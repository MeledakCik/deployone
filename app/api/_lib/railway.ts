import type { VercelReadyState } from "@/types";

const RAILWAY_API = "https://backboard.railway.com/graphql/v2";

export class RailwayApiError extends Error {
  code: "invalid_token" | "railway_error" | "not_found";
  constructor(message: string, code: RailwayApiError["code"]) {
    super(message);
    this.code = code;
  }
}

/**
 * Every Railway operation — query or mutation — goes through this single
 * GraphQL endpoint. Unlike a REST API, a bad request can come back as
 * HTTP 200 with an `errors` array, so both the transport status *and* the
 * body's `errors` field have to be checked.
 */
async function railwayGraphQL<T>(
  query: string,
  variables: Record<string, unknown>,
  railwayToken: string
): Promise<T> {
  const res = await fetch(RAILWAY_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${railwayToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });

  if (res.status === 401 || res.status === 403) {
    throw new RailwayApiError("Railway token tidak valid atau tidak punya izin.", "invalid_token");
  }

  // Railway's GraphQL endpoint doesn't always return 200 with an `errors`
  // array on failure — validation errors (e.g. a bad input field) can come
  // back as a non-2xx status too. Try to read the actual message out of the
  // body either way instead of throwing a blind "Railway API error (400)".
  let body: { data?: unknown; errors?: { message?: string }[] } | null = null;
  try {
    body = await res.json();
  } catch {
    /* body wasn't JSON */
  }

  if (!res.ok) {
    const message = body?.errors?.[0]?.message;
    throw new RailwayApiError(
      message ? message : `Railway API error (${res.status})`,
      "railway_error"
    );
  }

  if (Array.isArray(body?.errors) && body.errors.length > 0) {
    const message: string = body.errors[0]?.message ?? "Railway API error";
    if (/not authorized|unauthorized/i.test(message)) {
      throw new RailwayApiError("Railway token tidak valid atau tidak punya izin.", "invalid_token");
    }
    if (/not found/i.test(message)) {
      throw new RailwayApiError(message, "not_found");
    }
    throw new RailwayApiError(message, "railway_error");
  }

  return body?.data as T;
}

/**
 * Maps Railway's `DeploymentStatus` enum onto the same ready-state shape
 * already used across the app for Vercel/Cloudflare, so the deploy modal,
 * history table, and status polling can treat every platform uniformly.
 */
function toReadyState(status: string): VercelReadyState {
  switch (status) {
    case "INITIALIZING":
    case "QUEUED":
    case "WAITING":
    case "NEEDS_APPROVAL":
      return "QUEUED";
    case "BUILDING":
    case "DEPLOYING":
      return "BUILDING";
    case "SUCCESS":
    case "SLEEPING":
      return "READY";
    case "FAILED":
    case "CRASHED":
      return "ERROR";
    case "REMOVED":
    case "REMOVING":
    case "SKIPPED":
      return "CANCELED";
    default:
      return "QUEUED";
  }
}

function inspectorUrlFor(projectId: string, environmentId: string, serviceId: string): string {
  return `https://railway.com/project/${projectId}?environmentId=${environmentId}&serviceId=${serviceId}`;
}

/** Confirms a Railway token works and returns whose account it is — used by Settings' "Test koneksi" button. */
export async function getRailwayUser(
  railwayToken: string
): Promise<{ id: string; name: string | null; email: string | null }> {
  const data = await railwayGraphQL<{ me: { id: string; name: string | null; email: string | null } }>(
    `query { me { id name email } }`,
    {},
    railwayToken
  );
  return data.me;
}

/**
 * Railway's `projectCreate` mutation requires a `workspaceId` — creating a
 * project without one fails with "You must specify a workspaceId to create
 * a project". Every account has at least a personal workspace, so we just
 * grab the first one available to this token and use it as the default
 * target when deploying.
 */
