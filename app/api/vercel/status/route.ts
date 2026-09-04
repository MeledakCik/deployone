import type { NextRequest } from "next/server";
import { ok, fail, withErrorHandling } from "@/app/api/_lib/response";
import { getVercelProject, VercelApiError } from "@/app/api/_lib/vercel";

export const runtime = "nodejs";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const vercelToken = req.headers.get("x-vercel-token");
  const project = req.nextUrl.searchParams.get("project");

  if (!vercelToken) return fail("Header x-vercel-token wajib diisi.", 400, "bad_request");
  if (!project) return fail("Query param project wajib diisi.", 400, "bad_request");

  try {
    const status = await getVercelProject(project, vercelToken);
    return ok(status);
  } catch (e) {
    if (e instanceof VercelApiError) {
      const status = e.code === "invalid_token" ? 401 : e.code === "not_found" ? 404 : 502;
      return fail(e.message, status, e.code);
    }
    throw e;
  }
});
