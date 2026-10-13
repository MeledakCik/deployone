import type { NextRequest } from "next/server";
import { ok, fail, withErrorHandling } from "@/app/api/_lib/response";
import { removeCloudflareDomain, CloudflareApiError } from "@/app/api/_lib/cloudflare";

export const runtime = "nodejs";

export const DELETE = withErrorHandling(
  async (req: NextRequest, { params }: { params: { domain: string } }) => {
    const cloudflareToken = req.headers.get("x-cloudflare-token");
    const project = req.nextUrl.searchParams.get("project");
    const accountId = req.nextUrl.searchParams.get("accountId");

    if (!cloudflareToken) return fail("Header x-cloudflare-token wajib diisi.", 400, "bad_request");
    if (!project || !accountId) return fail("Query param project dan accountId wajib diisi.", 400, "bad_request");

    try {
      await removeCloudflareDomain(accountId, project, decodeURIComponent(params.domain), cloudflareToken);
      return ok({ removed: true });
    } catch (e) {
      if (e instanceof CloudflareApiError) {
        const status = e.code === "invalid_token" ? 401 : e.code === "not_found" ? 404 : 502;
        return fail(e.message, status, e.code);
      }
      throw e;
    }
  }
);
