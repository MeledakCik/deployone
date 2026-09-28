import type { NextRequest } from "next/server";
import { ok, fail, withErrorHandling } from "@/app/api/_lib/response";
import { getRenderDeployment, RenderApiError } from "@/app/api/_lib/render";

export const runtime = "nodejs";

export const GET = withErrorHandling(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    const renderToken = req.headers.get("x-render-token");
    // Unlike Railway's globally-addressable deployment id, Render's
    // `GET /services/{serviceId}/deploys/{deployId}` needs the owning
    // service id too — carried alongside the deployment id since creation.
    const serviceId = req.nextUrl.searchParams.get("serviceId");

    if (!renderToken) return fail("Header x-render-token wajib diisi.", 400, "bad_request");
    if (!serviceId) return fail("Query param serviceId wajib diisi.", 400, "bad_request");
    if (!params.id) return fail("Deployment id wajib diisi.", 400, "bad_request");

    try {
      const status = await getRenderDeployment(serviceId, params.id, renderToken);
      return ok(status);
    } catch (e) {
      if (e instanceof RenderApiError) {
        const status = e.code === "invalid_token" ? 401 : e.code === "not_found" ? 404 : 502;
        return fail(e.message, status, e.code);
      }
      throw e;
    }
  }
);
