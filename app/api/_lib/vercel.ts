import type {
  AnalyticsApiResult,
  AnalyticsTimeseriesPoint,
  AnalyticsTopPath,
  VercelReadyState,
} from "@/types";

const VERCEL_API = "https://api.vercel.com";

export class VercelApiError extends Error {
  code: "invalid_token" | "vercel_error" | "not_found";
  constructor(message: string, code: VercelApiError["code"]) {
    super(message);
    this.code = code;
  }
}

interface CreateDeploymentParams {
  projectName: string;
  owner: string;
  repo: string;
  ref: string;
  vercelToken: string;
}

export interface VercelDomainInfo {
  name: string;
  verified: boolean;
  /** Present when the domain needs a DNS record before it's live. */
  verification: { type: string; domain: string; value: string; reason: string }[] | null;
}

export interface ProjectStatus {
  exists: boolean;
  linkedRepoFullName: string | null;
  latestDeploymentReadyState: VercelReadyState | null;
  /** Whether Vercel Web Analytics has been switched on for this project. */
  webAnalyticsEnabled: boolean;
}

interface VercelDeploymentResponse {
  id: string;
  name?: string;
  url: string;
  /** Domains assigned to this deployment once it's READY, e.g. ["tes-pwa.vercel.app"]. */
  alias?: string[];
  readyState: VercelReadyState;
  inspectorUrl?: string | null;
}

function inspectorUrlFor(d: VercelDeploymentResponse): string {
  return d.inspectorUrl ?? `https://vercel.com/deployments/${d.id}`;
}

/**
 * `data.url` from the Vercel API is the per-deployment URL (contains a
 * random hash, e.g. tes-7gnmqce2q-meledakciks-projects.vercel.app). Once a
 * deployment is READY, Vercel also assigns the project's stable alias(es)
 * in `data.alias`. Prefer the clean `{project}.vercel.app` alias so the
 * user gets a URL that stays the same across every future deploy.
 */
function primaryUrlFor(d: VercelDeploymentResponse): string {
  if (d.alias && d.alias.length > 0) {
    const exact = d.name ? d.alias.find((a) => a === `${d.name}.vercel.app`) : undefined;
    if (exact) return exact;
    return [...d.alias].sort((a, b) => a.length - b.length)[0];
  }
  return d.url;
}

async function parseVercelError(res: Response): Promise<VercelApiError> {
  if (res.status === 401 || res.status === 403) {
    return new VercelApiError("Vercel token tidak valid atau tidak punya izin.", "invalid_token");
  }
  if (res.status === 404) {
    return new VercelApiError("Deployment tidak ditemukan di Vercel.", "not_found");
  }
  let message = `Vercel API error (${res.status})`;
  try {
    const body = await res.json();
    message = body?.error?.message ?? message;
  } catch {
    /* body wasn't JSON — keep the generic message */
  }
  return new VercelApiError(message, "vercel_error");
}

/**
 * Confirms a Vercel token actually works and returns whose account it is —
 * used by the Settings page's "Test koneksi" button, not the deploy flow.
 */
export async function getVercelUser(vercelToken: string): Promise<{ username: string; email: string | null }> {
  const res = await fetch(`${VERCEL_API}/v2/user`, {
    headers: { Authorization: `Bearer ${vercelToken}` },
    cache: "no-store",
  });
  if (!res.ok) throw await parseVercelError(res);
  const data = await res.json();
  const u = data?.user ?? {};
  return { username: u.username ?? u.name ?? "unknown", email: u.email ?? null };
}

/**
 * Looks up a project by name in the caller's Vercel account so we can tell,
 * before creating a deployment, whether that name is already taken by a
 * project linked to a *different* GitHub repo (a real conflict) versus the
 * same repo (a normal redeploy) versus not existing at all (brand new).
 */
