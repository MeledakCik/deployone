import type { NextRequest } from "next/server";
import { ok, fail } from "@/app/api/_lib/response";
import { signSession, SESSION_COOKIE } from "@/app/api/_lib/session";
import { verifyHandoff } from "@/app/api/_lib/app-handoff";
import { isBlocked } from "@/app/api/_lib/admin";
import { isAdminEmail } from "@/app/api/_lib/admin-config";

export const runtime = "nodejs";

/**
 * Menukar token serah-terima (dari deep link) menjadi cookie session di WebView app.
 * Dipanggil via fetch POST dari dalam app, jadi Set-Cookie masuk ke cookie jar WebView.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { token?: unknown; verifier?: unknown } | null;
  const payload = verifyHandoff(body?.token, body?.verifier);
  if (!payload) return fail("Token login tidak valid atau sudah kedaluwarsa. Coba login lagi.", 401);

  try {
    if (!isAdminEmail(payload.email) && (await isBlocked(payload.email.trim().toLowerCase()))) {
      return fail("Akun ini dinonaktifkan oleh admin Depup.", 403);
    }
  } catch {
    /* fail-open, sama seperti callback web */
  }

  const maxAge = 60 * 60 * 24 * 30;
  const token = signSession({
    email: payload.email,
    name: payload.name,
    picture: payload.picture,
    exp: Math.floor(Date.now() / 1000) + maxAge,
  });
  const res = ok({ loggedIn: true });
  res.cookies.set(SESSION_COOKIE, token, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge });
  return res;
}
