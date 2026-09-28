import type { NextRequest } from "next/server";
import { ok, fail, withErrorHandling } from "@/app/api/_lib/response";
import { redeployRenderProject, RenderApiError } from "@/app/api/_lib/render";
import { requireString, BadRequestError } from "@/app/api/_lib/validators";

export const runtime = "nodejs";

/**
 * Re-runs a service's latest deploy on Render. Called automatically right
 * after an env var is added/updated/removed for a Render-linked project,
 * mirroring the Railway/Vercel redeploy routes.
 */
export const POST = withErrorHandling(async (req: NextRequest) => {
  const body = (await req.json().catch(() => ({}))) as { project?: string; renderToken?: string };

  let project: string;
  let renderToken: string;
  try {
    project = requireString(body.project, "project");
    renderToken = requireString(body.renderToken, "renderToken");
  } catch (e) {
    if (e instanceof BadRequestError) return fail(e.message, 400, "bad_request");
    throw e;
  }

  try {
    const result = await redeployRenderProject(project, renderToken);
    return ok(result, 201);
  } catch (e) {
    if (e instanceof RenderApiError) {
      const status = e.code === "invalid_token" ? 401 : e.code === "not_found" ? 404 : 502;
      return fail(e.message, status, e.code);
    }
    throw e;
  }
});
