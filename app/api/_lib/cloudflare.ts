import type {
  CloudflareAccountInfo,
  CloudflareDomainResult,
  CloudflareEnvSummary,
  CloudflareProjectStatusResult,
  CloudflareProjectSummary,
  DnsRecordInstruction,
  VercelReadyState,
} from "@/types";

const CF_API = "https://api.cloudflare.com/client/v4";

export class CloudflareApiError extends Error {
  code: "invalid_token" | "cloudflare_error" | "not_found" | "github_not_connected" | "project_conflict" | "missing_account";
  constructor(message: string, code: CloudflareApiError["code"]) {
    super(message);
    this.code = code;
  }
}

interface CfErrorBody {
  errors?: { code?: number; message?: string }[];
}

async function parseCloudflareError(res: Response): Promise<CloudflareApiError> {
  if (res.status === 401 || res.status === 403) {
    return new CloudflareApiError("Cloudflare token tidak valid atau tidak punya izin.", "invalid_token");
  }
  if (res.status === 404) {
    return new CloudflareApiError("Resource tidak ditemukan di Cloudflare.", "not_found");
  }
  let message = `Cloudflare API error (${res.status})`;
  try {
    const body = (await res.json()) as CfErrorBody;
    const first = body?.errors?.[0];
    if (first?.message) message = first.message;
    // Cloudflare doesn't have a dedicated error code for "GitHub App not
    // installed on this account yet" — it surfaces as a generic 400 whose
    // message mentions the missing authorization/installation. Detect that
    // by keyword so the UI can show the "connect GitHub" step instead of a
    // raw API error.
    if (/github|installation|authoriz/i.test(message) && (res.status === 400 || res.status === 403)) {
      return new CloudflareApiError(
        "GitHub belum terhubung ke akun Cloudflare kamu. Hubungkan dulu, lalu coba deploy lagi.",
        "github_not_connected"
      );
    }
    if (/already exists|already taken/i.test(message)) {
      return new CloudflareApiError(message, "project_conflict");
    }
  } catch {
    /* body wasn't JSON — keep the generic message */
  }
  return new CloudflareApiError(message, "cloudflare_error");
}

