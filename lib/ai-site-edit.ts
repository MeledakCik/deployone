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

/* ---------------- editor kanvas: ubah satu teks langsung di pratinjau ---------------- */

/** Bidang teks yang boleh diubah lewat klik di kanvas, dengan batas panjang & boleh-kosong. */
const FIELD_RULES: { re: RegExp; max: number; optional?: boolean }[] = [
  { re: /^brand$/, max: 40 },
  { re: /^headline$/, max: 140 },
  { re: /^subheadline$/, max: 260, optional: true },
  { re: /^badge$/, max: 40, optional: true },
  { re: /^(featuresTitle|itemsTitle|stepsTitle|aboutTitle)$/, max: 70 },
  { re: /^about$/, max: 700, optional: true },
  { re: /^closing$/, max: 80 },
  { re: /^closingText$/, max: 220, optional: true },
  { re: /^testimonial\.text$/, max: 320 },
  { re: /^testimonial\.name$/, max: 40, optional: true },
  { re: /^features\.\d{1,2}\.title$/, max: 70 },
  { re: /^features\.\d{1,2}\.text$/, max: 220, optional: true },
  { re: /^steps\.\d{1,2}\.title$/, max: 70 },
  { re: /^steps\.\d{1,2}\.text$/, max: 220, optional: true },
  { re: /^items\.\d{1,2}\.name$/, max: 70 },
  { re: /^items\.\d{1,2}\.desc$/, max: 220, optional: true },
];

export const isEditableField = (path: unknown): path is string => typeof path === "string" && FIELD_RULES.some((r) => r.re.test(path));

/**
 * Terapkan satu teks hasil ketikan di kanvas ke isi website. Kembalikan null bila jalurnya tidak dikenal, nilainya
 * kosong untuk bidang wajib, atau tidak ada yang berubah. Spasi dirapikan; isi dinormalisasi ulang.
 */
export function setContentField(c: SiteContent, path: string, value: unknown): SiteContent | null {
  const rule = FIELD_RULES.find((r) => r.re.test(path));
  if (!rule || typeof value !== "string") return null;
  const v = value.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, rule.max);
  if (!v && !rule.optional) return null;
  const next = structuredClone(c) as unknown as Record<string, unknown>;
  const parts = path.split(".");
  if (parts.length === 1) {
    if (next[parts[0]] === v) return null;
    next[parts[0]] = v;
  } else if (parts[0] === "testimonial") {
    const t = { text: "", name: "", ...((next.testimonial as Record<string, string> | undefined) ?? {}) };
    if (t[parts[1] as "text" | "name"] === v) return null;
    t[parts[1] as "text" | "name"] = v;
    next.testimonial = t;
  } else {
    const list = next[parts[0]] as Record<string, unknown>[] | undefined;
    const i = Number(parts[1]);
    if (!Array.isArray(list) || !list[i] || list[i][parts[2]] === v) return null;
    list[i] = { ...list[i], [parts[2]]: v };
  }
  return normalizeContent(next);
}
