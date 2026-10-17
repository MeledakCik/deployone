import type { NextRequest } from "next/server";
import { fail, ok, withErrorHandling } from "@/app/api/_lib/response";
import { adminFromReq, audit } from "@/app/api/_lib/admin";
import { emailConfigured } from "@/app/api/_lib/email";
import { listSupportReports, replyToSupportReport, setSupportStatus } from "@/app/api/_lib/support-reports";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 30;

/** GET /api/admin/support — laporan dari chat bantuan (tombol "Laporkan ke developer" + laporan otomatis). */
export const GET = withErrorHandling(async (req: NextRequest) => {
  if (!adminFromReq(req)) return fail("Tidak ditemukan.", 404, "not_found");
  return ok({ reports: await listSupportReports(50), emailReady: emailConfigured() });
});

/**
 * POST /api/admin/support
 *  { id, action: "reply", text, resolve?: boolean }  -> kirim balasan ke email user lewat Resend
 *  { id, action: "resolve" | "reopen" }              -> ubah status laporan
 */
export const POST = withErrorHandling(async (req: NextRequest) => {
  const admin = adminFromReq(req);
  if (!admin) return fail("Tidak ditemukan.", 404, "not_found");
  let b: { id?: unknown; action?: unknown; text?: unknown; resolve?: unknown } = {};
  try {
    b = await req.json();
  } catch {
    return fail("Body harus berupa JSON.", 400, "bad_request");
  }
  const id = typeof b.id === "string" ? b.id : "";

  if (b.action === "reply") {
    if (!emailConfigured()) return fail("RESEND_API_KEY belum diisi di environment server.", 503, "bad_request");
    const text = typeof b.text === "string" ? b.text.trim().slice(0, 3000) : "";
    if (text.length < 3) return fail("Isi balasan terlalu pendek.", 400, "bad_request");
    const r = await replyToSupportReport(id, admin, text, b.resolve === true);
    if (!r) return fail("Laporan tidak ditemukan (mungkin sudah kedaluwarsa).", 404, "not_found");
    if (!r.emailed) return fail(r.error ?? "Email gagal dikirim.", 502, "bad_request");
    await audit(admin, "support.reply", `${id} → ${r.report.email}`);
    return ok({ report: r.report });
  }

  if (b.action === "resolve" || b.action === "reopen") {
    const report = await setSupportStatus(id, b.action === "resolve" ? "resolved" : "open");
    if (!report) return fail("Laporan tidak ditemukan.", 404, "not_found");
    await audit(admin, `support.${b.action}`, id);
    return ok({ report });
  }
  return fail("Aksi tidak dikenal.", 400, "bad_request");
});
