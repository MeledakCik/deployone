import type { NextRequest } from "next/server";
import { ok, fail, withErrorHandling } from "@/app/api/_lib/response";
import { deleteCloudflarePagesProject, listCloudflarePagesProjects, CloudflareApiError } from "@/app/api/_lib/cloudflare";

export const runtime = "nodejs";

/** Lists every project on the caller's real Cloudflare account — used by "Import Project". */
export const GET = withErrorHandling(async (req: NextRequest) => {
  const cloudflareToken = req.headers.get("x-cloudflare-token");
  const accountId = req.nextUrl.searchParams.get("accountId");

  if (!cloudflareToken) return fail("Header x-cloudflare-token wajib diisi.", 400, "bad_request");
  if (!accountId) return fail("Query param accountId wajib diisi.", 400, "bad_request");

  try {
    const projects = await listCloudflarePagesProjects(accountId, cloudflareToken);
    return ok(projects);
  } catch (e) {
    if (e instanceof CloudflareApiError) {
      const status = e.code === "invalid_token" ? 401 : e.code === "not_found" ? 404 : 502;
      return fail(e.message, status, e.code);
    }
    throw e;
  }
});

/** Permanently deletes a project on the real Cloudflare account — used by "Hapus di kedua sisi". */
export const DELETE = withErrorHandling(async (req: NextRequest) => {
  const cloudflareToken = req.headers.get("x-cloudflare-token");
  const project = req.nextUrl.searchParams.get("project");
  const accountId = req.nextUrl.searchParams.get("accountId");

  if (!cloudflareToken) return fail("Header x-cloudflare-token wajib diisi.", 400, "bad_request");
  if (!project || !accountId) return fail("Query param project dan accountId wajib diisi.", 400, "bad_request");

  try {
    await deleteCloudflarePagesProject(accountId, project, cloudflareToken);
    return ok({ removed: true });
  } catch (e) {
    if (e instanceof CloudflareApiError) {
      const status = e.code === "invalid_token" ? 401 : e.code === "not_found" ? 404 : 502;
      return fail(e.message, status, e.code);
    }
    throw e;
  }
});