export async function getVercelProject(
  projectName: string,
  vercelToken: string
): Promise<ProjectStatus> {
  const res = await fetch(`${VERCEL_API}/v9/projects/${encodeURIComponent(projectName)}`, {
    headers: { Authorization: `Bearer ${vercelToken}` },
    cache: "no-store",
  });

  if (res.status === 404) {
    return { exists: false, linkedRepoFullName: null, latestDeploymentReadyState: null, webAnalyticsEnabled: false };
  }
  if (!res.ok) throw await parseVercelError(res);

  const data = await res.json();
  const link = data?.link;
  const linkedRepoFullName =
    link?.type === "github" && link.org && link.repo ? `${link.org}/${link.repo}` : null;
  const latestDeploymentReadyState: VercelReadyState | null =
    data?.latestDeployments?.[0]?.readyState ?? null;
  // `webAnalytics.enabledAt` is only present once someone has clicked "Enable"
  // on the project's Analytics tab — Vercel doesn't expose a public API to
  // flip this switch, so we can only detect it, not set it, from here.
  const webAnalyticsEnabled = Boolean(data?.webAnalytics?.enabledAt);

  return { exists: true, linkedRepoFullName, latestDeploymentReadyState, webAnalyticsEnabled };
}

/**
 * Creates a real Vercel deployment straight from a GitHub repo, using the
 * caller-supplied personal Vercel token. No tokens are ever persisted —
 * they're forwarded to Vercel for this single request only.
 */
export async function createVercelDeployment(
  params: CreateDeploymentParams
): Promise<{ deploymentId: string; url: string; inspectorUrl: string; readyState: VercelReadyState }> {
  const res = await fetch(`${VERCEL_API}/v13/deployments?skipAutoDetectionConfirmation=1`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.vercelToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: params.projectName,
      target: "production",
      gitSource: {
        type: "github",
        org: params.owner,
        repo: params.repo,
        ref: params.ref,
      },
    }),
  });

  if (!res.ok) throw await parseVercelError(res);

  const data = (await res.json()) as VercelDeploymentResponse;
  return {
    deploymentId: data.id,
    url: primaryUrlFor(data),
    inspectorUrl: inspectorUrlFor(data),
    readyState: data.readyState,
  };
}

/** Polls a deployment's current build status. */
export async function getVercelDeployment(
  deploymentId: string,
  vercelToken: string
): Promise<{ deploymentId: string; url: string; inspectorUrl: string; readyState: VercelReadyState; errorMessage: string | null }> {
  const res = await fetch(`${VERCEL_API}/v13/deployments/${deploymentId}`, {
    headers: { Authorization: `Bearer ${vercelToken}` },
    cache: "no-store",
  });

  if (!res.ok) throw await parseVercelError(res);

  const data = (await res.json()) as VercelDeploymentResponse & {
    errorMessage?: string | null;
  };

  return {
    deploymentId: data.id,
    url: primaryUrlFor(data),
    inspectorUrl: inspectorUrlFor(data),
    readyState: data.readyState,
    errorMessage: data.errorMessage ?? null,
  };
}

/* ---------------------------------------------------------------------- */
/*  Domains                                                                */
/* ---------------------------------------------------------------------- */

export async function listProjectDomains(
  projectName: string,
  vercelToken: string
): Promise<VercelDomainInfo[]> {
  const res = await fetch(
    `${VERCEL_API}/v9/projects/${encodeURIComponent(projectName)}/domains`,
    { headers: { Authorization: `Bearer ${vercelToken}` }, cache: "no-store" }
  );
  if (!res.ok) throw await parseVercelError(res);
  const data = await res.json();
  return (data.domains ?? []).map((d: { name: string; verified: boolean }) => ({
    name: d.name,
    verified: d.verified,
    verification: null,
  }));
}

export async function addProjectDomain(
  projectName: string,
  domain: string,
  vercelToken: string
): Promise<VercelDomainInfo> {
  const res = await fetch(
    `${VERCEL_API}/v10/projects/${encodeURIComponent(projectName)}/domains`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${vercelToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: domain }),
    }
  );
  if (!res.ok) throw await parseVercelError(res);
  const data = await res.json();
  return { name: data.name, verified: data.verified, verification: data.verification ?? null };
}

export async function removeProjectDomain(
  projectName: string,
  domain: string,
  vercelToken: string
): Promise<void> {
  const res = await fetch(
    `${VERCEL_API}/v9/projects/${encodeURIComponent(projectName)}/domains/${encodeURIComponent(domain)}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${vercelToken}` } }
  );
  if (!res.ok) throw await parseVercelError(res);
}

