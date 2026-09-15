import type { NextRequest } from "next/server";
import { ok, fail, withErrorHandling } from "@/app/api/_lib/response";
import { validateGithubRepo, GithubApiError } from "@/app/api/_lib/github";
import {
  createCloudflarePagesProject,
  getCloudflarePagesProject,
  triggerCloudflareDeployment,
  cloudflareBuildPreset,
  CloudflareApiError,
} from "@/app/api/_lib/cloudflare";
import {
  requireString,
  optionalString,
  assertValidProjectName,
  BadRequestError,
} from "@/app/api/_lib/validators";
import type { CreateCloudflareDeployRequest } from "@/types";

export const runtime = "nodejs";

/**
 * Deploy orchestration for Cloudflare Pages:
 *   1. Re-validate the GitHub repo server-side (never trust the client).
 *   2. Create (or reuse) a Pages project wired to that repo.
 *   3. Trigger a real deployment from the production branch.
 * Step 2 is the one that fails with "github_not_connected" the first time a
 * Cloudflare account hasn't authorized the Pages GitHub App yet — the client
 * turns that into the "Hubungkan GitHub ke Cloudflare" step.
 */
export const POST = withErrorHandling(async (req: NextRequest) => {
  const body = (await req.json().catch(() => ({}))) as Partial<CreateCloudflareDeployRequest>;

  let projectName: string;
  let githubUrl: string;
  let cloudflareToken: string;
  let accountId: string;
  let githubPat: string | undefined;
  let buildCommand: string | undefined;
  let outputDir: string | undefined;
  try {
    projectName = requireString(body.projectName, "projectName");
    githubUrl = requireString(body.githubUrl, "githubUrl");
    cloudflareToken = requireString(body.cloudflareToken, "cloudflareToken");
    accountId = requireString(body.accountId, "accountId");
    githubPat = optionalString(body.githubPat);
    buildCommand = optionalString(body.buildCommand);
    outputDir = optionalString(body.outputDir);
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

  // Cloudflare Pages has no zero-config framework detection like Vercel —
  // if the caller didn't explicitly set a build command/output dir, fill in
  // Cloudflare's own documented preset for the detected framework.
  const preset = cloudflareBuildPreset(validation.framework);
  const effectiveBuildCommand = buildCommand || preset.buildCommand;
  const effectiveOutputDir = outputDir || preset.outputDir;

  // Same conflict guard as the Vercel flow: a project name already taken by
  // a *different* repo on this Cloudflare account is a real conflict.
  try {
    const existing = await getCloudflarePagesProject(accountId, projectName, cloudflareToken);
    if (existing.exists && existing.linkedRepoFullName && existing.linkedRepoFullName !== validation.fullName) {
      return fail(
        `Project "${projectName}" di Cloudflare Pages sudah terhubung ke repo lain (${existing.linkedRepoFullName}). ` +
          `Pakai nama project yang berbeda, atau deploy dari repo yang sama.`,
        409,
        "project_conflict"
      );
    }
    if (existing.exists) {
      // Already created & wired to the same repo — just kick off a fresh deployment.
      const deployment = await triggerCloudflareDeployment(accountId, projectName, cloudflareToken);
      return ok({ ...deployment, frameworkWarning: preset.warning }, 201);
    }
  } catch (e) {
    if (e instanceof CloudflareApiError) {
      const status = e.code === "invalid_token" ? 401 : e.code === "not_found" ? 404 : 502;
      return fail(e.message, status, e.code);
    }
    throw e;
  }

  try {
    await createCloudflarePagesProject({
      accountId,
      token: cloudflareToken,
      projectName,
      owner: validation.owner,
      repo: validation.repo,
      productionBranch: validation.defaultBranch,
      buildCommand: effectiveBuildCommand,
      outputDir: effectiveOutputDir,
      compatibilityFlags: preset.compatFlags,
    });
    const deployment = await triggerCloudflareDeployment(accountId, projectName, cloudflareToken);
    return ok({ ...deployment, frameworkWarning: preset.warning }, 201);
  } catch (e) {
    if (e instanceof CloudflareApiError) {
      const status =
        e.code === "invalid_token" ? 401 : e.code === "github_not_connected" ? 428 : e.code === "project_conflict" ? 409 : 502;
      return fail(e.message, status, e.code);
    }
    throw e;
  }
});
