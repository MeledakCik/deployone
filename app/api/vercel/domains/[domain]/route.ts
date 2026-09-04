import type { NextRequest } from "next/server";
import { ok, fail, withErrorHandling } from "@/app/api/_lib/response";
import { removeProjectDomain, VercelApiError } from "@/app/api/_lib/vercel";

export const runtime = "nodejs";

export const DELETE = withErrorHandling(
  async (req: NextRequest, { params }: { params: { domain: string } }) => {
    const vercelToken = req.headers.get("x-vercel-token");
    const project = req.nextUrl.searchParams.get("project");

    if (!vercelToken) return fail("Header x-vercel-token wajib diisi.", 400, "bad_request");
    if (!project) return fail("Query param project wajib diisi.", 400, "bad_request");

    try {
      await removeProjectDomain(project, decodeURIComponent(params.domain), vercelToken);
      return ok({ removed: true });
    } catch (e) {
      if (e instanceof VercelApiError) {
        const status = e.code === "invalid_token" ? 401 : e.code === "not_found" ? 404 : 502;
        return fail(e.message, status, e.code);
      }
      throw e;
    }
  }
);
