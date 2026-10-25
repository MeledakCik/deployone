import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { signSession, SESSION_COOKIE, OAUTH_STATE_COOKIE, OAUTH_NEXT_COOKIE } from "@/app/api/_lib/session";
import { getSettings, isBlocked, isKnownUser, recordLogin } from "@/app/api/_lib/admin";
import { isAdminEmail } from "@/app/api/_lib/admin-config";
import { isMcpAuthorizeNext } from "@/app/api/_lib/mcp-token";
import {
  OAUTH_APP_COOKIE,
  appDeepLink,
  appReturnHtml,
  isValidChallenge,
  signHandoff,
} from "@/app/api/_lib/app-handoff";

export const runtime = "nodejs";

interface GoogleTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

interface GoogleProfile {
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const savedState = req.cookies.get(OAUTH_STATE_COOKIE)?.value;

  // Login dimulai dari app mobile? (cookie ini hanya diset oleh /api/auth/google?app=1)
  const appChallenge = req.cookies.get(OAUTH_APP_COOKIE)?.value;
  const appMode = isValidChallenge(appChallenge);

  function appReturn(params: { token?: string; error?: string }) {
    const res = new NextResponse(appReturnHtml(appDeepLink(params), !!params.error), {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
    });
    res.cookies.delete(OAUTH_STATE_COOKIE);
    res.cookies.delete(OAUTH_NEXT_COOKIE);
    res.cookies.delete(OAUTH_APP_COOKIE);
    return res;
  }

  function fail(message: string) {
    if (appMode) return appReturn({ error: message });
    const url = new URL("/", req.url);
    url.searchParams.set("login_error", message);
    const res = NextResponse.redirect(url);
    res.cookies.delete(OAUTH_STATE_COOKIE);
    res.cookies.delete(OAUTH_NEXT_COOKIE);
    return res;
  }

  const stateOk =
    !!state &&
    !!savedState &&
    state.length === savedState.length &&
    timingSafeEqual(Buffer.from(state), Buffer.from(savedState));
  if (!code || !stateOk) {
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
    return fail("Akun Google tidak memiliki email publik yang bisa dipakai.");
  }

  if (profile.email_verified === false) {
    return fail("Email akun Google ini belum terverifikasi.");
  }

  // Kontrol admin: akun yang diblokir tidak bisa login; pendaftaran baru bisa ditutup.
  // Semua pengecekan fail-open — kalau KV bermasalah, login tetap jalan.
  const loginEmail = profile.email.trim().toLowerCase();
  const adminLogin = isAdminEmail(loginEmail);
  if (!adminLogin) {
    try {
      if (await isBlocked(loginEmail)) return fail("Akun ini dinonaktifkan oleh admin Depup.");
      const settings = await getSettings();
      if (!settings.signupOpen && !(await isKnownUser(loginEmail))) {
        return fail("Pendaftaran akun baru sedang ditutup sementara. Coba lagi nanti.");
      }
    } catch (e) {
      console.error("[auth] pemeriksaan admin gagal (diabaikan)", (e as Error)?.message);
    }
  }
  try {
    await recordLogin({ email: loginEmail, name: profile.name ?? profile.email, picture: profile.picture ?? null });
  } catch (e) {
    console.error("[auth] gagal mencatat login", (e as Error)?.message);
  }

  if (appMode) {
    try {
      return appReturn({
        token: signHandoff(
          { email: profile.email, name: profile.name ?? profile.email, picture: profile.picture ?? null },
          appChallenge
        ),
      });
    } catch (e) {
      return fail(e instanceof Error ? e.message : "Gagal membuat token login.");
    }
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

  const nextCookie = req.cookies.get(OAUTH_NEXT_COOKIE)?.value;
  const wantsAdmin = nextCookie === "/admin" && adminLogin;
  // Login yang dimulai dari layar izin konektor Claude kembali ke layar itu (bukan ke dashboard).
  const connectNext = isMcpAuthorizeNext(nextCookie) ? nextCookie : null;
  const res = NextResponse.redirect(new URL(wantsAdmin ? "/admin" : connectNext ?? "/dashboard", req.url));
  res.cookies.set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  res.cookies.delete(OAUTH_STATE_COOKIE);
  res.cookies.delete(OAUTH_NEXT_COOKIE);
  return res;
}
