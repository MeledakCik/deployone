import type { NextRequest } from "next/server";
import { ok, fail, withErrorHandling } from "@/app/api/_lib/response";
import { deleteRenderProject, listRenderProjectSummaries, RenderApiError } from "@/app/api/_lib/render";

export const runtime = "nodejs";

/** Lists every service on the caller's real Render account — used by "Import Project". */
export const GET = withErrorHandling(async (req: NextRequest) => {
  const renderToken = req.headers.get("x-render-token");
  if (!renderToken) return fail("Header x-render-token wajib diisi.", 400, "bad_request");

  try {
    const projects = await listRenderProjectSummaries(renderToken);
    return ok(projects);
  } catch (e) {
    if (e instanceof RenderApiError) {
      const status = e.code === "invalid_token" ? 401 : e.code === "not_found" ? 404 : 502;
      return fail(e.message, status, e.code);
    }
    throw e;
  }
});

/** Permanently deletes a service on the real Render account — used by "Hapus di kedua sisi". */
export const DELETE = withErrorHandling(async (req: NextRequest) => {
  const renderToken = req.headers.get("x-render-token");
  const project = req.nextUrl.searchParams.get("project");

  if (!renderToken) return fail("Header x-render-token wajib diisi.", 400, "bad_request");
  if (!project) return fail("Query param project wajib diisi.", 400, "bad_request");

  try {
    await deleteRenderProject(project, renderToken);
    return ok({ removed: true });
  } catch (e) {
    if (e instanceof RenderApiError) {
      const status = e.code === "invalid_token" ? 401 : e.code === "not_found" ? 404 : 502;
      return fail(e.message, status, e.code);
    }
    throw e;
  }
});
