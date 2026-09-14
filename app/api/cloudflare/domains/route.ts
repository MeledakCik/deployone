import type { NextRequest } from "next/server";
import { ok, fail, withErrorHandling } from "@/app/api/_lib/response";
import { addCloudflareDomain, listCloudflareDomains, CloudflareApiError } from "@/app/api/_lib/cloudflare";
import { requireString, BadRequestError } from "@/app/api/_lib/validators";

export const runtime = "nodejs";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const cloudflareToken = req.headers.get("x-cloudflare-token");
  const project = req.nextUrl.searchParams.get("project");
  const accountId = req.nextUrl.searchParams.get("accountId");

  if (!cloudflareToken) return fail("Header x-cloudflare-token wajib diisi.", 400, "bad_request");
  if (!project || !accountId) return fail("Query param project dan accountId wajib diisi.", 400, "bad_request");

  try {
    const domains = await listCloudflareDomains(accountId, project, cloudflareToken);
    return ok(domains);
  } catch (e) {
    if (e instanceof CloudflareApiError) {
      const status = e.code === "invalid_token" ? 401 : e.code === "not_found" ? 404 : 502;
      return fail(e.message, status, e.code);
    }
    throw e;
  }
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const body = await req.json().catch(() => ({}));

  let project: string;
  let domain: string;
  let cloudflareToken: string;
  let accountId: string;
  try {
    project = requireString(body.project, "project");
    domain = requireString(body.domain, "domain");
    cloudflareToken = requireString(body.cloudflareToken, "cloudflareToken");
    accountId = requireString(body.accountId, "accountId");
  } catch (e) {
    if (e instanceof BadRequestError) return fail(e.message, 400, "bad_request");
    throw e;
  }

  try {
    const result = await addCloudflareDomain(accountId, project, domain, cloudflareToken);
    return ok(result, 201);
  } catch (e) {
    if (e instanceof CloudflareApiError) {
      const status = e.code === "invalid_token" ? 401 : e.code === "not_found" ? 404 : 502;
      return fail(e.message, status, e.code);
    }
    throw e;
  }
});
