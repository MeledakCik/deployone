import { headers } from "next/headers";
import { LANG_HEADER } from "@/lib/i18n/core";
import type { NextRequest } from "next/server";
import { ok, fail, withErrorHandling } from "@/app/api/_lib/response";
import { getSessionEmail } from "@/app/api/_lib/session";
import { redactSecrets } from "@/app/api/_lib/redact";
import { KIND_OPTIONS, MAX_ARTICLES, type SiteKind } from "@/lib/ai-site-templates";
import { engineGenerate } from "@/lib/site-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_PROMPT = 1400;

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

/**
 * POST /api/ai/site { prompt, variant?, kind?, photoCount? } → { content, source: "engine", domain, confidence }
 *
 * Isi website dibuat oleh MESIN DEPUP SENDIRI (lib/site-engine): klasifikasi jenis usaha, ekstraksi
 * entitas dari deskripsi, lalu penyusunan isi dari bank frasa hasil training. Tidak memanggil layanan AI luar,
 * jadi tidak butuh token dan tidak ada kuota harian. HTML tetap dirakit di browser dari template.
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

  const variant = typeof body?.variant === "number" && Number.isFinite(body.variant) ? Math.max(0, Math.min(99, Math.floor(body.variant))) : 0;
  const forceKind: SiteKind | undefined = KIND_OPTIONS.find((k) => k.id === body?.kind)?.id;
  const photoCount = typeof body?.photoCount === "number" && Number.isFinite(body.photoCount) ? Math.max(0, Math.min(MAX_ARTICLES, Math.floor(body.photoCount))) : 0;
  const wantArticles = requestedArticles(prompt) ?? (photoCount >= 2 && (forceKind === "artikel" || /\b(blog|artikel|majalah|berita|jurnal)\b/i.test(prompt)) ? photoCount : null);
  const wantItems = requestedItems(prompt);

  const res = await engineGenerate(prompt, { variant, kind: forceKind, wantItems, wantArticles, langHint: headers().get(LANG_HEADER) === "en" ? "en" : "id" });
  if (!res) return fail("Mesin belum bisa menyusun isi dari deskripsi ini. Tambahkan jenis usaha dan apa yang kamu tawarkan, lalu coba lagi.", 422, "bad_request");
  return ok({ content: res.content, source: "engine", domain: res.domain, confidence: Math.round(res.confidence * 100) / 100 });
});
