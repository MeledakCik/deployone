import type { NextRequest } from "next/server";
import { ok, fail, withErrorHandling } from "@/app/api/_lib/response";
import { validateGithubRepo, GithubApiError } from "@/app/api/_lib/github";
import { createVercelDeployment, getVercelProject, VercelApiError } from "@/app/api/_lib/vercel";
import {
  requireString,
  optionalString,
  assertValidProjectName,
  BadRequestError,
} from "@/app/api/_lib/validators";
import type { CreateDeployRequest } from "@/types";

export const runtime = "nodejs";

/**
 * Deploy orchestration, currently Vercel-only:
 *   1. Re-validate the GitHub repo server-side (never trust the client).
 *   2. Kick off a real deployment via the Vercel REST API.
 * Cloudflare / Railway / Render integrations are planned but not wired up
 * yet — the client keeps its simulated flow for those platforms for now.
 */
export const POST = withErrorHandling(async (req: NextRequest) => {
  const body = (await req.json().catch(() => ({}))) as Partial<CreateDeployRequest>;

  let projectName: string;
  let githubUrl: string;
  let vercelToken: string;
  let githubPat: string | undefined;
  try {
    projectName = requireString(body.projectName, "projectName");
    githubUrl = requireString(body.githubUrl, "githubUrl");
    vercelToken = requireString(body.vercelToken, "vercelToken");
    githubPat = optionalString(body.githubPat);
    assertValidProjectName(projectName);
  } catch (e) {
    if (e instanceof BadRequestError) return fail(e.message, 400, "bad_request");
    throw e;
  }

  let validation;
  try {
    validation = await validateGithubRepo(githubUrl, githubPat);
  } catch (e) {
    if (e instanceof GithubApiError) {
      const status = e.code === "repo_not_found" ? 404 : e.code === "invalid_url" ? 400 : 401;
      return fail(e.message, status, e.code);
    }
    throw e;
  }

  if (!validation.hasPackageJson) {
    return fail(
      "Repo tidak punya package.json di root — bukan project Node.js yang bisa di-deploy Vercel.",
      422,
      "no_package_json"
    );
  }

  // Guard against name collisions: if `projectName` already exists in this
  // Vercel account but is linked to a *different* GitHub repo, creating a
  // deployment would silently re-link it to this repo instead — a real
  // conflict, not a normal redeploy. Block it and tell the user clearly.
  try {
    const existing = await getVercelProject(projectName, vercelToken);
    if (existing.exists && existing.linkedRepoFullName && existing.linkedRepoFullName !== validation.fullName) {
      return fail(
        `Project "${projectName}" di Vercel sudah terhubung ke repo lain (${existing.linkedRepoFullName}). ` +
          `Pakai nama project yang berbeda, atau deploy dari repo yang sama.`,
        409,
        "project_conflict"
      );
    }
  } catch (e) {
    if (e instanceof VercelApiError) {
      const status = e.code === "invalid_token" ? 401 : e.code === "not_found" ? 404 : 502;
      return fail(e.message, status, e.code);
    }
    throw e;
  }

  try {
    const deployment = await createVercelDeployment({
      projectName,
      owner: validation.owner,
      repo: validation.repo,
      ref: validation.defaultBranch,
      vercelToken,
    });
    return ok(deployment, 201);
  } catch (e) {
    if (e instanceof VercelApiError) {
      const status = e.code === "invalid_token" ? 401 : e.code === "not_found" ? 404 : 502;
      return fail(e.message, status, e.code);
    }
    throw e;
  }
});
