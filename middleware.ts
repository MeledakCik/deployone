import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { rateLimit, clientIp } from "@/app/api/_lib/rate-limit";
import { slugFromHost, slugFromReferer, isTunnelSlug, tunnelPathHost, sameHost, SLUG_RE } from "@/app/api/_lib/tunnel-host";
import { isAdminEmail } from "@/app/api/_lib/admin-config";
import { kv } from "@vercel/kv";
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|manifest\\.webmanifest|apple-touch-icon\\.png|icon-128\\.png|icon-192\\.png|icon-512\\.png|icon-maskable-512\\.png|logo\\.png|logo-lime\\.png|logo-white\\.png|og-image\\.png|email/|glassmorphic_dashboard_hero\\.svg).*)",
    {
      source: "/:path*",
      has: [{ type: "host", value: "[a-z0-9-]*-[a-hj-km-np-z2-9]{5}\\..+" }],
    },
    // Link Gaib mode path: aset & request ber-URL absolut dari halaman tunnel (/_next/static, /logo.png, dst.)
    // juga harus lewat middleware supaya diteruskan ke tunnel, bukan dilayani Depup.
    {
      source: "/:path*",
      has: [{ type: "header", key: "referer", value: ".*/t/[a-z0-9-]*-[a-hj-km-np-z2-9]{5}([/?#].*)?" }],
    },
    {
      source: "/:path*",
      has: [{ type: "header", key: "referer", value: "https?://[^/]+/[a-z0-9-]*-[a-hj-km-np-z2-9]{5}([/?#].*)?" }],
    },
  ],
};

const SESSION_COOKIE = "depup_session";

/**
 * Teruskan request ke handler tunnel /t/<slug>. x-depup-target = path asli pengunjung,
 * x-depup-prefix = awalan URL publik tunnel (untuk menulis ulang redirect & cookie). Keduanya selalu
 * ditimpa di sini, jadi tidak bisa dipalsukan klien.
 */
// Penanda internal: request hasil rewrite tunnelRewrite bisa melewati middleware lagi (path /t/...).
// Nilainya acak per proses, jadi klien tidak bisa memalsukannya.
const TUNNEL_RW_NONCE = crypto.randomUUID();

function tunnelRewrite(req: NextRequest, slug: string, target: string, prefix: string): NextResponse {
  const headers = new Headers(req.headers);
  headers.set("x-depup-rw", TUNNEL_RW_NONCE);
  headers.set("x-depup-target", target);
  headers.set("x-depup-prefix", prefix);
  const path = target.split("?")[0];
  const rewritten = new URL(`/t/${slug}${path === "/" ? "" : path}`, req.url);
  const res = NextResponse.rewrite(rewritten, { request: { headers } });
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}
function isPublicPath(pathname: string): boolean {
  return (
    pathname === "/api/auth" ||
    pathname.startsWith("/api/auth/") ||
    pathname === "/api/abuse" ||
    pathname === "/api/unsubscribe" ||
    isTunnelClientPath(pathname)
  );
}

function isDbOwnAuthPath(pathname: string): boolean {
  return /^\/api\/databases\/[a-z0-9]{16}(\/|$)/.test(pathname);
}
function isDbRestApiPath(pathname: string): boolean {
  return /^\/api\/v1\/db\/[a-z0-9]{16}\/query\/?$/.test(pathname);
}
function isMcpOwnAuthPath(pathname: string): boolean {
  return /^\/api\/mcp(\/oauth\/(register|token))?\/?$/.test(pathname);
}

