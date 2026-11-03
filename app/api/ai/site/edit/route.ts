import type { NextRequest } from "next/server";
import { ok, fail, withErrorHandling } from "@/app/api/_lib/response";
import { getSessionEmail } from "@/app/api/_lib/session";
import { redactSecrets } from "@/app/api/_lib/redact";
import { engineEdit } from "@/lib/site-engine";
import { normalizeContent, type SiteContent, type SiteKind } from "@/lib/ai-site-templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_INSTRUCTION = 600;
/** Isi website tanpa gambar jarang lebih dari puluhan KB; batas ini hanya menolak kiriman aneh. */
const MAX_CURRENT_CHARS = 150_000;

/**
 * POST /api/ai/site/edit { current, instruction } → { content, changed, note, source }
 * Perintah diurai oleh mesin Depup sendiri (lib/site-engine, tanpa AI luar) menjadi perubahan pada isi saat ini.
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

  const out = await engineEdit(current, instruction);
  if (!out.content) return fail(out.note, 422, "bad_request");
  const a = current as unknown as Record<string, unknown>;
  const b = out.content as unknown as Record<string, unknown>;
  const changed = Object.keys(b).filter((k) => JSON.stringify(a[k] ?? null) !== JSON.stringify(b[k] ?? null));
  return ok({ content: out.content, changed, note: out.note, source: "engine" });
});
