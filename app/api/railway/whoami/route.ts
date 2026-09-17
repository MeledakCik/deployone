import type { NextRequest } from "next/server";
import { ok, fail, withErrorHandling } from "@/app/api/_lib/response";
import { getRailwayUser, RailwayApiError } from "@/app/api/_lib/railway";

export const runtime = "nodejs";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const railwayToken = req.headers.get("x-railway-token");
  if (!railwayToken) return fail("Header x-railway-token wajib diisi.", 400, "bad_request");

  try {
    const user = await getRailwayUser(railwayToken);
    return ok(user);
  } catch (e) {
    if (e instanceof RailwayApiError) {
      const status = e.code === "invalid_token" ? 401 : e.code === "not_found" ? 404 : 502;
      return fail(e.message, status, e.code);
    }
    throw e;
  }
});
