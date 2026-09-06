import type { NextRequest } from "next/server";
import { ok, fail, withErrorHandling } from "@/app/api/_lib/response";
import { getSessionEmail, isStoreSlice, storeGet, storeSet } from "@/app/api/_lib/store";

export const runtime = "nodejs";

/**
 * GET  /api/user-data?slice=history|domains|envVars|settingsTokens
 * PUT  /api/user-data  { slice, value }
 *
 * Replaces the old localStorage-based persistence for dashboard data.
 * Both are scoped to whoever is signed in (via the session cookie set by
 * /api/auth/google/callback), so switching devices/browsers while logged
 * into the same Google account shows the same data.
 */

export const GET = withErrorHandling(async (req: NextRequest) => {
  const email = getSessionEmail(req);
  if (!email) return fail("Belum login.", 401, "unauthorized");

  const slice = req.nextUrl.searchParams.get("slice");
  if (!isStoreSlice(slice)) {
    return fail("Parameter 'slice' tidak valid.", 400, "bad_request");
  }

  const value = await storeGet(email, slice);
  return ok({ value });
});

export const PUT = withErrorHandling(async (req: NextRequest) => {
  const email = getSessionEmail(req);
  if (!email) return fail("Belum login.", 401, "unauthorized");

  const body = (await req.json().catch(() => null)) as { slice?: unknown; value?: unknown } | null;
  if (!body || !isStoreSlice(body.slice)) {
    return fail("Parameter 'slice' tidak valid.", 400, "bad_request");
  }
  if (!("value" in body)) {
    return fail("Field 'value' wajib diisi.", 400, "bad_request");
  }

  await storeSet(email, body.slice, body.value);
  return ok({ saved: true });
});
