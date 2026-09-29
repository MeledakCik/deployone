import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { rateLimit, clientIp } from "@/app/api/_lib/rate-limit";

export const config = {
  matcher: "/api/:path*",
};

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

/**
 * Applies to every /api/* request. Identifies the caller by session cookie
 * when present (so one user's usage doesn't collide with another behind
 * the same NAT/proxy IP), falling back to IP for anonymous requests (the
 * auth endpoints, github validate without login, etc).
 *
 * Fails open — see rateLimit()'s own comment — so a KV outage never takes
 * the whole API down, it just temporarily disables this extra layer.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const { bucket, limit, windowSeconds } = bucketFor(pathname);
  const sessionCookie = req.cookies.get("depup_session")?.value;
  const identifier = sessionCookie ? `s:${sessionCookie.slice(0, 40)}` : `ip:${clientIp(req)}`;

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
