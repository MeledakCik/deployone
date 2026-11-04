/**
 * Paket ikon & paket elemen untuk AI Web Builder (data latihan, diimpor admin).
 *
 *  - IconPack    : ikon SVG gaya Lucide (kanvas 24×24, garis) + kata kunci bahasa Indonesia. Mesin mempelajari
 *                  kata → ikon, jadi produk/fitur seperti "gerobak" atau "galon" otomatis mendapat ikon yang pas.
 *  - ElementPack : elemen dekoratif SVG dengan slot pemakaian (art, badge, divider, pattern) dan aturan kapan
 *                  dipakai (gaya visual, keluarga gaya, jenis usaha, domain, peluang).
 *
 * SVG dari luar akan tampil di website publik, jadi SELALU lewat sanitizeSvg(): hanya bentuk dasar dan atribut
 * yang aman. Tidak ada script, link, gambar luar, teks, style, atau event handler. Keluaran dibangun ulang dari
 * token yang lolos (bukan menyalin input), jadi markup aneh tidak bisa lolos.
 *
 * Murni (tanpa import), dipakai renderer, mesin, Panel Admin, dan skrip latih.
 */

export const ELEMENT_SLOTS = ["art", "badge", "divider", "pattern"] as const;
export type ElementSlot = (typeof ELEMENT_SLOTS)[number];

export interface IconDef {
  /** nama kebab-case, mis. "gerobak" */
  name: string;
  /** isi SVG (tanpa tag <svg>) di kanvas 24×24. Kosongkan untuk ikon bawaan (hanya menambah kata kunci). */
  svg?: string;
  /** kata/frasa yang memicu ikon ini, mis. ["gerobak", "kaki lima"] */
  keywords: string[];
}

export interface IconPack {
  type: "icons";
  id: string;
  label: string;
  license?: string;
  icons: IconDef[];
}

export interface ElementDef {
  id: string;
  label: string;
  slot: ElementSlot;
  /** "0 0 W H" */
  viewBox: string;
  svg: string;
  tags?: string[];
  /** Kapan dipakai: gaya (id) / keluarga gaya / domain / jenis usaha, dan peluangnya (0..1). */
  fit?: { styles?: string[]; families?: string[]; domains?: string[]; kinds?: string[]; chance?: number };
}

export interface ElementPack {
  type: "elements";
  id: string;
  label: string;
  license?: string;
  elements: ElementDef[];
}

/** Ornamen yang sudah dipilih untuk satu website (disimpan di SiteContent.ornaments). */
export interface SiteOrnament {
  id: string;
  slot: ElementSlot;
  vb: string;
  svg: string;
}

/* ======================================================================== */
/*  Sanitasi SVG (allow-list)                                                */
/* ======================================================================== */

