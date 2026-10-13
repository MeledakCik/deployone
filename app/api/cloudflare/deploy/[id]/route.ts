import type { NextRequest } from "next/server";
import { ok, fail, withErrorHandling } from "@/app/api/_lib/response";
import { getCloudflareDeployment, CloudflareApiError } from "@/app/api/_lib/cloudflare";

export const runtime = "nodejs";

export const GET = withErrorHandling(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    const cloudflareToken = req.headers.get("x-cloudflare-token");
    const project = req.nextUrl.searchParams.get("project");
    const accountId = req.nextUrl.searchParams.get("accountId");

    if (!cloudflareToken) return fail("Header x-cloudflare-token wajib diisi.", 400, "bad_request");
    if (!project || !accountId) return fail("Query param project dan accountId wajib diisi.", 400, "bad_request");
    if (!params.id) return fail("Deployment id wajib diisi.", 400, "bad_request");

    try {
      const status = await getCloudflareDeployment(accountId, project, params.id, cloudflareToken);
      return ok(status);
    } catch (e) {
      if (e instanceof CloudflareApiError) {
        const status = e.code === "invalid_token" ? 401 : e.code === "not_found" ? 404 : 502;
        return fail(e.message, status, e.code);
      }
      throw e;
    }
  }
);
