import type { NextRequest } from "next/server";
import { ok, fail, withErrorHandling } from "@/app/api/_lib/response";
import { redeployCloudflareProject, CloudflareApiError } from "@/app/api/_lib/cloudflare";
import { requireString, BadRequestError } from "@/app/api/_lib/validators";

export const runtime = "nodejs";

/**
 * Re-triggers a project's production branch on Cloudflare Pages. Called
 * automatically right after an env var is added/updated/removed for a
 * Cloudflare-linked project, mirroring the Vercel auto-redeploy behaviour.
 */
export const POST = withErrorHandling(async (req: NextRequest) => {
  const body = (await req.json().catch(() => ({}))) as {
    project?: string;
    cloudflareToken?: string;
    accountId?: string;
  };

  let project: string;
  let cloudflareToken: string;
  let accountId: string;
  try {
    project = requireString(body.project, "project");
    cloudflareToken = requireString(body.cloudflareToken, "cloudflareToken");
    accountId = requireString(body.accountId, "accountId");
  } catch (e) {
    if (e instanceof BadRequestError) return fail(e.message, 400, "bad_request");
    throw e;
  }

  try {
    const result = await redeployCloudflareProject(accountId, project, cloudflareToken);
    return ok(result, 201);
  } catch (e) {
    if (e instanceof CloudflareApiError) {
      const status = e.code === "invalid_token" ? 401 : e.code === "not_found" ? 404 : 502;
      return fail(e.message, status, e.code);
    }
    throw e;
  }
});