async function cfFetch(path: string, token: string, init?: RequestInit): Promise<Response> {
  return fetch(`${CF_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
}

/**
 * Confirms a Cloudflare API token actually works and lists every account it
 * can see — a token can be scoped to more than one account, so the caller
 * (Settings / deploy form) lets the user pick which one to deploy into.
 */
export async function getCloudflareAccounts(token: string): Promise<CloudflareAccountInfo[]> {
  const res = await cfFetch("/accounts?per_page=50", token);
  if (!res.ok) throw await parseCloudflareError(res);
  const data = await res.json();
  const accounts = Array.isArray(data.result) ? data.result : [];
  return accounts.map((a: { id: string; name: string }) => ({ id: a.id, name: a.name }));
}

/** Deep link to Cloudflare's own dashboard screen for connecting the GitHub App to an account. */
export function cloudflareGithubConnectUrl(accountId: string): string {
  return `https://dash.cloudflare.com/${accountId}/pages/new/provider/github`;
}

/**
 * Cloudflare has no public API to check whether the GitHub App is installed
 * on an account. Best-effort: if any existing Pages project on the account
 * already uses a GitHub source, the App is clearly installed. Otherwise we
 * genuinely don't know yet — the first real deploy attempt will tell us for
 * sure (see CloudflareApiError "github_not_connected" above).
 */
export async function checkCloudflareGithubConnected(
  accountId: string,
  token: string
): Promise<"connected" | "unknown"> {
  const res = await cfFetch(`/accounts/${accountId}/pages/projects?per_page=50`, token);
  if (!res.ok) throw await parseCloudflareError(res);
  const data = await res.json();
  const projects = Array.isArray(data.result) ? data.result : [];
  const hasGithubProject = projects.some(
    (p: { source?: { type?: string } }) => p.source?.type === "github"
  );
  return hasGithubProject ? "connected" : "unknown";
}

interface CfDeploymentResponse {
  id: string;
  url?: string;
  environment?: string;
  latest_stage?: { name?: string; status?: string };
  stages?: { name?: string; status?: string }[];
}

/** Normalizes Cloudflare's per-stage deployment status into our shared readyState union. */
function readyStateFor(d: CfDeploymentResponse): VercelReadyState {
  const stages = d.stages ?? [];
  if (stages.some((s) => s.status === "failure")) return "ERROR";
  if (stages.some((s) => s.status === "canceled")) return "CANCELED";
  const latest = d.latest_stage;
  if (!latest) return "QUEUED";
  if (latest.status === "failure") return "ERROR";
  if (latest.status === "canceled") return "CANCELED";
  if (latest.status === "success" && latest.name === "deploy") return "READY";
  if (latest.name === "queued" && (latest.status === "idle" || latest.status === "active")) return "QUEUED";
  return "BUILDING";
}

function inspectorUrlFor(accountId: string, projectName: string, deploymentId: string): string {
  return `https://dash.cloudflare.com/${accountId}/pages/view/${encodeURIComponent(projectName)}/${deploymentId}`;
}

interface CfProjectResponse {
  name: string;
  subdomain?: string;
  domains?: string[];
  production_branch?: string;
  source?: { type?: string; config?: { owner?: string; repo_name?: string } };
  latest_deployment?: CfDeploymentResponse;
  deployment_configs?: {
    production?: { env_vars?: Record<string, { value?: string } | null> | null };
    preview?: { env_vars?: Record<string, { value?: string } | null> | null };
  };
}

function primaryUrlFor(project: CfProjectResponse, deployment?: CfDeploymentResponse): string {
  if (project.subdomain) return `https://${project.subdomain}`;
  return deployment?.url ?? `https://${project.name}.pages.dev`;
}

/** Looks up a Pages project by name — used before creating a deployment, to detect name/repo conflicts like the Vercel flow does. */
export async function getCloudflarePagesProject(
  accountId: string,
  projectName: string,
  token: string
): Promise<CloudflareProjectStatusResult> {
  const res = await cfFetch(`/accounts/${accountId}/pages/projects/${encodeURIComponent(projectName)}`, token);
  if (res.status === 404) {
    return { exists: false, linkedRepoFullName: null, latestDeploymentReadyState: null, latestDeploymentId: null, subdomain: null };
  }
  if (!res.ok) throw await parseCloudflareError(res);
  const data = await res.json();
  const project = data.result as CfProjectResponse;
  const linkedRepoFullName =
    project.source?.type === "github" && project.source.config?.owner && project.source.config?.repo_name
      ? `${project.source.config.owner}/${project.source.config.repo_name}`
      : null;
  return {
    exists: true,
    linkedRepoFullName,
    latestDeploymentReadyState: project.latest_deployment ? readyStateFor(project.latest_deployment) : null,
    latestDeploymentId: project.latest_deployment?.id ?? null,
    subdomain: project.subdomain ?? null,
  };
}

/** Lists every Pages project on the account — used by "Import Project" (Cloudflare tab). */
export async function listCloudflarePagesProjects(
  accountId: string,
  token: string
): Promise<CloudflareProjectSummary[]> {
  const res = await cfFetch(`/accounts/${accountId}/pages/projects?per_page=50`, token);
  if (!res.ok) throw await parseCloudflareError(res);
  const data = await res.json();
  const projects = (Array.isArray(data.result) ? data.result : []) as CfProjectResponse[];
  return projects.map((p) => ({
    id: p.name,
    name: p.name,
    domain: p.subdomain ?? `${p.name}.pages.dev`,
    latestDeploymentReadyState: p.latest_deployment ? readyStateFor(p.latest_deployment) : null,
  }));
}

interface CreateCfProjectParams {
  accountId: string;
  token: string;
  projectName: string;
  owner: string;
  repo: string;
  productionBranch: string;
  buildCommand?: string;
  outputDir?: string;
}

/**
 * Creates a Cloudflare Pages project wired to a GitHub repo. This only
 * succeeds if the Cloudflare account already has the Pages GitHub App
 * installed & authorized for that repo/owner — otherwise Cloudflare rejects
 * it and we surface that as CloudflareApiError("github_not_connected").
 */
export async function createCloudflarePagesProject(params: CreateCfProjectParams): Promise<CfProjectResponse> {
  const res = await cfFetch(`/accounts/${params.accountId}/pages/projects`, params.token, {
    method: "POST",
    body: JSON.stringify({
      name: params.projectName,
      production_branch: params.productionBranch,
      source: {
        type: "github",
        config: {
          owner: params.owner,
          repo_name: params.repo,
          production_branch: params.productionBranch,
          pr_comments_enabled: true,
          deployments_enabled: true,
        },
      },
      build_config: {
        build_command: params.buildCommand || undefined,
        destination_dir: params.outputDir || undefined,
      },
    }),
  });
  if (!res.ok) throw await parseCloudflareError(res);
  const data = await res.json();
  return data.result as CfProjectResponse;
}

/** Starts a fresh deployment from the production branch — used both right after project creation and for manual redeploys. */
export async function triggerCloudflareDeployment(
  accountId: string,
  projectName: string,
  token: string
): Promise<{ deploymentId: string; url: string; inspectorUrl: string; readyState: VercelReadyState }> {
  const res = await cfFetch(`/accounts/${accountId}/pages/projects/${encodeURIComponent(projectName)}/deployments`, token, {
    method: "POST",
  });
  if (!res.ok) throw await parseCloudflareError(res);
  const data = await res.json();
  const deployment = data.result as CfDeploymentResponse;
  return {
    deploymentId: deployment.id,
    url: deployment.url ?? `https://${projectName}.pages.dev`,
    inspectorUrl: inspectorUrlFor(accountId, projectName, deployment.id),
    readyState: readyStateFor(deployment),
  };
}

/** Polls a deployment's current build status. */
export async function getCloudflareDeployment(
  accountId: string,
  projectName: string,
  deploymentId: string,
  token: string
): Promise<{ deploymentId: string; url: string; inspectorUrl: string; readyState: VercelReadyState; errorMessage: string | null }> {
  const res = await cfFetch(
    `/accounts/${accountId}/pages/projects/${encodeURIComponent(projectName)}/deployments/${deploymentId}`,
    token
  );
  if (!res.ok) throw await parseCloudflareError(res);
  const data = await res.json();
  const deployment = data.result as CfDeploymentResponse;
  const readyState = readyStateFor(deployment);
  const failedStage = (deployment.stages ?? []).find((s) => s.status === "failure");
  return {
    deploymentId: deployment.id,
    url: deployment.url ?? `https://${projectName}.pages.dev`,
    inspectorUrl: inspectorUrlFor(accountId, projectName, deployment.id),
    readyState,
    errorMessage:
      readyState === "ERROR"
        ? `Build gagal di tahap "${failedStage?.name ?? "build"}". Cek log deployment di Cloudflare dashboard untuk detail.`
        : null,
  };
}

/** Permanently deletes a Pages project — used by "Hapus di kedua sisi" (Cloudflare tab). */
export async function deleteCloudflarePagesProject(accountId: string, projectName: string, token: string): Promise<void> {
  const res = await cfFetch(`/accounts/${accountId}/pages/projects/${encodeURIComponent(projectName)}`, token, {
    method: "DELETE",
  });
  if (res.status === 404) return;
  if (!res.ok) throw await parseCloudflareError(res);
}

/** Re-triggers the production branch — the Cloudflare equivalent of "Redeploy". */
export async function redeployCloudflareProject(
  accountId: string,
  projectName: string,
  token: string
): Promise<{ deploymentId: string; url: string; inspectorUrl: string; readyState: VercelReadyState }> {
  const project = await getCloudflarePagesProject(accountId, projectName, token);
  if (!project.exists) {
    throw new CloudflareApiError(`Project "${projectName}" tidak ditemukan di Cloudflare.`, "not_found");
  }
  return triggerCloudflareDeployment(accountId, projectName, token);
}

/* ---------------------------------------------------------------------- */
/*  Custom domains                                                         */
/* ---------------------------------------------------------------------- */

interface CfDomainResponse {
  name: string;
  status?: string;
  validation_data?: { method?: "http" | "txt"; status?: string; txt_name?: string; txt_value?: string };
}

function domainDnsInstruction(domain: string, subdomain: string, validation?: CfDomainResponse["validation_data"]): DnsRecordInstruction {
  if (validation?.method === "txt" && validation.txt_name && validation.txt_value) {
    return { type: "TXT", name: validation.txt_name, value: validation.txt_value };
  }
  // Best-effort apex detection, same simplification used for Vercel's fallback records.
  const labels = domain.split(".");
  const isApex = labels.length <= 2;
  const name = isApex ? "@" : labels.slice(0, labels.length - 2).join(".");
  return { type: "CNAME", name, value: subdomain };
}

export async function listCloudflareDomains(
  accountId: string,
  projectName: string,
  token: string
): Promise<CloudflareDomainResult[]> {
  const res = await cfFetch(`/accounts/${accountId}/pages/projects/${encodeURIComponent(projectName)}/domains`, token);
  if (!res.ok) throw await parseCloudflareError(res);
  const data = await res.json();
  const domains = (Array.isArray(data.result) ? data.result : []) as CfDomainResponse[];
  return domains.map((d) => ({ name: d.name, verified: d.status === "active" }));
}

export async function addCloudflareDomain(
  accountId: string,
  projectName: string,
  domain: string,
  token: string
): Promise<CloudflareDomainResult> {
  const res = await cfFetch(`/accounts/${accountId}/pages/projects/${encodeURIComponent(projectName)}/domains`, token, {
    method: "POST",
    body: JSON.stringify({ name: domain }),
  });
  if (!res.ok) throw await parseCloudflareError(res);
  const data = await res.json();
  const result = data.result as CfDomainResponse;

  const project = await getCloudflarePagesProject(accountId, projectName, token);
  const subdomain = project.subdomain ?? `${projectName}.pages.dev`;

  return {
    name: result.name,
    verified: result.status === "active",
    dns: domainDnsInstruction(result.name, subdomain, result.validation_data),
  };
}

export async function removeCloudflareDomain(
  accountId: string,
  projectName: string,
  domain: string,
  token: string
): Promise<void> {
  const res = await cfFetch(
    `/accounts/${accountId}/pages/projects/${encodeURIComponent(projectName)}/domains/${encodeURIComponent(domain)}`,
    token,
    { method: "DELETE" }
  );
  if (res.status === 404) return;
  if (!res.ok) throw await parseCloudflareError(res);
}

/* ---------------------------------------------------------------------- */
/*  Environment variables                                                  */
/* ---------------------------------------------------------------------- */

/**
 * Cloudflare's "Update project" endpoint replaces `deployment_configs.
 * {production,preview}` wholesale rather than deep-merging per key, so every
 * write here first reads the project's current env vars and merges client
 * side before PATCHing the full object back.
 */
async function getCurrentEnvVars(
  accountId: string,
  projectName: string,
  token: string
): Promise<{ production: Record<string, { value: string }>; preview: Record<string, { value: string }> }> {
  const res = await cfFetch(`/accounts/${accountId}/pages/projects/${encodeURIComponent(projectName)}`, token);
  if (!res.ok) throw await parseCloudflareError(res);
  const data = await res.json();
  const project = data.result as CfProjectResponse;
  const clean = (map?: Record<string, { value?: string } | null> | null) => {
    const out: Record<string, { value: string }> = {};
    for (const [k, v] of Object.entries(map ?? {})) {
      if (v && typeof v.value === "string") out[k] = { value: v.value };
    }
    return out;
  };
  return {
    production: clean(project.deployment_configs?.production?.env_vars),
    preview: clean(project.deployment_configs?.preview?.env_vars),
  };
}

export async function listCloudflareEnv(
  accountId: string,
  projectName: string,
  token: string
): Promise<CloudflareEnvSummary[]> {
  const current = await getCurrentEnvVars(accountId, projectName, token);
  const out: CloudflareEnvSummary[] = [];
  for (const key of Object.keys(current.production)) out.push({ key, target: ["production"] });
  for (const key of Object.keys(current.preview)) out.push({ key, target: ["preview"] });
  return out;
}

export async function upsertCloudflareEnv(
  accountId: string,
  projectName: string,
  key: string,
  value: string,
  targets: ("production" | "preview")[],
  token: string
): Promise<void> {
  const current = await getCurrentEnvVars(accountId, projectName, token);
  if (targets.includes("production")) current.production[key] = { value };
  if (targets.includes("preview")) current.preview[key] = { value };

  const res = await cfFetch(`/accounts/${accountId}/pages/projects/${encodeURIComponent(projectName)}`, token, {
    method: "PATCH",
    body: JSON.stringify({
      deployment_configs: {
        production: { env_vars: toSecretPayload(current.production) },
        preview: { env_vars: toSecretPayload(current.preview) },
      },
    }),
  });
  if (!res.ok) throw await parseCloudflareError(res);
}

export async function deleteCloudflareEnv(
  accountId: string,
  projectName: string,
  key: string,
  token: string
): Promise<void> {
  const current = await getCurrentEnvVars(accountId, projectName, token);
  const productionPayload: Record<string, { value: string; type: string } | null> = toSecretPayload(current.production);
  const previewPayload: Record<string, { value: string; type: string } | null> = toSecretPayload(current.preview);
  // Per Cloudflare's docs: setting an env var's value to null deletes it.
  if (key in current.production) productionPayload[key] = null;
  if (key in current.preview) previewPayload[key] = null;
  if (!(key in current.production) && !(key in current.preview)) return; // already gone

  const res = await cfFetch(`/accounts/${accountId}/pages/projects/${encodeURIComponent(projectName)}`, token, {
    method: "PATCH",
    body: JSON.stringify({
      deployment_configs: {
        production: { env_vars: productionPayload },
        preview: { env_vars: previewPayload },
      },
    }),
  });
  if (!res.ok) throw await parseCloudflareError(res);
}

function toSecretPayload(vars: Record<string, { value: string }>): Record<string, { value: string; type: string }> {
  const out: Record<string, { value: string; type: string }> = {};
  for (const [k, v] of Object.entries(vars)) out[k] = { value: v.value, type: "secret_text" };
  return out;
}