async function getDefaultWorkspaceId(railwayToken: string): Promise<string> {
  const data = await railwayGraphQL<{
    me: { workspaces: { id: string; name: string }[] };
  }>(`query { me { workspaces { id name } } }`, {}, railwayToken);
  const workspace = data.me.workspaces[0];
  if (!workspace) {
    throw new RailwayApiError(
      "Akun Railway ini belum punya workspace. Buat workspace dulu di railway.com sebelum deploy.",
      "railway_error"
    );
  }
  return workspace.id;
}

interface RailwayProjectSummary {
  id: string;
  name: string;
}

/**
 * Fetches every project visible to this token, following Railway's cursor
 * pagination to the end instead of trusting whatever the default page size
 * happens to be.
 *
 * Without this, an account with more than one page of projects (easy to
 * reach after repeated test deploys, since every failed/renamed deploy used
 * to spin up a new Railway project before the reuse-by-repo fix) would
 * silently truncate the list. A project sitting past the first page would
 * come back as "not found" from `findProjectByName`/`findProjectByRepo` even
 * though it's alive and running on Railway — which is exactly what made
 * `getRailwayProject` report `exists: false` and made `syncProjectStatus`
 * (in deploy-context.tsx) wrongly treat a perfectly live project as deleted
 * and drop it from the local history list.
 */
async function listProjects(railwayToken: string): Promise<RailwayProjectSummary[]> {
  const all: RailwayProjectSummary[] = [];
  let after: string | null = null;

  for (;;) {
    const data: {
      projects: {
        edges: { node: RailwayProjectSummary }[];
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
      };
    } = await railwayGraphQL(
      `query projects($after: String) {
        projects(first: 100, after: $after) {
          edges { node { id name } }
          pageInfo { hasNextPage endCursor }
        }
      }`,
      { after },
      railwayToken
    );
    all.push(...data.projects.edges.map((e) => e.node));
    if (!data.projects.pageInfo.hasNextPage) break;
    after = data.projects.pageInfo.endCursor;
    if (!after) break; // safety net against a malformed response looping forever
  }

  return all;
}

interface RailwayEnvironmentNode {
  id: string;
  name: string;
}

interface RailwayServiceSummary {
  id: string;
  name: string;
  /** Derived from serviceInstances[].source.repo (see getProjectDetail) — a
   *  service can have a different source per environment, but for our
   *  single-environment usage the first instance's repo is what matters. */
  repo: string | null;
}

interface RailwayProjectDetail {
  id: string;
  name: string;
  baseEnvironmentId: string | null;
  services: { edges: { node: RailwayServiceSummary }[] };
  environments: { edges: { node: RailwayEnvironmentNode }[] };
}

async function getProjectDetail(projectId: string, railwayToken: string): Promise<RailwayProjectDetail> {
  const data = await railwayGraphQL<{
    project: {
      id: string;
      name: string;
      baseEnvironmentId: string | null;
      services: {
        edges: {
          node: {
            id: string;
            name: string;
            serviceInstances: { edges: { node: { source: { repo: string | null } | null } }[] };
          };
        }[];
      };
      environments: { edges: { node: RailwayEnvironmentNode }[] };
    };
  }>(
    `query project($id: String!) {
      project(id: $id) {
        id
        name
        baseEnvironmentId
        services {
          edges {
            node {
              id
              name
              serviceInstances { edges { node { source { repo } } } }
            }
          }
        }
        environments { edges { node { id name } } }
      }
    }`,
    { id: projectId },
    railwayToken
  );
  const p = data.project;
  return {
    id: p.id,
    name: p.name,
    baseEnvironmentId: p.baseEnvironmentId,
    services: {
      edges: p.services.edges.map((e) => ({
        node: {
          id: e.node.id,
          name: e.node.name,
          repo: e.node.serviceInstances.edges[0]?.node.source?.repo ?? null,
        },
      })),
    },
    environments: p.environments,
  };
}

/** Finds an existing project by exact name in the caller's Railway account, or null if none exists yet. */
async function findProjectByName(
  projectName: string,
  railwayToken: string
): Promise<RailwayProjectDetail | null> {
  const projects = await listProjects(railwayToken);
  const match = projects.find((p) => p.name === projectName);
  if (!match) return null;
  return getProjectDetail(match.id, railwayToken);
}

