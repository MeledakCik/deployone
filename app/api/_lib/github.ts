import type { GithubValidation } from "@/types";
import { evaluateAllPlatforms } from "@/lib/deploy-guides";
import {
  classifyProject,
  NESTED_CANDIDATES,
  STATIC_SUBDIR_CANDIDATES,
  type RepoEntry,
} from "@/app/api/_lib/project-detect";

// Menerima link repo apa adanya: https://github.com/o/r, .../r.git, .../r/tree/main, www.github.com, dst.
const GITHUB_URL_RE =
  /^https?:\/\/(?:www\.)?github\.com\/([^/\s]+)\/([^/\s#?]+?)(?:\.git)?(?:\/[^\s#?]*)?(?:[#?].*)?$/i;

export class GithubApiError extends Error {
  code: "invalid_url" | "repo_not_found" | "github_auth_required" | "bad_request" | "rate_limited";
  constructor(message: string, code: GithubApiError["code"]) {
    super(message);
    this.code = code;
  }
}

export function parseGithubUrl(input: string): { owner: string; repo: string } {
  const trimmed = input.trim();
  // Boleh ditulis tanpa "https://" (mis. "github.com/user/repo").
  const normalized = /^(?:www\.)?github\.com\//i.test(trimmed) ? `https://${trimmed}` : trimmed;
  const match = GITHUB_URL_RE.exec(normalized);
  if (!match) {
    throw new GithubApiError(
      "Link GitHub tidak valid. Gunakan format https://github.com/nama-akun/nama-repo",
      "invalid_url"
    );
  }
  return { owner: match[1], repo: match[2] };
}

function authHeaders(pat?: string): HeadersInit {
  const headers: HeadersInit = { Accept: "application/vnd.github+json" };
  const token = pat?.trim() || process.env.GITHUB_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function githubFetch(url: string, pat?: string) {
  const res = await fetch(url, { headers: authHeaders(pat), cache: "no-store" });
  return res;
}

/** Confirms a GitHub PAT actually works and returns whose account it is. */
export async function getGithubUser(pat: string): Promise<{ login: string; name: string | null }> {
  const res = await githubFetch("https://api.github.com/user", pat);
  if (res.status === 401) {
    throw new GithubApiError("GitHub token tidak valid.", "github_auth_required");
  }
  if (!res.ok) {
    throw new GithubApiError(`GitHub API error (${res.status})`, "bad_request");
  }
  const data = await res.json();
  return { login: data.login, name: data.name ?? null };
}

/**
 * Railway's builder (railpack) runs a mandatory security scan on the
 * lockfile before it will even attempt `npm run build` — a HIGH-severity
 * CVE in a dependency hard-fails the deploy with no way to opt out on
 * Railway's side. Next.js 14.x below 14.2.35 is the version people most
 * often still have pinned (CVE-2025-55184 / CVE-2025-67779), so we flag it
 * here — before a deploy is even attempted — rather than let the user burn
 * a full build cycle discovering it from Railway's error output.
 * Best-effort / not exhaustive: only catches this one known-common case.
 */
function checkKnownVulnerableNext(depsVersion: string | undefined): string | null {
  if (!depsVersion) return null;
  const m = /(\d+)\.(\d+)\.(\d+)/.exec(depsVersion);
  if (!m) return null;
  const [major, minor, patch] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (major === 14 && minor === 2 && patch < 35) {
    return `next@${depsVersion} punya CVE HIGH (CVE-2025-55184, CVE-2025-67779) yang bakal diblokir Railway saat build. Update ke next@^14.2.35 di package.json sebelum deploy ke Railway.`;
  }
  return null;
}

/**
 * Env var names that are commonly referenced via `process.env.X` but are
 * injected automatically by the platform/runtime, not something a user
 * needs to configure manually — filtered out of detection results.
 */
const IGNORED_ENV_NAMES = new Set([
  "NODE_ENV",
  "PORT",
  "HOSTNAME",
  "CI",
  "VERCEL",
  "VERCEL_ENV",
  "VERCEL_URL",
  "VERCEL_REGION",
  "RAILWAY_ENVIRONMENT",
  "RAILWAY_PUBLIC_DOMAIN",
  "RAILWAY_PRIVATE_DOMAIN",
  "RAILWAY_STATIC_URL",
  "RAILWAY_PROJECT_ID",
  "RAILWAY_SERVICE_ID",
  "ANALYZE",
  "NEXT_RUNTIME",
]);

const ENV_VAR_NAME_RE = /^[A-Z][A-Z0-9_]{1,}$/;

/** Extracts `process.env.SOME_NAME` references from arbitrary source text. */
function extractProcessEnvRefs(source: string): string[] {
  const found = new Set<string>();
  // Matches both `process.env.NAME` and `process.env["NAME"]` / `process.env['NAME']`.
  const re = /process\.env(?:\.([A-Za-z_][A-Za-z0-9_]*)|\[["']([A-Za-z_][A-Za-z0-9_]*)["']\])/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) {
    const name = m[1] ?? m[2];
    if (ENV_VAR_NAME_RE.test(name) && !IGNORED_ENV_NAMES.has(name)) found.add(name);
  }
  return [...found];
}

/** Extracts `KEY=...` lines from an .env-style file, ignoring comments/blank lines. */
function extractEnvFileKeys(source: string): string[] {
  const found = new Set<string>();
  for (const line of source.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const name = trimmed.slice(0, eq).trim();
    if (ENV_VAR_NAME_RE.test(name) && !IGNORED_ENV_NAMES.has(name)) found.add(name);
  }
  return [...found];
}

async function fetchRepoFileText(
  owner: string,
  repo: string,
  path: string,
  ref: string,
  pat?: string
): Promise<string | null> {
  try {
    const res = await githubFetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${encodeURIComponent(ref)}`,
      pat
    );
    if (!res.ok) return null;
    const meta = await res.json();
    if (typeof meta.content !== "string") return null;
    return Buffer.from(meta.content, "base64").toString("utf-8");
  } catch {
    return null;
  }
}

/**
 * Best-effort scan for env vars a repo likely needs at build/runtime:
 * checks common `.env.example`-style files for declared keys, and scans
 * `next.config.*` for `process.env.X` references. Not exhaustive (can't see
 * env vars only used deep in app code without fetching the whole tree), but
 * catches the common "config file reads an env var with no fallback" case
 * that otherwise only surfaces as a cryptic build failure.
 */
async function detectEnvVars(
  owner: string,
  repo: string,
  defaultBranch: string,
  githubPat?: string
): Promise<string[]> {
  const found = new Set<string>();

  const envFileCandidates = [".env.example", ".env.sample", ".env.template"];
  for (const path of envFileCandidates) {
    const text = await fetchRepoFileText(owner, repo, path, defaultBranch, githubPat);
    if (text) {
      extractEnvFileKeys(text).forEach((k) => found.add(k));
      break; // one env-example file is enough — they're usually kept in sync
    }
  }

  const configCandidates = ["next.config.js", "next.config.mjs", "next.config.ts"];
  for (const path of configCandidates) {
    const text = await fetchRepoFileText(owner, repo, path, defaultBranch, githubPat);
    if (text) {
      extractProcessEnvRefs(text).forEach((k) => found.add(k));
      break; // repos only have one active next.config.*
    }
  }

  return [...found].sort();
}

function describeGithubFailure(res: Response, hadToken: boolean): GithubApiError {
  const remaining = res.headers.get("x-ratelimit-remaining");
  if (res.status === 429 || (res.status === 403 && remaining === "0")) {
    return new GithubApiError(
      hadToken
        ? "Batas permintaan ke GitHub sedang penuh. Tunggu beberapa menit lalu coba lagi."
        : "Batas permintaan ke GitHub (tanpa token) sedang penuh. Isi GitHub Token di form, atau tunggu sekitar 1 jam lalu coba lagi.",
      "rate_limited"
    );
  }
  if (res.status === 401 || res.status === 403) {
    return new GithubApiError(
      "GitHub menolak akses ke repo ini. Kalau repo-nya private, isi GitHub Token (izin: repo). Kalau sudah diisi, cek apakah token masih berlaku.",
      "github_auth_required"
    );
  }
  return new GithubApiError(`GitHub sedang bermasalah (kode ${res.status}). Coba lagi sebentar lagi.`, "bad_request");
}

/** Daftar file/folder di sebuah path repo. `null` = path tidak ada / tidak bisa dibaca. */
async function listRepoDir(
  owner: string,
  repo: string,
  path: string,
  ref: string,
  pat?: string
): Promise<RepoEntry[] | null> {
  try {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents${path ? `/${path}` : ""}?ref=${encodeURIComponent(ref)}`;
    const res = await githubFetch(url, pat);
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data)) return null;
    return data
      .filter((e: { name?: unknown }) => typeof e.name === "string")
      .map((e: { name: string; type: string }) => ({
        name: e.name,
        type: e.type === "dir" ? "dir" : "file",
      }));
  } catch {
    return null;
  }
}

// Cache pendek supaya satu kali deploy (cek di form + cek ulang di server)
// tidak menghabiskan kuota GitHub 3x lipat.
const VALIDATION_CACHE_TTL_MS = 45_000;
const validationCache = new Map<string, { at: number; value: GithubValidation }>();

/**
 * Validates a GitHub repo: existence, public/private visibility, default
 * branch, and — yang terpenting — JENIS project-nya (HTML statis, Node.js,
 * TypeScript, Vue, Docker, Python, ...). Hasilnya dipakai untuk memutuskan
 * boleh/tidaknya lanjut deploy ke tiap platform SEBELUM deploy dimulai.
 */
export async function validateGithubRepo(
  repoUrl: string,
  githubPat?: string
): Promise<GithubValidation> {
  const { owner, repo } = parseGithubUrl(repoUrl);

  const cacheKey = `${owner}/${repo}`.toLowerCase() + `::${githubPat ? githubPat.slice(-6) : ""}`;
  const cached = validationCache.get(cacheKey);
  if (cached && Date.now() - cached.at < VALIDATION_CACHE_TTL_MS) return cached.value;

  const repoRes = await githubFetch(`https://api.github.com/repos/${owner}/${repo}`, githubPat);

  if (repoRes.status === 404) {
    throw new GithubApiError(
      githubPat || process.env.GITHUB_TOKEN
        ? "Repository tidak ditemukan. Cek penulisan URL-nya, atau pastikan GitHub Token punya akses ke repo ini."
        : "Repository tidak ditemukan. Cek penulisan URL-nya. Kalau repo ini private, isi GitHub Token di form.",
      "repo_not_found"
    );
  }
  if (!repoRes.ok) throw describeGithubFailure(repoRes, !!(githubPat || process.env.GITHUB_TOKEN));

  const repoData = await repoRes.json();
  const defaultBranch: string = repoData.default_branch ?? "main";
  const visibility: "public" | "private" = repoData.private ? "private" : "public";

  /* ---- 1. Baca isi root repo ---- */
  const listRes = await githubFetch(
    `https://api.github.com/repos/${owner}/${repo}/contents?ref=${encodeURIComponent(defaultBranch)}`,
    githubPat
  );
  let entries: RepoEntry[] = [];
  if (listRes.ok) {
    const data = await listRes.json();
    if (Array.isArray(data)) {
      entries = data
        .filter((e: { name?: unknown }) => typeof e.name === "string")
        .map((e: { name: string; type: string }) => ({
          name: e.name,
          type: e.type === "dir" ? "dir" : "file",
        }));
    }
  } else if (listRes.status !== 404) {
    // 404 = repo kosong (belum ada commit). Selain itu = masalah akses / rate limit.
    throw describeGithubFailure(listRes, !!(githubPat || process.env.GITHUB_TOKEN));
  }

  /* ---- 2. package.json (kalau ada) ---- */
  let pkg: Record<string, unknown> | null = null;
  let pkgBroken = false;
  const warnings: string[] = [];
  if (entries.some((e) => e.type === "file" && e.name === "package.json")) {
    const raw = await fetchRepoFileText(owner, repo, "package.json", defaultBranch, githubPat);
    try {
      if (raw === null) throw new Error("empty");
      pkg = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      pkgBroken = true;
      warnings.push("package.json ditemukan tapi isinya tidak valid (format JSON rusak). Perbaiki dulu sebelum deploy.");
    }
  }

  /* ---- 3. Klasifikasi tipe project ---- */
  let project = classifyProject({ entries, pkg, pkgBroken, staticSubdir: null, nestedProjectDir: null });

  // Kalau root tidak menunjukkan project apa pun, intip subfolder umum
  // (public/, docs/, frontend/, ...) sebelum menyerah.
  if (project.type === "unknown" || (project.type === "static" && project.staticDir === null)) {
    const dirNames = new Set(entries.filter((e) => e.type === "dir").map((e) => e.name));
    const candidates = [...new Set([...STATIC_SUBDIR_CANDIDATES, ...NESTED_CANDIDATES])].filter((d) =>
      dirNames.has(d)
    );
    const listings = await Promise.all(
      candidates.slice(0, 8).map(async (d) => ({
        dir: d,
        list: await listRepoDir(owner, repo, d, defaultBranch, githubPat),
      }))
    );
    const hasFile = (l: RepoEntry[] | null, name: string) =>
      !!l?.some((e) => e.type === "file" && e.name.toLowerCase() === name);
    const staticSubdir =
      listings.find((x) => STATIC_SUBDIR_CANDIDATES.includes(x.dir) && hasFile(x.list, "index.html"))?.dir ?? null;
    const nestedProjectDir =
      listings.find(
        (x) => NESTED_CANDIDATES.includes(x.dir) && (hasFile(x.list, "package.json") || hasFile(x.list, "index.html"))
      )?.dir ?? null;
    project = classifyProject({ entries, pkg, pkgBroken, staticSubdir, nestedProjectDir });
  }

  /* ---- 4. Catatan khusus Node.js ---- */
  if (project.type === "node" && pkg) {
    if (!(pkg.scripts as Record<string, string> | undefined)?.build) {
      warnings.push(
        'Tidak ada script "build" di package.json — platform akan memakai pengaturan default framework. Kalau build gagal, tambahkan script "build".'
      );
    }
    if (!project.framework) {
      warnings.push("Framework web tidak terdeteksi otomatis — pastikan project ini bisa di-build.");
    }
    const nextVersion = (pkg.dependencies as Record<string, string> | undefined)?.next;
    const vulnWarning = checkKnownVulnerableNext(nextVersion);
    if (vulnWarning) warnings.push(vulnWarning);
  }

  /* ---- 5. Env var yang mungkin dibutuhkan (tidak relevan untuk HTML statis) ---- */
  const needsEnvScan = project.type !== "static" && project.type !== "empty" && project.type !== "unknown";
  const detectedEnvVars = needsEnvScan ? await detectEnvVars(owner, repo, defaultBranch, githubPat) : [];
  if (detectedEnvVars.length > 0) {
    warnings.push(
      `Repo ini kemungkinan butuh env var: ${detectedEnvVars.join(", ")}. Isi di step Environment Variables sebelum deploy.`
    );
  }

  const fullName = `${owner}/${repo}`;
  const result: GithubValidation = {
    owner,
    repo,
    fullName,
    visibility,
    defaultBranch,
    hasPackageJson: entries.some((e) => e.type === "file" && e.name === "package.json"),
    framework: project.framework,
    structureOk: project.type !== "empty" && project.type !== "unknown",
    warnings,
    detectedEnvVars,
    project,
    compat: evaluateAllPlatforms(project, fullName),
  };

  validationCache.set(cacheKey, { at: Date.now(), value: result });
  if (validationCache.size > 200) {
    const oldest = validationCache.keys().next().value;
    if (oldest) validationCache.delete(oldest);
  }
  return result;
}
