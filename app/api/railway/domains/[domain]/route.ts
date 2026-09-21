import type { NextRequest } from "next/server";
import { ok, fail, withErrorHandling } from "@/app/api/_lib/response";
import { removeRailwayCustomDomain, RailwayApiError } from "@/app/api/_lib/railway";

export const runtime = "nodejs";

export const DELETE = withErrorHandling(
  async (req: NextRequest, { params }: { params: { domain: string } }) => {
    const railwayToken = req.headers.get("x-railway-token");
    const project = req.nextUrl.searchParams.get("project");

    if (!railwayToken) return fail("Header x-railway-token wajib diisi.", 400, "bad_request");
    if (!project) return fail("Query param project wajib diisi.", 400, "bad_request");

    try {
      await removeRailwayCustomDomain(project, decodeURIComponent(params.domain), railwayToken);
      return ok({ removed: true });
    } catch (e) {
      if (e instanceof RailwayApiError) {
        const status = e.code === "invalid_token" ? 401 : e.code === "not_found" ? 404 : 502;
        return fail(e.message, status, e.code);
      }
      throw e;
    }
  }
);