function isTunnelClientPath(pathname: string): boolean {
  return /^\/api\/tunnel\/(create|poll|respond|close)\/?$/.test(pathname);
}
function skipRateLimit(pathname: string): boolean {
  return (
    /^\/api\/tunnel\/(poll|respond|close)\/?$/.test(pathname) ||
    /^\/api\/sites\/[^/]+\/chunk\/?$/.test(pathname)
  );
}
const CUSTOM_LIMITS: Record<string, { limit: number; windowSeconds: number }> = {
  "auth/google": { limit: 20, windowSeconds: 60 },
  "auth/app-exchange": { limit: 20, windowSeconds: 60 },
  "auth/session": { limit: 120, windowSeconds: 60 },
  "github/validate": { limit: 20, windowSeconds: 60 },
  "github/whoami": { limit: 20, windowSeconds: 60 },
  "support/chat": { limit: 12, windowSeconds: 60 },
  "support/report": { limit: 5, windowSeconds: 60 },
  "donate/create": { limit: 6, windowSeconds: 60 },
  "donate/status": { limit: 30, windowSeconds: 60 },
  "ai/site": { limit: 30, windowSeconds: 60 }, // mesin lokal: murah, tidak memanggil AI luar
  "ai/key": { limit: 10, windowSeconds: 60 },
  convert: { limit: 40, windowSeconds: 60 },
  "tunnel/create": { limit: 20, windowSeconds: 60 },
  abuse: { limit: 5, windowSeconds: 600 },
  unsubscribe: { limit: 20, windowSeconds: 600 },
};

const DEFAULT_LIMIT = { limit: 60, windowSeconds: 60 };

