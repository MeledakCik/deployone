import type { NextRequest } from "next/server";
import { kv } from "@vercel/kv";
import { ok, fail, withErrorHandling } from "@/app/api/_lib/response";
import { getSessionEmail } from "@/app/api/_lib/session";
import { rateLimit } from "@/app/api/_lib/rate-limit";
import { redactSecrets } from "@/app/api/_lib/redact";
import { normalizeContent, type SiteKind } from "@/lib/ai-site-templates";
import { ENGINE_FEEDBACK_KEY, ENGINE_FEEDBACK_MAX } from "@/lib/site-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/ai/site/feedback { prompt, content }
 * Pengguna MENGIZINKAN (centang di AI Web Builder) website yang ia terbitkan dipakai sebagai contoh latih.
 * Disimpan tanpa email, gambar, dan kontak; admin melatih ulang mesin dari Panel Admin → Mesin AI.
 */
export const POST = withErrorHandling(async (req: NextRequest) => {
  const email = getSessionEmail(req);
  if (!email) return fail("Sesi login habis. Silakan login lagi.", 401, "unauthorized");
  const rl = await rateLimit("engine-feedback", `u:${email}`, 20, 86400);
  if (!rl.allowed) return ok({ saved: false });

  let body: { prompt?: unknown; content?: unknown } | null = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }
  const prompt = typeof body?.prompt === "string" ? redactSecrets(body.prompt.trim()).slice(0, 1400) : "";
  const kind = (body?.content as { kind?: SiteKind } | undefined)?.kind;
  const content = normalizeContent(body?.content, kind);
  if (prompt.length < 10 || !content) return fail("Contoh tidak lengkap.", 400, "bad_request");

  // Data pribadi tidak ikut: kontak dikosongkan, gambar tidak pernah dikirim.
  const clean = { ...content, whatsapp: "", email: "", address: "", items: content.items.map((i) => ({ ...i, img: "" })) };
  await kv.lpush(ENGINE_FEEDBACK_KEY, JSON.stringify({ prompt, content: clean, at: Date.now() }));
  await kv.ltrim(ENGINE_FEEDBACK_KEY, 0, ENGINE_FEEDBACK_MAX - 1);
  return ok({ saved: true });
});
