import type { NextRequest } from "next/server";
import { ok, fail, withErrorHandling } from "@/app/api/_lib/response";
import { deleteProjectEnv, upsertProjectEnv, VercelApiError } from "@/app/api/_lib/vercel";
import { requireString, BadRequestError } from "@/app/api/_lib/validators";
import type { UpsertEnvRequest } from "@/types";

export const runtime = "nodejs";

const ENV_KEY_RE = /^[A-Z][A-Z0-9_]*$/;

export const POST = withErrorHandling(async (req: NextRequest) => {
  const body = (await req.json().catch(() => ({}))) as Partial<UpsertEnvRequest>;

  let project: string;
  let key: string;
  let value: string;
  let vercelToken: string;
  try {
    project = requireString(body.project, "project");
    key = requireString(body.key, "key");
    value = requireString(body.value, "value");
    vercelToken = requireString(body.vercelToken, "vercelToken");
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
    await upsertProjectEnv(project, key, value, [...target], vercelToken);
    return ok({ key, project, target }, 201);
  } catch (e) {
    if (e instanceof VercelApiError) {
      const status = e.code === "invalid_token" ? 401 : e.code === "not_found" ? 404 : 502;
      return fail(e.message, status, e.code);
    }
    throw e;
  }
});

export const DELETE = withErrorHandling(async (req: NextRequest) => {
  const vercelToken = req.headers.get("x-vercel-token");
  const project = req.nextUrl.searchParams.get("project");
  const key = req.nextUrl.searchParams.get("key");

  if (!vercelToken) return fail("Header x-vercel-token wajib diisi.", 400, "bad_request");
  if (!project || !key) return fail("Query param project dan key wajib diisi.", 400, "bad_request");

  try {
    await deleteProjectEnv(project, key, vercelToken);
    return ok({ removed: true });
  } catch (e) {
    if (e instanceof VercelApiError) {
      const status = e.code === "invalid_token" ? 401 : e.code === "not_found" ? 404 : 502;
      return fail(e.message, status, e.code);
    }
    throw e;
  }
});
