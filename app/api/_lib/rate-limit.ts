import { kv } from "@vercel/kv";

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  /** Berapa detik lagi sampai window reset — dipakai buat header Retry-After. */
  retryAfterSeconds: number;
}

/**
 * Fixed-window rate limiter pakai Vercel KV (Redis) — sengaja bukan sliding
 * window supaya cukup 1 kv.incr per request (murah, cocok jalan di edge
 * middleware untuk SETIAP request /api/*).
 *
 * FAIL-OPEN: kalau KV tidak bisa diakses (mis. KV_REST_API_URL/TOKEN belum
 * di-set saat dev lokal), request tetap diloloskan dan cuma di-log —
 * rate limiting itu proteksi tambahan, bukan boleh jadi single point of
 * failure yang bikin seluruh API down kalau KV lagi bermasalah.
 */
export async function rateLimit(
  bucket: string,
  identifier: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const windowStart = Math.floor(nowSeconds / windowSeconds);
  const key = `ratelimit:${bucket}:${identifier}:${windowStart}`;
  const retryAfterSeconds = windowSeconds - (nowSeconds % windowSeconds);

  try {
    const count = await kv.incr(key);
    if (count === 1) {
      // TTL cuma di-set sekali, pas key baru dibuat, biar tidak keperpanjang
      // terus tiap request masuk di window yang sama.
      await kv.expire(key, windowSeconds);
    }
    return {
      allowed: count <= limit,
      limit,
      remaining: Math.max(0, limit - count),
      retryAfterSeconds,
    };
  } catch (err) {
    console.error("[rate-limit] KV tidak bisa diakses, fail-open:", err);
    return { allowed: true, limit, remaining: limit, retryAfterSeconds: 0 };
  }
}

/** Ambil IP client dari header proxy standar (Vercel selalu set x-forwarded-for). */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}
