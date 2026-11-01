import type { NextRequest } from "next/server";
import { ok, fail, withErrorHandling } from "@/app/api/_lib/response";
import { getSessionEmail } from "@/app/api/_lib/session";
import { rateLimit } from "@/app/api/_lib/rate-limit";
import { groqChatFull, GroqError } from "@/app/api/_lib/groq";
import { freeAiPerDay, getUserGroqKey } from "@/app/api/_lib/ai-keys";
import { fileSystemPrompt, fileUserMessage, pageSystemPrompt, pageUserMessage, stripFence, type ContextFile } from "@/app/api/_lib/convert-prompts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_CODE = 36_000;
const MAX_CTX_TOTAL = 80_000;
/** Jatah gratis dihitung per file: tiap 1 "jatah AI" harian = 5 file. */
const FILES_PER_FREE_UNIT = 5;

const str = (v: unknown, max: number): string => (typeof v === "string" ? v.slice(0, max) : "");

function ctxFiles(v: unknown): ContextFile[] {
  if (!Array.isArray(v)) return [];
  const out: ContextFile[] = [];
  let total = 0;
  for (const x of v.slice(0, 40)) {
    const path = str((x as { path?: unknown })?.path, 300);
    const code = str((x as { code?: unknown })?.code, 24_000);
    if (!path || total + code.length > MAX_CTX_TOTAL) continue;
    total += code.length;
    out.push({ path, code });
  }
  return out;
}

/**
 * POST /api/convert
 *  { mode: "file", path, code, from, to, hint? }                       → konversi satu file ke bahasa lain
 *  { mode: "page", path, code, context, routeMap, assetPrefix, cssLinks, imageImports, tailwind, hint? }
 *                                                                      → satu halaman Next.js → satu file HTML
 * Mengembalikan { code, truncated, source }. Klien memanggil per file supaya tiap permintaan muat di batas waktu.
 */
export const POST = withErrorHandling(async (req: NextRequest) => {
  const email = getSessionEmail(req);
  if (!email) return fail("Sesi login habis. Silakan login lagi.", 401, "unauthorized");

  let body: Record<string, unknown> | null = null;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    body = null;
  }
  if (!body) return fail("Permintaan tidak valid.", 400, "bad_request");

  const mode = body.mode === "page" ? "page" : "file";
  const path = str(body.path, 300);
  const code = str(body.code, MAX_CODE + 1);
  const hint = str(body.hint, 300).replace(/\s+/g, " ").trim();
  if (!code.trim()) return fail("Isi file kosong.", 400, "bad_request");
  if (code.length > MAX_CODE) return fail(`File terlalu besar (batas ${MAX_CODE / 1000} KB per file). Pecah dulu jadi bagian lebih kecil.`, 413, "bad_request");

  let system: string;
  let user: string;
  if (mode === "page") {
    const payload = {
      path,
      code,
      context: ctxFiles(body.context),
      routeMap: Object.fromEntries(Object.entries((body.routeMap as Record<string, unknown>) ?? {}).slice(0, 80).map(([k, v]) => [str(k, 200), str(v, 200)])),
      assetPrefix: /^(\.\.\/)*$/.test(str(body.assetPrefix, 40)) ? str(body.assetPrefix, 40) : "",
      cssLinks: Array.isArray(body.cssLinks) ? body.cssLinks.slice(0, 20).map((x) => str(x, 200)) : [],
      imageImports: Array.isArray(body.imageImports) ? body.imageImports.slice(0, 40).map((x) => str(x, 300)) : [],
      tailwind: body.tailwind === true,
      hint,
    };
    system = pageSystemPrompt(payload);
    user = pageUserMessage(payload);
  } else {
    const from = str(body.from, 60).trim();
    const to = str(body.to, 80).trim();
    if (!from || !to) return fail("Bahasa asal dan tujuan wajib diisi.", 400, "bad_request");
    system = fileSystemPrompt(from, to, hint);
    user = fileUserMessage(path, from, code);
  }

  // Sumber token: milik user (tanpa batas dari Depup) atau jatah gratis harian per file.
  const ownKey = await getUserGroqKey(email);
  let source: "own" | "free" = "own";
  if (!ownKey) {
    const free = freeAiPerDay();
    if (free === 0) return fail("Pasang token Groq-mu dulu (gratis di console.groq.com/keys).", 402, "ai_not_configured");
    const daily = await rateLimit("convert-free-daily", `u:${email}`, free * FILES_PER_FREE_UNIT, 86400);
    if (!daily.allowed) return fail(`Jatah konversi gratis hari ini (${free * FILES_PER_FREE_UNIT} file) sudah habis. Pasang token Groq-mu sendiri untuk lanjut.`, 429, "rate_limited");
    source = "free";
  }

  // Perkiraan token: ~3,2 karakter/token. Keluaran kira-kira sepanjang masukan (HTML dari JSX bisa lebih panjang).
  const estIn = Math.ceil(code.length / 3.2);
  const maxTokens = Math.max(2500, Math.min(16_000, Math.round(estIn * (mode === "page" ? 2.2 : 1.5)) + 1500));

  try {
    const r = await groqChatFull(system, [{ role: "user", content: user }], {
      apiKey: ownKey ?? undefined,
      maxTokens,
      temperature: 0.1,
      timeoutMs: 52_000,
      reasoningEffort: "low",
    });
    return ok({ code: stripFence(r.text), truncated: r.finishReason === "length", source });
  } catch (e) {
    if (e instanceof GroqError) {
      switch (e.kind) {
        case "invalid_key":
          return fail(e.message, 400, "invalid_token");
        case "rate_limited":
          return fail(e.message, 429, "ai_unavailable");
        case "timeout":
          return fail("AI terlalu lama menjawab untuk file ini. Coba lagi, atau pecah file jadi lebih kecil.", 504, "ai_unavailable");
        case "not_configured":
          return fail("Asisten AI belum aktif di server ini.", 503, "ai_not_configured");
        default:
          console.error("[convert]", e.message);
          return fail("AI sedang tidak bisa menjawab. Coba lagi nanti.", 502, "ai_unavailable");
      }
    }
    throw e;
  }
});
