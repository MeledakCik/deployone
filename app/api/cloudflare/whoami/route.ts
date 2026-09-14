import type { NextRequest } from "next/server";
import { ok, fail, withErrorHandling } from "@/app/api/_lib/response";
import { getCloudflareAccounts, CloudflareApiError } from "@/app/api/_lib/cloudflare";

export const runtime = "nodejs";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const cloudflareToken = req.headers.get("x-cloudflare-token");
  if (!cloudflareToken) return fail("Header x-cloudflare-token wajib diisi.", 400, "bad_request");

  try {
    const accounts = await getCloudflareAccounts(cloudflareToken);
    return ok({ accounts });
  } catch (e) {
    if (e instanceof CloudflareApiError) {
      const status = e.code === "invalid_token" ? 401 : e.code === "not_found" ? 404 : 502;
      return fail(e.message, status, e.code);
    }
    throw e;
  }
});
