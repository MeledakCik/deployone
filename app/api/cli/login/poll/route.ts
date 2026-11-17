import { kv } from "@vercel/kv";
import { fail, ok, withErrorHandling } from "@/app/api/_lib/response";
import { getEpoch } from "@/app/api/_lib/mcp-auth";
import { kLogin, kLoginDevice, loadLogin, sha256, signCliToken } from "@/app/api/_lib/cli-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/**
 * POST /api/cli/login/poll — PUBLIK, dipanggil CLI tiap ~2 detik. Body: { deviceCode }.
 * pending -> { status: "pending" }; disetujui -> { status: "approved", token, email } (sekali saja).
 */
export const POST = withErrorHandling(async (req: Request) => {
  let body: { deviceCode?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return fail("Body harus berupa JSON.", 400, "bad_request");
  }
  const deviceCode = typeof body.deviceCode === "string" ? body.deviceCode : "";
  if (!/^[A-Za-z0-9_-]{40,64}$/.test(deviceCode)) return fail("deviceCode tidak valid.", 400, "bad_request");

  const dh = sha256(deviceCode);
  const userCode = await kv.get<string>(kLoginDevice(dh));
  const session = typeof userCode === "string" ? await loadLogin(userCode) : null;
  if (!userCode || !session || session.dh !== dh) {
    return fail("Sesi login sudah kedaluwarsa. Jalankan lagi: depup login", 410, "not_found");
  }

  if (session.status === "denied") {
    await kv.del(kLogin(userCode), kLoginDevice(dh));
    return fail("Login ditolak di browser.", 403, "unauthorized");
  }
  if (session.status !== "approved" || !session.email) return ok({ status: "pending" });

  // Hanya poll yang berhasil menghapus sesi yang menerima token (mencegah token terbit dua kali).
  const removed = await kv.del(kLogin(userCode));
  await kv.del(kLoginDevice(dh));
  if (!removed) return fail("Sesi login sudah dipakai. Jalankan lagi: depup login", 410, "not_found");

  const token = signCliToken(session.email, await getEpoch(session.email));
  return ok({ status: "approved", token, email: session.email });
});
