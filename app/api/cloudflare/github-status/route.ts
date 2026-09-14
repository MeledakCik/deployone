import type { NextRequest } from "next/server";
import { ok, fail, withErrorHandling } from "@/app/api/_lib/response";
import { checkCloudflareGithubConnected, cloudflareGithubConnectUrl, CloudflareApiError } from "@/app/api/_lib/cloudflare";

export const runtime = "nodejs";

/**
 * Best-effort check for whether the Cloudflare account already has the
 * Pages GitHub App installed — see checkCloudflareGithubConnected() for why
 * this can only ever confirm "connected", never definitively "not connected".
 */
export const GET = withErrorHandling(async (req: NextRequest) => {
  const cloudflareToken = req.headers.get("x-cloudflare-token");
  const accountId = req.nextUrl.searchParams.get("accountId");

  if (!cloudflareToken) return fail("Header x-cloudflare-token wajib diisi.", 400, "bad_request");
  if (!accountId) return fail("Query param accountId wajib diisi.", 400, "bad_request");

  try {
    const status = await checkCloudflareGithubConnected(accountId, cloudflareToken);
    return ok({ status, connectUrl: cloudflareGithubConnectUrl(accountId) });
  } catch (e) {
    if (e instanceof CloudflareApiError) {
      const status = e.code === "invalid_token" ? 401 : e.code === "not_found" ? 404 : 502;
      return fail(e.message, status, e.code);
    }
    throw e;
  }
});
