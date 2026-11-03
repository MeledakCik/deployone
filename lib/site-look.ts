/**
 * Gaya visual hasil latihan ("paket gaya") untuk AI Web Builder.
 *
 * Dua bentuk:
 *  - StylePack  = data latihan yang diimpor admin (satu gerakan visual, mis. brutalism): beberapa palet, karakter
 *                 huruf, bentuk, tata letak, elemen dekoratif, dan teks pendek (label meta, pita berjalan).
 *  - SiteLook   = gaya yang sudah dipilih untuk SATU website (satu palet, elemen terpilih, label sudah terisi).
 *                 Disimpan di SiteContent.look dan dibaca renderer.
 *
 * Murni (tanpa import), dipakai renderer, mesin, Panel Admin, dan skrip latih.
 */

/** Keluarga huruf (font sistem; tanpa unduhan font dari luar). */
export const LOOK_FONTS = ["condensed", "grotesk", "sans", "serif", "slab", "mono", "display"] as const;
export type LookFontFamily = (typeof LOOK_FONTS)[number];

/**
 * Elemen yang bisa digambar renderer:
 *  meta       baris label kecil di atas hero (label, angka besar, daftar →)
 *  bands      blok warna terbalik selebar layar (judul raksasa dua nada)
 *  ticker     pita teks berjalan di bawah hero
 *  index      nomor bagian (01), (02), ... di setiap judul bagian
 *  arrow      panah ↗ besar di blok aksen dan tombol
 *  crosshair  target / bidikan (lingkaran + garis silang)
 *  barcode    batang barcode dengan angka
 *  sunburst   garis memancar
 *  asterisk   asterisk tebal di kotak aksen
 *  halftone   bola titik-titik
 *  plus-grid  tanda plus kecil berjajar (kesan blueprint)
 */
export const LOOK_ELEMENTS = ["meta", "bands", "ticker", "index", "arrow", "crosshair", "barcode", "sunburst", "asterisk", "halftone", "plus-grid"] as const;
export type LookElement = (typeof LOOK_ELEMENTS)[number];

export const LOOK_SHADOWS = ["none", "hard", "soft"] as const;
export type LookShadow = (typeof LOOK_SHADOWS)[number];

export interface LookFont {
  family: LookFontFamily;
  /** 400..900 */
  weight: number;
  upper?: boolean;
  /** letter-spacing dalam em, mis. -0.04 */
  tracking?: number;
  /** pengali ukuran (judul), 0.7..1.6 */
  scale?: number;
  /** line-height judul, 0.78..1.3 */
  leading?: number;
}

export interface LookPalette {
  name?: string;
  bg: string;
  fg: string;
  /** Warna garis tepi & blok terbalik. Kosong = fg. */
  ink?: string;
  accent: string;
  accent2?: string;
}

export interface LookShape {
  /** radius sudut px (0 = lancip) */
  radius: number;
  /** tebal garis px */
  border: number;
  shadow: LookShadow;
  /** jarak antar kartu px; 0 = kartu saling menempel berbagi garis */
  gap: number;
  /** padding kartu px */
  pad: number;
  /** lebar konten maksimum px */
  width: number;
  /** jarak antar bagian px (desktop) */
  section: number;
}