/**
 * Finds an existing project whose service is already wired to this exact
 * GitHub repo, regardless of what project name it was created under.
 * Prevents deploying the same repo again under a different `projectName`
 * (e.g. during testing) from spinning up a brand-new Railway project every
 * time — which quickly burns through the free plan's resource limit.
 */
async function findProjectByRepo(
  owner: string,
  repo: string,
  railwayToken: string
): Promise<RailwayProjectDetail | null> {
  const target = `${owner}/${repo}`.toLowerCase();
  const projects = await listProjects(railwayToken);
  for (const p of projects) {
    let detail: RailwayProjectDetail;
    try {
      detail = await getProjectDetail(p.id, railwayToken);
    } catch {
      // A project can still show up in the list right after being deleted,
      // or fail to fetch for other reasons — skip it rather than aborting
      // the whole deploy over an unrelated project.
      continue;
    }
    const hasMatch = detail.services.edges.some(
      (e) => e.node.repo?.toLowerCase() === target
    );
    if (hasMatch) return detail;
  }
  return null;
}

export interface RailwayProjectStatus {
  exists: boolean;
  linkedRepoFullName: string | null;
  latestDeploymentReadyState: VercelReadyState | null;
  latestDeploymentId: string | null;
  projectId: string | null;
  serviceId: string | null;
  environmentId: string | null;
  domain: string | null;
}

async function getServiceDomain(
  serviceId: string,
  environmentId: string,
  railwayToken: string
): Promise<string | null> {
  try {
    const data = await railwayGraphQL<{
      domains: { serviceDomains: { domain: string }[] };
    }>(
      `query domains($serviceId: String!, $environmentId: String!) {
        domains(serviceId: $serviceId, environmentId: $environmentId) {
          serviceDomains { domain }
        }
      }`,
      { serviceId, environmentId },
      railwayToken
    );
    return data.domains.serviceDomains[0]?.domain ?? null;
  } catch {
    return null;
  }
}

/* ---------------------------------------------------------------------- */
/*  Custom domains                                                         */
/* ---------------------------------------------------------------------- */

interface RailwayDnsRecordRaw {
  hostlabel: string;
  requiredValue: string;
  currentValue?: string | null;
  status?: string | null;
  recordType?: string | null;
  purpose?: string | null;
}

interface RailwayCustomDomainRaw {
  id: string;
  domain: string;
  status: {
    verified?: boolean | null;
    verificationToken?: string | null;
    dnsRecords: RailwayDnsRecordRaw[];
  } | null;
}

/** Shape returned to the client for one Railway custom domain — mirrors VercelDomainInfo/CloudflareDomainResult. */
export interface RailwayDomainInfo {
  id: string;
  domain: string;
  verified: boolean;
  /** The CNAME record pointing this domain at the Railway service. */
  dns: { type: "CNAME"; name: string; value: string } | null;
  /** The TXT record Railway requires to verify domain ownership — required alongside the CNAME. */
  verificationDns: { type: "TXT"; name: string; value: string } | null;
}

function hostlabelToName(hostlabel: string, domain: string): string {
  if (!hostlabel || hostlabel === domain) return "@";
  const suffix = `.${domain}`;
  return hostlabel.endsWith(suffix) ? hostlabel.slice(0, -suffix.length) : hostlabel;
}

