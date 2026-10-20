import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { rateLimit, clientIp } from "@/app/api/_lib/rate-limit";
import { slugFromHost, SLUG_RE } from "@/app/api/_lib/tunnel-host";
import { isAdminEmail } from "@/app/api/_lib/admin-config";
import { kv } from "@vercel/kv";

/**
 * Matcher mencakup SEMUA path (bukan cuma /api) karena fitur Link Gaib:
 * request ke https://<slug>.<TUNNEL_BASE_DOMAIN>/apa-saja — termasuk /api/*
 * dan /_next/* milik app si developer — harus di-rewrite ke tunnel, bukan
 * dilayani Depup. Untuk host biasa, non-/api langsung diteruskan (murah).
 */
export const config = {
  matcher: [
    // Host utama: semua path KECUALI aset statis (Vercel menyajikannya dari CDN tanpa menjalankan middleware).
    "/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|manifest\\.webmanifest|apple-touch-icon\\.png|icon-192\\.png|icon-512\\.png|icon-maskable-512\\.png|logo\\.png|email/|glassmorphic_dashboard_hero\\.svg).*)",
    // Host tunnel/situs (<awalan>-<5 huruf-angka acak>.<TUNNEL_BASE_DOMAIN>): SEMUA path, termasuk /_next/*
    // milik app si developer. Pola ini sama dengan format slug di tunnel.ts (randomSuffix) —
    // kalau format slug diubah, ubah juga regex ini.
    {
      source: "/:path*",
      has: [{ type: "host", value: "[a-z0-9-]*-[a-hj-km-np-z2-9]{5}\\..+" }],
    },
  ],
};

const SESSION_COOKIE = "depup_session";

/**
 * Hanya endpoint auth yang boleh diakses tanpa login (login Google,
 * callback, logout, dan cek session). Semua route /api/* lainnya — proxy
 * Vercel/Cloudflare/Railway, deploy, 【entity-github¦canonical_name=github】, user-data — WAJIB session valid,
 * supaya server ini tidak bisa dipakai orang luar sebagai proxy gratis.
 */
function isPublicPath(pathname: string): boolean {
  return (
    pathname === "/api/auth" ||
    pathname.startsWith("/api/auth/") ||
    // Laporan abuse boleh dari siapa saja (korban phishing tidak punya akun); dibatasi ketat per IP.
    pathname === "/api/abuse" ||
    // Berhenti berlangganan email: dibuka dari link email / klien email tanpa session; dilindungi token HMAC.
    pathname === "/api/unsubscribe" ||
    isTunnelClientPath(pathname)
  );
}

/**
 * Endpoint yang dipanggil CLI `depup share` (tanpa session browser). Mereka
 * punya autentikasi sendiri: bearer token per-tunnel (lihat _lib/tunnel.ts).
 */
function isTunnelClientPath(pathname: string): boolean {
  return /^\/api\/tunnel\/(create|poll|respond|close)\/?$/.test(pathname);
}

/** Poll & respond dipanggil sangat sering & sudah dilindungi token + TTL; jangan hitung ke rate limit global. */
function skipRateLimit(pathname: string): boolean {
  return (
    /^\/api\/tunnel\/(poll|respond|close)\/?$/.test(pathname) ||
    // Upload Link Instan mengirim belasan potongan berurutan; dibatasi per-user di route init.
    /^\/api\/sites\/[^/]+\/chunk\/?$/.test(pathname)
  );
}

/**
 * Stricter buckets for endpoints that are reachable without a session
 * (so they're the ones most exposed to brute-force / scraping) or that
 * proxy out to a third party we don't want to get rate-limited by
 * (GitHub, Google). Anything not listed falls back to DEFAULT_LIMIT.tes
 */
