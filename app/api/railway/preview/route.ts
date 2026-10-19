import type { NextRequest } from "next/server";
import { ok, fail, withErrorHandling } from "@/app/api/_lib/response";
import { validateGithubRepo, GithubApiError } from "@/app/api/_lib/github";
import { previewRailwayAutofix } from "@/app/api/_lib/repo-autofix";
import { requireString, optionalString, BadRequestError } from "@/app/api/_lib/validators";

export const runtime = "nodejs";

/**
 * Pratinjau (READ-ONLY) file yang akan ditambahkan Depup ke repo saat deploy ke Railway.
 * Tidak menulis apa pun ke GitHub maupun Railway — hanya dipakai kartu cek repo di layar
 * Deploy supaya user tahu sebelum menekan tombol Deploy.
 */
export const POST = withErrorHandling(async (req: NextRequest) => {
  const body = (await req.json().catch(() => ({}))) as { githubUrl?: unknown; githubPat?: unknown };

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
    const validation = await validateGithubRepo(githubUrl, githubPat);
    // Repo yang memang diblokir untuk Railway tidak akan dideploy — tidak ada yang perlu dilengkapi.
    if (validation.compat.railway.level === "blocked") {
      return ok({ files: [], rootDirectory: null, canWrite: true });
    }
    return ok(await previewRailwayAutofix(validation, githubPat));
  } catch (e) {
    if (e instanceof GithubApiError) {
      const status = e.code === "repo_not_found" ? 404 : e.code === "invalid_url" ? 400 : 401;
      return fail(e.message, status, e.code);
    }
    throw e;
  }
});