function toDomainInfo(raw: RailwayCustomDomainRaw): RailwayDomainInfo {
  const records = raw.status?.dnsRecords ?? [];
  const cname = records.find((r) => (r.recordType ?? "CNAME").toUpperCase() !== "TXT");
  const txt = records.find((r) => (r.recordType ?? "").toUpperCase() === "TXT");
  const verificationToken = raw.status?.verificationToken ?? null;

  return {
    id: raw.id,
    domain: raw.domain,
    verified: Boolean(raw.status?.verified),
    dns: cname
      ? { type: "CNAME", name: hostlabelToName(cname.hostlabel, raw.domain), value: cname.requiredValue }
      : null,
    // Prefer the TXT record straight from dnsRecords (has the correct
    // hostlabel) — fall back to reconstructing it from verificationToken
    // for older API responses that don't include it in the records list.
    verificationDns: txt
      ? { type: "TXT", name: hostlabelToName(txt.hostlabel, raw.domain), value: txt.requiredValue }
      : verificationToken
        ? { type: "TXT", name: hostlabelToName(`_railway.${raw.domain}`, raw.domain), value: verificationToken }
        : null,
  };
}

/** Lists every custom domain attached to a Railway project's main service. */
export async function listRailwayCustomDomains(
  projectName: string,
  railwayToken: string
): Promise<RailwayDomainInfo[]> {
  const status = await requireProjectStatus(projectName, railwayToken);
  const data = await railwayGraphQL<{
    domains: { customDomains: RailwayCustomDomainRaw[] };
  }>(
    `query domains($projectId: String!, $environmentId: String!, $serviceId: String!) {
      domains(projectId: $projectId, environmentId: $environmentId, serviceId: $serviceId) {
        customDomains {
          id
          domain
          status {
            verified
            verificationToken
            dnsRecords { hostlabel requiredValue currentValue status recordType }
          }
        }
      }
    }`,
    { projectId: status.projectId, environmentId: status.environmentId, serviceId: status.serviceId },
    railwayToken
  );
  return (data.domains.customDomains ?? []).map(toDomainInfo);
}

/** Attaches a custom domain to a Railway project's main service, returning the DNS records to configure. */
export async function addRailwayCustomDomain(
  projectName: string,
  domain: string,
  railwayToken: string
): Promise<RailwayDomainInfo> {
  const status = await requireProjectStatus(projectName, railwayToken);
  const data = await railwayGraphQL<{ customDomainCreate: RailwayCustomDomainRaw }>(
    `mutation customDomainCreate($input: CustomDomainCreateInput!) {
      customDomainCreate(input: $input) {
        id
        domain
        status {
          verified
          verificationToken
          dnsRecords { hostlabel requiredValue currentValue status recordType }
        }
      }
    }`,
    {
      input: {
        projectId: status.projectId,
        environmentId: status.environmentId,
        serviceId: status.serviceId,
        domain,
      },
    },
    railwayToken
  );
  return toDomainInfo(data.customDomainCreate);
}

/** Removes a custom domain from a Railway project, looked up by its domain name. */
export async function removeRailwayCustomDomain(
  projectName: string,
  domain: string,
  railwayToken: string
): Promise<void> {
  const existing = await listRailwayCustomDomains(projectName, railwayToken);
  const match = existing.find((d) => d.domain.toLowerCase() === domain.toLowerCase());
  if (!match) return; // already gone — nothing to do

  await railwayGraphQL(
    `mutation customDomainDelete($id: String!) {
      customDomainDelete(id: $id)
    }`,
    { id: match.id },
    railwayToken
  );
}

/* ---------------------------------------------------------------------- */
/*  Project deletion                                                       */
/* ---------------------------------------------------------------------- */

/** Permanently deletes a Railway project (and every service/deployment inside it) — used by "Hapus di kedua sisi". */
export async function deleteRailwayProject(projectName: string, railwayToken: string): Promise<void> {
  const project = await findProjectByName(projectName, railwayToken);
  if (!project) return; // already gone — nothing to do

  await railwayGraphQL(
    `mutation projectDelete($id: String!) {
      projectDelete(id: $id)
    }`,
    { id: project.id },
    railwayToken
  );
}

async function getLatestDeployment(
  projectId: string,
  serviceId: string,
  environmentId: string,
  railwayToken: string
): Promise<{ id: string; status: string } | null> {
  const data = await railwayGraphQL<{
    deployments: { edges: { node: { id: string; status: string } }[] };
  }>(
    `query deployments($input: DeploymentListInput!, $first: Int) {
      deployments(input: $input, first: $first) {
        edges { node { id status } }
      }
    }`,
    { input: { projectId, serviceId, environmentId }, first: 1 },
    railwayToken
  );
  return data.deployments.edges[0]?.node ?? null;
}

