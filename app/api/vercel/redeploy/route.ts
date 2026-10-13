import type { NextRequest } from "next/server";
import { ok, fail, withErrorHandling } from "@/app/api/_lib/response";
import { redeployProject, VercelApiError } from "@/app/api/_lib/vercel";
import { requireString, BadRequestError } from "@/app/api/_lib/validators";

export const runtime = "nodejs";

/**
 * Re-runs a project's most recent deployment on Vercel. Called automatically
 * right after an env var is added/updated/removed for a Vercel-linked
 * project, since Vercel only applies env var changes on the next deploy.
 */
export const POST = withErrorHandling(async (req: NextRequest) => {
  const body = (await req.json().catch(() => ({}))) as { project?: string; vercelToken?: string };

  let project: string;
  let vercelToken: string;
  try {
    project = requireString(body.project, "project");
    vercelToken = requireString(body.vercelToken, "vercelToken");
  } catch (e) {
    if (e instanceof BadRequestError) return fail(e.message, 400, "bad_request");
    throw e;
  }

  try {
    const result = await redeployProject(project, vercelToken);
    return ok(result, 201);
  } catch (e) {
    if (e instanceof VercelApiError) {
      const status = e.code === "invalid_token" ? 401 : e.code === "not_found" ? 404 : 502;
      return fail(e.message, status, e.code);
    }
    throw e;
  }
});
