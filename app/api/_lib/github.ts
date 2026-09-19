import type { GithubValidation } from "@/types";

const GITHUB_URL_RE = /^https?:\/\/github\.com\/([^/\s]+)\/([^/\s#?]+?)(?:\.git)?\/?(?:[#?].*)?$/i;

export class GithubApiError extends Error {
  code: "invalid_url" | "repo_not_found" | "github_auth_required" | "bad_request";
  constructor(message: string, code: GithubApiError["code"]) {
    super(message);
    this.code = code;
  }
}

export function parseGithubUrl(input: string): { owner: string; repo: string } {
  const match = GITHUB_URL_RE.exec(input.trim());
  if (!match) {
    throw new GithubApiError(
      "URL GitHub tidak valid. Gunakan format https://github.com/owner/repo",
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

/** Detects the framework from a package.json's dependencies, best-effort. */
function detectFramework(pkg: Record<string, unknown>): string | null {
  const deps = {
    ...((pkg.dependencies as Record<string, string>) ?? {}),
    ...((pkg.devDependencies as Record<string, string>) ?? {}),
  };
  if (deps.next) return "Next.js";
  if (deps["@remix-run/react"]) return "Remix";
  if (deps.nuxt) return "Nuxt";
  if (deps["@sveltejs/kit"]) return "SvelteKit";
  if (deps.astro) return "Astro";
  if (deps.vite && deps.react) return "Vite + React";
  if (deps.vite) return "Vite";
  if (deps["react-scripts"]) return "Create React App";
  if (deps.gatsby) return "Gatsby";
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
  const re = /process\.env\.([A-Za-z_][A-Za-z0-9_]*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) {
    const name = m[1];
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

/**
 * Validates a GitHub repo: existence, public/private visibility, default
 * branch, and a light structural check (package.json present + parseable,
 * framework guess, build script present) so we can surface useful warnings
 * before handing the repo off to Vercel.
 */
export async function validateGithubRepo(
  repoUrl: string,
  githubPat?: string
): Promise<GithubValidation> {
  const { owner, repo } = parseGithubUrl(repoUrl);

  const repoRes = await githubFetch(`https://api.github.com/repos/${owner}/${repo}`, githubPat);

  if (repoRes.status === 404) {
    throw new GithubApiError(
      "Repository tidak ditemukan. Jika private, isi GitHub Token di atas.",
      "repo_not_found"
    );
  }
  if (repoRes.status === 401 || repoRes.status === 403) {
    throw new GithubApiError(
      "GitHub menolak akses. Token tidak valid atau rate limit tercapai.",
      "github_auth_required"
    );
  }
  if (!repoRes.ok) {
    throw new GithubApiError(`GitHub API error (${repoRes.status})`, "bad_request");
  }

  const repoData = await repoRes.json();
  const defaultBranch: string = repoData.default_branch ?? "main";
  const visibility: "public" | "private" = repoData.private ? "private" : "public";

  const warnings: string[] = [];
  let hasPackageJson = false;
  let framework: string | null = null;

  const pkgRes = await githubFetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/package.json?ref=${defaultBranch}`,
    githubPat
  );

  if (pkgRes.ok) {
    hasPackageJson = true;
    try {
      const pkgMeta = await pkgRes.json();
      const raw = Buffer.from(pkgMeta.content, "base64").toString("utf-8");
      const pkg = JSON.parse(raw);
      framework = detectFramework(pkg);
      if (!pkg.scripts?.build) {
        warnings.push('Tidak ada script "build" di package.json — Vercel akan pakai default framework.');
      }
      if (!framework) {
        warnings.push("Framework tidak terdeteksi otomatis, pastikan project bisa di-build oleh Vercel.");
      }
    } catch {
      warnings.push("package.json ditemukan tapi gagal di-parse.");
    }
  } else {
    warnings.push("Tidak ada package.json di root repo — pastikan ini project Node.js yang valid.");
  }

  const detectedEnvVars = await detectEnvVars(owner, repo, defaultBranch, githubPat);
  if (detectedEnvVars.length > 0) {
    warnings.push(
      `Repo ini kemungkinan butuh env var: ${detectedEnvVars.join(", ")}. Isi di step Environment Variables sebelum deploy.`
    );
  }

  return {
    owner,
    repo,
    fullName: `${owner}/${repo}`,
    visibility,
    defaultBranch,
    hasPackageJson,
    framework,
    structureOk: hasPackageJson,
    warnings,
    detectedEnvVars,
  };
}
