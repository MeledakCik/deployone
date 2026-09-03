import type { NextRequest } from "next/server";
import { ok, fail, withErrorHandling } from "@/app/api/_lib/response";
import {
  addVercelDomain,
  getVercelDomainStatus,
  removeVercelDomain,
  VercelApiError,
} from "@/app/api/_lib/vercel";
import { requireString, BadRequestError } from "@/app/api/_lib/validators";

export const runtime = "nodejs";

function statusFor(e: VercelApiError) {
  return e.code === "invalid_token" ? 401 : e.code === "not_found" ? 404 : 502;
}

/** Attaches a new domain to a real Vercel project. */
export const POST = withErrorHandling(async (req: NextRequest) => {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  let projectName: string;
  let domain: string;
  let vercelToken: string;
  try {
    projectName = requireString(body.projectName, "projectName");
    domain = requireString(body.domain, "domain");
    vercelToken = requireString(body.vercelToken, "vercelToken");
  } catch (e) {
    if (e instanceof BadRequestError) return fail(e.message, 400, "bad_request");
    throw e;
  }

  try {
    const result = await addVercelDomain(projectName, domain, vercelToken);
    return ok(result, 201);
  } catch (e) {
    if (e instanceof VercelApiError) return fail(e.message, statusFor(e), e.code);
    throw e;
  }
});

/** Re-checks verification/misconfiguration status for a domain already attached to a project. */
export const GET = withErrorHandling(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const projectName = searchParams.get("projectName") ?? "";
  const domain = searchParams.get("domain") ?? "";
  const vercelToken = req.headers.get("x-vercel-token") ?? "";

  if (!projectName || !domain || !vercelToken) {
    return fail("projectName, domain (query) dan header x-vercel-token wajib diisi.", 400, "bad_request");
  }

  try {
    const result = await getVercelDomainStatus(projectName, domain, vercelToken);
    return ok(result);
  } catch (e) {
    if (e instanceof VercelApiError) return fail(e.message, statusFor(e), e.code);
    throw e;
  }
});

/** Detaches a domain from a project — best-effort cleanup when removed from the dashboard. */
export const DELETE = withErrorHandling(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const projectName = searchParams.get("projectName") ?? "";
  const domain = searchParams.get("domain") ?? "";
  const vercelToken = req.headers.get("x-vercel-token") ?? "";

  if (!projectName || !domain || !vercelToken) {
    return fail("projectName, domain (query) dan header x-vercel-token wajib diisi.", 400, "bad_request");
  }

  try {
    await removeVercelDomain(projectName, domain, vercelToken);
    return ok({ removed: true });
  } catch (e) {
    if (e instanceof VercelApiError) return fail(e.message, statusFor(e), e.code);
    throw e;
  }
});
