import type { NextRequest } from "next/server";
import { ok, fail, withErrorHandling } from "@/app/api/_lib/response";
import { redeployRailwayProject, RailwayApiError } from "@/app/api/_lib/railway";
import { requireString, BadRequestError } from "@/app/api/_lib/validators";

export const runtime = "nodejs";

/**
 * Re-runs a project's current deployment on Railway. Called automatically
 * right after an env var is added/updated/removed for a Railway-linked
 * project, mirroring the Vercel redeploy route.
 */
export const POST = withErrorHandling(async (req: NextRequest) => {
  const body = (await req.json().catch(() => ({}))) as { project?: string; railwayToken?: string };

  let project: string;
  let railwayToken: string;
  try {
    project = requireString(body.project, "project");
    railwayToken = requireString(body.railwayToken, "railwayToken");
  } catch (e) {
    if (e instanceof BadRequestError) return fail(e.message, 400, "bad_request");
    throw e;
  }

  try {
    const result = await redeployRailwayProject(project, railwayToken);
    return ok(result, 201);
  } catch (e) {
    if (e instanceof RailwayApiError) {
      const status = e.code === "invalid_token" ? 401 : e.code === "not_found" ? 404 : 502;
      return fail(e.message, status, e.code);
    }
    throw e;
  }
});
