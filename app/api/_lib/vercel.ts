import type { VercelReadyState } from "@/types";

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
    return { exists: false, linkedRepoFullName: null, latestDeploymentReadyState: null };
  }
  if (!res.ok) throw await parseVercelError(res);

  const data = await res.json();
  const link = data?.link;
  const linkedRepoFullName =
    link?.type === "github" && link.org && link.repo ? `${link.org}/${link.repo}` : null;
  const latestDeploymentReadyState: VercelReadyState | null =
    data?.latestDeployments?.[0]?.readyState ?? null;

  return { exists: true, linkedRepoFullName, latestDeploymentReadyState };
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