/** Data latihan: satu gerakan visual. Semua teks boleh memakai slot {brand} {city} {year} {product}. */
export interface StylePack {
  type: "style";
  id: string;
  label: string;
  desc?: string;
  /** Contoh deskripsi pengguna yang meminta gaya ini (mis. "website gaya poster tegas"). */
  prompts: string[];
  /** Kata yang memicu gaya ini bila muncul di deskripsi. */
  keywords: string[];
  /**
   * Kapan gaya dipakai walau pengguna tidak memintanya: domain/jenis usaha yang cocok dan peluangnya (0..1).
   * Pemilihan memakai acak deterministik per deskripsi + varian, jadi "Buat ulang" bisa berganti gaya.
   */
  fit?: { kinds?: string[]; domains?: string[]; chance?: number };
  palettes: LookPalette[];
  fonts: { title: LookFont; sub?: LookFont; body: LookFont; label: LookFont };
  /** Set huruf alternatif; tiap website memakai satu set (fonts atau salah satu typeSets). */
  typeSets?: { title: LookFont; sub?: LookFont; body: LookFont; label: LookFont }[];
  shape: LookShape;
  layouts: { hero: string[]; feat: string[] };
  /** Elemen yang selalu dipakai, dan elemen pilihan (diambil acak 2–4 per website). */
  elements: { always?: string[]; pool: string[] };
  copy: {
    /** Label kecil di baris meta (3–4 dipakai), mis. "{city} / {year}". */
    meta: string[];
    /** Kalimat pendek di blok aksen / bawah judul raksasa. */
    kicker: string[];
    /** Teks pita berjalan. */
    ticker: string[];
  };
}

/** Gaya yang sudah dipilih untuk satu website. */
export interface SiteLook {
  style: string;
  name: string;
  bg: string;
  fg: string;
  ink: string;
  accent: string;
  accent2: string;
  fonts: { title: LookFont; sub: LookFont; body: LookFont; label: LookFont };
  shape: LookShape;
  elements: LookElement[];
  meta: string[];
  kicker: string;
  ticker: string;
  /** Angka besar di baris meta (mis. tahun). */
  num: string;
}

/* ---------------- normalisasi (isi dari mesin/penyimpanan jangan dipercaya mentah) ---------------- */

const HEX = /^#[0-9a-fA-F]{6}$/;
const isHex = (v: unknown): v is string => typeof v === "string" && HEX.test(v);
const num = (v: unknown, lo: number, hi: number, d: number): number => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d;
};
const txt = (v: unknown, max: number): string =>
  typeof v === "string"
    ? v
        .replace(/[\u0000-\u001f\u007f<>]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, max)
    : "";
const rec = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

function normFont(v: unknown, d: LookFont): LookFont {
  const o = rec(v);
  const family = (LOOK_FONTS as readonly string[]).includes(o.family as string) ? (o.family as LookFontFamily) : d.family;
  return {
    family,
    weight: Math.round(num(o.weight, 100, 900, d.weight) / 100) * 100,
    upper: typeof o.upper === "boolean" ? o.upper : !!d.upper,
    tracking: num(o.tracking, -0.12, 0.3, d.tracking ?? 0),
    scale: num(o.scale, 0.7, 1.6, d.scale ?? 1),
    leading: num(o.leading, 0.78, 1.4, d.leading ?? 1.06),
  };
}

const DEF_FONT: LookFont = { family: "sans", weight: 700, upper: false, tracking: 0, scale: 1, leading: 1.06 };

export function normalizeShape(v: unknown): LookShape {
  const o = rec(v);
  return {
    radius: Math.round(num(o.radius, 0, 40, 0)),
    border: Math.round(num(o.border, 0, 6, 2)),
    shadow: (LOOK_SHADOWS as readonly string[]).includes(o.shadow as string) ? (o.shadow as LookShadow) : "none",
    gap: Math.round(num(o.gap, 0, 40, 0)),
    pad: Math.round(num(o.pad, 12, 48, 24)),
    width: Math.round(num(o.width, 880, 1440, 1200)),
    section: Math.round(num(o.section, 40, 180, 88)),
  };
}

