import type { NextRequest } from "next/server";
import { ok, fail, withErrorHandling } from "@/app/api/_lib/response";
import { deleteRenderEnv, listRenderEnv, upsertRenderEnv, RenderApiError } from "@/app/api/_lib/render";
import { requireString, BadRequestError } from "@/app/api/_lib/validators";
import type { UpsertRenderEnvRequest } from "@/types";

export const runtime = "nodejs";

const ENV_KEY_RE = /^[A-Z][A-Z0-9_]*$/;

/** Lists every variable key currently set on a real Render service. */
export const GET = withErrorHandling(async (req: NextRequest) => {
  const renderToken = req.headers.get("x-render-token");
  const project = req.nextUrl.searchParams.get("project");

  if (!renderToken) return fail("Header x-render-token wajib diisi.", 400, "bad_request");
  if (!project) return fail("Query param project wajib diisi.", 400, "bad_request");

  try {
    const keys = await listRenderEnv(project, renderToken);
    return ok(keys.map((key) => ({ key })));
  } catch (e) {
    if (e instanceof RenderApiError) {
      const status = e.code === "invalid_token" ? 401 : e.code === "not_found" ? 404 : 502;
      return fail(e.message, status, e.code);
    }
    throw e;
  }
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const body = (await req.json().catch(() => ({}))) as Partial<UpsertRenderEnvRequest>;

  let project: string;
  let key: string;
  let value: string;
  let renderToken: string;
  try {
    project = requireString(body.project, "project");
    key = requireString(body.key, "key");
    value = requireString(body.value, "value");
    renderToken = requireString(body.renderToken, "renderToken");
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

  try {
    await upsertRenderEnv(project, key, value, renderToken);
    return ok({ key, project }, 201);
  } catch (e) {
    if (e instanceof RenderApiError) {
      const status = e.code === "invalid_token" ? 401 : e.code === "not_found" ? 404 : 502;
      return fail(e.message, status, e.code);
    }
    throw e;
  }
});

export const DELETE = withErrorHandling(async (req: NextRequest) => {
  const renderToken = req.headers.get("x-render-token");
  const project = req.nextUrl.searchParams.get("project");
  const key = req.nextUrl.searchParams.get("key");

  if (!renderToken) return fail("Header x-render-token wajib diisi.", 400, "bad_request");
  if (!project || !key) return fail("Query param project dan key wajib diisi.", 400, "bad_request");

  try {
    await deleteRenderEnv(project, key, renderToken);
    return ok({ removed: true });
  } catch (e) {
    if (e instanceof RenderApiError) {
      const status = e.code === "invalid_token" ? 401 : e.code === "not_found" ? 404 : 502;
      return fail(e.message, status, e.code);
    }
    throw e;
  }
});
