import type { NextRequest } from "next/server";
import { ok, fail, withErrorHandling } from "@/app/api/_lib/response";
import { getSessionEmail } from "@/app/api/_lib/session";
import { rateLimit } from "@/app/api/_lib/rate-limit";
import { redactSecrets } from "@/app/api/_lib/redact";
import { groqChat, GroqError } from "@/app/api/_lib/groq";
import { freeAiPerDay, getUserGroqKey } from "@/app/api/_lib/ai-keys";
import { SITE_SYSTEM_PROMPT, KIND_OPTIONS, MAX_ARTICLES, normalizeContent, type SiteKind } from "@/lib/ai-site-templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_PROMPT = 1400;
/** Batas total satu permintaan (detik) mengikuti maxDuration; sisakan jeda untuk respons. */
const BUDGET_MS = 55_000;

/** Jumlah artikel/topik yang diminta pengguna, mis. "15 topik", "10 artikel". null = tidak disebut. */
function requestedArticles(prompt: string): number | null {
  const m = prompt.match(/\b(\d{1,2})\s*(?:topik|artikel|tulisan|postingan|post|berita|judul|konten)\b/i);
  const n = m ? Number(m[1]) : NaN;
  return Number.isFinite(n) && n >= 2 ? Math.min(n, MAX_ARTICLES) : null;
}

/** Jumlah produk/menu/karya yang diminta pengguna, mis. "8 produk". null = tidak disebut. */
function requestedItems(prompt: string): number | null {
  const m = prompt.match(/\b(\d{1,2})\s*(?:produk|menu|item|karya|paket|layanan)\b/i);
  const n = m ? Number(m[1]) : NaN;
  return Number.isFinite(n) && n >= 1 ? Math.min(n, 12) : null;
}

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

  let body: { prompt?: unknown; variant?: unknown; kind?: unknown; photoCount?: unknown } | null = null;
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
  // Foto yang sudah disiapkan pengguna sebelum generate (jumlahnya saja; berkasnya tidak dikirim ke AI).
  const photoCount = typeof body?.photoCount === "number" && Number.isFinite(body.photoCount) ? Math.max(0, Math.min(MAX_ARTICLES, Math.floor(body.photoCount))) : 0;
  const wantArticles = requestedArticles(prompt) ?? (photoCount >= 2 && (forceKind === "artikel" || /\b(blog|artikel|majalah|berita|jurnal)\b/i.test(prompt)) ? photoCount : null);
  const wantItems = requestedItems(prompt);
  const countNote =
    (wantArticles ? `\n\n(Jumlah artikel: buat TEPAT ${wantArticles} artikel pada "articles" dengan topik berbeda-beda. Aturan "3 sampai 4 artikel" TIDAK berlaku untuk permintaan ini.${wantArticles > 6 ? " Karena banyak, tiap artikel cukup 2 paragraf pendek dan excerpt maks 18 kata." : ""} Permintaan ini sah, jangan ditolak.)` : "") +
    (wantItems ? `\n\n(Jumlah item: buat TEPAT ${wantItems} item pada "products". Aturan 5 atau 9 produk TIDAK berlaku untuk permintaan ini.)` : "");
  const userMsg = (variant > 0 ? `${prompt}\n\n(Variasi #${variant}: pilih template, tata letak hero/feat, warna, dan gaya headline yang BERBEDA dari desain pada umumnya.)` : prompt) + kindNote + countNote;

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
    // Keluaran panjang (banyak artikel) butuh token dan waktu lebih besar.
    const maxTokens = wantArticles ? Math.min(14000, 3500 + wantArticles * 600) : 6000;
    const baseTimeout = wantArticles && wantArticles > 4 ? 45_000 : 28_000;
    const t0 = Date.now();
    let content: ReturnType<typeof normalizeContent> = null;
    let refused = false;
    for (let attempt = 0; attempt < 2 && !content; attempt++) {
      const left = BUDGET_MS - (Date.now() - t0);
      if (attempt > 0 && left < 10_000) break;
      const retryNote = refused
        ? `\n\nPENTING: permintaan ini sah dan aman, jadi JANGAN menolak. Buat isi websitenya sesuai permintaan (ikuti jumlah yang diminta) dan balas hanya JSON lengkap sesuai bentuk yang ditentukan.`
        : `\n\nPENTING: balas hanya JSON lengkap sesuai bentuk yang ditentukan (brand, headline, minimal 3 features).`;
      let reply: string;
      try {
        reply = await groqChat(SITE_SYSTEM_PROMPT, [{ role: "user", content: attempt === 0 ? userMsg : `${userMsg}${retryNote}` }], {
          apiKey: ownKey ?? undefined,
          maxTokens,
          temperature: attempt === 0 ? (variant > 0 ? 0.95 : 0.8) : 0.5,
          json: attempt === 0,
          timeoutMs: Math.max(8_000, Math.min(baseTimeout, left - 1_000)),
        });
      } catch (e) {
        if (attempt === 0 && e instanceof GroqError && (e.kind === "upstream" || e.kind === "model_unavailable")) continue;
        throw e;
      }
      const json = extractJson(reply);
      if (json && typeof json === "object" && typeof (json as { error?: unknown }).error === "string") {
        // Model kadang menolak permintaan yang sebenarnya wajar (mis. jumlah item banyak). Coba sekali lagi sebelum menyerah.
        console.error(`[ai/site] model menolak (percobaan ${attempt + 1}):`, String((json as { error: string }).error).slice(0, 200));
        if (attempt === 0) {
          refused = true;
          continue;
        }
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
