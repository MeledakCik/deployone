import type { NextRequest } from "next/server";
import { ok, fail, withErrorHandling } from "@/app/api/_lib/response";
import { deleteGithubRepo, GithubApiError } from "@/app/api/_lib/github";
import { getSessionEmail } from "@/app/api/_lib/session";

export const runtime = "nodejs";

/** Permanently deletes a repo on the caller's GitHub account — used by the "Hapus juga repo GitHub" switch. */
export const DELETE = withErrorHandling(async (req: NextRequest) => {
  if (!getSessionEmail(req)) return fail("Belum login.", 401, "unauthorized");

  const githubPat = req.headers.get("x-github-pat");
  const repo = req.nextUrl.searchParams.get("repo");

  if (!githubPat) return fail("Header x-github-pat wajib diisi.", 400, "bad_request");
  if (!repo) return fail("Query param repo wajib diisi (format owner/repo).", 400, "bad_request");

  try {
    await deleteGithubRepo(repo, githubPat);
    return ok({ removed: true });
  } catch (e) {
    if (e instanceof GithubApiError) {
      const status =
        e.code === "github_auth_required" ? 401 : e.code === "repo_not_found" ? 404 : 400;
      return fail(e.message, status, e.code);
    }
    throw e;
  }
});
