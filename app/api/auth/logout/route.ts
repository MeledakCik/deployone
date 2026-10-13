import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ok } from "@/app/api/_lib/response";
import { SESSION_COOKIE } from "@/app/api/_lib/session";

export const runtime = "nodejs";

/**
 * PENTING: file ini SENGAJA tidak mengimpor apapun dari
 * app/api/_lib/store.ts. Logout HANYA boleh menghapus cookie session.
 * Data user (history, domains, envVars, settingsTokens) di Vercel KV
 * tidak pernah disentuh di sini, apapun yang terjadi.
 */

function clearSessionCookie<T>(res: NextResponse<T>) {
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0, // expire immediately
  });
}

export async function POST(_req: NextRequest) {
  const res = ok({ loggedOut: true });
  clearSessionCookie(res);
  return res;
}

// Kalau suatu saat ada link logout via GET (mis. <a href="/api/auth/logout">),
// guard yang sama tetap berlaku: hanya hapus cookie, lalu redirect ke home.
export async function GET(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/", req.url));
  clearSessionCookie(res);
  return res;
}
