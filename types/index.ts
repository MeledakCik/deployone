export type Platform = "vercel" | "cloudflare" | "railway" | "render";

export type DeployStatus = "ready" | "failed" | "building";

export interface HistoryItem {
  id: string;
  name: string;
  platform: Platform;
  domain: string;
  date: string;
  status: DeployStatus;
}

export interface DummyUser {
  name: string;
  email: string;
  avatar: string;
  color: "violet" | "blue";
}

export interface DeployFormValues {
  projectName: string;
  platform: Platform;
  domain: string;
  platformToken: string;
  githubUrl: string;
  githubPat: string; // optional GitHub PAT (used on the Vercel form)
  note: string;
  // Cloudflare Pages specific
  accountId: string;
  buildCommand: string;
  outputDir: string;
  // Railway / Render specific
  startCommand: string;
  envText: string;
}

export interface DomainItem {
  id: string;
  domain: string;
  project: string;
  status: "Active" | "Pending";
  /** Set when the domain belongs to a Vercel-deployed project — enables real sync with the Vercel API. */
  platform?: Platform;
  misconfigured?: boolean;
}

export interface EnvItem {
  id: string;
  key: string;
  value: string;
  environment: "Production" | "Preview";
  visible: boolean;
}

export interface SettingsTokens {
  vercelToken: string;
  cloudflareToken: string;
  githubPat: string;
}

export type DashboardView =
  | "dashboard"
  | "deploy"
  | "projects"
  | "domains"
  | "env"
  | "docs"
  | "settings";

/* ---------------------------------------------------------------------- */
/*  Backend API contracts (app/api/**)                                    */
/*  Shared between the client (lib/deploy-context.tsx) and the route      */
/*  handlers so both sides stay in sync on shape.                         */
/* ---------------------------------------------------------------------- */

export interface ApiError {
  ok: false;
  error: string;
  /** Machine-readable reason, used by the client to branch UI copy. */
  code?:
    | "invalid_url"
    | "repo_not_found"
    | "github_auth_required"
    | "no_package_json"
    | "invalid_token"
    | "vercel_error"
    | "project_conflict"
    | "not_found"
    | "bad_request";
}

export interface ApiOk<T> {
  ok: true;
  data: T;
}

export type ApiResponse<T> = ApiOk<T> | ApiError;

/** Result of POST /api/github/validate */
export interface GithubValidation {
  owner: string;
  repo: string;
  fullName: string;
  visibility: "public" | "private";
  defaultBranch: string;
  hasPackageJson: boolean;
  framework: string | null;
  structureOk: boolean;
  /** Human-readable notes surfaced to the user, e.g. missing build script. */
  warnings: string[];
}

/** Body of POST /api/deploy */
export interface CreateDeployRequest {
  projectName: string;
  githubUrl: string;
  vercelToken: string;
  githubPat?: string;
}

/** Result of POST /api/deploy */
export interface CreateDeployResult {
  deploymentId: string;
  url: string;
  inspectorUrl: string;
  readyState: VercelReadyState;
}

export type VercelReadyState =
  | "QUEUED"
  | "BUILDING"
  | "INITIALIZING"
  | "READY"
  | "ERROR"
  | "CANCELED";

/** Result of GET /api/deploy/[id] */
export interface DeployStatusResult {
  deploymentId: string;
  url: string;
  inspectorUrl: string;
  readyState: VercelReadyState;
  errorMessage: string | null;
}

/** Result of POST /api/vercel/project-status — used to detect a project deleted directly on Vercel. */
export interface VercelProjectStatusResult {
  exists: boolean;
  linkedRepoFullName: string | null;
}

/** Client-side sync state for a history/project entry against the real Vercel account. */
export type SyncStatus = "idle" | "checking" | "exists" | "deleted" | "error";

/** Result of POST/GET /api/vercel/domains — real domain state from the Vercel API. */
export interface VercelDomainResult {
  name: string;
  verified: boolean;
  misconfigured?: boolean;
  verification: { type: string; domain: string; value: string; reason?: string }[];
}

/** One parsed+validated issue from a `KEY=value` env block or a single env key field. */
export interface EnvValidationIssue {
  line: number;
  level: "error" | "warning";
  message: string;
}

