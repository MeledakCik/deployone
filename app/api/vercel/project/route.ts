import type { NextRequest } from "next/server";
import { ok, fail, withErrorHandling } from "@/app/api/_lib/response";
import { deleteVercelProject, getVercelProject, listVercelProjects, VercelApiError } from "@/app/api/_lib/vercel";

export const runtime = "nodejs";

/** Lists every project on the caller's real Vercel account — used by "Import Project". */
export const GET = withErrorHandling(async (req: NextRequest) => {
  const vercelToken = req.headers.get("x-vercel-token");
  if (!vercelToken) return fail("Header x-vercel-token wajib diisi.", 400, "bad_request");

  // ?project=nama → hanya cek satu project & repo GitHub yang terhubung
  // (dipakai dialog hapus untuk mengisi otomatis repo yang bisa ikut dihapus).
  const single = req.nextUrl.searchParams.get("project");
  if (single) {
    try {
      const status = await getVercelProject(single, vercelToken);
      return ok({ exists: status.exists, linkedRepoFullName: status.linkedRepoFullName });
    } catch (e) {
      if (e instanceof VercelApiError) {
        const code = e.code === "invalid_token" ? 401 : e.code === "not_found" ? 404 : 502;
        return fail(e.message, code, e.code);
      }
      throw e;
    }
  }

  try {
    const projects = await listVercelProjects(vercelToken);
    return ok(projects);
  } catch (e) {
    if (e instanceof VercelApiError) {
      const status = e.code === "invalid_token" ? 401 : e.code === "not_found" ? 404 : 502;
      return fail(e.message, status, e.code);
    }
    throw e;
  }
});

/** Permanently deletes a project on the real Vercel account — used by "Hapus di kedua sisi". */
export const DELETE = withErrorHandling(async (req: NextRequest) => {
  const vercelToken = req.headers.get("x-vercel-token");
  const project = req.nextUrl.searchParams.get("project");

  if (!vercelToken) return fail("Header x-vercel-token wajib diisi.", 400, "bad_request");
  if (!project) return fail("Query param project wajib diisi.", 400, "bad_request");

  try {
    await deleteVercelProject(project, vercelToken);
    return ok({ removed: true });
  } catch (e) {
    if (e instanceof VercelApiError) {
      const status = e.code === "invalid_token" ? 401 : e.code === "not_found" ? 404 : 502;
      return fail(e.message, status, e.code);
    }
    throw e;
  }
});