const SHAPES = new Set(["path", "circle", "rect", "ellipse", "line", "polyline", "polygon", "g"]);
const NUM = /^-?(\d+\.?\d*|\.\d+)(e-?\d+)?(px|%)?$/i;
const NUM_ATTRS = new Set(["cx", "cy", "r", "rx", "ry", "x", "y", "width", "height", "x1", "y1", "x2", "y2", "stroke-width", "opacity", "fill-opacity", "stroke-opacity", "stroke-miterlimit"]);
const PAINT = /^(none|currentColor|#[0-9a-fA-F]{3}|#[0-9a-fA-F]{6}|var\(--(a|a2|ink|bg|fg|on)\))$/;
const ENUMS: Record<string, RegExp> = {
  "stroke-linecap": /^(butt|round|square)$/,
  "stroke-linejoin": /^(miter|round|bevel)$/,
  "fill-rule": /^(nonzero|evenodd)$/,
  "clip-rule": /^(nonzero|evenodd)$/,
};
const PATH_D = /^[MmLlHhVvCcSsQqTtAaZz0-9.,\s\-eE]+$/;
const POINTS = /^[0-9.,\s\-eE]+$/;
const DASH = /^[0-9.,\s]+$/;
const TRANSFORM = /^(\s*(translate|rotate|scale|matrix|skewX|skewY)\(\s*[-0-9.,\seE]+\)\s*)+$/;

export interface SanitizeResult {
  svg: string;
  errors: string[];
}

/**
 * Bersihkan isi SVG. Hanya: path, circle, rect, ellipse, line, polyline, polygon, g; atribut geometri, warna
 * (none, currentColor, hex, var(--a|a2|ink|bg|fg|on)), dan transform sederhana. Yang lain = error (bukan dibuang
 * diam-diam), supaya admin tahu file mana yang perlu diperbaiki.
 */
export function sanitizeSvg(input: string, opts: { maxLen?: number; maxNodes?: number } = {}): SanitizeResult {
  const errors: string[] = [];
  const maxLen = opts.maxLen ?? 12000;
  const maxNodes = opts.maxNodes ?? 400;
  const src = String(input ?? "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .trim();
  if (!src) return { svg: "", errors: ["SVG kosong."] };
  if (src.length > maxLen) return { svg: "", errors: [`SVG terlalu panjang (${src.length} karakter, maks. ${maxLen}).`] };

  const out: string[] = [];
  const stack: string[] = [];
  let nodes = 0;
  let i = 0;
  const tagRe = /<\s*(\/)?\s*([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[a-zA-Z][a-zA-Z0-9:-]*\s*=\s*(?:"[^"<>]*"|'[^'<>]*'))*)\s*(\/)?\s*>/y;
  const attrRe = /([a-zA-Z][a-zA-Z0-9:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let pendingClose: string | null = null;

  while (i < src.length) {
    const ws = /\s*/y;
    ws.lastIndex = i;
    ws.exec(src);
    i = ws.lastIndex;
    if (i >= src.length) break;
    if (src[i] !== "<") {
      errors.push("SVG hanya boleh berisi bentuk (path, circle, rect, ...), bukan teks.");
      break;
    }
    tagRe.lastIndex = i;
    const m = tagRe.exec(src);
    if (!m) {
      errors.push(`Tag tidak bisa dibaca di dekat: ${src.slice(i, i + 40)}`);
      break;
    }
    i = tagRe.lastIndex;
    const [, closing, rawName, attrs, selfClose] = m;
    const name = rawName.toLowerCase();
    if (!SHAPES.has(name)) {
      errors.push(`Elemen <${name}> tidak diizinkan. Pakai path, circle, rect, ellipse, line, polyline, polygon, atau g.`);
      continue;
    }
    if (closing) {
      if (pendingClose === name) {
        pendingClose = null;
        continue;
      }
      if (name === "g" && stack.length) {
        stack.pop();
        out.push("</g>");
        continue;
      }
      errors.push(`Penutup </${name}> tidak punya pasangan.`);
      continue;
    }
    if (pendingClose) {
      errors.push(`<${pendingClose}> harus ditutup sebelum elemen berikutnya.`);
      pendingClose = null;
    }
    if (++nodes > maxNodes) {
      errors.push(`Terlalu banyak bentuk (maks. ${maxNodes}).`);
      break;
    }
    const clean: string[] = [];
    attrRe.lastIndex = 0;
    let a: RegExpExecArray | null;
    while ((a = attrRe.exec(attrs))) {
      const k = a[1].toLowerCase();
      const v = (a[2] ?? a[3] ?? "").trim();
      let ok = false;
      if (NUM_ATTRS.has(k)) ok = NUM.test(v);
      else if (k === "d") ok = v.length <= 6000 && PATH_D.test(v);
      else if (k === "points") ok = v.length <= 3000 && POINTS.test(v);
      else if (k === "fill" || k === "stroke") ok = PAINT.test(v);
      else if (k === "stroke-dasharray") ok = DASH.test(v);
      else if (k === "transform") ok = v.length <= 200 && TRANSFORM.test(v);
      else if (ENUMS[k]) ok = ENUMS[k].test(v);
      if (ok) clean.push(`${k}="${v}"`);
      else errors.push(`Atribut ${k}="${v.slice(0, 40)}" pada <${name}> tidak diizinkan.`);
    }
    const tag = `<${name}${clean.length ? " " + clean.join(" ") : ""}`;
    if (name === "g") {
      if (selfClose) out.push(`${tag}/>`);
      else {
        stack.push("g");
        out.push(`${tag}>`);
      }
    } else {
      out.push(`${tag}/>`);
      if (!selfClose) pendingClose = name;
    }
  }
  if (pendingClose) errors.push(`<${pendingClose}> tidak ditutup.`);
  if (stack.length) errors.push("Ada <g> yang tidak ditutup.");
  if (!nodes) errors.push("SVG tidak berisi bentuk apa pun.");
  return { svg: errors.length ? "" : out.join(""), errors };
}

/** Versi "pasti aman" untuk runtime: SVG yang tidak lolos jadi string kosong. */
export function safeSvg(input: unknown, maxLen?: number): string {
  if (typeof input !== "string") return "";
  const r = sanitizeSvg(input, { maxLen });
  return r.errors.length ? "" : r.svg;
}

export const VIEWBOX = /^0 0 (\d{1,4}(\.\d+)?) (\d{1,4}(\.\d+)?)$/;
const ID = /^[a-z0-9][a-z0-9-]{1,47}$/;
const NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const isIconPack = (v: unknown): boolean => !!v && typeof v === "object" && (v as { type?: unknown }).type === "icons";
export const isElementPack = (v: unknown): boolean => !!v && typeof v === "object" && (v as { type?: unknown }).type === "elements";

/** Periksa paket ikon. builtin = nama ikon bawaan (tidak boleh ditimpa). */
export function validateIconPack(p: IconPack, builtin: ReadonlySet<string>): string[] {
  const where = `Paket ikon "${p?.id ?? "?"}"`;
  const e: string[] = [];
  if (typeof p.id !== "string" || !ID.test(p.id)) e.push(`${where}: "id" hanya huruf kecil, angka, dan tanda minus.`);
  if (typeof p.label !== "string" || !p.label.trim()) e.push(`${where}: "label" wajib diisi.`);
  if (!Array.isArray(p.icons) || !p.icons.length) return [...e, `${where}: "icons" minimal satu ikon.`];
  if (p.icons.length > 400) e.push(`${where}: maksimal 400 ikon per paket.`);
  const seen = new Set<string>();
  p.icons.forEach((ic, i) => {
    const n = `${where}: ikon #${i + 1}${ic?.name ? ` "${ic.name}"` : ""}`;
    if (typeof ic?.name !== "string" || !NAME.test(ic.name) || ic.name.length > 40) e.push(`${n}: "name" harus kebab-case (mis. "gerobak-sate").`);
    else if (seen.has(ic.name)) e.push(`${n}: nama ganda di paket ini.`);
    seen.add(ic?.name);
    if (builtin.has(ic?.name)) {
      // Ikon bawaan: hanya boleh menambah kata kunci, gambarnya tidak boleh ditimpa.
      if (ic.svg) e.push(`${n}: nama sudah dipakai ikon bawaan. Hapus "svg" untuk sekadar menambah kata kunci, atau pakai nama lain.`);
    } else {
      const r = sanitizeSvg(ic?.svg ?? "", { maxLen: 3000, maxNodes: 40 });
      r.errors.slice(0, 2).forEach((x) => e.push(`${n}: ${x}`));
    }
    if (!Array.isArray(ic?.keywords) || !ic.keywords.length || ic.keywords.some((k) => typeof k !== "string" || !k.trim()))
      e.push(`${n}: "keywords" minimal satu kata (mis. ["gerobak", "kaki lima"]).`);
  });
  return e;
}

/** Periksa paket elemen. */
export function validateElementPack(p: ElementPack): string[] {
  const where = `Paket elemen "${p?.id ?? "?"}"`;
  const e: string[] = [];
  if (typeof p.id !== "string" || !ID.test(p.id)) e.push(`${where}: "id" hanya huruf kecil, angka, dan tanda minus.`);
  if (typeof p.label !== "string" || !p.label.trim()) e.push(`${where}: "label" wajib diisi.`);
  if (!Array.isArray(p.elements) || !p.elements.length) return [...e, `${where}: "elements" minimal satu elemen.`];
  if (p.elements.length > 200) e.push(`${where}: maksimal 200 elemen per paket.`);
  const seen = new Set<string>();
  p.elements.forEach((el, i) => {
    const n = `${where}: elemen #${i + 1}${el?.id ? ` "${el.id}"` : ""}`;
    if (typeof el?.id !== "string" || !ID.test(el.id)) e.push(`${n}: "id" hanya huruf kecil, angka, dan tanda minus.`);
    else if (seen.has(el.id)) e.push(`${n}: id ganda di paket ini.`);
    seen.add(el?.id);
    if (!(ELEMENT_SLOTS as readonly string[]).includes(el?.slot)) e.push(`${n}: "slot" harus ${ELEMENT_SLOTS.join(", ")}.`);
    if (typeof el?.viewBox !== "string" || !VIEWBOX.test(el.viewBox)) e.push(`${n}: "viewBox" harus "0 0 lebar tinggi", mis. "0 0 200 40".`);
    const r = sanitizeSvg(el?.svg ?? "", { maxLen: 12000, maxNodes: 400 });
    r.errors.slice(0, 2).forEach((x) => e.push(`${n}: ${x}`));
    const f = el?.fit;
    if (f !== undefined) {
      if (typeof f !== "object" || Array.isArray(f)) e.push(`${n}: "fit" harus objek.`);
      else if (f.chance !== undefined && (typeof f.chance !== "number" || f.chance < 0 || f.chance > 1)) e.push(`${n}: fit.chance harus angka 0–1.`);
    }
  });
  return e;
}

/** Ganti var(--x) dengan warna nyata (untuk SVG yang dipakai sebagai gambar latar data-URI, yang tidak bisa membaca variabel CSS). */
export function resolveSvgColors(svg: string, colors: { fg: string; bg: string; a: string; a2: string; ink: string; on: string }): string {
  return svg
    .replace(/currentColor/g, colors.fg)
    .replace(/var\(--(a2|a|ink|bg|fg|on)\)/g, (_m, k: keyof typeof colors) => colors[k]);
}

/** SVG → data URI aman untuk CSS url("..."). */
export function svgDataUri(vb: string, inner: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">${inner}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg).replace(/'/g, "%27").replace(/\(/g, "%28").replace(/\)/g, "%29")}`;
}
