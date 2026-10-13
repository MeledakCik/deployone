import type { NextRequest } from "next/server";
import { ok, fail, withErrorHandling } from "@/app/api/_lib/response";
import { addProjectDomain, listProjectDomains, VercelApiError } from "@/app/api/_lib/vercel";
import { requireString, BadRequestError } from "@/app/api/_lib/validators";

export const runtime = "nodejs";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const vercelToken = req.headers.get("x-vercel-token");
  const project = req.nextUrl.searchParams.get("project");

  if (!vercelToken) return fail("Header x-vercel-token wajib diisi.", 400, "bad_request");
  if (!project) return fail("Query param project wajib diisi.", 400, "bad_request");

  try {
    const domains = await listProjectDomains(project, vercelToken);
    return ok(domains);
  } catch (e) {
    if (e instanceof VercelApiError) {
      const status = e.code === "invalid_token" ? 401 : e.code === "not_found" ? 404 : 502;
      return fail(e.message, status, e.code);
    }
    throw e;
  }
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const body = await req.json().catch(() => ({}));

  let project: string;
  let domain: string;
  let vercelToken: string;
  try {
    project = requireString(body.project, "project");
    domain = requireString(body.domain, "domain");
    vercelToken = requireString(body.vercelToken, "vercelToken");
  } catch (e) {
    if (e instanceof BadRequestError) return fail(e.message, 400, "bad_request");
    throw e;
  }

  try {
    const result = await addProjectDomain(project, domain, vercelToken);
    return ok(result, 201);
  } catch (e) {
    if (e instanceof VercelApiError) {
      const status = e.code === "invalid_token" ? 401 : e.code === "not_found" ? 404 : 502;
      return fail(e.message, status, e.code);
    }
    throw e;
  }
});