/** SiteLook dari data mentah, atau undefined bila tidak valid. */
export function normalizeLook(v: unknown): SiteLook | undefined {
  const o = rec(v);
  if (!isHex(o.bg) || !isHex(o.fg) || !isHex(o.accent)) return undefined;
  const f = rec(o.fonts);
  const title = normFont(f.title, { ...DEF_FONT, weight: 800 });
  const elements = Array.isArray(o.elements)
    ? [...new Set(o.elements.filter((e): e is LookElement => (LOOK_ELEMENTS as readonly string[]).includes(e as string)))]
    : [];
  return {
    style: txt(o.style, 40) || "gaya",
    name: txt(o.name, 40) || "Gaya",
    bg: o.bg.toLowerCase(),
    fg: o.fg.toLowerCase(),
    ink: (isHex(o.ink) ? o.ink : o.fg).toLowerCase(),
    accent: o.accent.toLowerCase(),
    accent2: (isHex(o.accent2) ? o.accent2 : o.accent).toLowerCase(),
    fonts: {
      title,
      sub: normFont(f.sub, title),
      body: normFont(f.body, { ...DEF_FONT, weight: 400 }),
      label: normFont(f.label, { family: "mono", weight: 600, upper: true, tracking: 0.06 }),
    },
    shape: normalizeShape(o.shape),
    elements,
    meta: (Array.isArray(o.meta) ? o.meta : []).map((x) => txt(x, 28)).filter(Boolean).slice(0, 4),
    kicker: txt(o.kicker, 60),
    ticker: txt(o.ticker, 80),
    num: txt(o.num, 6),
  };
}

/* ---------------- validasi data latihan ---------------- */

export interface StyleRules {
  heroes: ReadonlySet<string>;
  feats: ReadonlySet<string>;
  banned?: readonly string[];
}