/* ---------------------------------------------------------------------- */
/*  Environment variables                                                  */
/* ---------------------------------------------------------------------- */

interface VercelEnvVar {
  id: string;
  key: string;
}

async function findProjectEnvId(
  projectName: string,
  key: string,
  vercelToken: string
): Promise<string | null> {
  const res = await fetch(`${VERCEL_API}/v9/projects/${encodeURIComponent(projectName)}/env`, {
    headers: { Authorization: `Bearer ${vercelToken}` },
    cache: "no-store",
  });
  if (!res.ok) throw await parseVercelError(res);
  const data = await res.json();
  const match = (data.envs as VercelEnvVar[] | undefined)?.find((e) => e.key === key);
  return match?.id ?? null;
}

/** Removes an environment variable from a real Vercel project, looked up by key. */
export async function deleteProjectEnv(
  projectName: string,
  key: string,
  vercelToken: string
): Promise<void> {
  const id = await findProjectEnvId(projectName, key, vercelToken);
  if (!id) return; // already gone — nothing to do
  const res = await fetch(
    `${VERCEL_API}/v9/projects/${encodeURIComponent(projectName)}/env/${id}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${vercelToken}` } }
  );
  if (!res.ok) throw await parseVercelError(res);
}

/**
 * Creates (or updates, if the key already exists) a Production+Preview
 * environment variable on a real Vercel project.
 */
