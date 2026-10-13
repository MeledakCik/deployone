import type { NextRequest } from "next/server";
import { ok, fail, withErrorHandling } from "@/app/api/_lib/response";
import { getGithubUser, GithubApiError } from "@/app/api/_lib/github";

export const runtime = "nodejs";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const githubPat = req.headers.get("x-github-pat");
  if (!githubPat) return fail("Header x-github-pat wajib diisi.", 400, "bad_request");

  try {
    const user = await getGithubUser(githubPat);
    return ok(user);
  } catch (e) {
    if (e instanceof GithubApiError) {
      const status = e.code === "github_auth_required" ? 401 : 400;
      return fail(e.message, status, e.code);
    }
    throw e;
  }
});
