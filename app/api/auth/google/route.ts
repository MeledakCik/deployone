import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import crypto from "crypto";
import { OAUTH_NEXT_COOKIE, OAUTH_STATE_COOKIE } from "@/app/api/_lib/session";
import { OAUTH_APP_COOKIE, isValidChallenge } from "@/app/api/_lib/app-handoff";
import { isMcpAuthorizeNext } from "@/app/api/_lib/mcp-token";

export const runtime = "nodejs";

/**
 * Redirects the browser straight to Google's real consent screen. The
 * client ID lives in env vars (never hardcoded) — see README for how to
 * create one and which redirect URI to register.
 */
export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;

  // Mode app mobile: dibuka dari Chrome Custom Tab, hasilnya dikembalikan lewat deep link.
  const appMode = req.nextUrl.searchParams.get("app") === "1";
  const challenge = req.nextUrl.searchParams.get("challenge");
  if (appMode && !isValidChallenge(challenge)) {
    return NextResponse.json({ ok: false, error: "Parameter challenge tidak valid." }, { status: 400 });
  }

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
  if (appMode && challenge) {
    res.cookies.set(OAUTH_APP_COOKIE, challenge, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 600 });
  } else {
    res.cookies.delete(OAUTH_APP_COOKIE);
  }
  // Login dari halaman admin / layar izin konektor Claude: ingat tujuannya. Whitelist ketat supaya tidak jadi open redirect
  // (konektor hanya boleh kembali ke "/connect/authorize?...", lihat isMcpAuthorizeNext).
  const nextParam = req.nextUrl.searchParams.get("next");
  if (nextParam === "/admin") {
    res.cookies.set(OAUTH_NEXT_COOKIE, "/admin", { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 600 });
  } else if (isMcpAuthorizeNext(nextParam)) {
    res.cookies.set(OAUTH_NEXT_COOKIE, nextParam, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 600 });
  } else {
    res.cookies.delete(OAUTH_NEXT_COOKIE);
  }
  return res;
}
