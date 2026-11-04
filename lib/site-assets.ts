/**
 * Paket ikon & paket elemen untuk AI Web Builder (data latihan, diimpor admin).
 *
 *  - IconPack    : ikon SVG gaya Lucide (kanvas 24×24, garis) + kata kunci bahasa Indonesia. Mesin mempelajari
 *                  kata → ikon, jadi produk/fitur seperti "gerobak" atau "galon" otomatis mendapat ikon yang pas.
 *  - IconPack + variant: gambar alternatif satu gaya ikon (mis. "piksel") untuk ikon bawaan/impor.
 *  - ElementPack : elemen dekoratif SVG dengan slot pemakaian (art, badge, divider, pattern, corner), keluarga
 *                  visual (satu website = satu keluarga), dan aturan kapan dipakai (gaya, template, jenis usaha,
 *                  domain, peluang).
 *  - Gaya ikon   : perlakuan seragam untuk semua ikon satu website (garis, tipis, tegas, duotone, bayangan,
 *                  sketsa, neon, piksel).
 *
 * SVG dari luar akan tampil di website publik, jadi SELALU lewat sanitizeSvg(): hanya bentuk dasar dan atribut
 * yang aman. Tidak ada script, link, gambar luar, teks, style, atau event handler. Keluaran dibangun ulang dari
 * token yang lolos (bukan menyalin input), jadi markup aneh tidak bisa lolos.
 *
 * Murni (tanpa import), dipakai renderer, mesin, Panel Admin, dan skrip latih.
 */

export const ELEMENT_SLOTS = ["art", "badge", "divider", "pattern", "corner"] as const;
export type ElementSlot = (typeof ELEMENT_SLOTS)[number];

/* ======================================================================== */
/*  Gaya ikon                                                                */
/* ======================================================================== */

/**
 * Gaya ikon satu website. Semua ikon (fitur, produk, kontak, tombol) memakai perlakuan yang sama supaya serasi.
 * Perlakuan diterapkan pada ISI svg (bukan pembungkusnya), jadi katalog toko yang digambar ulang oleh skrip di
 * browser pengunjung ikut konsisten.
 */
export const ICON_STYLES = [
  { id: "garis", name: "Garis", desc: "Garis 2px membulat. Netral, cocok untuk semua." },
  { id: "tipis", name: "Tipis", desc: "Garis halus, kesan lapang dan elegan." },
  { id: "tegas", name: "Tegas", desc: "Garis tebal bersudut kotak, kesan industrial." },
  { id: "duotone", name: "Duotone", desc: "Garis dengan isian warna lembut, kesan ramah." },
  { id: "bayangan", name: "Bayangan", desc: "Garis berbayang geser, kesan cetak retro." },
  { id: "sketsa", name: "Sketsa", desc: "Garis ganda sedikit miring, seperti digambar tangan." },
  { id: "neon", name: "Neon", desc: "Garis berpendar, paling hidup di latar gelap." },
  { id: "piksel", name: "Piksel", desc: "Ikon 8-bit kotak-kotak, kesan game retro." },
] as const;
export type IconStyle = (typeof ICON_STYLES)[number]["id"];
export const ICON_STYLE_IDS: readonly IconStyle[] = ICON_STYLES.map((x) => x.id);
export const isIconStyle = (v: unknown): v is IconStyle => typeof v === "string" && (ICON_STYLE_IDS as readonly string[]).includes(v);

/** Gaya ikon yang serasi per Template. Urutan pertama = ciri khas Template (dipakai bila Template diganti). */
export const TEMPLATE_ICON_STYLES: Record<string, IconStyle[]> = {
  bersih: ["garis", "duotone", "tipis"],
  gelap: ["garis", "neon", "duotone"],
  hangat: ["duotone", "sketsa", "garis"],
  tegas: ["tegas", "bayangan"],
  segar: ["duotone", "garis", "sketsa"],
  elegan: ["tipis"],
  pastel: ["duotone", "sketsa", "bayangan"],
  neon: ["neon", "piksel", "tegas"],
  bakso: ["duotone", "garis", "sketsa"],
  kue: ["sketsa", "tipis", "duotone"],
  barber: ["tegas", "garis", "bayangan"],
  tech: ["garis", "duotone", "tipis"],
  majalah: ["tipis", "garis"],
  jurnal: ["tipis", "garis"],
};

/** Gaya ikon ciri khas satu Template (bawaan "garis"). */
export const templateIconStyle = (template: string): IconStyle => TEMPLATE_ICON_STYLES[template]?.[0] ?? "garis";

