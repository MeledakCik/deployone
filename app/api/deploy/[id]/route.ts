import type { NextRequest } from "next/server";
import { ok, fail, withErrorHandling } from "@/app/api/_lib/response";
import { getVercelDeployment, VercelApiError } from "@/app/api/_lib/vercel";

export const runtime = "nodejs";

export const GET = withErrorHandling(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    const vercelToken = req.headers.get("x-vercel-token");
    if (!vercelToken) return fail("Header x-vercel-token wajib diisi.", 400, "bad_request");
    if (!params.id) return fail("Deployment id wajib diisi.", 400, "bad_request");

    try {
      const status = await getVercelDeployment(params.id, vercelToken);
      return ok(status);
    } catch (e) {
      if (e instanceof VercelApiError) {
        const status = e.code === "invalid_token" ? 401 : e.code === "not_found" ? 404 : 502;
        return fail(e.message, status, e.code);
      }
      throw e;
    }
  }
);