export interface RailwayProjectImportSummary {
  id: string;
  name: string;
  domain: string | null;
  latestDeploymentReadyState: VercelReadyState | null;
}

/** Lists every project on the caller's real Railway account, with enough detail to import — used by "Import Project", mirrors `listVercelProjects`/`listCloudflarePagesProjects`. */
export async function listRailwayProjectSummaries(
  railwayToken: string
): Promise<RailwayProjectImportSummary[]> {
  const projects = await listProjects(railwayToken);
  return Promise.all(
    projects.map(async (p): Promise<RailwayProjectImportSummary> => {
      try {
        const detail = await getProjectDetail(p.id, railwayToken);
        const service = detail.services.edges[0]?.node ?? null;
        const environmentId =
          detail.baseEnvironmentId ?? detail.environments.edges[0]?.node.id ?? null;
        if (!service || !environmentId) {
          return { id: p.id, name: p.name, domain: null, latestDeploymentReadyState: null };
        }
        const [latest, domain] = await Promise.all([
          getLatestDeployment(detail.id, service.id, environmentId, railwayToken),
          getServiceDomain(service.id, environmentId, railwayToken),
        ]);
        return {
          id: p.id,
          name: p.name,
          domain,
          latestDeploymentReadyState: latest ? toReadyState(latest.status) : null,
        };
      } catch {
        // A project that fails to fetch full detail (e.g. mid-deletion, or a
        // stray empty project with no service yet) shouldn't block importing
        // the rest of the list — just show it with what little we know.
        return { id: p.id, name: p.name, domain: null, latestDeploymentReadyState: null };
      }
    })
  );
}

/**
 * Looks up a project by name so we can tell, before deploying, whether it
 * already exists (and which service/environment/repo it's wired to) —
 * mirrors `getVercelProject` for the Vercel flow.
 */
export async function getRailwayProject(
  projectName: string,
  railwayToken: string
): Promise<RailwayProjectStatus> {
  const project = await findProjectByName(projectName, railwayToken);
  if (!project) {
    return {
      exists: false,
      linkedRepoFullName: null,
      latestDeploymentReadyState: null,
      latestDeploymentId: null,
      projectId: null,
      serviceId: null,
      environmentId: null,
      domain: null,
    };
  }

  const service = project.services.edges[0]?.node ?? null;
  const environmentId =
    project.baseEnvironmentId ?? project.environments.edges[0]?.node.id ?? null;

  if (!service || !environmentId) {
    return {
      exists: true,
      linkedRepoFullName: null,
      latestDeploymentReadyState: null,
      latestDeploymentId: null,
      projectId: project.id,
      serviceId: null,
      environmentId,
      domain: null,
    };
  }

  const [latest, domain] = await Promise.all([
    getLatestDeployment(project.id, service.id, environmentId, railwayToken),
    getServiceDomain(service.id, environmentId, railwayToken),
  ]);

  return {
    exists: true,
    linkedRepoFullName: null,
    latestDeploymentReadyState: latest ? toReadyState(latest.status) : null,
    latestDeploymentId: latest?.id ?? null,
    projectId: project.id,
    serviceId: service.id,
    environmentId,
    domain,
  };
}

interface CreateDeploymentParams {
  projectName: string;
  owner: string;
  repo: string;
  ref: string;
  railwayToken: string;
  startCommand?: string;
  env?: Record<string, string>;
}

export interface RailwayDeploymentResult {
  deploymentId: string;
  projectId: string;
  serviceId: string;
  environmentId: string;
  url: string;
  inspectorUrl: string;
  readyState: VercelReadyState;
}

