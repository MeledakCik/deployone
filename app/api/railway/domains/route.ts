import type { NextRequest } from "next/server";
import { ok, fail, withErrorHandling } from "@/app/api/_lib/response";
import { addRailwayCustomDomain, listRailwayCustomDomains, RailwayApiError } from "@/app/api/_lib/railway";
import { requireString, BadRequestError } from "@/app/api/_lib/validators";
import type { AddRailwayDomainRequest } from "@/types";

export const runtime = "nodejs";

/** Lists every custom domain attached to a real Railway service. */
export const GET = withErrorHandling(async (req: NextRequest) => {
  const railwayToken = req.headers.get("x-railway-token");
  const project = req.nextUrl.searchParams.get("project");

  if (!railwayToken) return fail("Header x-railway-token wajib diisi.", 400, "bad_request");
  if (!project) return fail("Query param project wajib diisi.", 400, "bad_request");

  try {
    const domains = await listRailwayCustomDomains(project, railwayToken);
    return ok(domains);
  } catch (e) {
    if (e instanceof RailwayApiError) {
      const status = e.code === "invalid_token" ? 401 : e.code === "not_found" ? 404 : 502;
      return fail(e.message, status, e.code);
    }
    throw e;
  }
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const body = (await req.json().catch(() => ({}))) as Partial<AddRailwayDomainRequest>;

  let project: string;
  let domain: string;
  let railwayToken: string;
  try {
    project = requireString(body.project, "project");
    domain = requireString(body.domain, "domain");
    railwayToken = requireString(body.railwayToken, "railwayToken");
  } catch (e) {
    if (e instanceof BadRequestError) return fail(e.message, 400, "bad_request");
    throw e;
  }

  try {
    const result = await addRailwayCustomDomain(project, domain, railwayToken);
    return ok(result, 201);
  } catch (e) {
    if (e instanceof RailwayApiError) {
      const status = e.code === "invalid_token" ? 401 : e.code === "not_found" ? 404 : 502;
      return fail(e.message, status, e.code);
    }
    throw e;
  }
});
