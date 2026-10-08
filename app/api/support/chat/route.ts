import type { NextRequest } from "next/server";
import { ok, fail, withErrorHandling } from "@/app/api/_lib/response";
import { groqChat, GroqError, type ChatMessage } from "@/app/api/_lib/groq";
import { buildSupportPrompt, VIEW_LABEL } from "@/app/api/_lib/support-prompt";
import { redactSecrets } from "@/app/api/_lib/redact";
import { getSessionEmail } from "@/app/api/_lib/session";
import { rateLimit } from "@/app/api/_lib/rate-limit";
import {
  detectFocus,
  diagnosticsToPrompt,
  looksLikeIssue,
  runDiagnostics,
  type DiagnosticsResult,
} from "@/app/api/_lib/support-diagnostics";
import { fileSupportReport } from "@/app/api/_lib/support-reports";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_BODY_BYTES = 40_000;
const MAX_MESSAGES = 12; // hanya konteks terakhir yang dikirim ke AI
const MAX_CONTENT = 2000;

function parseMessages(input: unknown): ChatMessage[] | null {
  if (!Array.isArray(input) || input.length === 0) return null;
  const out: ChatMessage[] = [];
  for (const m of input.slice(-MAX_MESSAGES)) {
    if (!m || typeof m !== "object") return null;
    const { role, content } = m as { role?: unknown; content?: unknown };
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") return null;
    const trimmed = content.trim().slice(0, MAX_CONTENT);
    if (!trimmed) continue;
    out.push({ role, content: redactSecrets(trimmed) });
  }
  // Harus mulai dan berakhir dengan pesan user (aturan umum chat API).
  while (out.length && out[0].role !== "user") out.shift();
  if (!out.length || out[out.length - 1].role !== "user") return null;
  return out;
}

export const POST = withErrorHandling(async (req: NextRequest) => {
  const raw = await req.text().catch(() => "");
  if (raw.length > MAX_BODY_BYTES) return fail("Pesan terlalu panjang.", 413, "bad_request");

  let body: { messages?: unknown; view?: unknown } | null = null;
  try {
    body = JSON.parse(raw);
  } catch {
    body = null;
  }
  const messages = parseMessages(body?.messages);
  if (!messages) return fail("Pesan tidak valid.", 400, "bad_request");

  const view =
    typeof body?.view === "string" && Object.prototype.hasOwnProperty.call(VIEW_LABEL, body.view)
      ? body.view
      : undefined;

  // Laporan masalah → periksa kondisi teknis akun user (token, status platform, riwayat deploy)
  // SEBELUM menjawab, supaya jawabannya berdasar fakta. Dibatasi 3x / 5 menit per akun.
  const email = getSessionEmail(req);
  const latest = messages[messages.length - 1].content;
  let diagnostics: DiagnosticsResult | null = null;
  let diagSkipped = false;
  let reportId: string | null = null;

  if (email && looksLikeIssue(latest)) {
    const rl = await rateLimit("support-diag", `u:${email}`, 3, 300);
    if (!rl.allowed) {
      diagSkipped = true;
    } else {
      try {
        diagnostics = await runDiagnostics(email, detectFocus(latest));
      } catch (e) {
        console.error("[support/chat] diagnostik gagal", (e as Error)?.message);
      }
      if (diagnostics?.anomaly) {
        reportId = await fileSupportReport({
          email,
          source: "auto",
          view: view ?? null,
          summary: latest.slice(0, 300),
          transcript: messages.slice(-6),
          diagnostics,
        });
      }
    }
  }

  const diagPrompt = diagnostics
    ? diagnosticsToPrompt(diagnostics, reportId)
    : diagSkipped
      ? "HASIL PEMERIKSAAN SISTEM: pemeriksaan otomatis dilewati karena sudah dijalankan beberapa kali barusan. Jawab dari panduan umum dan minta pengguna menunggu beberapa menit sebelum mencoba pemeriksaan lagi."
      : undefined;

  try {
    const reply = await groqChat(buildSupportPrompt(view, diagPrompt), messages);
    return ok({
      reply,
      // Hanya ringkasan yang aman ditampilkan ke user (tanpa token).
      diagnostics: diagnostics
        ? diagnostics.checks.map((c) => ({ id: c.id, label: c.label, status: c.status, detail: c.detail }))
        : null,
      reportId,
    });
  } catch (e) {
    if (e instanceof GroqError) {
      switch (e.kind) {
        case "not_configured":
          return fail("Asisten AI belum aktif di server ini.", 503, "ai_not_configured");
        case "rate_limited":
          return fail("Asisten sedang ramai. Coba lagi sebentar lagi.", 429, "ai_unavailable");
        case "timeout":
          return fail("Asisten terlalu lama menjawab. Coba kirim ulang.", 504, "ai_unavailable");
        default:
          console.error("[support/chat]", e.message);
          return fail("Asisten sedang tidak bisa menjawab. Coba lagi nanti.", 502, "ai_unavailable");
      }
    }
    throw e;
  }
});