/**
 * Creates (or reuses) a Railway project + service wired to a GitHub repo,
 * generates a public domain the first time, applies optional env vars /
 * start command, and triggers a fresh deployment. No tokens are ever
 * persisted server-side — they're forwarded to Railway for this request only.
 */
export async function createRailwayDeployment(
  params: CreateDeploymentParams
): Promise<RailwayDeploymentResult> {
  const { projectName, owner, repo, ref, railwayToken, startCommand, env } = params;

  // Match by exact project name first (normal redeploy case), then fall
  // back to matching by the linked GitHub repo — so deploying the same repo
  // again under a different `projectName` (e.g. while testing) reuses the
  // existing Railway project + service instead of provisioning a brand-new
  // one every time, which burns through the free plan's resource limit fast.
  let project =
    (await findProjectByName(projectName, railwayToken)) ??
    (await findProjectByRepo(owner, repo, railwayToken));

  if (!project) {
    const workspaceId = await getDefaultWorkspaceId(railwayToken);
    const created = await railwayGraphQL<{
      projectCreate: { id: string; baseEnvironmentId: string | null; name: string };
    }>(
      `mutation projectCreate($input: ProjectCreateInput!) {
        projectCreate(input: $input) { id name baseEnvironmentId }
      }`,
      { input: { name: projectName, workspaceId } },
      railwayToken
    );
    project = await getProjectDetail(created.projectCreate.id, railwayToken);
  }

  const environmentId =
    project.baseEnvironmentId ?? project.environments.edges[0]?.node.id ?? null;
  if (!environmentId) {
    throw new RailwayApiError(
      `Project "${projectName}" di Railway tidak punya environment default.`,
      "railway_error"
    );
  }

  const targetRepo = `${owner}/${repo}`.toLowerCase();
  let service =
    project.services.edges.find((e) => e.node.repo?.toLowerCase() === targetRepo)?.node ??
    project.services.edges[0]?.node ??
    null;

  if (!service) {
    const createdService = await railwayGraphQL<{ serviceCreate: { id: string; name: string } }>(
      `mutation serviceCreate($input: ServiceCreateInput!) {
        serviceCreate(input: $input) { id name }
      }`,
      {
        input: {
          name: projectName,
          projectId: project.id,
          environmentId,
          source: { repo: `${owner}/${repo}` },
          branch: ref,
          variables: env && Object.keys(env).length > 0 ? env : undefined,
        },
      },
      railwayToken
    );
    service = { ...createdService.serviceCreate, repo: `${owner}/${repo}` };
  } else if (env && Object.keys(env).length > 0) {
    // Existing service being redeployed with (possibly new/updated) env vars.
    await railwayGraphQL(
      `mutation variableCollectionUpsert($projectId: String!, $serviceId: String!, $environmentId: String!, $variables: EnvironmentVariables!) {
        variableCollectionUpsert(
          input: { projectId: $projectId, environmentId: $environmentId, serviceId: $serviceId, variables: $variables, skipDeploys: true }
        )
      }`,
      { projectId: project.id, serviceId: service.id, environmentId, variables: env },
      railwayToken
    );
  }

  if (startCommand && startCommand.trim()) {
    await railwayGraphQL(
      `mutation serviceInstanceUpdate($serviceId: String!, $environmentId: String!, $input: ServiceInstanceUpdateInput!) {
        serviceInstanceUpdate(serviceId: $serviceId, environmentId: $environmentId, input: $input)
      }`,
      { serviceId: service.id, environmentId, input: { startCommand: startCommand.trim() } },
      railwayToken
    );
  }

  // Ensure the service has a public domain so there's a URL to show once it's live.
  let domain = await getServiceDomain(service.id, environmentId, railwayToken);
  if (!domain) {
    try {
      const domainRes = await railwayGraphQL<{ serviceDomainCreate: { domain: string } }>(
        `mutation serviceDomainCreate($input: ServiceDomainCreateInput!) {
          serviceDomainCreate(input: $input) { id domain }
        }`,
        { input: { environmentId, serviceId: service.id } },
        railwayToken
      );
      domain = domainRes.serviceDomainCreate.domain;
    } catch {
      /* domain generation is best-effort — deployment can still proceed without it */
    }
  }

  const deployRes = await railwayGraphQL<{ serviceInstanceDeployV2: string }>(
    `mutation serviceInstanceDeployV2($serviceId: String!, $environmentId: String!, $commitSha: String) {
      serviceInstanceDeployV2(serviceId: $serviceId, environmentId: $environmentId, commitSha: $commitSha)
    }`,
    { serviceId: service.id, environmentId, commitSha: null },
    railwayToken
  );

  const deploymentId = deployRes.serviceInstanceDeployV2;

  return {
    deploymentId,
    projectId: project.id,
    serviceId: service.id,
    environmentId,
    url: domain ?? "",
    inspectorUrl: inspectorUrlFor(project.id, environmentId, service.id),
    readyState: "QUEUED",
  };
}

