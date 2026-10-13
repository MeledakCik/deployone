import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import crypto from "crypto";
import { OAUTH_STATE_COOKIE } from "@/app/api/_lib/session";

export const runtime = "nodejs";

/**
 * Redirects the browser straight to Google's real consent screen. The
 * client ID lives in env vars (never hardcoded) — see README for how to
 * create one and which redirect URI to register.
 */
export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!clientId) {
    const url = new URL("/", req.url);
    url.searchParams.set(
      "login_error",
      "Google OAuth belum dikonfigurasi di server (GOOGLE_CLIENT_ID kosong)."
    );
    return NextResponse.redirect(url);
  }

  const state = crypto.randomBytes(16).toString("hex");
  const redirectUri = new URL("/api/auth/google/callback", req.url).toString();

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("prompt", "select_account");

  const res = NextResponse.redirect(authUrl.toString());
  res.cookies.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