export async function upsertProjectEnv(
  projectName: string,
  key: string,
  value: string,
  target: ("production" | "preview")[],
  vercelToken: string
): Promise<void> {
  const createRes = await fetch(
    `${VERCEL_API}/v10/projects/${encodeURIComponent(projectName)}/env`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${vercelToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ key, value, target, type: "encrypted" }),
    }
  );

  if (createRes.ok) return;

  // Key already exists on this project — look it up and PATCH the value instead.
  const existingId = await findProjectEnvId(projectName, key, vercelToken);
  if (!existingId) throw await parseVercelError(createRes);

  const patchRes = await fetch(
    `${VERCEL_API}/v9/projects/${encodeURIComponent(projectName)}/env/${existingId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${vercelToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ value, target }),
    }
  );
  if (!patchRes.ok) throw await parseVercelError(patchRes);
}

/* ---------------------------------------------------------------------- */
/*  Observability / analytics                                              */
/* ---------------------------------------------------------------------- */

const ANALYTICS_DISABLED_MESSAGE =
  "Web Analytics belum diaktifkan untuk project ini. Aktifkan dulu di Vercel Dashboard → Project → Analytics. Wajib pasang analytics di kode project nya.";

/** Loose shape of a single timeseries bucket — the exact field names vary between the two analytics endpoints we try. */
interface RawTimeseriesPoint {
  timestamp?: string | number;
  time?: string | number;
  date?: string | number;
  total?: number;
  requests?: number;
  value?: number;
  count?: number;
}

interface RawTopPath {
  path?: string;
  pathname?: string;
  route?: string;
  key?: string;
  total?: number;
  count?: number;
  value?: number;
}

function toIsoTimestamp(value: string | number | undefined): string {
  if (value === undefined) return new Date().toISOString();
  if (typeof value === "number") {
    // Vercel timestamps are usually epoch ms; treat anything under 10^12 as seconds.
    const ms = value < 1e12 ? value * 1000 : value;
    return new Date(ms).toISOString();
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function normalizeTimeseries(raw: unknown): AnalyticsTimeseriesPoint[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((point: RawTimeseriesPoint) => ({
    timestamp: toIsoTimestamp(point.timestamp ?? point.time ?? point.date),
    requests: Number(point.total ?? point.requests ?? point.value ?? point.count ?? 0) || 0,
  }));
}

function normalizeTopPaths(raw: unknown): AnalyticsTopPath[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item: RawTopPath) => ({
      path: item.path ?? item.pathname ?? item.route ?? item.key ?? "/",
      count: Number(item.total ?? item.count ?? item.value ?? 0) || 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

/**
 * Tries the primary Web Analytics endpoint (`/v1/projects/{project}/analytics`),
 * then falls back to the older timeseries endpoint (`/v6/analytics/timeseries`)
 * when the first isn't available for this account/project. If neither returns
 * usable data — most commonly because the project simply doesn't have Web
 * Analytics enabled — we return `{ enabled: false }` instead of throwing, so
 * the UI can show a friendly empty state rather than an error.
 */
export async function getProjectAnalytics(
  projectName: string,
  vercelToken: string
): Promise<AnalyticsApiResult> {
  // Resolve the project first — this also validates the token/project the
  // same way every other route in this file does, so a bad token or a
  // missing project surfaces as the usual VercelApiError.
  const projectRes = await fetch(
    `${VERCEL_API}/v9/projects/${encodeURIComponent(projectName)}`,
    { headers: { Authorization: `Bearer ${vercelToken}` }, cache: "no-store" }
  );
  if (!projectRes.ok) throw await parseVercelError(projectRes);
  const projectData = await projectRes.json();
  const projectId: string | undefined = projectData?.id;

  const to = Date.now();
  const from = to - 7 * 24 * 60 * 60 * 1000; // 7 days ago

  const authHeaders = { Authorization: `Bearer ${vercelToken}` };

  // Attempt 1: newer per-project analytics endpoint.
  try {
    const res = await fetch(
      `${VERCEL_API}/v1/projects/${encodeURIComponent(projectName)}/analytics?from=${from}&to=${to}&tier=pro`,
      { headers: authHeaders, cache: "no-store" }
    );

    if (res.ok) {
      const data = await res.json();
      const result = extractAnalyticsResult(data);
      if (result) return result;
    } else if (res.status !== 400 && res.status !== 403 && res.status !== 404) {
      // Something other than "not available" — surface it as a real error.
      throw await parseVercelError(res);
    }
  } catch (e) {
    if (e instanceof VercelApiError) throw e;
    // Network/parse hiccup on the primary endpoint — fall through to the fallback.
  }

  // Attempt 2: legacy timeseries endpoint, keyed by projectId instead of name.
  if (projectId) {
    try {
      const res = await fetch(
        `${VERCEL_API}/v6/analytics/timeseries?projectId=${encodeURIComponent(projectId)}&from=${from}&to=${to}`,
        { headers: authHeaders, cache: "no-store" }
      );

      if (res.ok) {
        const data = await res.json();
        const result = extractAnalyticsResult(data);
        if (result) return result;
      } else if (res.status !== 400 && res.status !== 403 && res.status !== 404) {
        throw await parseVercelError(res);
      }
    } catch (e) {
      if (e instanceof VercelApiError) throw e;
    }
  }

  // Neither endpoint returned usable data — treat as "analytics not enabled".
  return { enabled: false, message: ANALYTICS_DISABLED_MESSAGE };
}

/** Normalizes either analytics endpoint's response shape into our own contract, or returns null if the payload looks empty/unrecognized. */
function extractAnalyticsResult(data: unknown): AnalyticsApiResult | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;

  const timeseriesRaw = d.timeseries ?? d.series ?? d.data ?? null;
  const timeseries = normalizeTimeseries(timeseriesRaw);

  const topPathsRaw = d.topPaths ?? d.pages ?? d.paths ?? d.routes ?? null;
  const topPaths = normalizeTopPaths(topPathsRaw);

  const totalRequests =
    Number(d.totalRequests ?? d.total ?? d.requests) ||
    timeseries.reduce((sum, p) => sum + p.requests, 0);

  if (totalRequests === 0 && timeseries.length === 0 && topPaths.length === 0) {
    // No data at all usually means analytics isn't enabled rather than a
    // genuinely empty week — let the caller fall back / report disabled.
    return null;
  }

  const errorsRaw = (d.errors ?? {}) as Record<string, unknown>;
  const bandwidth = Number(d.bandwidth ?? d.bytes ?? 0) || 0;

  return {
    enabled: true,
    totalRequests,
    bandwidth,
    topPaths,
    errors: {
      "4xx": Number(errorsRaw["4xx"] ?? errorsRaw.clientErrors ?? 0) || 0,
      "5xx": Number(errorsRaw["5xx"] ?? errorsRaw.serverErrors ?? 0) || 0,
    },
    timeseries,
  };
}
