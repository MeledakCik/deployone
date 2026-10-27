/**
 * Mode "ubah dengan perintah": AI hanya membalas bagian yang berubah (patch), lalu digabung ke isi yang ada
 * dan dinormalisasi ulang. Murni (tanpa import Node/React) supaya mudah diuji dan aman di server maupun browser.
 */

import { normalizeContent, type SiteContent, type SiteImages } from "@/lib/ai-site-templates";
import { EDITABLE_KEYS, type EditableKey } from "@/lib/ai-site-prompts";

const STRING_KEYS = new Set<EditableKey>([
  "template", "accent", "hero", "feat", "hover", "brand", "brandIcon", "slogan", "badge", "headline", "subheadline", "ctaLabel",
  "featuresTitle", "itemsTitle", "stepsTitle", "aboutTitle", "about", "whatsapp", "email", "address", "hours", "closing", "closingText",
]);
const ARRAY_KEYS = new Set<EditableKey>(["features", "items", "articles", "steps"]);

/** Isi saat ini dalam bentuk ringkas untuk dikirim ke AI (tanpa id, gambar, dan bidang internal). */
export function buildEditMessage(current: SiteContent, instruction: string): string {
  const slim: Record<string, unknown> = {};
  for (const k of EDITABLE_KEYS) {
    const v = (current as unknown as Record<string, unknown>)[k];
    if (k === "items" && Array.isArray(v)) slim[k] = v.map(({ id: _id, img: _img, ...rest }: Record<string, unknown>) => rest);
    else if (k === "articles" && Array.isArray(v)) slim[k] = v.map(({ id: _id, ...rest }: Record<string, unknown>) => rest);
    else if (v !== undefined) slim[k] = v;
  }
  return `ISI WEBSITE SAAT INI (jenis: ${current.kind}):\n${JSON.stringify(slim)}\n\nPERINTAH PENGGUNA:\n${instruction}`;
}

/** Ambil hanya kunci yang boleh diubah dan bertipe wajar; sisanya dibuang. */
export function pickPatch(raw: unknown): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  const r = raw as Record<string, unknown>;
  for (const k of EDITABLE_KEYS) {
    if (!(k in r)) continue;
    const v = r[k];
    if (STRING_KEYS.has(k)) {
      if (typeof v === "string") out[k] = v;
    } else if (ARRAY_KEYS.has(k)) {
      if (Array.isArray(v)) out[k] = v;
    } else if (k === "testimonial") {
      if (v && typeof v === "object" && !Array.isArray(v)) out[k] = v;
    }
  }
  return out;
}

export interface PatchResult {
  content: SiteContent;
  /** Kunci yang benar-benar berubah setelah normalisasi. */
  changed: string[];
}

/** Gabungkan patch ke isi saat ini. Mengembalikan null bila hasil gabungan tidak valid. */
export function applyPatch(current: SiteContent, rawPatch: unknown): PatchResult | null {
  const patch = pickPatch(rawPatch);
  const merged = { ...(current as unknown as Record<string, unknown>), ...patch };
  const next = normalizeContent(merged, current.kind);
  if (!next) return null;
  const a = current as unknown as Record<string, unknown>;
  const b = next as unknown as Record<string, unknown>;
  const changed = EDITABLE_KEYS.filter((k) => JSON.stringify(a[k] ?? null) !== JSON.stringify(b[k] ?? null));
  return { content: next, changed: [...changed] };
}

const norm = (t: string): string => t.trim().toLowerCase().replace(/\s+/g, " ");

/**
 * Setelah isi berubah, id produk/artikel (berbasis urutan) bisa bergeser. Pindahkan gambar mengikuti
 * nama produk / judul artikel supaya foto tetap menempel di barang yang benar. Logo dan gambar utama tetap.
 */
export function remapImages(oldC: SiteContent, newC: SiteContent, images: SiteImages): SiteImages {
  const out: SiteImages = {};
  if (images.logo) out.logo = images.logo;
  if (images.hero) out.hero = images.hero;

  const move = (oldList: { id: string; label: string }[], newList: { id: string; label: string }[], prefix: string) => {
    const byLabel = new Map<string, string>();
    for (const o of oldList) {
      const src = images[`${prefix}:${o.id}`];
      if (src && !byLabel.has(norm(o.label))) byLabel.set(norm(o.label), src);
    }
    const newLabels = new Set(newList.map((n) => norm(n.label)));
    newList.forEach((n, i) => {
      const src = byLabel.get(norm(n.label));
      if (src) {
        out[`${prefix}:${n.id}`] = src;
        return;
      }
      // Nama/judul diganti lewat perintah: gambar di posisi yang sama ikut, selama pemilik lamanya tidak muncul lagi.
      const prev = oldList[i];
      const prevSrc = prev ? images[`${prefix}:${prev.id}`] : undefined;
      if (prevSrc && !newLabels.has(norm(prev.label))) out[`${prefix}:${n.id}`] = prevSrc;
    });
  };
  move(oldC.items.map((i) => ({ id: i.id, label: i.name })), newC.items.map((i) => ({ id: i.id, label: i.name })), "item");
  move((oldC.articles ?? []).map((a) => ({ id: a.id, label: a.title })), (newC.articles ?? []).map((a) => ({ id: a.id, label: a.title })), "article");
  return out;
}
