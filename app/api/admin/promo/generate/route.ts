import type { NextRequest } from "next/server";
import { fail, ok, withErrorHandling } from "@/app/api/_lib/response";
import { adminFromReq } from "@/app/api/_lib/admin";
import { groqChat, GroqError } from "@/app/api/_lib/groq";
import { rateLimit } from "@/app/api/_lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 40;

const TONES = {
  santai: "santai, hangat, dan akrab (pakai 'kamu'), seperti teman yang memberi kabar",
  profesional: "profesional dan sopan, tetap ramah (pakai 'kamu' atau 'Anda' secara konsisten)",
  singkat: "sangat singkat dan to the point (maksimal 2 paragraf pendek)",
} as const;
type Tone = keyof typeof TONES;

function systemPrompt(tone: Tone): string {
  return `Kamu penulis email untuk Depup, layanan yang membantu developer men-deploy proyek dari GitHub ke Vercel, Cloudflare, dan Railway, membuat "Link Instan" (upload situs statis jadi link) dan "Link Gaib" (membagikan localhost lewat CLI). Tugasmu menulis SATU email promosi/pengumuman dalam Bahasa Indonesia berdasarkan topik dari admin.

Gaya: ${TONES[tone]}.

Aturan penting agar email tidak dianggap spam dan tidak menyesatkan:
- Jangan mengarang fakta: harga, angka, tanggal, diskon, atau fitur yang TIDAK disebut admin di topik. Kalau topik minim detail, tulis umum dan jujur.
- Subjek maksimal 60 karakter, tanpa HURUF BESAR semua, tanpa tanda seru berlebihan (maksimal satu), tanpa kata seperti "GRATIS!!!", "PROMO GILA", "buruan", "klik sekarang juga".
- Maksimal 1 emoji di seluruh email (boleh nol). Jangan pakai markdown, tanda bintang, atau HTML.
- Isi: 2-4 paragraf pendek dipisah SATU baris kosong, mulai dengan sapaan "Halo!" atau "Halo,". Jangan menulis tanda tangan atau link berhenti berlangganan (ditambahkan otomatis).
- preheader: satu kalimat 50-110 karakter yang melengkapi subjek, bukan mengulangnya.
- ctaLabel: teks tombol 2-4 kata (mis. "Buka dashboard", "Coba sekarang").

Jawab HANYA dengan satu objek JSON valid tanpa teks lain dan tanpa blok kode, dengan kunci persis: {"subject": "...", "preheader": "...", "body": "...", "ctaLabel": "..."}`;
}

function extractJson(raw: string): Record<string, unknown> | null {
  const cleaned = raw.replace(/```json|```/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const v = JSON.parse(cleaned.slice(start, end + 1));
    return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** POST /api/admin/promo/generate { topic, tone? } -> { subject, preheader, body, ctaLabel } */
export const POST = withErrorHandling(async (req: NextRequest) => {
  const admin = adminFromReq(req);
  if (!admin) return fail("Tidak ditemukan.", 404, "not_found");

  let b: { topic?: unknown; tone?: unknown } = {};
  try {
    b = await req.json();
  } catch {
    return fail("Body harus berupa JSON.", 400, "bad_request");
  }
  const topic = typeof b.topic === "string" ? b.topic.trim().slice(0, 600) : "";
  if (topic.length < 5) return fail("Tulis topiknya dulu (minimal beberapa kata).", 400, "bad_request");
  const tone: Tone = b.tone === "profesional" || b.tone === "singkat" ? b.tone : "santai";

  const rl = await rateLimit("promo-ai", `u:${admin}`, 10, 300);
  if (!rl.allowed) return fail("Terlalu sering membuat template. Coba lagi beberapa menit lagi.", 429, "rate_limited");

  try {
    const raw = await groqChat(systemPrompt(tone), [{ role: "user", content: `Topik email: ${topic}` }]);
    const j = extractJson(raw);
    const subject = typeof j?.subject === "string" ? j.subject.trim().slice(0, 120) : "";
    const body = typeof j?.body === "string" ? j.body.replace(/\*\*/g, "").trim().slice(0, 5000) : "";
    if (!subject || body.length < 10) return fail("AI belum menghasilkan template yang valid. Coba klik lagi.", 502, "ai_unavailable");
    return ok({
      subject,
      preheader: typeof j?.preheader === "string" ? j.preheader.trim().slice(0, 140) : "",
      body,
      ctaLabel: typeof j?.ctaLabel === "string" ? j.ctaLabel.trim().slice(0, 60) : "",
    });
  } catch (e) {
    if (e instanceof GroqError) {
      if (e.kind === "not_configured") return fail("GROQ_API_KEY belum diisi / ditolak, jadi pembuat template AI belum aktif.", 503, "ai_not_configured");
      if (e.kind === "rate_limited") return fail("Kuota Groq sedang habis. Coba lagi nanti.", 429, "ai_unavailable");
      if (e.kind === "timeout") return fail("AI terlalu lama menjawab. Coba klik lagi.", 504, "ai_unavailable");
      return fail(e.message, 502, "ai_unavailable");
    }
    throw e;
  }
});
