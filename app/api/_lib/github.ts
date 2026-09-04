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
  };
}
