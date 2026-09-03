import type { NextRequest } from "next/server";
import { ok, fail, withErrorHandling } from "@/app/api/_lib/response";
import { getVercelProject, VercelApiError } from "@/app/api/_lib/vercel";
import { requireString, BadRequestError } from "@/app/api/_lib/validators";

export const runtime = "nodejs";

function statusFor(e: VercelApiError) {
  return e.code === "invalid_token" ? 401 : e.code === "not_found" ? 404 : 502;
}

/**
 * Tells the client whether a project name still exists in the caller's
 * Vercel account. Used to answer "kalau di Vercel udah dihapus, otomatis
 * kehapus juga di sini?" — no, so this endpoint lets the UI actively check
 * and offer to remove the now-stale local entry.
 */
export const POST = withErrorHandling(async (req: NextRequest) => {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  let projectName: string;
  let vercelToken: string;
  try {
    projectName = requireString(body.projectName, "projectName");
    vercelToken = requireString(body.vercelToken, "vercelToken");
  } catch (e) {
    if (e instanceof BadRequestError) return fail(e.message, 400, "bad_request");
    throw e;
  }

  try {
    const status = await getVercelProject(projectName, vercelToken);
    return ok(status);
  } catch (e) {
    if (e instanceof VercelApiError) return fail(e.message, statusFor(e), e.code);
    throw e;
  }
});
