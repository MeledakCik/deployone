import type { NextRequest } from "next/server";
import { ok, fail, withErrorHandling } from "@/app/api/_lib/response";
import { validateGithubRepo, GithubApiError } from "@/app/api/_lib/github";
import { getSessionEmail } from "@/app/api/_lib/session";
import { requireString, optionalString, BadRequestError } from "@/app/api/_lib/validators";

export const runtime = "nodejs";

export const POST = withErrorHandling(async (req: NextRequest) => {
  // Route ini bisa memakai GITHUB_TOKEN milik server — wajib login supaya
  // tidak bisa dipakai orang luar untuk menghabiskan kuota.
  if (!getSessionEmail(req)) return fail("Belum login.", 401, "unauthorized");

  const body = await req.json().catch(() => ({}));

  let githubUrl: string;
  let githubPat: string | undefined;
  try {
    githubUrl = requireString(body.githubUrl, "githubUrl");
    githubPat = optionalString(body.githubPat);
  } catch (e) {
    if (e instanceof BadRequestError) return fail(e.message, 400, "bad_request");
    throw e;
  }

  try {
    const result = await validateGithubRepo(githubUrl, githubPat);
    return ok(result);
  } catch (e) {
    if (e instanceof GithubApiError) {
      const status = e.code === "repo_not_found" ? 404 : e.code === "invalid_url" ? 400 : 401;
      return fail(e.message, status, e.code);
    }
    throw e;
  }
});