/**
 * Terapkan gaya ikon pada isi SVG ikon 24×24 (pembungkus tetap: fill none, stroke currentColor, lebar 2, ujung
 * membulat). alt = gambar alternatif khusus gaya ini (mis. versi piksel) bila ada; dipakai apa adanya.
 * Piksel tanpa gambar alternatif jatuh ke perlakuan "tegas" supaya tetap bersudut.
 */
export function treatIcon(inner: string, style: IconStyle | undefined, alt?: string): string {
  if (!inner) return inner;
  if (alt && style && style !== "garis") return alt;
  switch (style) {
    case "tipis":
      return `<g stroke-width="1.25">${inner}</g>`;
    case "tegas":
    case "piksel":
      return `<g stroke-width="2.5" stroke-linecap="square" stroke-linejoin="miter">${inner}</g>`;
    case "duotone":
      // Salinan ikon diisi tipis di bawah garisnya: bidang (tertutup maupun terbuka) mendapat warna kedua.
      return `<g fill="currentColor" fill-opacity=".2" stroke="none">${inner}</g>${inner}`;
    case "bayangan":
      return `<g transform="translate(-.6 -.6)"><g transform="translate(1.7 1.7)" opacity=".3">${inner}</g>${inner}</g>`;
    case "sketsa":
      return `<g transform="translate(1.3 .9) rotate(-6 12 12)" stroke-width="1.1" opacity=".55">${inner}</g><g stroke-width="1.5">${inner}</g>`;
    case "neon":
      return `<g transform="translate(1.2 1.2) scale(.9)"><g stroke-width="5.5" opacity=".14">${inner}</g><g stroke-width="3" opacity=".26">${inner}</g><g stroke-width="1.6">${inner}</g></g>`;
    default:
      return inner;
  }
}

export interface IconDef {
  /** nama kebab-case, mis. "gerobak" */
  name: string;
  /** isi SVG (tanpa tag <svg>) di kanvas 24×24. Kosongkan untuk ikon bawaan (hanya menambah kata kunci). */
  svg?: string;
  /** kata/frasa yang memicu ikon ini, mis. ["gerobak", "kaki lima"]. Wajib, kecuali di paket varian. */
  keywords?: string[];
}

export interface IconPack {
  type: "icons";
  id: string;
  label: string;
  license?: string;
  /**
   * Paket varian: isinya gambar alternatif untuk satu gaya ikon (mis. "piksel"), bukan ikon baru. Nama boleh
   * sama dengan ikon bawaan/impor; "keywords" tidak wajib. Website bergaya itu memakai gambar ini bila ada.
   */
  variant?: IconStyle;
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
  /**
   * Keluarga visual (mis. "memphis", "nusantara"). Satu website hanya memakai elemen dari SATU keluarga supaya
   * serasi. Kosong = id paket.
   */
  family?: string;
  /** Kapan dipakai: gaya (id) / keluarga gaya / template / domain / jenis usaha, dan peluangnya (0..1). */
  fit?: { styles?: string[]; families?: string[]; templates?: string[]; domains?: string[]; kinds?: string[]; chance?: number };
}

/** Keterangan satu keluarga elemen. */
export interface ElementFamily {
  label?: string;
  /** Gaya ikon yang serasi (urutan = prioritas), mis. ["piksel", "tegas"] untuk keluarga piksel. */
  iconStyles?: IconStyle[];
  /** Kata di deskripsi yang meminta keluarga ini, mis. ["batik", "nusantara"]. */
  keywords?: string[];
  /** Template yang serasi, dipakai bila keluarga ini diminta lewat kata kunci, mis. ["neon", "gelap"] untuk piksel. */
  templates?: string[];
}

