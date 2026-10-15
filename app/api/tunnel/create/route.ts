import { kv } from "@vercel/kv";
import { fail, ok, withErrorHandling } from "@/app/api/_lib/response";
import { clientIp, rateLimit } from "@/app/api/_lib/rate-limit";
import { getSettings, recordStat } from "@/app/api/_lib/admin";
import {
  SLUG_RE,
  TUNNEL_RESERVED,
  clampTtl,
  kMeta,
  newToken,
  randomPrefix,
  randomSuffix,
  sanitizePrefix,
  sha256,
  tunnelBaseDomain,
  tunnelEnabled,
  type TunnelMeta,
} from "@/app/api/_lib/tunnel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Wajib: Next 14 meng-cache fetch POST di dalam route handler GET, dan klien KV (Upstash) memakai fetch —
// tanpa ini lpop/get yang sama terus mengembalikan hasil lama dari cache.
export const fetchCache = "force-no-store";

/**
 * POST /api/tunnel/create — dipanggil CLI (`depup share`), TANPA session
 * browser (lihat isPublicPath di middleware.ts). Dibatasi per IP.
 * Body: { port: number, name?: string, ttlMinutes?: number }
 */
export const POST = withErrorHandling(async (req: Request) => {
  if (!tunnelEnabled() || !(await getSettings()).tunnelEnabled) {
    return fail("Fitur Link Gaib sedang dimatikan oleh admin Depup.", 503, "tunnel_disabled");
  }

  const rl = await rateLimit("tunnel-create-hourly", `ip:${clientIp(req)}`, 10, 3600);
  if (!rl.allowed) {
    return fail(
      `Terlalu banyak link dibuat dari jaringan ini. Coba lagi ${Math.ceil(rl.retryAfterSeconds / 60)} menit lagi.`,
      429,
      "rate_limited"
    );
  }

  let body: { port?: unknown; name?: unknown; ttlMinutes?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return fail("Body harus berupa JSON.", 400, "bad_request");
  }

  const port = typeof body.port === "number" ? Math.floor(body.port) : NaN;
  if (!Number.isFinite(port) || port < 1 || port > 65535) {
    return fail("Port tidak valid (1–65535).", 400, "bad_request");
  }

  const ttlMin = clampTtl(body.ttlMinutes);
  const ttlSec = ttlMin * 60;
  const token = newToken();
  const now = Date.now();
  const meta: TunnelMeta = {
    tokenHash: sha256(token),
    createdAt: now,
    expiresAt: now + ttlSec * 1000,
    port,
  };

  // Cari slug unik: <prefix>-<5 karakter acak>. SET NX menjamin tidak menimpa tunnel orang lain.
  const prefix = sanitizePrefix(body.name) ?? randomPrefix();
  let slug: string | null = null;
  for (let i = 0; i < 6 && !slug; i++) {
    const candidate = `${prefix}-${randomSuffix(5)}`;
    if (!SLUG_RE.test(candidate) || TUNNEL_RESERVED.has(candidate)) continue;
    const res = await kv.set(kMeta(candidate), JSON.stringify(meta), { nx: true, ex: ttlSec + 60 });
    if (res) slug = candidate;
  }
  if (!slug) return fail("Gagal membuat nama link unik. Coba lagi.", 500);
  await recordStat("tunnels");

  const base = tunnelBaseDomain();
  let publicBase: string;
  if (base) {
    publicBase = `https://${slug}.${base}`;
  } else {
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
    const proto = req.headers.get("x-forwarded-proto") ?? "https";
    publicBase = `${proto}://${host}/t/${slug}`;
  }

  return ok({
    id: slug,
    token,
    url: publicBase + "/",
    publicBase,
    mode: base ? "subdomain" : "path",
    expiresAt: meta.expiresAt,
    ttlMinutes: ttlMin,
  });
});
