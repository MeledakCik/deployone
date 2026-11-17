import { kv } from "@vercel/kv";
import type { NextRequest } from "next/server";
import { fail, ok, withErrorHandling } from "@/app/api/_lib/response";
import { getSessionEmail } from "@/app/api/_lib/session";
import { isAccountBlocked } from "@/app/api/_lib/mcp-auth";
import { LOGIN_TTL_SECONDS, kLogin, loadLogin, normalizeUserCode } from "@/app/api/_lib/cli-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/**
 * POST /api/cli/login — dari layar izin /cli/login (butuh session browser).
 * Body: { action: "preview" | "approve" | "deny", code: "ABCD-EFGH" }
 */
export const POST = withErrorHandling(async (req: NextRequest) => {
  const email = getSessionEmail(req);
  if (!email) return fail("Sesi login habis. Silakan login lagi.", 401, "unauthorized");
  if (await isAccountBlocked(email)) return fail("Akun ini dinonaktifkan oleh admin Depup.", 403, "unauthorized");

  let body: { action?: unknown; code?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return fail("Body harus berupa JSON.", 400, "bad_request");
  }
  const code = normalizeUserCode(body.code);
  if (!code) return fail("Kode login tidak valid.", 400, "bad_request");

  const session = await loadLogin(code);
  if (!session) return fail("Kode login tidak ditemukan atau sudah kedaluwarsa. Jalankan lagi depup login di terminal.", 404, "not_found");
  if (session.status !== "pending") return fail("Kode login ini sudah dipakai.", 409, "bad_request");

  if (body.action === "preview") return ok({ email, code });

  if (body.action !== "approve" && body.action !== "deny") return fail("Aksi tidak dikenal.", 400, "bad_request");
  const next = { ...session, status: body.action === "approve" ? "approved" : "denied", email };
  // Sisa masa berlaku sesi login tidak diperpanjang (CLI tetap butuh waktu untuk poll, jadi minimal 60 dtk).
  const left = Math.max(60, LOGIN_TTL_SECONDS - Math.floor((Date.now() - session.createdAt) / 1000));
  await kv.set(kLogin(code), JSON.stringify(next), { ex: left, xx: true });
  return ok({ status: next.status, email });
});