const CUSTOM_LIMITS: Record<string, { limit: number; windowSeconds: number }> = {
  "auth/google": { limit: 20, windowSeconds: 60 },
  "auth/app-exchange": { limit: 20, windowSeconds: 60 },
  "auth/session": { limit: 120, windowSeconds: 60 },
  "github/validate": { limit: 20, windowSeconds: 60 },
  "github/whoami": { limit: 20, windowSeconds: 60 },
  // Tiap pesan = 1 panggilan Groq berbayar/berkuota; batasi per pengguna.
  "support/chat": { limit: 12, windowSeconds: 60 },
  "support/report": { limit: 5, windowSeconds: 60 },
  // Memanggil Saweria pihak ketiga; jaga supaya tidak dipakai spam.
  "donate/create": { limit: 6, windowSeconds: 60 },
  "donate/status": { limit: 30, windowSeconds: 60 },
  // Tiap generate = 1 panggilan Groq; batasi per pengguna.
  "ai/site": { limit: 6, windowSeconds: 60 },
  "ai/key": { limit: 10, windowSeconds: 60 },
  // Pembuatan tunnel juga dibatasi per jam di route-nya sendiri.
  "tunnel/create": { limit: 20, windowSeconds: 60 },
  // Laporan abuse (publik): maks 5 per 10 menit per IP.
  abuse: { limit: 5, windowSeconds: 600 },
  // Publik (tanpa login): batasi per IP.
  unsubscribe: { limit: 20, windowSeconds: 600 },
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
 * Akun yang diblokir lewat panel admin (set Redis `admin:blocked`). Hasil di-cache 15 detik per
 * instance supaya tidak menambah 1 command Redis di tiap request. FAIL-OPEN kalau KV bermasalah.
 */
const BLOCK_CACHE_MS = 15_000;
const blockCache = new Map<string, { blocked: boolean; until: number }>();

async function isBlockedEdge(email: string): Promise<boolean> {
  const now = Date.now();
  const hit = blockCache.get(email);
  if (hit && hit.until > now) return hit.blocked;
  try {
    const blocked = (await kv.sismember("admin:blocked", email)) === 1;
    if (blockCache.size > 500) blockCache.clear();
    blockCache.set(email, { blocked, until: now + BLOCK_CACHE_MS });
    return blocked;
  } catch {
    return false;
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
  const { pathname, search } = req.nextUrl;
  const host = req.headers.get("host") || "";

  // ============ TAMBAHAN FIX SEO & DEPUSH LOGIC ============

  // 1. www.depup.web.id -> depup.web.id (fix GSC www mu)
  if (host === "www.depup.web.id" || host === "www.depup.app") {
    const newHost = host.replace(/^www\./, "");
    const url = req.nextUrl.clone();
    url.host = newHost;
    url.protocol = "https:";
    return NextResponse.redirect(url, 308);
  }

  // 2. depush.web.id TANPA subdomain = harusnya gak ada web, redirect ke depup
  // Sesuai maumu: depush.web.id kalau dibuka langsung -> kosong
  if (host === "depush.web.id") {
    const url = req.nextUrl.clone();
    url.host = "depup.web.id";
    url.protocol = "https:";
    url.pathname = "/";
    return NextResponse.redirect(url, 308);
  }

  // 3. *.depush.web.id (link instan) = kasih noindex biar gak ngerusak SEO depup & gak muncul di Ringkasan AI
  const isDepushSubdomain = host.endsWith(".depush.web.id");
  // ===========================================================

  // --- Link Gaib: https://<slug>.<TUNNEL_BASE_DOMAIN>/... -> /t/<slug>/... ---
  const hostSlug = slugFromHost(req.headers.get("host"));
  if (hostSlug) {
    const headers = new Headers(req.headers);
    headers.set("x-depup-target", pathname + search);
    const rewritten = new URL(`/t/${hostSlug}${pathname === "/" ? "" : pathname}`, req.url);
    // Kalau ini subdomain depush, tetap lanjut tapi nanti dikasih noindex di response
    const res = NextResponse.rewrite(rewritten, { request: { headers } });
    if (isDepushSubdomain) {
      res.headers.set("X-Robots-Tag", "noindex, nofollow");
    }
    return res;
  }

  // --- Link Gaib mode path: https://<host depup>/t/<slug>/... ---
  const tm = /^\/t\/([^/]+)(\/.*)?$/.exec(pathname);
  if (tm && SLUG_RE.test(tm[1])) {
    const headers = new Headers(req.headers);
    headers.set("x-depup-target", (tm[2] ?? "/") + search); // selalu ditimpa -> tidak bisa dipalsukan klien
    const res = NextResponse.next({ request: { headers } });
    if (isDepushSubdomain) {
      res.headers.set("X-Robots-Tag", "noindex, nofollow");
    }
    return res;
  }

  // --- Panel admin: gerbang di edge supaya status HTTP-nya benar (307 ke login / 404), bukan 200 ber-stream. ---
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const who = await verifySessionEdge(req.cookies.get(SESSION_COOKIE)?.value);
    if (!who) {
      const login = new URL("/api/auth/google", req.url);
      login.searchParams.set("next", "/admin");
      return NextResponse.redirect(login);
    }
    // Bukan admin: pura-pura halaman ini tidak ada.
    if (!isAdminEmail(who)) return NextResponse.rewrite(new URL("/__tidak-ada", req.url), { status: 404 });
    const res = NextResponse.next();
    res.headers.set("Cache-Control", "no-store");
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    if (isDepushSubdomain) res.headers.append("X-Robots-Tag", "noindex, nofollow");
    return res;
  }

  // Selain /api/*, middleware ini tidak melakukan apa-apa — KECUALI untuk depush subdomain kasih noindex
  if (pathname !== "/api" && !pathname.startsWith("/api/")) {
    if (isDepushSubdomain) {
      const res = NextResponse.next();
      res.headers.set("X-Robots-Tag", "noindex, nofollow");
      return res;
    }
    return NextResponse.next();
  }

  // Anti-CSRF: situs yang di-host Link Instan hidup di subdomain yang "same-site" dengan dashboard,
  // jadi cookie SameSite=Lax tetap terkirim dari sana. Tolak request yang mengubah data kalau
  // header Origin-nya bukan host Depup sendiri. (CLI tidak mengirim Origin, jadi tidak terpengaruh.)
  const origin = req.headers.get("origin");
  if (origin && !["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    let originHost = "";
    try {
      originHost = new URL(origin).host;
    } catch {
      /* origin tidak valid -> ditolak di bawah */
    }
    if (!originHost || originHost !== req.headers.get("host")) {
      return NextResponse.json(
        { ok: false, error: "Request lintas-origin ditolak.", code: "unauthorized" },
        { status: 403 }
      );
    }
  } else if (!origin && !["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    // Tanpa Origin (CLI tidak mengirimnya) tapi browser menandai request lintas-situs -> tolak.
    if (req.headers.get("sec-fetch-site") === "cross-site") {
      return NextResponse.json(
        { ok: false, error: "Request lintas-origin ditolak.", code: "unauthorized" },
        { status: 403 }
      );
    }
  }

  const email = await verifySessionEdge(req.cookies.get(SESSION_COOKIE)?.value);

  if (!email && !isPublicPath(pathname)) {
    return NextResponse.json(
      { ok: false, error: "Sesi login habis. Silakan login lagi.", code: "unauthorized" },
      { status: 401 }
    );
  }

  // 401 + code "unauthorized" -> klien memperlakukannya sebagai sesi habis dan kembali ke halaman login.
  if (email && !isPublicPath(pathname) && !isAdminEmail(email) && (await isBlockedEdge(email))) {
    return NextResponse.json(
      { ok: false, error: "Akun ini dinonaktifkan oleh admin Depup.", code: "unauthorized" },
      { status: 401 }
    );
  }

  if (skipRateLimit(pathname)) {
    const res = NextResponse.next();
    if (isDepushSubdomain) res.headers.set("X-Robots-Tag", "noindex, nofollow");
    return res;
  }

  // Cek session dipanggil di setiap load halaman dan hanya memverifikasi HMAC cookie (tanpa Redis).
  // Untuk user yang sudah terverifikasi, rate limit-nya cuma membuang 1 command Redis per load.
  if (email && req.method === "GET" && pathname === "/api/auth/session") {
    const res = NextResponse.next();
    if (isDepushSubdomain) res.headers.set("X-Robots-Tag", "noindex, nofollow");
    return res;
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
  if (isDepushSubdomain) {
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  return res;
}