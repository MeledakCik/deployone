export type Platform = "vercel" | "cloudflare" | "railway" | "render";

export type DeployStatus = "ready" | "failed" | "building" | "deleted";

export interface HistoryItem {
  id: string;
  name: string;
  platform: Platform;
  domain: string;
  date: string;
  status: DeployStatus;
}

/** Real Google profile fields, decoded from the signed session cookie. */
export interface AuthUser {
  name: string;
  email: string;
  picture: string | null;
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

/** The DNS record the user needs to add at their domain registrar/DNS provider. */
export interface DnsRecordInstruction {
  type: "A" | "CNAME" | "TXT";
  /** Host/name part to enter at the registrar, e.g. "@" for apex or "app" for a subdomain. */
  name: string;
  value: string;
}

export interface DomainItem {
  id: string;
  domain: string;
  project: string;
  status: "Active" | "Pending";
  /** true once this was successfully pushed to a real Vercel project. */
  syncedToVercel?: boolean;
  /** true once this was successfully pushed to a real Cloudflare Pages project. */
  syncedToCloudflare?: boolean;
  /** true once this was successfully pushed to a real Railway service as a custom domain. */
  syncedToRailway?: boolean;
  /** Key-value DNS record to add at the domain's DNS provider — present once synced to Vercel/Cloudflare/Railway. */
  dns?: DnsRecordInstruction;
  /** Extra TXT verification record Railway requires alongside the CNAME above. */
  verificationDns?: DnsRecordInstruction;
  /** Shared id linking this domain to its auto-added www/non-www counterpart, so both are removed together. */
  pairId?: string;
}

export interface EnvItem {
  id: string;
  key: string;
  value: string;
  environment: "Production" | "Preview";
  visible: boolean;
  /** Project this secret belongs to — env vars are always scoped per-project, never global. */
  project: string;
  /** True once this secret has been pushed to the matching project on Vercel. */
  syncedToVercel?: boolean;
  /** True once this secret has been pushed to the matching project on Cloudflare Pages. */
  syncedToCloudflare?: boolean;
  /** True once this secret has been pushed to the matching service on Railway. */
  syncedToRailway?: boolean;
}

export interface SettingsTokens {
  vercelToken: string;
  cloudflareToken: string;
  /** Which Cloudflare account (of possibly several the token can see) to use — picked once in Settings. */
  cloudflareAccountId?: string;
  githubPat: string;
  /** Railway account/workspace API token (from railway.com/account/tokens). */
  railwayToken: string;
}

export type DashboardView =
  | "dashboard"
  | "deploy"
  | "projects"
  | "domains"
  | "env"
  | "observability"
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
    | "cloudflare_error"
    | "railway_error"
    | "github_not_connected"
    | "missing_account"
    | "project_conflict"
    | "not_found"
    | "bad_request"
    | "unauthorized";
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
  /** Env var names the repo appears to require (from .env.example / process.env.* usage in config files), best-effort. */
  detectedEnvVars: string[];
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

/** Result of GET /api/vercel/status */
export interface ProjectStatusResult {
  exists: boolean;
  linkedRepoFullName: string | null;
  latestDeploymentReadyState: VercelReadyState | null;
  /** Whether Vercel Web Analytics has been switched on for this project. */
  webAnalyticsEnabled: boolean;
  /** id of the most recent deployment — needed to trigger a redeploy from it. */
  latestDeploymentId: string | null;
}

/** Result of POST /api/vercel/redeploy */
export interface RedeployResult {
  deploymentId: string;
  url: string;
  inspectorUrl: string;
  readyState: VercelReadyState;
}

/** A single domain as returned by /api/vercel/domains */
export interface VercelDomainResult {
  name: string;
  verified: boolean;
  verification: { type: string; domain: string; value: string; reason: string }[] | null;
  apexName?: string;
  /** The A/CNAME record to add at the DNS provider so the domain points here. */
  dns?: DnsRecordInstruction;
}

/** Body of POST /api/vercel/env */
export interface UpsertEnvRequest {
  project: string;
  key: string;
  value: string;
  target: ("production" | "preview")[];
  vercelToken: string;
}

/** One entry from GET /api/vercel/env — an env var as it currently exists on Vercel. */
export interface VercelEnvSummary {
  key: string;
  target: string[];
}

/** Result of GET /api/vercel/whoami — used by Settings to prove a token actually works. */
export interface VercelUserInfo {
  username: string;
  email: string | null;
}

/** One project as it exists on Vercel — result of GET /api/vercel/project, used by "Import Project". */
export interface VercelProjectSummary {
  id: string;
  name: string;
  domain: string | null;
  latestDeploymentReadyState: VercelReadyState | null;
}

/** Result of GET /api/github/whoami */
export interface GithubUserInfo {
  login: string;
  name: string | null;
}

/* ---------------------------------------------------------------------- */
/*  Observability / analytics                                              */
/* ---------------------------------------------------------------------- */

export interface AnalyticsTopPath {
  path: string;
  count: number;
}

export interface AnalyticsTimeseriesPoint {
  timestamp: string;
  requests: number;
}

export interface AnalyticsErrorCounts {
  "4xx": number;
  "5xx": number;
}

/** Result of GET /api/vercel/analytics when Web Analytics is enabled on the project. */
export interface AnalyticsResult {
  enabled: true;
  totalRequests: number;
  /** Bandwidth used, in bytes. */
  bandwidth: number;
  topPaths: AnalyticsTopPath[];
  errors: AnalyticsErrorCounts;
  timeseries: AnalyticsTimeseriesPoint[];
}

/** Result of GET /api/vercel/analytics when the project has no Web Analytics data. */
export interface AnalyticsDisabledResult {
  enabled: false;
  message: string;
}

export type AnalyticsApiResult = AnalyticsResult | AnalyticsDisabledResult;

/* ---------------------------------------------------------------------- */
/*  Cloudflare Pages                                                       */
/* ---------------------------------------------------------------------- */

/** One Cloudflare account the token has access to — a token can belong to more than one account. */
export interface CloudflareAccountInfo {
  id: string;
  name: string;
}

/** Result of GET /api/cloudflare/whoami — used by Settings & the deploy form to prove a token actually works. */
export interface CloudflareUserInfo {
  accounts: CloudflareAccountInfo[];
}

/**
 * Result of GET /api/cloudflare/github-status. Cloudflare has no public API
 * to *start* the GitHub App install for a third party — that has to happen
 * once on the Cloudflare dashboard. "connected" means we found at least one
 * existing Pages project on this account already wired to GitHub, so new
 * deploys can go straight through. "unknown" means we can't tell yet (no
 * projects on the account at all) — the first deploy attempt will confirm
 * either way.
 */
export interface GithubConnectionStatus {
  status: "connected" | "unknown";
  /** Deep link to Cloudflare's own "connect to Git" screen for this account. */
  connectUrl: string;
}

/** Body of POST /api/cloudflare/deploy */
export interface CreateCloudflareDeployRequest {
  projectName: string;
  githubUrl: string;
  cloudflareToken: string;
  accountId: string;
  githubPat?: string;
  buildCommand?: string;
  outputDir?: string;
}

/** Result of POST /api/cloudflare/deploy */
export interface CreateCloudflareDeployResult {
  deploymentId: string;
  url: string;
  inspectorUrl: string;
  readyState: VercelReadyState;
  /** Framework-specific caveat (e.g. Next.js on Pages) surfaced from the server so the client can show it even on a successful deploy. */
  frameworkWarning?: string;
}

/** Result of GET /api/cloudflare/deploy/[id] */
export interface CloudflareDeployStatusResult {
  deploymentId: string;
  url: string;
  inspectorUrl: string;
  readyState: VercelReadyState;
  errorMessage: string | null;
}

/** Result of GET /api/cloudflare/status */
export interface CloudflareProjectStatusResult {
  exists: boolean;
  linkedRepoFullName: string | null;
  latestDeploymentReadyState: VercelReadyState | null;
  latestDeploymentId: string | null;
  /** The project's stable `{name}.pages.dev` domain. */
  subdomain: string | null;
}

/** One project already existing on Cloudflare Pages — used by "Import Project". */
export interface CloudflareProjectSummary {
  id: string;
  name: string;
  domain: string | null;
  latestDeploymentReadyState: VercelReadyState | null;
}

/** One project already existing on Railway — result of GET /api/railway/project, used by "Import Project". */
export interface RailwayProjectSummary {
  id: string;
  name: string;
  domain: string | null;
  latestDeploymentReadyState: VercelReadyState | null;
}

/** A single custom domain attached to a Cloudflare Pages project. */
export interface CloudflareDomainResult {
  name: string;
  verified: boolean;
  dns?: DnsRecordInstruction;
}

/** One entry from GET /api/cloudflare/env — an env var as it currently exists on Cloudflare Pages. */
export interface CloudflareEnvSummary {
  key: string;
  target: string[];
}

/** Body of POST /api/cloudflare/env */
export interface UpsertCloudflareEnvRequest {
  project: string;
  key: string;
  value: string;
  target: ("production" | "preview")[];
  cloudflareToken: string;
  accountId: string;
}

/* ---------------------------------------------------------------------- */
/*  Railway                                                                 */
/* ---------------------------------------------------------------------- */

/** Result of GET /api/railway/whoami — used by Settings & the deploy form to prove a token actually works. */
export interface RailwayUserInfo {
  id: string;
  name: string | null;
  email: string | null;
}

/** Body of POST /api/railway/deploy */
export interface CreateRailwayDeployRequest {
  projectName: string;
  githubUrl: string;
  railwayToken: string;
  githubPat?: string;
  /** Optional custom start command (leave empty to let Railway/Railpack auto-detect). */
  startCommand?: string;
  /** Optional env vars to seed the service with, format `KEY=value` per line. */
  envText?: string;
}

/** Result of POST /api/railway/deploy */
export interface CreateRailwayDeployResult {
  deploymentId: string;
  projectId: string;
  /** The project's actual name on Railway — may differ from the requested projectName when an existing project (matched by repo) was reused. Use this for history, not the input name. */
  name: string;
  serviceId: string;
  environmentId: string;
  url: string;
  inspectorUrl: string;
  readyState: VercelReadyState;
}

/** Result of GET /api/railway/deploy/[id] */
export interface RailwayDeployStatusResult {
  deploymentId: string;
  url: string;
  inspectorUrl: string;
  readyState: VercelReadyState;
  errorMessage: string | null;
}

/** Result of GET /api/railway/status */
export interface RailwayProjectStatusResult {
  exists: boolean;
  linkedRepoFullName: string | null;
  latestDeploymentReadyState: VercelReadyState | null;
  latestDeploymentId: string | null;
  projectId: string | null;
  serviceId: string | null;
  environmentId: string | null;
  /** The service's public `{name}.up.railway.app` domain, once generated. */
  domain: string | null;
}

/** Result of POST /api/railway/redeploy */
export interface RailwayRedeployResult {
  deploymentId: string;
  url: string;
  inspectorUrl: string;
  readyState: VercelReadyState;
}

/** One entry from GET /api/railway/env — a variable as it currently exists on the Railway service. */
export interface RailwayEnvSummary {
  key: string;
}

/** Body of POST /api/railway/env */
export interface UpsertRailwayEnvRequest {
  project: string;
  key: string;
  value: string;
  railwayToken: string;
}

/** A single custom domain attached to a Railway service — result of GET/POST /api/railway/domains. */
export interface RailwayDomainResult {
  id: string;
  domain: string;
  verified: boolean;
  /** The CNAME record pointing this domain at the Railway service. */
  dns?: DnsRecordInstruction;
  /** The TXT record Railway requires to verify domain ownership — required alongside the CNAME. */
  verificationDns?: DnsRecordInstruction;
}

/** Body of POST /api/railway/domains */
export interface AddRailwayDomainRequest {
  project: string;
  domain: string;
  railwayToken: string;
}

