import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { signSession, SESSION_COOKIE, OAUTH_STATE_COOKIE } from "@/app/api/_lib/session";

export const runtime = "nodejs";

interface GoogleTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

interface GoogleProfile {
  email?: string;
  name?: string;
  picture?: string;
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const savedState = req.cookies.get(OAUTH_STATE_COOKIE)?.value;

  function fail(message: string) {
    const url = new URL("/", req.url);
    url.searchParams.set("login_error", message);
    const res = NextResponse.redirect(url);
    res.cookies.delete(OAUTH_STATE_COOKIE);
    return res;
  }

  if (!code || !state || !savedState || state !== savedState) {
    return fail("Login Google gagal — state tidak cocok, coba login lagi.");
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return fail("Google OAuth belum dikonfigurasi lengkap di server.");
  }

  const redirectUri = new URL("/api/auth/google/callback", req.url).toString();

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const tokenData = (await tokenRes.json().catch(() => ({}))) as GoogleTokenResponse;
  if (!tokenRes.ok || !tokenData.access_token) {
    return fail(tokenData.error_description ?? "Gagal menukar kode otorisasi dengan Google.");
  }

  const profileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  if (!profileRes.ok) {
    return fail("Gagal mengambil profil akun Google.");
  }
  const profile = (await profileRes.json()) as GoogleProfile;

  if (!profile.email) {
    return fail("Akun Google tidak punya email publik yang bisa dipakai.");
  }

  let sessionToken: string;
  try {
    sessionToken = signSession({
      email: profile.email,
      name: profile.name ?? profile.email,
      picture: profile.picture ?? null,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30, // 30 hari
    });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Gagal membuat session.");
  }

  const res = NextResponse.redirect(new URL("/dashboard", req.url));
  res.cookies.set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  res.cookies.delete(OAUTH_STATE_COOKIE);
  return res;
}