function bucketFor(pathname: string): { bucket: string; limit: number; windowSeconds: number } {
  const rest = pathname.replace(/^\/api\//, "");
  const segments = rest.split("/").filter(Boolean);
  const twoSeg = segments.slice(0, 2).join("/");
  const oneSeg = segments[0] ?? "root";
  if (oneSeg === "databases") return { bucket: "databases", limit: 240, windowSeconds: 60 };
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

async function verifySessionEdge(token: string | undefined): Promise<string | null> {
  if (!token || token.length > 4096) return null;
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
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

    const payload = JSON.parse(fromBase64Url(body)) as { email?: string; exp?: number; dev?: boolean };
    if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) return null;
    if (typeof payload.email !== "string" || !payload.email) return null;
    if (payload.dev === true && process.env.NODE_ENV !== "development") return null;
    return payload.email.trim().toLowerCase();
  } catch {
    return null;
  }
}
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
export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const host = req.headers.get("host") || "";
  if (host === "www.depup.cloud" || host === "www.depup.app") {
    const newHost = host.replace(/^www\./, "");
    const url = req.nextUrl.clone();
    url.host = newHost;
    url.protocol = "https:";
    return NextResponse.redirect(url, 308);
  }
  if (host === "depup.web.id") {
    const url = req.nextUrl.clone();
    url.host = "depup.cloud";
    url.protocol = "https:";
    url.pathname = "/";
    return NextResponse.redirect(url, 308);
  }
  const isDepushSubdomain = host.endsWith(".depup.web.id");
  const hostSlug = slugFromHost(req.headers.get("host"));
  if (hostSlug) {
    const headers = new Headers(req.headers);
    headers.set("x-depup-target", pathname + search);
    headers.set("x-depup-prefix", "");
    const rewritten = new URL(`/t/${hostSlug}${pathname === "/" ? "" : pathname}`, req.url);
    const res = NextResponse.rewrite(rewritten, { request: { headers } });
    if (isDepushSubdomain) {
      res.headers.set("X-Robots-Tag", "noindex, nofollow");
    }
    return res;
  }

  /* ---------- Link Gaib mode path (ala ngrok) ---------- */
  const reqHost = req.headers.get("host");
  const pathHost = tunnelPathHost();
  const onPathHost = !!pathHost && sameHost(reqHost, pathHost);

  // Host khusus tunnel (TUNNEL_PATH_HOST): /<slug>/... -> /t/<slug>/...
  if (onPathHost) {
    const pm = /^\/([^/]+)(\/.*)?$/.exec(pathname);
    if (pm && isTunnelSlug(pm[1])) {
      return tunnelRewrite(req, pm[1], (pm[2] ?? "/") + search, "/" + pm[1]);
    }
  }

  // Request ber-URL absolut dari halaman tunnel ("/style.css", "/_next/...", fetch("/api/..."), <a href="/about">)
  // dikenali dari Referer, lalu diteruskan ke tunnel yang sama. Tanpa ini request itu jatuh ke route Depup:
  // 404, atau "Sesi login habis" / login Google Depup untuk /api dan /dashboard.
  const isTunnelPath = /^\/t\/[^/]+(\/|$)/.test(pathname);
  if (!isTunnelPath && pathname !== "/laporkan") {
    const refSlug = slugFromReferer(req.headers.get("referer"), reqHost, onPathHost);
    if (refSlug) {
      const prefix = onPathHost ? `/${refSlug}` : `/t/${refSlug}`;
      const mode = req.headers.get("sec-fetch-mode");
      const dest = req.headers.get("sec-fetch-dest");
      const isNavigation = mode === "navigate" || dest === "document" || dest === "iframe";
      if (isNavigation) {
        // Navigasi: arahkan ke URL tunnel yang benar supaya address bar & Referer berikutnya tetap di dalam tunnel.
        // Location relatif: tetap di host yang dibuka pengunjung (req.nextUrl bisa memakai nama host lain di dev/proxy).
        // Origin diambil dari Referer (sudah dipastikan host-nya sama), supaya pengunjung tetap di host yang ia buka.
        const location = `${new URL(req.headers.get("referer") as string).origin}${prefix}${pathname}${search}`;
        return new NextResponse(null, {
          status: 307,
          headers: { location, "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" },
        });
      }
      return tunnelRewrite(req, refSlug, pathname + search, prefix);
    }
  }

  // Host khusus tunnel tidak melayani halaman Depup lain.
  if (onPathHost) {
    return new NextResponse("Link tidak ditemukan. Periksa lagi alamat Link Gaib-nya.", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8", "x-robots-tag": "noindex, nofollow" },
    });
  }

  const tm = /^\/t\/([^/]+)(\/.*)?$/.exec(pathname);
  if (tm && SLUG_RE.test(tm[1]) && req.headers.get("x-depup-rw") === TUNNEL_RW_NONCE) {
    // Sudah diproses tunnelRewrite: pertahankan target & awalan yang ditetapkan di sana.
    return NextResponse.next();
  }
  if (tm && SLUG_RE.test(tm[1])) {
    const headers = new Headers(req.headers);
    headers.delete("x-depup-rw");
    headers.set("x-depup-target", (tm[2] ?? "/") + search); // selalu ditimpa -> tidak bisa dipalsukan klien
    headers.set("x-depup-prefix", `/t/${tm[1]}`);
    const res = NextResponse.next({ request: { headers } });
    if (isDepushSubdomain) {
      res.headers.set("X-Robots-Tag", "noindex, nofollow");
    }
    return res;
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const who = await verifySessionEdge(req.cookies.get(SESSION_COOKIE)?.value);
    if (!who) {
      const login = new URL("/api/auth/google", req.url);
      login.searchParams.set("next", "/admin");
      return NextResponse.redirect(login);
    }
    if (!isAdminEmail(who)) return NextResponse.rewrite(new URL("/__tidak-ada", req.url), { status: 404 });
    const res = NextResponse.next();
    res.headers.set("Cache-Control", "no-store");
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    if (isDepushSubdomain) res.headers.append("X-Robots-Tag", "noindex, nofollow");
    return res;
  }

  if (pathname !== "/api" && !pathname.startsWith("/api/")) {
    if (isDepushSubdomain) {
      const res = NextResponse.next();
      res.headers.set("X-Robots-Tag", "noindex, nofollow");
      return res;
    }
    return NextResponse.next();
  }

  if (isDbRestApiPath(pathname)) return NextResponse.next();
  if (isMcpOwnAuthPath(pathname)) return NextResponse.next();
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
    if (req.headers.get("sec-fetch-site") === "cross-site") {
      return NextResponse.json(
        { ok: false, error: "Request lintas-origin ditolak.", code: "unauthorized" },
        { status: 403 }
      );
    }
  }

  const email = await verifySessionEdge(req.cookies.get(SESSION_COOKIE)?.value);

  if (!email && !isPublicPath(pathname) && !isDbOwnAuthPath(pathname)) {
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