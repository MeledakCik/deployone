import type { NextRequest } from "next/server";
import { ok, fail, withErrorHandling } from "@/app/api/_lib/response";
import { getSessionEmail } from "@/app/api/_lib/session";
import { redactSecrets } from "@/app/api/_lib/redact";
import { GroqError } from "@/app/api/_lib/groq";
import { resolveAiSource, runSiteEdit } from "@/app/api/_lib/ai-site-common";
import { normalizeContent, type SiteContent, type SiteKind } from "@/lib/ai-site-templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_INSTRUCTION = 600;
/** Isi website tanpa gambar jarang lebih dari puluhan KB; batas ini hanya menolak kiriman aneh. */
const MAX_CURRENT_CHARS = 150_000;

/**
 * POST /api/ai/site/edit { current, instruction } → { content, changed, note, source }
 * AI hanya membalas bagian yang berubah; server menggabungkannya ke isi saat ini dan menormalisasi ulang.
 * Isi `current` dari klien tidak dipercaya: selalu dinormalisasi dulu.
 */
export const POST = withErrorHandling(async (req: NextRequest) => {
  const email = getSessionEmail(req);
  if (!email) return fail("Sesi login habis. Silakan login lagi.", 401, "unauthorized");

  let body: { current?: unknown; instruction?: unknown } | null = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }
  const instruction = typeof body?.instruction === "string" ? redactSecrets(body.instruction.trim()).slice(0, MAX_INSTRUCTION) : "";
  if (instruction.length < 4) return fail("Tulis perubahan yang kamu mau, misalnya: tambah 3 menu minuman.", 400, "bad_request");

  let tooBig = false;
  try {
    tooBig = JSON.stringify(body?.current ?? null).length > MAX_CURRENT_CHARS;
  } catch {
    tooBig = true;
  }
  if (tooBig) return fail("Isi website terlalu besar untuk diubah. Buat ulang dengan deskripsi yang lebih ringkas.", 413, "bad_request");
  const kind = (body?.current as { kind?: SiteKind } | undefined)?.kind;
  const current: SiteContent | null = normalizeContent(body?.current, kind);
  if (!current) return fail("Isi website tidak valid. Buat websitenya dulu, lalu coba ubah lagi.", 400, "bad_request");

  const src = await resolveAiSource(email);
  if (!src.ok) return src.res;
  const { ownKey, source } = src;

  try {
    const out = await runSiteEdit(current, instruction, { apiKey: ownKey ?? undefined, timeoutMs: 40_000 });
    if (!out) return fail("AI membalas perubahan yang tidak bisa dipakai. Coba kalimat yang lebih spesifik.", 502, "ai_unavailable");
    return ok({ content: out.content, changed: out.changed, note: out.note, source });
  } catch (e) {
    if (e instanceof GroqError) {
      switch (e.kind) {
        case "invalid_key":
          return fail(e.message, 400, "invalid_token");
        case "rate_limited":
          return fail(e.message, 429, "ai_unavailable");
        case "timeout":
          return fail("AI terlalu lama menjawab. Coba kirim ulang.", 504, "ai_unavailable");
        case "not_configured":
          return fail("Asisten AI belum aktif di server ini.", 503, "ai_not_configured");
        default:
          console.error("[ai/site/edit]", e.message);
          return fail("AI sedang tidak bisa menjawab. Coba lagi nanti.", 502, "ai_unavailable");
      }
    }
    throw e;
  }
});
