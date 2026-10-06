import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { rateLimit, clientIp } from "@/app/api/_lib/rate-limit";

export const config = {
  matcher: "/api/:path*",
};

const SESSION_COOKIE = "depup_session";

/**
 * Hanya endpoint auth yang boleh diakses tanpa login (login Google,
 * callback, logout, dan cek session). Semua route /api/* lainnya — proxy
 * Vercel/Cloudflare/Railway, deploy, github, user-data — WAJIB session valid,
 * supaya server ini tidak bisa dipakai orang luar sebagai proxy gratis.
 */
function isPublicPath(pathname: string): boolean {
  return pathname === "/api/auth" || pathname.startsWith("/api/auth/");
}

/**
 * Stricter buckets for endpoints that are reachable without a session
 * (so they're the ones most exposed to brute-force / scraping) or that
 * proxy out to a third party we don't want to get rate-limited by
 * (GitHub, Google). Anything not listed falls back to DEFAULT_LIMIT.
 */
const CUSTOM_LIMITS: Record<string, { limit: number; windowSeconds: number }> = {
  "auth/google": { limit: 20, windowSeconds: 60 },
  "auth/session": { limit: 120, windowSeconds: 60 },
  "github/validate": { limit: 20, windowSeconds: 60 },
  "github/whoami": { limit: 20, windowSeconds: 60 },
  // Tiap pesan = 1 panggilan Groq berbayar/berkuota; batasi per pengguna.
  "support/chat": { limit: 12, windowSeconds: 60 },
  // Memanggil Saweria pihak ketiga; jaga supaya tidak dipakai spam.
  "donate/create": { limit: 6, windowSeconds: 60 },
  "donate/status": { limit: 30, windowSeconds: 60 },
};

const DEFAULT_LIMIT = { limit: 60, windowSeconds: 60 };

function bucketFor(pathname: string): { bucket: string; limit: number; windowSeconds: number } {
  const rest = pathname.replace(/^\/api\//, "");
  const segments = rest.split("/").filter(Boolean);
  const twoSeg = segments.slice(0, 2).join("/");
  const oneSeg = segments[0] ?? "root";
  const custom = CUSTOM_LIMITS[twoSeg];
  const { limit, windowSeconds } = custom ?? DEFAULT_LIMIT;
  return { bucket: custom ? twoSeg : oneSeg, limit, windowSeconds };
}

/* ---------- verifikasi session di edge (Web Crypto, bukan node:crypto) ---------- */

function toBase64Url(buf: ArrayBuffer): string {
  let s = "";
  new Uint8Array(buf).forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(input: string): string {
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  const bin = atob(padded);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Sama persis dengan verifySession() di app/api/_lib/session.ts, versi edge. */
async function verifySessionEdge(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) return null;

  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const expected = toBase64Url(
      await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body))
    );
    if (!safeEqual(sig, expected)) return null;

    const payload = JSON.parse(fromBase64Url(body)) as { email?: string; exp?: number };
    if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) return null;
    if (!payload.email) return null;
    return payload.email.trim().toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Berlaku untuk setiap request /api/*:
 * 1. Selain endpoint auth, wajib session valid (401 kalau tidak).
 * 2. Rate limit — identitas dari email session yang SUDAH TERVERIFIKASI
 *    (bukan isi cookie mentah, yang bisa dipalsukan untuk ganti bucket),
 *    fallback ke IP untuk request anonim (endpoint auth).
 *
 * Rate limit fail-open — lihat komentar rateLimit() — jadi KV down tidak
 * mematikan API. Gerbang session TIDAK fail-open.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const email = await verifySessionEdge(req.cookies.get(SESSION_COOKIE)?.value);

  if (!email && !isPublicPath(pathname)) {
    return NextResponse.json(
      { ok: false, error: "Sesi login habis. Silakan login lagi.", code: "unauthorized" },
      { status: 401 }
    );
  }

  const { bucket, limit, windowSeconds } = bucketFor(pathname);
  const identifier = email ? `u:${email}` : `ip:${clientIp(req)}`;

  const result = await rateLimit(bucket, identifier, limit, windowSeconds);

  if (!result.allowed) {
    return NextResponse.json(
      { ok: false, error: "Terlalu banyak request. Coba lagi sebentar lagi.", code: "rate_limited" },
      {
        status: 429,
        headers: {
          "Retry-After": String(result.retryAfterSeconds),
          "X-RateLimit-Limit": String(result.limit),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  const res = NextResponse.next();
  res.headers.set("X-RateLimit-Limit", String(result.limit));
  res.headers.set("X-RateLimit-Remaining", String(result.remaining));
  return res;
}