interface RailwayLogLine {
  message: string;
  severity?: string | null;
}

/**
 * Pulls the last few log lines for a failed deployment so the user gets an
 * actual reason instead of Railway's opaque `meta.reason` (which is often
 * just a lifecycle stage name like "deploy", not a human-readable message).
 * Tries runtime logs first (crash-on-start is the common case once the
 * build succeeded), falling back to build logs for build-time failures.
 * Best-effort only — if both queries fail or come back empty, the caller
 * falls back to a generic message.
 */
async function fetchRailwayFailureReason(
  deploymentId: string,
  railwayToken: string
): Promise<string | null> {
  const tail = (lines: RailwayLogLine[]): string | null => {
    const relevant = lines.filter((l) => l.message?.trim());
    if (relevant.length === 0) return null;
    return relevant
      .slice(-8)
      .map((l) => l.message.trim())
      .join("\n")
      .slice(0, 1500);
  };

  try {
    const runtime = await railwayGraphQL<{ deploymentLogs: RailwayLogLine[] }>(
      `query deploymentLogs($deploymentId: String!, $limit: Int) {
        deploymentLogs(deploymentId: $deploymentId, limit: $limit) { message severity }
      }`,
      { deploymentId, limit: 50 },
      railwayToken
    );
    const runtimeTail = tail(runtime.deploymentLogs ?? []);
    if (runtimeTail) return runtimeTail;
  } catch {
    /* best-effort — fall through to build logs */
  }

  try {
    const build = await railwayGraphQL<{ buildLogs: RailwayLogLine[] }>(
      `query buildLogs($deploymentId: String!, $limit: Int) {
        buildLogs(deploymentId: $deploymentId, limit: $limit) { message severity }
      }`,
      { deploymentId, limit: 50 },
      railwayToken
    );
    return tail(build.buildLogs ?? []);
  } catch {
    return null;
  }
}

/** Polls a deployment's current build/deploy status. */
export async function getRailwayDeployment(
  deploymentId: string,
  railwayToken: string
): Promise<{
  deploymentId: string;
  url: string;
  inspectorUrl: string;
  readyState: VercelReadyState;
  errorMessage: string | null;
}> {
  const data = await railwayGraphQL<{
    deployment: {
      id: string;
      status: string;
      url: string | null;
      staticUrl: string | null;
      meta: unknown;
      projectId?: string;
      serviceId?: string;
      environmentId?: string;
    } | null;
  }>(
    `query deployment($id: String!) {
      deployment(id: $id) {
        id
        status
        url
        staticUrl
        meta
      }
    }`,
    { id: deploymentId },
    railwayToken
  );

  if (!data.deployment) {
    throw new RailwayApiError("Deployment tidak ditemukan di Railway.", "not_found");
  }

  const d = data.deployment;
  const readyState = toReadyState(d.status);
  const errorMessage =
    readyState === "ERROR"
      ? (await fetchRailwayFailureReason(deploymentId, railwayToken)) ??
        "Build/deploy gagal di Railway. Cek log di dashboard Railway untuk detail."
      : null;

  return {
    deploymentId: d.id,
    url: d.url ?? d.staticUrl ?? "",
    inspectorUrl: `https://railway.com/project/_/service/_?id=${d.id}`,
    readyState,
    errorMessage,
  };
}


