import { NextRequest, NextResponse } from "next/server";

/**
 * PENTING: file ini SENGAJA tidak mengimpor apapun dari
 * app/api/_lib/store.ts. Logout HANYA boleh menghapus cookie session.
 * Data user di Vercel KV tidak pernah disentuh di sini.
 */

function clearedSessionCookie() {
  return {
    name: "depush_session",
    value: "",
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: 0, // expire immediately
    },
  };
}

export async function POST(_req: NextRequest) {
  const res = NextResponse.json({ ok: true });

  const cookie = clearedSessionCookie();
  res.cookies.set(cookie.name, cookie.value, cookie.options);

  return res;
}

// Kalau ada link logout via GET (mis. <a href="/api/auth/logout">),
// terapkan guard yang sama: hanya hapus cookie, redirect ke home.
export async function GET(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/", req.url));

  const cookie = clearedSessionCookie();
  res.cookies.set(cookie.name, cookie.value, cookie.options);

  return res;
}
