import type { NextRequest } from "next/server";
import { ok, fail, withErrorHandling } from "@/app/api/_lib/response";
import { getSessionEmail } from "@/app/api/_lib/session";
import { redactSecrets } from "@/app/api/_lib/redact";
import { rateLimit } from "@/app/api/_lib/rate-limit";
import { VIEW_LABEL } from "@/app/api/_lib/support-prompt";
import { detectFocus, runDiagnostics, type DiagnosticsResult } from "@/app/api/_lib/support-diagnostics";
import { fileSupportReport, isAdminEmail, listSupportReports } from "@/app/api/_lib/support-reports";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_BODY_BYTES = 60_000;
const MAX_MESSAGES = 20;
const MAX_CONTENT = 2000;

/** User menekan "Laporkan ke developer": simpan percakapan + pemeriksaan teknis terbaru. */
export const POST = withErrorHandling(async (req: NextRequest) => {
  const email = getSessionEmail(req);
  if (!email) return fail("Belum login.", 401, "unauthorized");

  const raw = await req.text().catch(() => "");
  if (raw.length > MAX_BODY_BYTES) return fail("Percakapan terlalu panjang.", 413, "bad_request");

  let body: { messages?: unknown; view?: unknown } | null = null;
  try {
    body = JSON.parse(raw);
  } catch {
    body = null;
  }
  if (!body || !Array.isArray(body.messages) || body.messages.length === 0) {
    return fail("Percakapan kosong.", 400, "bad_request");
  }

  const transcript: { role: "user" | "assistant"; content: string }[] = [];
  for (const m of body.messages.slice(-MAX_MESSAGES)) {
    const { role, content } = (m ?? {}) as { role?: unknown; content?: unknown };
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") continue;
    const text = redactSecrets(content.trim().slice(0, MAX_CONTENT));
    if (text) transcript.push({ role, content: text });
  }
  const userText = transcript.filter((m) => m.role === "user").map((m) => m.content);
  if (userText.length === 0) return fail("Percakapan tidak berisi pesan pengguna.", 400, "bad_request");

  const view =
    typeof body.view === "string" && Object.prototype.hasOwnProperty.call(VIEW_LABEL, body.view) ? body.view : null;

  // Pemeriksaan terbaru ikut dilampirkan supaya developer langsung melihat kondisi akunnya.
  let diagnostics: DiagnosticsResult | null = null;
  const rl = await rateLimit("support-diag", `u:${email}`, 3, 300);
  if (rl.allowed) {
    try {
      diagnostics = await runDiagnostics(email, detectFocus(userText.join(" ")));
    } catch (e) {
      console.error("[support/report] diagnostik gagal", (e as Error)?.message);
    }
  }

  const id = await fileSupportReport({
    email,
    source: "user",
    view,
    summary: userText[0].slice(0, 300),
    transcript,
    diagnostics,
  });
  if (!id) return fail("Laporan belum bisa disimpan. Coba lagi, atau pakai tombol Salin percakapan.", 503, "bad_request");
  return ok({ id });
});

/** Opsional, khusus developer (email di env ADMIN_EMAILS): daftar laporan terbaru. Tanpa ADMIN_EMAILS endpoint ini tertutup; notifikasi Telegram tidak membutuhkannya. */
export const GET = withErrorHandling(async (req: NextRequest) => {
  const email = getSessionEmail(req);
  if (!email) return fail("Belum login.", 401, "unauthorized");
  if (!isAdminEmail(email)) return fail("Tidak punya akses.", 403, "bad_request");
  const limit = Number(req.nextUrl.searchParams.get("limit")) || 30;
  return ok({ reports: await listSupportReports(limit) });
});
