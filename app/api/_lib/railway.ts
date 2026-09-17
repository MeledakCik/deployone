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
  if (!res.ok) {
    throw new RailwayApiError(`Railway API error (${res.status})`, "railway_error");
  }

  const body = await res.json();
  if (Array.isArray(body.errors) && body.errors.length > 0) {
    const message: string = body.errors[0]?.message ?? "Railway API error";
    if (/not authorized|unauthorized/i.test(message)) {
      throw new RailwayApiError("Railway token tidak valid atau tidak punya izin.", "invalid_token");
    }
    if (/not found/i.test(message)) {
      throw new RailwayApiError(message, "not_found");
    }
    throw new RailwayApiError(message, "railway_error");
  }

  return body.data as T;
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

async function listProjects(railwayToken: string): Promise<RailwayProjectSummary[]> {
  const data = await railwayGraphQL<{
    projects: { edges: { node: RailwayProjectSummary }[] };
  }>(
    `query { projects { edges { node { id name } } } }`,
    {},
    railwayToken
  );
  return data.projects.edges.map((e) => e.node);
}

interface RailwayServiceNode {
  id: string;
  name: string;
}

interface RailwayEnvironmentNode {
  id: string;
  name: string;
}

interface RailwayProjectDetail {
  id: string;
  name: string;
  baseEnvironmentId: string | null;
  services: { edges: { node: RailwayServiceNode & { repo?: string | null } }[] };
  environments: { edges: { node: RailwayEnvironmentNode }[] };
}

async function getProjectDetail(projectId: string, railwayToken: string): Promise<RailwayProjectDetail> {
  const data = await railwayGraphQL<{ project: RailwayProjectDetail }>(
    `query project($id: String!) {
      project(id: $id) {
        id
        name
        baseEnvironmentId
        services { edges { node { id name } } }
        environments { edges { node { id name } } }
      }
    }`,
    { id: projectId },
    railwayToken
  );
  return data.project;
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

  let project = await findProjectByName(projectName, railwayToken);

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

  let service = project.services.edges[0]?.node ?? null;

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
    service = createdService.serviceCreate;
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
  const meta = (d.meta ?? {}) as Record<string, unknown>;
  const errorMessage =
    readyState === "ERROR"
      ? (typeof meta.reason === "string" ? meta.reason : null) ??
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
