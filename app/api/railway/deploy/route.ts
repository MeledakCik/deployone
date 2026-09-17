import type { NextRequest } from "next/server";
import { ok, fail, withErrorHandling } from "@/app/api/_lib/response";
import { validateGithubRepo, GithubApiError } from "@/app/api/_lib/github";
import { createRailwayDeployment, getRailwayProject, RailwayApiError } from "@/app/api/_lib/railway";
import {
  requireString,
  optionalString,
  assertValidProjectName,
  BadRequestError,
} from "@/app/api/_lib/validators";
import type { CreateRailwayDeployRequest } from "@/types";

export const runtime = "nodejs";

const ENV_LINE_RE = /^([A-Z][A-Z0-9_]*)=(.*)$/;

/** Parses the "KEY=value per line" textarea format used by the Railway/Render deploy step. */
function parseEnvText(text: string | undefined): Record<string, string> {
  if (!text) return {};
  const env: Record<string, string> = {};
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = ENV_LINE_RE.exec(line);
    if (match) env[match[1]] = match[2];
  }
  return env;
}

/**
 * Deploy orchestration for Railway:
 *   1. Re-validate the GitHub repo server-side (never trust the client).
 *      Unlike the Vercel flow, a package.json isn't required — Railway can
 *      build Dockerfiles and many other stacks via Railpack.
 *   2. Create (or reuse) a Railway project + service wired to that repo and
 *      trigger a real deployment via the Railway GraphQL API.
 */
export const POST = withErrorHandling(async (req: NextRequest) => {
  const body = (await req.json().catch(() => ({}))) as Partial<CreateRailwayDeployRequest>;

  let projectName: string;
  let githubUrl: string;
  let railwayToken: string;
  let githubPat: string | undefined;
  try {
    projectName = requireString(body.projectName, "projectName");
    githubUrl = requireString(body.githubUrl, "githubUrl");
    railwayToken = requireString(body.railwayToken, "railwayToken");
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

  // Validates the token up front (and confirms the account is reachable)
  // before we start creating/mutating anything on Railway.
  try {
    await getRailwayProject(projectName, railwayToken);
  } catch (e) {
    if (e instanceof RailwayApiError) {
      const status = e.code === "invalid_token" ? 401 : e.code === "not_found" ? 404 : 502;
      return fail(e.message, status, e.code);
    }
    throw e;
  }

  try {
    const deployment = await createRailwayDeployment({
      projectName,
      owner: validation.owner,
      repo: validation.repo,
      ref: validation.defaultBranch,
      railwayToken,
      startCommand: optionalString(body.startCommand),
      env: parseEnvText(body.envText),
    });
    return ok(deployment, 201);
  } catch (e) {
    if (e instanceof RailwayApiError) {
      const status = e.code === "invalid_token" ? 401 : e.code === "not_found" ? 404 : 502;
      return fail(e.message, status, e.code);
    }
    throw e;
  }
});
