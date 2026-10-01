import type { DnsRecordInstruction, VercelReadyState } from "@/types";

const RENDER_API = "https://api.render.com/v1";

/** Render's load balancer IP for apex/root custom domains (see render.com/docs/configure-other-dns). */
const RENDER_APEX_IP = "216.24.57.1";

export class RenderApiError extends Error {
  code: "invalid_token" | "render_error" | "not_found";
  constructor(message: string, code: RenderApiError["code"]) {
    super(message);
    this.code = code;
  }
}

/**
 * Thin wrapper around Render's REST API (api.render.com/v1). Unlike
 * Railway's single GraphQL endpoint, Render is plain REST — every call here
 * hits its own path, but errors are normalized the same way so callers
 * don't need to care which transport is underneath.
 */
async function renderFetch<T>(
  path: string,
  renderToken: string,
  init?: { method?: string; body?: unknown }
): Promise<T> {
  const res = await fetch(`${RENDER_API}${path}`, {
    method: init?.method ?? "GET",
    headers: {
      Authorization: `Bearer ${renderToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });

  if (res.status === 401 || res.status === 403) {
    throw new RenderApiError("Render API Key tidak valid atau tidak punya izin.", "invalid_token");
  }
  if (res.status === 404) {
    throw new RenderApiError("Resource tidak ditemukan di Render.", "not_found");
  }

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    /* 204 No Content, or body wasn't JSON */
  }

  if (!res.ok) {
    const message =
      body && typeof body === "object" && "message" in body
        ? String((body as { message?: unknown }).message)
        : `Render API error (${res.status})`;
    throw new RenderApiError(message, "render_error");
  }

  return body as T;
}

/**
 * Maps Render's deploy `status` enum onto the same ready-state shape used
 * across the app for Vercel/Cloudflare/Railway, so the deploy modal,
 * history table, and status polling can treat every platform uniformly.
 */
function toReadyState(status: string): VercelReadyState {
  switch (status) {
    case "created":
    case "queued":
      return "QUEUED";
    case "build_in_progress":
    case "update_in_progress":
    case "pre_deploy_in_progress":
      return "BUILDING";
    case "live":
      return "READY";
    case "build_failed":
    case "update_failed":
    case "pre_deploy_failed":
      return "ERROR";
    case "canceled":
    case "deactivated":
      return "CANCELED";
    default:
      return "QUEUED";
  }
}

/** Short slug Render itself uses in dashboard URLs, per service type. */
function dashboardType(serviceType: string): string {
  switch (serviceType) {
    case "static_site":
      return "static";
    case "background_worker":
      return "worker";
    case "cron_job":
      return "cron";
    default:
      return "web";
  }
}

function inspectorUrlFor(serviceId: string, serviceType: string, deployId?: string): string {
  const base = `https://dashboard.render.com/${dashboardType(serviceType)}/${serviceId}`;
  return deployId ? `${base}/deploys/${deployId}` : base;
}

/** Confirms a Render API key works and returns whose account it is — used by Settings' "Test koneksi" button. */
export async function getRenderUser(
  renderToken: string
): Promise<{ id: string; name: string | null; email: string | null }> {
  const [owners, user] = await Promise.all([
    renderFetch<{ owner: { id: string; name?: string | null; email?: string | null } }[]>(
      "/owners?limit=1",
      renderToken
    ),
    renderFetch<{ name?: string | null; email?: string | null }>("/users", renderToken),
  ]);
  const owner = owners[0]?.owner ?? null;
  if (!owner) {
    throw new RenderApiError(
      "Akun Render ini tidak punya workspace yang bisa diakses token ini.",
      "render_error"
    );
  }
  return { id: owner.id, name: user.name ?? owner.name ?? null, email: user.email ?? owner.email ?? null };
}

/**
 * Render's `POST /services` requires an `ownerId` — the workspace the
 * service is created under. Every account has at least one (personal)
 * workspace, so we just grab the first one visible to this token, mirroring
 * Railway's `getDefaultWorkspaceId`.
 */
async function getDefaultOwnerId(renderToken: string): Promise<string> {
  const owners = await renderFetch<{ owner: { id: string } }[]>("/owners?limit=1", renderToken);
  const owner = owners[0]?.owner;
  if (!owner) {
    throw new RenderApiError(
      "Akun Render ini belum punya workspace. Selesaikan setup akun dulu di dashboard.render.com.",
      "render_error"
    );
  }
  return owner.id;
}

interface RenderServiceRaw {
  id: string;
  name: string;
  type: string;
  repo?: string | null;
  slug?: string;
  serviceDetails?: { url?: string | null };
}

/**
 * Lists every service visible to this token, following Render's
 * cursor-based pagination to the end. Render's list endpoints wrap each
 * item as `{ cursor, service }` rather than returning bare objects.
 */
async function listRenderServices(renderToken: string): Promise<RenderServiceRaw[]> {
  const all: RenderServiceRaw[] = [];
  let cursor: string | null = null;

  for (;;) {
    const query: string = cursor ? `?limit=100&cursor=${encodeURIComponent(cursor)}` : "?limit=100";
    const page: { cursor: string; service: RenderServiceRaw }[] = await renderFetch(
      `/services${query}`,
      renderToken
    );
    if (page.length === 0) break;
    all.push(...page.map((p: { cursor: string; service: RenderServiceRaw }) => p.service));
    if (page.length < 100) break; // last page
    cursor = page[page.length - 1].cursor;
    if (!cursor) break; // safety net against a malformed response looping forever
  }

  return all;
}

/** Normalizes a repo URL for comparison (strip protocol, trailing slash, `.git`, case). */
function normalizeRepoUrl(url: string): string {
  return url
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\.git$/, "")
    .replace(/\/+$/, "");
}

async function findServiceByName(name: string, renderToken: string): Promise<RenderServiceRaw | null> {
  const services = await listRenderServices(renderToken);
  return services.find((s) => s.name === name) ?? null;
}

/**
 * Finds an existing service already wired to this exact GitHub repo,
 * regardless of what name it was created under — prevents deploying the
 * same repo again under a different `projectName` from spinning up a
 * brand-new Render service every time.
 */
async function findServiceByRepo(
  owner: string,
  repo: string,
  renderToken: string
): Promise<RenderServiceRaw | null> {
  const target = normalizeRepoUrl(`github.com/${owner}/${repo}`);
  const services = await listRenderServices(renderToken);
  return services.find((s) => s.repo && normalizeRepoUrl(s.repo).endsWith(target)) ?? null;
}

async function getService(serviceId: string, renderToken: string): Promise<RenderServiceRaw> {
  return renderFetch<RenderServiceRaw>(`/services/${encodeURIComponent(serviceId)}`, renderToken);
}

interface RenderDeployRaw {
  id: string;
  status: string;
}

async function getLatestDeploy(serviceId: string, renderToken: string): Promise<RenderDeployRaw | null> {
  const page = await renderFetch<{ cursor: string; deploy: RenderDeployRaw }[]>(
    `/services/${encodeURIComponent(serviceId)}/deploys?limit=1`,
    renderToken
  );
  return page[0]?.deploy ?? null;
}

export interface RenderProjectStatus {
  exists: boolean;
  linkedRepoFullName: string | null;
  latestDeploymentReadyState: VercelReadyState | null;
  latestDeploymentId: string | null;
  serviceId: string | null;
  domain: string | null;
}

/**
 * Looks up a service by name so we can tell, before deploying, whether it
 * already exists (and which service/domain it's wired to) — mirrors
 * `getRailwayProject` for the Railway flow.
 */
export async function getRenderProject(
  projectName: string,
  renderToken: string
): Promise<RenderProjectStatus> {
  const match = await findServiceByName(projectName, renderToken);
  if (!match) {
    return {
      exists: false,
      linkedRepoFullName: null,
      latestDeploymentReadyState: null,
      latestDeploymentId: null,
      serviceId: null,
      domain: null,
    };
  }

  const [service, latest] = await Promise.all([
    getService(match.id, renderToken),
    getLatestDeploy(match.id, renderToken).catch(() => null),
  ]);

  return {
    exists: true,
    linkedRepoFullName: null,
    latestDeploymentReadyState: latest ? toReadyState(latest.status) : null,
    latestDeploymentId: latest?.id ?? null,
    serviceId: service.id,
    domain: service.serviceDetails?.url ?? null,
  };
}

interface CreateDeploymentParams {
  projectName: string;
  owner: string;
  repo: string;
  ref: string;
  renderToken: string;
  startCommand?: string;
  env?: Record<string, string>;
}

export interface RenderDeploymentResult {
  deploymentId: string;
  /**
   * The service's *actual* name on Render — not necessarily the same as
   * the `projectName` the caller passed in, when an existing service (same
   * repo, different name) was reused instead. Callers must save this to
   * history, not the input `projectName` — same reasoning as Railway's
   * `RailwayDeploymentResult.name`.
   */
  name: string;
  serviceId: string;
  url: string;
  inspectorUrl: string;
  readyState: VercelReadyState;
}

/**
 * Creates (or reuses) a Render web service wired to a GitHub repo, applies
 * optional env vars / start command, and triggers a fresh deployment. No
 * tokens are ever persisted server-side — they're forwarded to Render for
 * this request only.
 *
 * Render (unlike Railway's Railpack) has no generic auto-detect builder —
 * `runtime` is required up front. Depup targets Node.js repos (same
 * baseline the Vercel flow assumes via `hasPackageJson`), so it defaults to
 * the Node runtime with `npm install` / `npm start`, overridable via the
 * optional start command field shared with the Railway step.
 */
export async function createRenderDeployment(
  params: CreateDeploymentParams
): Promise<RenderDeploymentResult> {
  const { projectName, owner, repo, ref, renderToken, startCommand, env } = params;

  const existing =
    (await findServiceByName(projectName, renderToken)) ??
    (await findServiceByRepo(owner, repo, renderToken));

  const envVars = env
    ? Object.entries(env).map(([key, value]) => ({ key, value }))
    : undefined;

  if (!existing) {
    const ownerId = await getDefaultOwnerId(renderToken);
    const created = await renderFetch<{ service: RenderServiceRaw; deployId: string }>(
      "/services",
      renderToken,
      {
        method: "POST",
        body: {
          type: "web_service",
          name: projectName,
          ownerId,
          repo: `https://github.com/${owner}/${repo}`,
          branch: ref,
          autoDeploy: "yes",
          envVars,
          serviceDetails: {
            runtime: "node",
            plan: "free",
            region: "oregon",
            envSpecificDetails: {
              buildCommand: "npm install",
              startCommand: startCommand?.trim() || "npm start",
            },
          },
        },
      }
    );

    return {
      deploymentId: created.deployId,
      name: created.service.name,
      serviceId: created.service.id,
      url: created.service.serviceDetails?.url ?? "",
      inspectorUrl: inspectorUrlFor(created.service.id, created.service.type, created.deployId),
      readyState: "QUEUED",
    };
  }

  // Existing service being redeployed — push (possibly new/updated) env
  // vars and start command first, then trigger a fresh deploy.
  if (envVars && envVars.length > 0) {
    await Promise.all(
      envVars.map((v) =>
        renderFetch(`/services/${encodeURIComponent(existing.id)}/env-vars/${encodeURIComponent(v.key)}`, renderToken, {
          method: "PUT",
          body: { value: v.value },
        }).catch(() => {
          /* best-effort — one bad key shouldn't block the rest or the deploy */
        })
      )
    );
  }

  if (startCommand && startCommand.trim()) {
    await renderFetch(`/services/${encodeURIComponent(existing.id)}`, renderToken, {
      method: "PATCH",
      body: { serviceDetails: { envSpecificDetails: { startCommand: startCommand.trim() } } },
    }).catch(() => {
      /* best-effort — deploy can still proceed with whatever start command is already set */
    });
  }

  const deploy = await renderFetch<RenderDeployRaw>(`/services/${encodeURIComponent(existing.id)}/deploys`, renderToken, {
    method: "POST",
    body: {},
  });

  const service = await getService(existing.id, renderToken);

  return {
    deploymentId: deploy.id,
    name: service.name,
    serviceId: service.id,
    url: service.serviceDetails?.url ?? "",
    inspectorUrl: inspectorUrlFor(service.id, service.type, deploy.id),
    readyState: toReadyState(deploy.status),
  };
}

/** Polls a deployment's current build/deploy status. */
export async function getRenderDeployment(
  serviceId: string,
  deploymentId: string,
  renderToken: string
): Promise<{
  deploymentId: string;
  url: string;
  inspectorUrl: string;
  readyState: VercelReadyState;
  errorMessage: string | null;
}> {
  const [deploy, service] = await Promise.all([
    renderFetch<RenderDeployRaw>(`/services/${encodeURIComponent(serviceId)}/deploys/${encodeURIComponent(deploymentId)}`, renderToken),
    getService(serviceId, renderToken).catch(() => null),
  ]);

  const readyState = toReadyState(deploy.status);

  return {
    deploymentId: deploy.id,
    url: service?.serviceDetails?.url ?? "",
    inspectorUrl: inspectorUrlFor(serviceId, service?.type ?? "web_service", deploy.id),
    readyState,
    errorMessage:
      readyState === "ERROR"
        ? "Build/deploy gagal di Render. Cek log di dashboard Render untuk detail."
        : null,
  };
}

/**
 * Re-triggers a deployment for an existing service (no new code pulled
 * beyond whatever the latest commit on the linked branch already is) — the
 * Render equivalent of Railway's `redeployRailwayProject`, used right after
 * an env var changes.
 */
export async function redeployRenderProject(
  projectName: string,
  renderToken: string
): Promise<{ deploymentId: string; serviceId: string; url: string; inspectorUrl: string; readyState: VercelReadyState }> {
  const status = await getRenderProject(projectName, renderToken);
  if (!status.exists || !status.serviceId) {
    throw new RenderApiError(`Service "${projectName}" tidak ditemukan di Render.`, "not_found");
  }

  const [deploy, service] = await Promise.all([
    renderFetch<RenderDeployRaw>(`/services/${encodeURIComponent(status.serviceId)}/deploys`, renderToken, {
      method: "POST",
      body: {},
    }),
    getService(status.serviceId, renderToken),
  ]);

  return {
    deploymentId: deploy.id,
    serviceId: status.serviceId,
    url: service.serviceDetails?.url ?? "",
    inspectorUrl: inspectorUrlFor(status.serviceId, service.type, deploy.id),
    readyState: toReadyState(deploy.status),
  };
}

/* ---------------------------------------------------------------------- */
/*  Project (service) listing & deletion                                   */
/* ---------------------------------------------------------------------- */

export interface RenderProjectImportSummary {
  id: string;
  name: string;
  domain: string | null;
  latestDeploymentReadyState: VercelReadyState | null;
}

/** Lists every service on the caller's real Render account, with enough detail to import — used by "Import Project", mirrors `listRailwayProjectSummaries`. */
export async function listRenderProjectSummaries(
  renderToken: string
): Promise<RenderProjectImportSummary[]> {
  const services = await listRenderServices(renderToken);
  return Promise.all(
    services.map(async (s): Promise<RenderProjectImportSummary> => {
      try {
        const latest = await getLatestDeploy(s.id, renderToken);
        return {
          id: s.id,
          name: s.name,
          domain: s.serviceDetails?.url ?? null,
          latestDeploymentReadyState: latest ? toReadyState(latest.status) : null,
        };
      } catch {
        // A service that fails to fetch full detail shouldn't block
        // importing the rest of the list — just show it with what little
        // we know, same as Railway's fallback.
        return { id: s.id, name: s.name, domain: s.serviceDetails?.url ?? null, latestDeploymentReadyState: null };
      }
    })
  );
}

/** Permanently deletes a service on the real Render account — used by "Hapus di kedua sisi". */
export async function deleteRenderProject(projectName: string, renderToken: string): Promise<void> {
  const match = await findServiceByName(projectName, renderToken);
  if (!match) return; // already gone — nothing to do
  await renderFetch(`/services/${encodeURIComponent(match.id)}`, renderToken, { method: "DELETE" });
}

/* ---------------------------------------------------------------------- */
/*  Custom domains                                                         */
/* ---------------------------------------------------------------------- */

interface RenderCustomDomainRaw {
  id: string;
  name: string;
  domainType: "apex" | "subdomain";
  verificationStatus: "verified" | "unverified";
}

/** Best-effort split of a domain into its registrar label + DNS instruction, same simplification used for Vercel/Cloudflare's fallback records. */
function domainDnsInstruction(raw: RenderCustomDomainRaw, onrenderHost: string): DnsRecordInstruction {
  if (raw.domainType === "apex") {
    return { type: "A", name: "@", value: RENDER_APEX_IP };
  }
  const labels = raw.name.split(".");
  const name = labels.length > 2 ? labels.slice(0, labels.length - 2).join(".") : raw.name;
  return { type: "CNAME", name, value: onrenderHost };
}

async function requireProjectStatus(
  projectName: string,
  renderToken: string
): Promise<RenderProjectStatus & { serviceId: string }> {
  const status = await getRenderProject(projectName, renderToken);
  if (!status.exists || !status.serviceId) {
    throw new RenderApiError(`Service "${projectName}" tidak ditemukan di Render.`, "not_found");
  }
  return { ...status, serviceId: status.serviceId };
}

/** The bare `{name}.onrender.com` host to CNAME subdomains at, derived from the service's own URL. */
function onrenderHostFrom(status: RenderProjectStatus): string {
  if (!status.domain) return "";
  try {
    return new URL(status.domain).hostname;
  } catch {
    return status.domain;
  }
}

/** Lists every custom domain attached to a Render service. */
export async function listRenderCustomDomains(
  projectName: string,
  renderToken: string
): Promise<{ id: string; domain: string; verified: boolean; dns: DnsRecordInstruction }[]> {
  const status = await requireProjectStatus(projectName, renderToken);
  const host = onrenderHostFrom(status);
  const page = await renderFetch<{ cursor: string; customDomain: RenderCustomDomainRaw }[]>(
    `/services/${encodeURIComponent(status.serviceId)}/custom-domains?limit=100`,
    renderToken
  );
  return page.map(({ customDomain: d }) => ({
    id: d.id,
    domain: d.name,
    verified: d.verificationStatus === "verified",
    dns: domainDnsInstruction(d, host),
  }));
}

/** Attaches a custom domain to a Render service, returning the DNS record to configure. */
export async function addRenderCustomDomain(
  projectName: string,
  domain: string,
  renderToken: string
): Promise<{ id: string; domain: string; verified: boolean; dns: DnsRecordInstruction }> {
  const status = await requireProjectStatus(projectName, renderToken);
  const host = onrenderHostFrom(status);
  const res = await renderFetch<RenderCustomDomainRaw | RenderCustomDomainRaw[]>(
    `/services/${encodeURIComponent(status.serviceId)}/custom-domains`,
    renderToken,
    { method: "POST", body: { name: domain } }
  );
  const created = Array.isArray(res) ? res[0] : res;
  if (!created) {
    throw new RenderApiError("Render tidak mengembalikan data domain setelah ditambahkan.", "render_error");
  }
  return {
    id: created.id,
    domain: created.name,
    verified: created.verificationStatus === "verified",
    dns: domainDnsInstruction(created, host),
  };
}

/** Removes a custom domain from a Render service, looked up by its domain name. */
export async function removeRenderCustomDomain(
  projectName: string,
  domain: string,
  renderToken: string
): Promise<void> {
  const status = await requireProjectStatus(projectName, renderToken);
  await renderFetch(
    `/services/${encodeURIComponent(status.serviceId)}/custom-domains/${encodeURIComponent(domain)}`,
    renderToken,
    { method: "DELETE" }
  ).catch((e) => {
    if (e instanceof RenderApiError && e.code === "not_found") return; // already gone
    throw e;
  });
}

/* ---------------------------------------------------------------------- */
/*  Environment variables                                                  */
/* ---------------------------------------------------------------------- */

/** Lists every variable key currently set on a real Render service. */
export async function listRenderEnv(projectName: string, renderToken: string): Promise<string[]> {
  const status = await requireProjectStatus(projectName, renderToken);
  const page = await renderFetch<{ cursor: string; envVar: { key: string } }[]>(
    `/services/${encodeURIComponent(status.serviceId)}/env-vars?limit=100`,
    renderToken
  );
  return page.map((p) => p.envVar.key);
}

/** Creates (or updates) a single environment variable on a real Render service. */
export async function upsertRenderEnv(
  projectName: string,
  key: string,
  value: string,
  renderToken: string
): Promise<void> {
  const status = await requireProjectStatus(projectName, renderToken);
  await renderFetch(`/services/${encodeURIComponent(status.serviceId)}/env-vars/${encodeURIComponent(key)}`, renderToken, {
    method: "PUT",
    body: { value },
  });
}

/** Removes an environment variable from a real Render service, looked up by key. */
export async function deleteRenderEnv(projectName: string, key: string, renderToken: string): Promise<void> {
  const status = await requireProjectStatus(projectName, renderToken);
  await renderFetch(`/services/${encodeURIComponent(status.serviceId)}/env-vars/${encodeURIComponent(key)}`, renderToken, {
    method: "DELETE",
  });
}
