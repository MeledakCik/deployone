import type { NextRequest } from "next/server";
import { ok, fail, withErrorHandling } from "@/app/api/_lib/response";
import { getSessionEmail } from "@/app/api/_lib/session";
import { verifyGroqKey } from "@/app/api/_lib/groq";
import { GROQ_KEY_RE, freeAiPerDay, getUserGroqKey, maskKey, setUserGroqKey } from "@/app/api/_lib/ai-keys";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/ai/key — status token Groq milik user (tidak pernah mengembalikan token utuh). */
export const GET = withErrorHandling(async (req: NextRequest) => {
  const email = getSessionEmail(req);
  if (!email) return fail("Sesi login habis. Silakan login lagi.", 401, "unauthorized");
  const key = await getUserGroqKey(email);
  return ok({ hasKey: !!key, masked: key ? maskKey(key) : null, freePerDay: freeAiPerDay() });
});

/** PUT /api/ai/key { key } — cek token ke Groq (tanpa memakai kuota), lalu simpan terenkripsi. */
export const PUT = withErrorHandling(async (req: NextRequest) => {
  const email = getSessionEmail(req);
  if (!email) return fail("Sesi login habis. Silakan login lagi.", 401, "unauthorized");

  let body: { key?: unknown } | null = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }
  const key = typeof body?.key === "string" ? body.key.trim() : "";
  if (!GROQ_KEY_RE.test(key)) {
    return fail("Format token tidak dikenali. Token Groq diawali \"gsk_\" — salin utuh dari console.groq.com/keys.", 400, "invalid_token");
  }

  const check = await verifyGroqKey(key);
  if (check === "invalid") return fail("Token ditolak Groq. Pastikan masih aktif dan disalin dengan benar.", 400, "invalid_token");
  if (check === "unreachable") return fail("Belum bisa menghubungi Groq untuk memeriksa token. Coba lagi sebentar lagi.", 502);

  await setUserGroqKey(email, key);
  return ok({ hasKey: true, masked: maskKey(key) });
});

/** DELETE /api/ai/key — hapus token dari akun. */
export const DELETE = withErrorHandling(async (req: NextRequest) => {
  const email = getSessionEmail(req);
  if (!email) return fail("Sesi login habis. Silakan login lagi.", 401, "unauthorized");
  await setUserGroqKey(email, null);
  return ok({ hasKey: false, masked: null });
});
