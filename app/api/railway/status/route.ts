import type { NextRequest } from "next/server";
import { ok, fail, withErrorHandling } from "@/app/api/_lib/response";
import { getRailwayProject, RailwayApiError } from "@/app/api/_lib/railway";

export const runtime = "nodejs";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const railwayToken = req.headers.get("x-railway-token");
  const project = req.nextUrl.searchParams.get("project");

  if (!railwayToken) return fail("Header x-railway-token wajib diisi.", 400, "bad_request");
  if (!project) return fail("Query param project wajib diisi.", 400, "bad_request");

  try {
    const status = await getRailwayProject(project, railwayToken);
    return ok(status);
  } catch (e) {
    if (e instanceof RailwayApiError) {
      const status = e.code === "invalid_token" ? 401 : e.code === "not_found" ? 404 : 502;
      return fail(e.message, status, e.code);
    }
    throw e;
  }
});