/** Luminans relatif WCAG. */
export function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const ch = (x: number) => {
    const c = x / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * ch((n >> 16) & 255) + 0.7152 * ch((n >> 8) & 255) + 0.0722 * ch(n & 255);
}
export function contrast(a: string, b: string): number {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

export function isStylePack(v: unknown): boolean {
  const o = rec(v);
  return o.type === "style" || (Array.isArray(o.palettes) && !!o.fonts && !!o.shape);
}

/** Periksa satu paket gaya. Kosong = lolos. */
export function validateStyle(s: StylePack, rules: StyleRules): string[] {
  const o = s as unknown as Record<string, unknown>;
  const where = `Gaya "${(o.id as string) ?? "?"}"`;
  const e: string[] = [];
  if (typeof s.id !== "string" || !/^[a-z0-9][a-z0-9-]{1,47}$/.test(s.id)) e.push(`${where}: "id" hanya huruf kecil, angka, dan tanda minus.`);
  if (!txt(s.label, 40)) e.push(`${where}: "label" wajib diisi.`);
  if (!Array.isArray(s.keywords) || !s.keywords.length) e.push(`${where}: "keywords" wajib diisi (kata yang memicu gaya ini).`);
  if (!Array.isArray(s.prompts) || s.prompts.length < 3) e.push(`${where}: tulis minimal 3 contoh deskripsi di "prompts".`);

  if (!Array.isArray(s.palettes) || !s.palettes.length) e.push(`${where}: "palettes" minimal satu palet.`);
  else
    s.palettes.forEach((p, i) => {
      const n = `${where}: palet #${i + 1}${p?.name ? ` (${p.name})` : ""}`;
      for (const k of ["bg", "fg", "accent"] as const) if (!isHex(p?.[k])) e.push(`${n}: "${k}" harus warna hex #rrggbb.`);
      for (const k of ["ink", "accent2"] as const) if (p?.[k] !== undefined && !isHex(p[k])) e.push(`${n}: "${k}" harus warna hex #rrggbb.`);
      if (isHex(p?.bg) && isHex(p?.fg) && contrast(p.bg, p.fg) < 4.5) e.push(`${n}: kontras teks (fg) di atas latar (bg) ${contrast(p.bg, p.fg).toFixed(1)}:1, minimal 4,5:1.`);
      if (isHex(p?.bg) && isHex(p?.ink) && contrast(p.bg, p.ink) < 4.5) e.push(`${n}: kontras garis/blok (ink) dengan latar ${contrast(p.bg, p.ink).toFixed(1)}:1, minimal 4,5:1 (teks di blok ink memakai warna latar).`);
    });

  const checkFonts = (f: Record<string, unknown>, name: string) => {
    for (const k of ["title", "body", "label"]) {
      const x = rec(f[k]);
      if (!(LOOK_FONTS as readonly string[]).includes(x.family as string)) e.push(`${where}: ${name}.${k}.family harus salah satu dari ${LOOK_FONTS.join(", ")}.`);
      if (typeof x.weight !== "number" || x.weight < 100 || x.weight > 900) e.push(`${where}: ${name}.${k}.weight harus angka 100–900.`);
    }
    if (f.sub !== undefined && !(LOOK_FONTS as readonly string[]).includes(rec(f.sub).family as string)) e.push(`${where}: ${name}.sub.family tidak dikenal.`);
  };
  checkFonts(rec(o.fonts), "fonts");
  if (o.typeSets !== undefined) {
    if (!Array.isArray(o.typeSets)) e.push(`${where}: "typeSets" harus array.`);
    else o.typeSets.forEach((x, i) => checkFonts(rec(x), `typeSets[${i}]`));
  }

  const sh = rec(o.shape);
  for (const k of ["radius", "border", "gap", "pad", "width", "section"]) if (typeof sh[k] !== "number") e.push(`${where}: shape.${k} harus angka.`);
  if (sh.shadow !== undefined && !(LOOK_SHADOWS as readonly string[]).includes(sh.shadow as string)) e.push(`${where}: shape.shadow harus ${LOOK_SHADOWS.join(", ")}.`);

  const L = rec(o.layouts);
  const badList = (v: unknown, allowed: ReadonlySet<string>, k: string) => {
    if (!Array.isArray(v) || !v.length) return e.push(`${where}: layouts.${k} minimal satu.`);
    const w = v.filter((x) => !allowed.has(x as string));
    if (w.length) e.push(`${where}: layouts.${k} tidak dikenal: ${w.join(", ")}. Pilihan: ${[...allowed].join(", ")}.`);
  };
  badList(L.hero, rules.heroes, "hero");
  badList(L.feat, rules.feats, "feat");

  const el = rec(o.elements);
  const all = [...(Array.isArray(el.always) ? el.always : []), ...(Array.isArray(el.pool) ? el.pool : [])];
  if (!Array.isArray(el.pool)) e.push(`${where}: elements.pool wajib berupa array.`);
  const unk = all.filter((x) => !(LOOK_ELEMENTS as readonly string[]).includes(x as string));
  if (unk.length) e.push(`${where}: elemen tidak dikenal: ${unk.join(", ")}. Pilihan: ${LOOK_ELEMENTS.join(", ")}.`);

  const c = rec(o.copy);
  for (const k of ["meta", "kicker", "ticker"]) if (!Array.isArray(c[k]) || !(c[k] as unknown[]).length) e.push(`${where}: copy.${k} minimal satu teks.`);
  for (const t of (Array.isArray(c.meta) ? c.meta : []) as string[]) if (typeof t === "string" && t.length > 28) e.push(`${where}: label meta "${t}" terlalu panjang (maks. 28 huruf).`);

  if (rules.banned?.length) {
    const text = JSON.stringify(c).toLowerCase();
    for (const w of rules.banned)
      if (new RegExp(`(?<![\\p{L}])${w.replace(/ /g, "\\s+")}(?![\\p{L}])`, "iu").test(text)) e.push(`${where}: memakai ungkapan generik terlarang "${w}".`);
  }
  if (o.fit !== undefined) {
    const fit = rec(o.fit);
    if (fit.chance !== undefined && (typeof fit.chance !== "number" || fit.chance < 0 || fit.chance > 1)) e.push(`${where}: fit.chance harus angka 0–1.`);
  }
  return e;
}