/**
 * Re-triggers a deployment for an existing project's service using its
 * current commit (no new code pulled) — the Railway equivalent of Vercel's
 * "redeploy latest" used right after an env var changes.
 */
export async function redeployRailwayProject(
  projectName: string,
  railwayToken: string
): Promise<{ deploymentId: string; url: string; inspectorUrl: string; readyState: VercelReadyState }> {
  const status = await getRailwayProject(projectName, railwayToken);
  if (!status.exists || !status.serviceId || !status.environmentId || !status.projectId) {
    throw new RailwayApiError(`Project "${projectName}" tidak ditemukan di Railway.`, "not_found");
  }

  await railwayGraphQL(
    `mutation serviceInstanceRedeploy($serviceId: String!, $environmentId: String!) {
      serviceInstanceRedeploy(serviceId: $serviceId, environmentId: $environmentId)
    }`,
    { serviceId: status.serviceId, environmentId: status.environmentId },
    railwayToken
  );

  const latest = await getLatestDeployment(
    status.projectId,
    status.serviceId,
    status.environmentId,
    railwayToken
  );
  if (!latest) {
    throw new RailwayApiError(
      `Redeploy terkirim tapi deployment baru belum muncul — cek dashboard Railway.`,
      "railway_error"
    );
  }

  return {
    deploymentId: latest.id,
    url: status.domain ?? "",
    inspectorUrl: inspectorUrlFor(status.projectId, status.environmentId, status.serviceId),
    readyState: toReadyState(latest.status),
  };
}

/* ---------------------------------------------------------------------- */
/*  Environment variables                                                  */
/* ---------------------------------------------------------------------- */

async function requireProjectStatus(projectName: string, railwayToken: string): Promise<RailwayProjectStatus> {
  const status = await getRailwayProject(projectName, railwayToken);
  if (!status.exists || !status.serviceId || !status.environmentId || !status.projectId) {
    throw new RailwayApiError(`Project "${projectName}" tidak ditemukan di Railway.`, "not_found");
  }
  return status;
}

/** Lists every variable key currently set on a real Railway service. */
export async function listRailwayEnv(projectName: string, railwayToken: string): Promise<string[]> {
  const status = await requireProjectStatus(projectName, railwayToken);
  const data = await railwayGraphQL<{ variables: Record<string, string> }>(
    `query variables($projectId: String!, $environmentId: String!, $serviceId: String) {
      variables(projectId: $projectId, environmentId: $environmentId, serviceId: $serviceId)
    }`,
    { projectId: status.projectId, environmentId: status.environmentId, serviceId: status.serviceId },
    railwayToken
  );
  return Object.keys(data.variables ?? {});
}

/** Creates (or updates) a single environment variable on a real Railway service. */
export async function upsertRailwayEnv(
  projectName: string,
  key: string,
  value: string,
  railwayToken: string
): Promise<void> {
  const status = await requireProjectStatus(projectName, railwayToken);
  await railwayGraphQL(
    `mutation variableUpsert($input: VariableUpsertInput!) {
      variableUpsert(input: $input)
    }`,
    {
      input: {
        projectId: status.projectId,
        environmentId: status.environmentId,
        serviceId: status.serviceId,
        name: key,
        value,
      },
    },
    railwayToken
  );
}

/** Removes an environment variable from a real Railway service, looked up by key. */
export async function deleteRailwayEnv(
  projectName: string,
  key: string,
  railwayToken: string
): Promise<void> {
  const status = await requireProjectStatus(projectName, railwayToken);
  await railwayGraphQL(
    `mutation variableDelete($input: VariableDeleteInput!) {
      variableDelete(input: $input)
    }`,
    {
      input: {
        projectId: status.projectId,
        environmentId: status.environmentId,
        serviceId: status.serviceId,
        name: key,
      },
    },
    railwayToken
  );
}