export interface ElementPack {
  type: "elements";
  id: string;
  label: string;
  license?: string;
  /** Keterangan keluarga yang dipakai elemen paket ini (opsional). */
  families?: Record<string, ElementFamily>;
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
const PAINT = /^(none|currentColor|#[0-9a-fA-F]{3}|#[0-9a-fA-F]{6}|var\(--(a|a2|ink|bg|fg|on|s[1-5])\))$/;
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
 * (none, currentColor, hex, var(--a|a2|ink|bg|fg|on|s1..s5)), dan transform sederhana. Yang lain = error (bukan dibuang
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
  if (p.variant !== undefined && (!isIconStyle(p.variant) || p.variant === "garis"))
    e.push(`${where}: "variant" harus salah satu gaya ikon: ${ICON_STYLE_IDS.filter((x) => x !== "garis").join(", ")}.`);
  if (!Array.isArray(p.icons) || !p.icons.length) return [...e, `${where}: "icons" minimal satu ikon.`];
  if (p.icons.length > 400) e.push(`${where}: maksimal 400 ikon per paket.`);
  const seen = new Set<string>();
  if (p.variant !== undefined) {
    // Paket varian: gambar alternatif untuk nama yang sudah ada (bawaan atau impor); kata kunci tidak wajib.
    p.icons.forEach((ic, i) => {
      const n = `${where}: ikon #${i + 1}${ic?.name ? ` "${ic.name}"` : ""}`;
      if (typeof ic?.name !== "string" || !NAME.test(ic.name) || ic.name.length > 40) e.push(`${n}: "name" harus kebab-case (mis. "gerobak-sate").`);
      else if (seen.has(ic.name)) e.push(`${n}: nama ganda di paket ini.`);
      seen.add(ic?.name);
      const r = sanitizeSvg(ic?.svg ?? "", { maxLen: 4000, maxNodes: 60 });
      r.errors.slice(0, 2).forEach((x) => e.push(`${n}: ${x}`));
      if (ic?.keywords !== undefined && (!Array.isArray(ic.keywords) || ic.keywords.some((k) => typeof k !== "string"))) e.push(`${n}: "keywords" harus array teks.`);
    });
    return e;
  }
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
  const strList = (v: unknown) => Array.isArray(v) && v.every((x) => typeof x === "string");
  if (p.families !== undefined) {
    if (!p.families || typeof p.families !== "object" || Array.isArray(p.families)) e.push(`${where}: "families" harus objek { id: { label, iconStyles, keywords } }.`);
    else
      for (const [fid, fam] of Object.entries(p.families)) {
        const n = `${where}: keluarga "${fid}"`;
        if (!ID.test(fid)) e.push(`${n}: id hanya huruf kecil, angka, dan tanda minus.`);
        if (!fam || typeof fam !== "object" || Array.isArray(fam)) {
          e.push(`${n}: harus objek.`);
          continue;
        }
        if (fam.label !== undefined && typeof fam.label !== "string") e.push(`${n}: "label" harus teks.`);
        if (fam.iconStyles !== undefined && (!Array.isArray(fam.iconStyles) || fam.iconStyles.some((x) => !isIconStyle(x))))
          e.push(`${n}: "iconStyles" hanya boleh berisi ${ICON_STYLE_IDS.join(", ")}.`);
        if (fam.keywords !== undefined && !strList(fam.keywords)) e.push(`${n}: "keywords" harus array teks.`);
        if (fam.templates !== undefined && !strList(fam.templates)) e.push(`${n}: "templates" harus array teks (id template).`);
      }
  }
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
    if (el?.family !== undefined && (typeof el.family !== "string" || !ID.test(el.family))) e.push(`${n}: "family" hanya huruf kecil, angka, dan tanda minus.`);
    const f = el?.fit;
    if (f !== undefined) {
      if (typeof f !== "object" || Array.isArray(f)) e.push(`${n}: "fit" harus objek.`);
      else {
        if (f.chance !== undefined && (typeof f.chance !== "number" || f.chance < 0 || f.chance > 1)) e.push(`${n}: fit.chance harus angka 0–1.`);
        for (const k of ["styles", "families", "templates", "domains", "kinds"] as const)
          if (f[k] !== undefined && !strList(f[k])) e.push(`${n}: fit.${k} harus array teks.`);
      }
    }
  });
  return e;
}

/** Ganti var(--x) dengan warna nyata (untuk SVG yang dipakai sebagai gambar latar data-URI, yang tidak bisa membaca variabel CSS). */
export function resolveSvgColors(
  svg: string,
  colors: { fg: string; bg: string; a: string; a2: string; ink: string; on: string; s1?: string; s2?: string; s3?: string; s4?: string; s5?: string },
): string {
  // Warna swatch (--s1..--s5) yang tidak diberikan jatuh ke aksen / aksen kedua.
  const sw = (k: string): string => (colors as Record<string, string | undefined>)[k] ?? (k === "s1" || k === "s3" || k === "s5" ? colors.a : colors.a2);
  return svg
    .replace(/currentColor/g, colors.fg)
    .replace(/var\(--(a2|a|ink|bg|fg|on|s[1-5])\)/g, (_m, k: string) => (k[0] === "s" && k.length === 2 ? sw(k) : colors[k as "a" | "a2" | "ink" | "bg" | "fg" | "on"]));
}

/** SVG → data URI aman untuk CSS url("..."). */
export function svgDataUri(vb: string, inner: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">${inner}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg).replace(/'/g, "%27").replace(/\(/g, "%28").replace(/\)/g, "%29")}`;
}
