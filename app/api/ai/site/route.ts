import type { NextRequest } from "next/server";
import { ok, fail, withErrorHandling } from "@/app/api/_lib/response";
import { getSessionEmail } from "@/app/api/_lib/session";
import { rateLimit } from "@/app/api/_lib/rate-limit";
import { redactSecrets } from "@/app/api/_lib/redact";
import { groqChat, GroqError } from "@/app/api/_lib/groq";
import { freeAiPerDay, getUserGroqKey } from "@/app/api/_lib/ai-keys";
import { SITE_SYSTEM_PROMPT, KIND_OPTIONS, normalizeContent, type SiteKind } from "@/lib/ai-site-templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_PROMPT = 1400;

/** Ambil objek JSON pertama dari balasan model (jaga-jaga kalau dibungkus teks/markdown). */
function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  if (start === -1) return null;
  const end = text.lastIndexOf("}");
  const tryParse = (t: string): unknown => {
    try {
      return JSON.parse(t);
    } catch {
      return undefined;
    }
  };
  if (end > start) {
    const body = text.slice(start, end + 1);
    const a = tryParse(body) ?? tryParse(body.replace(/,\s*([}\]])/g, "$1")); // koma sisa sebelum } atau ]
    if (a !== undefined) return a;
  }
  // Balasan terpotong (kehabisan token): tutup kurung yang masih terbuka.
  let s = text.slice(start).replace(/,\s*$/, "");
  const stack: string[] = [];
  let inStr = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      if (ch === "\\") i++;
      else if (ch === '"') inStr = false;
    } else if (ch === '"') inStr = true;
    else if (ch === "{") stack.push("}");
    else if (ch === "[") stack.push("]");
    else if (ch === "}" || ch === "]") stack.pop();
  }
  if (inStr) s += '"';
  s = s.replace(/,\s*$/, "").replace(/"[^"]*"\s*:\s*$/, "").replace(/,\s*$/, "");
  const fixed = s + stack.reverse().join("");
  return tryParse(fixed) ?? tryParse(fixed.replace(/,\s*([}\]])/g, "$1")) ?? null;
}

/**
 * POST /api/ai/site { prompt, variant? } → { content, source }
 * Hanya MENGHASILKAN isi (JSON: teks, jenis usaha, saran template, ikon Lucide, produk). HTML dirakit di browser dari template, lalu
 * dipublikasikan lewat alur Link Instan yang sudah ada.
 */
export const POST = withErrorHandling(async (req: NextRequest) => {
  const email = getSessionEmail(req);
  if (!email) return fail("Sesi login habis. Silakan login lagi.", 401, "unauthorized");

  let body: { prompt?: unknown; variant?: unknown; kind?: unknown } | null = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }
  const prompt = typeof body?.prompt === "string" ? redactSecrets(body.prompt.trim()).slice(0, MAX_PROMPT) : "";
  if (prompt.length < 10) return fail("Ceritakan sedikit lebih detail tentang website yang kamu mau (minimal 10 karakter).", 400, "bad_request");

  // "Buat ulang": nomor variasi memaksa AI memilih template, tata letak, dan sudut pandang yang berbeda.
  const variant = typeof body?.variant === "number" && Number.isFinite(body.variant) ? Math.max(0, Math.min(99, Math.floor(body.variant))) : 0;
  // Jenis situs pilihan pengguna (opsional). Kosong = AI yang memilih.
  const forceKind: SiteKind | undefined = KIND_OPTIONS.find((k) => k.id === body?.kind)?.id;
  const kindNote = forceKind ? `\n\n(Jenis situs yang diminta pengguna: type "${forceKind}". Wajib memakai type ini${forceKind === "artikel" ? " dan isi articles lengkap beserta body-nya" : ""}.)` : "";
  const userMsg = (variant > 0 ? `${prompt}\n\n(Variasi #${variant}: pilih template, tata letak hero/feat, warna, dan gaya headline yang BERBEDA dari desain pada umumnya.)` : prompt) + kindNote;

  // Token milik user diutamakan. Tanpa itu, pakai token server hanya bila admin memberi jatah harian.
  const ownKey = await getUserGroqKey(email);
  let source: "own" | "free" = "own";
  if (!ownKey) {
    const free = freeAiPerDay();
    if (free === 0) {
      return fail("Pasang token Groq-mu dulu di halaman AI Web Builder (gratis di console.groq.com/keys).", 402, "ai_not_configured");
    }
    const daily = await rateLimit("ai-site-free-daily", `u:${email}`, free, 86400);
    if (!daily.allowed) {
      return fail(`Jatah AI gratis hari ini (${free}x) sudah habis. Pasang token Groq-mu sendiri untuk lanjut tanpa batas dari Depup.`, 429, "rate_limited");
    }
    source = "free";
  }

  try {
    // Percobaan 1: mode JSON. Bila ditolak/tak valid, percobaan 2 tanpa mode JSON dengan pengingat format.
    let content: ReturnType<typeof normalizeContent> = null;
    for (let attempt = 0; attempt < 2 && !content; attempt++) {
      let reply: string;
      try {
        reply = await groqChat(SITE_SYSTEM_PROMPT, [{ role: "user", content: attempt === 0 ? userMsg : `${userMsg}\n\nPENTING: balas hanya JSON lengkap sesuai bentuk yang ditentukan (brand, headline, minimal 3 features).` }], {
          apiKey: ownKey ?? undefined,
          maxTokens: 6000,
          temperature: attempt === 0 ? (variant > 0 ? 0.95 : 0.8) : 0.5,
          json: attempt === 0,
        });
      } catch (e) {
        if (attempt === 0 && e instanceof GroqError && (e.kind === "upstream" || e.kind === "model_unavailable")) continue;
        throw e;
      }
      const json = extractJson(reply);
      if (json && typeof json === "object" && typeof (json as { error?: unknown }).error === "string") {
        return fail("Permintaan ini tidak bisa dibuatkan website-nya oleh AI. Coba deskripsi usaha/kegiatan yang lain.", 422, "bad_request");
      }
      content = normalizeContent(json, forceKind);
      if (!content) console.error(`[ai/site] isi tidak lengkap (percobaan ${attempt + 1}):`, json ? Object.keys(json as object).join(",") : "bukan JSON", "|", reply.slice(0, 240).replace(/\s+/g, " "));
    }
    if (!content) return fail("AI belum mengembalikan isi yang lengkap. Coba kirim ulang, atau tambahkan detail di deskripsi.", 502, "ai_unavailable");
    return ok({ content, source });
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
          console.error("[ai/site]", e.message);
          return fail("AI sedang tidak bisa menjawab. Coba lagi nanti.", 502, "ai_unavailable");
      }
    }
    throw e;
  }
});
