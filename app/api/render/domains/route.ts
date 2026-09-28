import type { NextRequest } from "next/server";
import { ok, fail, withErrorHandling } from "@/app/api/_lib/response";
import { addRenderCustomDomain, listRenderCustomDomains, RenderApiError } from "@/app/api/_lib/render";
import { requireString, BadRequestError } from "@/app/api/_lib/validators";
import type { AddRenderDomainRequest } from "@/types";

export const runtime = "nodejs";

/** Lists every custom domain attached to a real Render service. */
export const GET = withErrorHandling(async (req: NextRequest) => {
  const renderToken = req.headers.get("x-render-token");
  const project = req.nextUrl.searchParams.get("project");

  if (!renderToken) return fail("Header x-render-token wajib diisi.", 400, "bad_request");
  if (!project) return fail("Query param project wajib diisi.", 400, "bad_request");

  try {
    const domains = await listRenderCustomDomains(project, renderToken);
    return ok(domains);
  } catch (e) {
    if (e instanceof RenderApiError) {
      const status = e.code === "invalid_token" ? 401 : e.code === "not_found" ? 404 : 502;
      return fail(e.message, status, e.code);
    }
    throw e;
  }
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const body = (await req.json().catch(() => ({}))) as Partial<AddRenderDomainRequest>;

  let project: string;
  let domain: string;
  let renderToken: string;
  try {
    project = requireString(body.project, "project");
    domain = requireString(body.domain, "domain");
    renderToken = requireString(body.renderToken, "renderToken");
  } catch (e) {
    if (e instanceof BadRequestError) return fail(e.message, 400, "bad_request");
    throw e;
  }

  try {
    const result = await addRenderCustomDomain(project, domain, renderToken);
    return ok(result, 201);
  } catch (e) {
    if (e instanceof RenderApiError) {
      const status = e.code === "invalid_token" ? 401 : e.code === "not_found" ? 404 : 502;
      return fail(e.message, status, e.code);
    }
    throw e;
  }
});
