import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { signSession, SESSION_COOKIE, OAUTH_STATE_COOKIE, OAUTH_NEXT_COOKIE } from "@/app/api/_lib/session";
import { getSettings, isBlocked, isKnownUser, recordLogin } from "@/app/api/_lib/admin";
import { isAdminEmail } from "@/app/api/_lib/admin-config";

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

  function fail(message: string) {
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
    return fail("Akun Google tidak punya email publik yang bisa dipakai.");
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
      console.error("[auth] pengecekan admin gagal (diabaikan)", (e as Error)?.message);
    }
  }
  try {
    await recordLogin({ email: loginEmail, name: profile.name ?? profile.email, picture: profile.picture ?? null });
  } catch (e) {
    console.error("[auth] gagal mencatat login", (e as Error)?.message);
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

  const wantsAdmin = req.cookies.get(OAUTH_NEXT_COOKIE)?.value === "/admin" && adminLogin;
  const res = NextResponse.redirect(new URL(wantsAdmin ? "/admin" : "/dashboard", req.url));
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
