import { kv } from "@vercel/kv";
import { fail, ok, withErrorHandling } from "@/app/api/_lib/response";
import { clientIp, rateLimit } from "@/app/api/_lib/rate-limit";
import { appOrigin } from "@/app/api/_lib/mcp-token";
import {
  LOGIN_POLL_INTERVAL_SECONDS,
  LOGIN_TTL_SECONDS,
  kLogin,
  kLoginDevice,
  newDeviceCode,
  newUserCode,
  sha256,
  type LoginSession,
} from "@/app/api/_lib/cli-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/**
 * POST /api/cli/login/start — PUBLIK (dipanggil `depup login`, belum punya token).
 * Membuat sesi login; deviceCode hanya dikembalikan ke CLI, userCode ditampilkan di browser.
 */
export const POST = withErrorHandling(async (req: Request) => {
  const rl = await rateLimit("cli-login-start", `ip:${clientIp(req)}`, 10, 600);
  if (!rl.allowed) {
    return fail(`Terlalu banyak percobaan login. Coba lagi ${Math.ceil(rl.retryAfterSeconds / 60)} menit lagi.`, 429, "rate_limited");
  }

  const deviceCode = newDeviceCode();
  const dh = sha256(deviceCode);
  const session: LoginSession = { dh, status: "pending", createdAt: Date.now() };

  let userCode: string | null = null;
  for (let i = 0; i < 5 && !userCode; i++) {
    const candidate = newUserCode();
    const res = await kv.set(kLogin(candidate), JSON.stringify(session), { nx: true, ex: LOGIN_TTL_SECONDS });
    if (res) userCode = candidate;
  }
  if (!userCode) return fail("Gagal memulai login. Coba lagi.", 500);
  await kv.set(kLoginDevice(dh), userCode, { ex: LOGIN_TTL_SECONDS });

  const origin = appOrigin(req.headers.get("host"));
  return ok({
    deviceCode,
    userCode,
    verifyUrl: `${origin}/cli/login?code=${userCode}`,
    interval: LOGIN_POLL_INTERVAL_SECONDS,
    expiresIn: LOGIN_TTL_SECONDS,
  });
});
