import type { NextRequest } from "next/server";
import { ok, fail, withErrorHandling } from "@/app/api/_lib/response";
import { deleteCloudflareEnv, listCloudflareEnv, upsertCloudflareEnv, CloudflareApiError } from "@/app/api/_lib/cloudflare";
import { requireString, BadRequestError } from "@/app/api/_lib/validators";
import type { UpsertCloudflareEnvRequest } from "@/types";

export const runtime = "nodejs";

const ENV_KEY_RE = /^[A-Z][A-Z0-9_]*$/;

/** Lists every env var currently set on a real Cloudflare Pages project — used to sync-detect vars deleted directly on Cloudflare. */
export const GET = withErrorHandling(async (req: NextRequest) => {
  const cloudflareToken = req.headers.get("x-cloudflare-token");
  const project = req.nextUrl.searchParams.get("project");
  const accountId = req.nextUrl.searchParams.get("accountId");

  if (!cloudflareToken) return fail("Header x-cloudflare-token wajib diisi.", 400, "bad_request");
  if (!project || !accountId) return fail("Query param project dan accountId wajib diisi.", 400, "bad_request");

  try {
    const envs = await listCloudflareEnv(accountId, project, cloudflareToken);
    return ok(envs);
  } catch (e) {
    if (e instanceof CloudflareApiError) {
      const status = e.code === "invalid_token" ? 401 : e.code === "not_found" ? 404 : 502;
      return fail(e.message, status, e.code);
    }
    throw e;
  }
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const body = (await req.json().catch(() => ({}))) as Partial<UpsertCloudflareEnvRequest>;

  let project: string;
  let key: string;
  let value: string;
  let cloudflareToken: string;
  let accountId: string;
  try {
    project = requireString(body.project, "project");
    key = requireString(body.key, "key");
    value = requireString(body.value, "value");
    cloudflareToken = requireString(body.cloudflareToken, "cloudflareToken");
    accountId = requireString(body.accountId, "accountId");
  } catch (e) {
    if (e instanceof BadRequestError) return fail(e.message, 400, "bad_request");
    throw e;
  }

  if (!ENV_KEY_RE.test(key)) {
    return fail(
      'Key harus UPPER_SNAKE_CASE — huruf besar, angka, underscore, diawali huruf (contoh: "DATABASE_URL").',
      422,
      "bad_request"
    );
  }

  const target = Array.isArray(body.target) && body.target.length > 0 ? body.target : (["production", "preview"] as const);

  try {
    await upsertCloudflareEnv(accountId, project, key, value, [...target], cloudflareToken);
    return ok({ key, project, target }, 201);
  } catch (e) {
    if (e instanceof CloudflareApiError) {
      const status = e.code === "invalid_token" ? 401 : e.code === "not_found" ? 404 : 502;
      return fail(e.message, status, e.code);
    }
    throw e;
  }
});

export const DELETE = withErrorHandling(async (req: NextRequest) => {
  const cloudflareToken = req.headers.get("x-cloudflare-token");
  const project = req.nextUrl.searchParams.get("project");
  const accountId = req.nextUrl.searchParams.get("accountId");
  const key = req.nextUrl.searchParams.get("key");

  if (!cloudflareToken) return fail("Header x-cloudflare-token wajib diisi.", 400, "bad_request");
  if (!project || !accountId || !key) return fail("Query param project, accountId, dan key wajib diisi.", 400, "bad_request");

  try {
    await deleteCloudflareEnv(accountId, project, key, cloudflareToken);
    return ok({ removed: true });
  } catch (e) {
    if (e instanceof CloudflareApiError) {
      const status = e.code === "invalid_token" ? 401 : e.code === "not_found" ? 404 : 502;
      return fail(e.message, status, e.code);
    }
    throw e;
  }
});
