import type { NextRequest } from "next/server";
import { ok, fail, withErrorHandling } from "@/app/api/_lib/response";
import { getRailwayDeployment, RailwayApiError } from "@/app/api/_lib/railway";

export const runtime = "nodejs";

export const GET = withErrorHandling(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    const railwayToken = req.headers.get("x-railway-token");
    if (!railwayToken) return fail("Header x-railway-token wajib diisi.", 400, "bad_request");
    if (!params.id) return fail("Deployment id wajib diisi.", 400, "bad_request");

    try {
      const status = await getRailwayDeployment(params.id, railwayToken);
      return ok(status);
    } catch (e) {
      if (e instanceof RailwayApiError) {
        const status = e.code === "invalid_token" ? 401 : e.code === "not_found" ? 404 : 502;
        return fail(e.message, status, e.code);
      }
      throw e;
    }
  }
);
