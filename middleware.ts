import { NextResponse, type NextRequest } from "next/server";
import { rateLimit, clientIp } from "@/app/api/_lib/rate-limit";

export const config = {
  matcher: ["/api/:path*"],
};

/**
 * Batas per bucket: { prefix, limit, windowSeconds }. Dicek berurutan,
 * prefix paling spesifik HARUS di atas prefix yang lebih umum (mis.
 * "/api/auth/google" sebelum "/api/auth") karena find() ambil match
 * pertama.
 *
 * - /api/auth/google (initiate + callback OAuth): paling ketat, target
 *   empuk buat brute force / spam login.
 * - /api/deploy, /api/vercel/*, /api/github/*: proxy ke API pihak ketiga
 *   (Vercel/GitHub) — mahal (network + kena rate limit mereka juga), jadi
 *   dibatasi lebih rendah dibanding endpoint baca-data biasa.
 * - default: endpoint ringan (session check, dll).
 */
const BUCKETS: { prefix: string; limit: number; windowSeconds: number }[] = [
  { prefix: "/api/auth/google", limit: 15, windowSeconds: 60 },
  { prefix: "/api/auth", limit: 30, windowSeconds: 60 },
  { prefix: "/api/deploy", limit: 20, windowSeconds: 60 },
  { prefix: "/api/vercel", limit: 40, windowSeconds: 60 },
  { prefix: "/api/github", limit: 40, windowSeconds: 60 },
];
const DEFAULT_BUCKET = { prefix: "default", limit: 60, windowSeconds: 60 };

function resolveBucket(pathname: string) {
  return BUCKETS.find((b) => pathname.startsWith(b.prefix)) ?? DEFAULT_BUCKET;
}

// Body request di app ini semuanya kecil (nama project, token, key/value
// env, domain) — 256KB sudah sangat longgar, tapi cukup buat nolak upaya
// kirim payload raksasa (JSON-bomb) yang niatnya cuma bikin server sibuk
// parsing. Berbasis header Content-Length (dikirim otomatis oleh fetch()
// untuk body JSON biasa) — bukan proteksi mutlak untuk request tanpa
// Content-Length, tapi jadi lapisan pertama yang murah dan tidak butuh baca
// body-nya sendiri.
const MAX_BODY_BYTES = 256 * 1024;

function payloadTooLargeResponse() {
  return NextResponse.json(
    { ok: false, error: "Ukuran request terlalu besar.", code: "payload_too_large" },
    { status: 413 }
  );
}

function rateLimitedResponse(retryAfterSeconds: number) {
  return NextResponse.json(
    { ok: false, error: "Terlalu banyak request, coba lagi sebentar lagi.", code: "rate_limited" },
    { status: 429, headers: { "Retry-After": String(Math.max(1, retryAfterSeconds)) } }
  );
}

/**
 * Guard CSRF ringan: request yang mengubah state (bukan GET/HEAD/OPTIONS)
 * WAJIB origin-nya sama-host kalau header Origin ada. Browser modern selalu
 * kirim Origin untuk request cross-site, jadi ini cukup buat nolak form/fetch
 * dari domain lain yang nebeng cookie session user.
 *
 * Kalau header Origin tidak ada sama sekali (server-to-server, curl, atau
 * beberapa kasus same-origin lama) request DILOLOSKAN — lapisan pertahanan
 * utama tetap SameSite=Lax di cookie session (lihat app/api/_lib/session.ts).
 * Endpoint yang auth-nya pakai token di body/header (bukan cookie, mis.
 * /api/deploy, /api/vercel/*) tidak butuh proteksi ini juga tapi tidak masalah
 * kena karena mereka memang selalu dipanggil dari origin sendiri.
 */
function isCrossSiteWrite(req: NextRequest): boolean {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return false;
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host !== req.nextUrl.host;
  } catch {
    return true; // Origin header rusak/aneh -> anggap mencurigakan, tolak.
  }
}

export async function middleware(req: NextRequest) {
  const contentLength = req.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_BODY_BYTES) {
    return payloadTooLargeResponse();
  }

  if (isCrossSiteWrite(req)) {
    return NextResponse.json(
      { ok: false, error: "Request ditolak: Origin tidak cocok.", code: "cross_site_forbidden" },
      { status: 403 }
    );
  }

  const bucket = resolveBucket(req.nextUrl.pathname);
  const ip = clientIp(req);
  const result = await rateLimit(bucket.prefix, ip, bucket.limit, bucket.windowSeconds);

  if (!result.allowed) {
    return rateLimitedResponse(result.retryAfterSeconds);
  }

  const res = NextResponse.next();
  res.headers.set("X-RateLimit-Limit", String(result.limit));
  res.headers.set("X-RateLimit-Remaining", String(result.remaining));
  return res;
}
