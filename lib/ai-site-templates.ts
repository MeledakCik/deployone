/**
 * Mesin template untuk fitur "AI Web Builder".
 *
 * Kenapa template? Supaya AI tidak menulis HTML+CSS (ribuan token). AI cukup mengisi JSON berisi teks,
 * jenis usaha, saran template/tata letak, ikon Lucide, dan (untuk UMKM) daftar produk. HTML dirakit di sini.
 * Satu isi bisa dirender ulang ke template / tata letak / warna lain TANPA memanggil AI lagi.
 *
 * File ini murni (tanpa import Node/React) sehingga dipakai server (validasi) dan browser (pratinjau, ekspor).
 * Hasil: satu index.html mandiri (atau dipecah jadi index.html + assets/ untuk ekspor ZIP). Ikon = SVG Lucide
 * inline, tanpa emoji dan tanpa request ke luar (font sistem). Skrip hanya ada untuk situs berkatalog (UMKM).
 */
import { LUCIDE, isIconName } from "@/lib/lucide-icons";
import { SHOP_RUNTIME_JS } from "@/lib/ai-site-runtime";
import { contrast as lookContrast, normalizeLook, type LookElement, type LookFont, type LookFontFamily, type SiteLook } from "@/lib/site-look";
import { ELEMENT_SLOTS, VIEWBOX, isIconStyle, resolveSvgColors, safeSvg, svgDataUri, templateIconStyle, treatIcon, type IconStyle, type SiteOrnament } from "@/lib/site-assets";
import { pixelIcon } from "@/lib/lucide-pixel";

export type { SiteLook } from "@/lib/site-look";

export type TemplateId = "bersih" | "gelap" | "hangat" | "tegas" | "segar" | "elegan" | "pastel" | "neon" | "bakso" | "kue" | "barber" | "tech" | "majalah" | "jurnal";
export type SiteKind = "umkm" | "jasa" | "portofolio" | "event" | "profil" | "artikel";
/** center/left/split = lawas; split-bold (60/40 + tumpukan kartu), asymmetric (1 kartu besar + 2 kecil), editorial (headline raksasa) = baru. */
export type HeroLayout = "center" | "left" | "split" | "split-bold" | "asymmetric" | "editorial" | "poster" | "breaker" | "terminal" | "dashboard" | "label" | "neo" | "collage";
export type FeatLayout = "grid" | "bento" | "list" | "editorial" | "index";
export type HoverEffect = "lift" | "tilt";

export interface SiteFeature {
  /** Nama ikon Lucide (kebab-case), mis. "utensils". */
  icon: string;
  title: string;
  text: string;
  /** Lebar kartu di bento (1 atau 2 kolom). Kosong = 1. */
  span?: 1 | 2;
}

export interface SiteStep {
  title: string;
  text: string;
}

export interface SiteArticle {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  author: string;
  /** Perkiraan menit baca. */
  readMin: number;
  /** Paragraf; paragraf berawalan "## " dirender sebagai subjudul. */
  body: string[];
}

/** Gambar unggahan pengguna (data URL), kunci: logo | hero | item:<id> | article:<id>. */
export type SiteImages = Record<string, string>;

export interface SiteItem {
  id: string;
  name: string;
  desc: string;
  /** Rupiah, bilangan bulat. 0 = harga tidak disebut ("Tanya harga"). */
  price: number;
  category: string;
  icon: string;
  img: string;
  /** large = kartu 2x lebih besar (best seller). Kosong = small. */
  size?: "large" | "small";
  /** Label kecil, mis. "Best Seller". */
  tag?: string;
}

export interface SiteContent {
  kind: SiteKind;
  /** Saran AI; pengguna boleh menggantinya. */
  template: TemplateId;
  accent: string;
  hero: HeroLayout;
  feat: FeatLayout;
  brand: string;
  brandIcon: string;
  /** Label kecil di atas judul, mis. "Buka setiap hari". Boleh kosong. */
  badge: string;
  headline: string;
  subheadline: string;
  ctaLabel: string;
  features: SiteFeature[];
  itemsTitle: string;
  items: SiteItem[];
  /** Hanya untuk jenis "artikel". */
  articles?: SiteArticle[];
  stepsTitle: string;
  steps: SiteStep[];
  aboutTitle: string;
  about: string;
  /** Hanya angka, format internasional tanpa "+", mis. 6281234567890. Kosong = tombol WA tidak muncul. */
  whatsapp: string;
  email: string;
  address: string;
  hours: string;
  /** Judul bagian keunggulan; netral, mis. "Kenapa Bakso Pak Slamet". */
  featuresTitle: string;
  /** Judul + teks penutup (blok ajakan di bawah). */
  closing: string;
  closingText: string;
  /** Palet kurasi (bakso | kue | barber | tech) bila AI memakai format baru. */
  palette?: string;
  /** Slogan maks 5 kata. */
  slogan?: string;
  hover?: HoverEffect;
  /** Kosong = bagian testimoni tidak ditampilkan. */
  testimonial?: { text: string; name: string };
  /** Gaya visual hasil latihan (paket gaya), mis. brutalism. Kosong = ikut Template. */
  look?: SiteLook;
  /** Ikon hasil impor yang dipakai website ini: nama → isi SVG 24×24 (sudah disaring). */
  icons?: Record<string, string>;
  /** Gaya ikon pilihan mesin (garis, tipis, tegas, duotone, bayangan, sketsa, neon, piksel). Kosong = "garis". */
  iconStyle?: IconStyle;
  /** Gambar ikon alternatif per gaya dari paket varian: gaya → nama → isi SVG (sudah disaring). */
  iconAlt?: Partial<Record<IconStyle, Record<string, string>>>;
  /** Elemen dekoratif hasil impor (paket elemen): maks. satu per slot, semuanya dari satu keluarga. */
  ornaments?: SiteOrnament[];
  /** Keluarga elemen ornamen (mis. "memphis"). */
  ornFamily?: string;
  /** Urutan & bagian yang disembunyikan (diatur pengguna di editor). Kosong = urutan bawaan jenis situs. */
  sections?: { order?: SectionId[]; hidden?: SectionId[] };
}

/** Bagian halaman di bawah hero yang bisa diurutkan / disembunyikan. */
export type SectionId = "katalog" | "artikel" | "fitur" | "testimoni" | "cara" | "tentang" | "kontak";
export const SECTION_IDS: SectionId[] = ["katalog", "artikel", "fitur", "testimoni", "cara", "tentang", "kontak"];
export const isSectionId = (v: unknown): v is SectionId => SECTION_IDS.includes(v as SectionId);

/** Urutan bawaan: UMKM berkatalog = katalog dulu; artikel = daftar artikel dulu; lainnya = keunggulan dulu. */
export function defaultSectionOrder(kind: SiteKind, shop: boolean): SectionId[] {
  if (kind === "artikel") return ["artikel", "fitur", "testimoni", "cara", "tentang", "kontak"];
  return shop ? ["katalog", "fitur", "testimoni", "cara", "tentang", "kontak"] : ["fitur", "katalog", "testimoni", "cara", "tentang", "kontak"];
}

/** Urutan efektif: pilihan pengguna dulu (yang valid), sisanya ikut urutan bawaan. */
export function sectionOrder(c: Pick<SiteContent, "kind" | "sections">, shop: boolean): SectionId[] {
  const base = defaultSectionOrder(c.kind, shop);
  const own = (c.sections?.order ?? []).filter((x) => base.includes(x));
  return [...new Set([...own, ...base])];
}

export const KIND_LABEL: Record<SiteKind, string> = {
  umkm: "UMKM / toko (katalog + keranjang + kelola produk)",
  jasa: "Jasa / layanan",
  portofolio: "Portofolio / personal",
  event: "Event / promo",
  profil: "Profil organisasi / komunitas",
  artikel: "Artikel / blog (daftar artikel + halaman baca)",
};

export const KIND_OPTIONS: { id: SiteKind; name: string }[] = [
  { id: "umkm", name: "Toko / UMKM" },
  { id: "jasa", name: "Jasa / layanan" },
  { id: "portofolio", name: "Portofolio" },
  { id: "event", name: "Event / promo" },
  { id: "profil", name: "Profil organisasi" },
  { id: "artikel", name: "Artikel / blog" },
];

export const MAX_PALETTE = 6;

/** Latar siap pakai untuk mode "Atur manual" (lepas dari Template). Pengguna tetap bebas pilih warna lain lewat input hex/color-picker — ini cuma titik awal cepat. */
export const BG_PRESETS: { name: string; hex: string }[] = [
  { name: "Putih", hex: "#ffffff" },
  { name: "Krem", hex: "#faf6ee" },
  { name: "Abu muda", hex: "#f1f3f6" },
  { name: "Hitam", hex: "#0b0b0f" },
  { name: "Navy", hex: "#0b1324" },
  { name: "Cokelat tua", hex: "#1c1410" },
];

export const TEMPLATES: { id: TemplateId; name: string; desc: string; swatch: [string, string]; accent: string }[] = [
  { id: "bakso", name: "Kuliner Hangat", desc: "Krem & terakota, kartu membulat. Warung, bakso, kuliner", swatch: ["#FFFBF5", "#C2410C"], accent: "#C2410C" },
  { id: "kue", name: "Kue & Dessert", desc: "Persik lembut, pink tua, huruf serif. Bakery, dessert", swatch: ["#FFF7ED", "#BE185D"], accent: "#BE185D" },
  { id: "barber", name: "Barber Gelap", desc: "Hitam pekat & kuning, kartu kaca. Barber, studio, otomotif", swatch: ["#0A0A0A", "#EAB308"], accent: "#EAB308" },
  { id: "tech", name: "Tech Rapi", desc: "Putih kebiruan, navy tegas. Jasa digital, konsultan, startup", swatch: ["#F8FAFC", "#0F172A"], accent: "#0F172A" },
  { id: "majalah", name: "Majalah Artikel", desc: "Putih gading, huruf serif, merah editorial. Blog, berita, panduan", swatch: ["#FBFAF7", "#B91C1C"], accent: "#B91C1C" },
  { id: "jurnal", name: "Jurnal Gelap", desc: "Gelap nyaman dibaca, aksen amber. Blog pribadi, esai, catatan", swatch: ["#0F1115", "#F59E0B"], accent: "#F59E0B" },
  { id: "bersih", name: "Bersih", desc: "Terang & rapi, cocok untuk jasa dan profil usaha", swatch: ["#f7f9fd", "#2563eb"], accent: "#2563eb" },
  { id: "gelap", name: "Gelap", desc: "Modern, cocok untuk produk digital dan startup", swatch: ["#070a13", "#7c5cff"], accent: "#7c5cff" },
  { id: "hangat", name: "Hangat", desc: "Ramah berhuruf serif, cocok untuk kuliner dan toko", swatch: ["#fffaf2", "#ea580c"], accent: "#ea580c" },
  { id: "tegas", name: "Tegas", desc: "Kontras tinggi gaya brutalis, cocok untuk event dan promo", swatch: ["#fde68a", "#111111"], accent: "#111111" },
  { id: "segar", name: "Segar", desc: "Hijau lembut, cocok untuk herbal, kesehatan, pertanian", swatch: ["#f2fbf5", "#16a34a"], accent: "#16a34a" },
  { id: "elegan", name: "Elegan", desc: "Serif tipis bernuansa emas, cocok untuk butik, fotografi, kerajinan", swatch: ["#faf7f2", "#a16207"], accent: "#a16207" },
  { id: "pastel", name: "Pastel", desc: "Ceria & membulat, cocok untuk kreatif, kids, dessert", swatch: ["#fdf4ff", "#c026d3"], accent: "#c026d3" },
  { id: "neon", name: "Neon", desc: "Gelap bergaris grid, cocok untuk gaming, teknologi, portofolio dev", swatch: ["#04050a", "#00e5a0"], accent: "#00e5a0" },
];

export const HERO_LAYOUTS: { id: HeroLayout; name: string }[] = [
  { id: "center", name: "Tengah" },
  { id: "left", name: "Kiri" },
  { id: "split", name: "Dua kolom" },
  { id: "split-bold", name: "Split 60/40" },
  { id: "asymmetric", name: "Asimetris" },
  { id: "editorial", name: "Editorial" },
  { id: "poster", name: "Poster" },
  { id: "breaker", name: "Judul pecah grid" },
  { id: "terminal", name: "Terminal" },
  { id: "dashboard", name: "Dasbor misi" },
  { id: "label", name: "Label pengiriman" },
  { id: "neo", name: "Neo split" },
  { id: "collage", name: "Kolase" },
];

export const FEAT_LAYOUTS: { id: FeatLayout; name: string }[] = [
  { id: "grid", name: "Kartu" },
  { id: "bento", name: "Bento" },
  { id: "list", name: "Daftar" },
  { id: "editorial", name: "Editorial 01" },
  { id: "index", name: "Indeks bernomor" },
];

const KINDS: SiteKind[] = ["umkm", "jasa", "portofolio", "event", "profil", "artikel"];

export function isTemplateId(v: unknown): v is TemplateId {
  return typeof v === "string" && TEMPLATES.some((t) => t.id === v);
}
export function isHeroLayout(v: unknown): v is HeroLayout {
  return v === "center" || v === "left" || v === "split" || v === "split-bold" || v === "asymmetric" || v === "editorial" || v === "poster" || v === "breaker" || v === "terminal" || v === "dashboard" || v === "label" || v === "neo" || v === "collage";
}
export function isFeatLayout(v: unknown): v is FeatLayout {
  return v === "grid" || v === "bento" || v === "list" || v === "editorial" || v === "index";
}
export function isHexColor(v: unknown): v is string {
  return typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v);
}

/** Apakah situs ini punya katalog yang bisa dikelola (CRUD + keranjang)? */
export function hasShop(c: SiteContent): boolean {
  return c.kind === "umkm" && c.items.length >= 1;
}

/* ---------- normalisasi (jangan percaya output AI) ---------- */

const str = (v: unknown, max: number): string =>
  typeof v === "string"
    ? v
        .replace(/[\u0000-\u001f\u007f]+/g, " ")
        .replace(/\p{Extended_Pictographic}\uFE0F?/gu, "") // tanpa emoji
        .replace(/\s*\u2014\s*/g, ", ") // tanpa tanda pisah em-dash (ciri khas teks AI)
        .replace(/!{2,}/g, "!")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, max)
    : "";

/** Hash kecil & stabil → angka, dipakai untuk variasi deterministik dan kunci penyimpanan. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Nama ikon dari AI → nama Lucide yang valid; juga menerima "Utensils" / "chef_hat". */
function iconName(v: unknown, fallback: string, custom?: Record<string, string>): string {
  // "Clock3" / "ShoppingBag" → "clock-3" / "shopping-bag"; "chef_hat" → "chef-hat"
  const t = typeof v === "string" ? v.trim().replace(/([a-z])([A-Z0-9])/g, "$1-$2").toLowerCase().replace(/[_\s]+/g, "-") : "";
  const alias = /^clock-(?:[1-9]|1[0-2])$/.test(t) ? "clock" : t;
  return isIconName(alias) || (custom && Object.prototype.hasOwnProperty.call(custom, alias)) ? alias : fallback;
}

/** Ikon impor dari isi website: hanya nama kebab-case, maks. 40 ikon, SVG disaring ulang. */
function normalizeIcons(v: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!v || typeof v !== "object" || Array.isArray(v)) return out;
  for (const [k, svg] of Object.entries(v as Record<string, unknown>).slice(0, 40)) {
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(k) || k.length > 40 || isIconName(k)) continue;
    const clean = safeSvg(svg, 3000);
    if (clean) out[k] = clean;
  }
  return out;
}

/** Gambar ikon alternatif per gaya: hanya gaya yang dikenal, nama kebab-case, maks. 60 per gaya, SVG disaring ulang. */
function normalizeIconAlt(v: unknown): SiteContent["iconAlt"] {
  if (!v || typeof v !== "object" || Array.isArray(v)) return undefined;
  const out: NonNullable<SiteContent["iconAlt"]> = {};
  for (const [style, m] of Object.entries(v as Record<string, unknown>)) {
    if (!isIconStyle(style) || style === "garis" || !m || typeof m !== "object" || Array.isArray(m)) continue;
    const clean: Record<string, string> = {};
    for (const [k, svg] of Object.entries(m as Record<string, unknown>).slice(0, 60)) {
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(k) || k.length > 40) continue;
      const x = safeSvg(svg, 4000);
      if (x) clean[k] = x;
    }
    if (Object.keys(clean).length) out[style] = clean;
  }
  return Object.keys(out).length ? out : undefined;
}

/** Ornamen dari isi website: maks. satu per slot, SVG disaring ulang. */
function normalizeOrnaments(v: unknown): SiteOrnament[] {
  if (!Array.isArray(v)) return [];
  const out: SiteOrnament[] = [];
  for (const o of v.slice(0, 8)) {
    if (!o || typeof o !== "object") continue;
    const x = o as Record<string, unknown>;
    const slot = x.slot as SiteOrnament["slot"];
    if (!(ELEMENT_SLOTS as readonly string[]).includes(slot) || out.some((y) => y.slot === slot)) continue;
    if (typeof x.vb !== "string" || !VIEWBOX.test(x.vb)) continue;
    const svg = safeSvg(x.svg, 12000);
    if (!svg) continue;
    out.push({ id: typeof x.id === "string" ? x.id.replace(/[^a-z0-9-]/g, "").slice(0, 48) : "elemen", slot, vb: x.vb, svg });
    if (out.length >= ELEMENT_SLOTS.length) break;
  }
  return out;
}

const FEATURE_FALLBACK_ICONS = ["sparkles", "badge-check", "heart", "zap", "shield-check", "star"];

const DEFAULT_TEMPLATE: Record<SiteKind, TemplateId[]> = {
  umkm: ["hangat", "segar", "pastel"],
  jasa: ["bersih", "elegan", "gelap"],
  portofolio: ["gelap", "neon", "elegan"],
  event: ["tegas", "pastel", "neon"],
  profil: ["bersih", "segar", "elegan"],
  artikel: ["majalah", "jurnal", "elegan"],
};

/** Palet kurasi per jenis usaha, dipakai bila palette_id dari AI tidak dikenal. */
const PALETTE_BY_KIND: Record<SiteKind, TemplateId[]> = {
  umkm: ["bakso", "kue"],
  jasa: ["tech", "barber"],
  portofolio: ["tech", "barber"],
  event: ["barber", "bakso"],
  profil: ["tech", "kue"],
  artikel: ["majalah", "jurnal"],
};

const rec = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

/**
 * Format baru ({brand:{name,slogan,palette_id}, hero:{layout,...}, products, bento_features, testimonial, contact})
 * diratakan ke bentuk datar yang dipakai normalizeContent. Format lama (brand = string) dilewatkan apa adanya.
 */
function adaptNew(r: Record<string, unknown>): { flat: Record<string, unknown>; isNew: boolean } {
  if (!r.brand || typeof r.brand !== "object") return { flat: r, isNew: false };
  const b = rec(r.brand);
  const h = rec(r.hero);
  const ct = rec(r.contact);
  const pal = typeof b.palette_id === "string" ? b.palette_id.trim().toLowerCase() : "";
  return {
    isNew: true,
    flat: {
      ...r,
      kind: r.type ?? r.kind,
      template: pal,
      palette: pal,
      accent: "",
      hero: h.layout,
      feat: r.feat ?? "bento",
      brand: b.name,
      slogan: b.slogan,
      badge: h.badge,
      headline: h.headline,
      subheadline: h.sub,
      ctaLabel: h.cta,
      features: r.bento_features ?? r.features,
      items: r.products ?? r.items,
      whatsapp: ct.wa ?? ct.whatsapp,
      address: ct.address,
      hours: ct.hours,
      email: ct.email,
      hover: r.hover_effect,
    },
  };
}

/** Harga dari AI → rupiah bulat. Menerima 15000, "15.000", "Rp 15.000", "15rb", "15k", "1,5jt". */
function parsePrice(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) && v > 0 ? Math.round(v) : 0;
  const t = String(v ?? "").toLowerCase().replace(/rp\.?/g, "").trim();
  const m = /^(\d+(?:[.,]\d+)?)\s*(rb|ribu|k|jt|juta)?$/.exec(t);
  if (!m) return parseInt(t.replace(/\D/g, ""), 10) || 0;
  const unit = m[2];
  if (!unit) return parseInt(m[1].replace(/\D/g, ""), 10) || 0; // "15.000" → 15000
  const n = parseFloat(m[1].replace(",", "."));
  return Math.round(n * (unit === "jt" || unit === "juta" ? 1_000_000 : 1000));
}

/**
 * Daftar kekurangan isi mentah dari AI (sebelum dinormalisasi), untuk diberitahukan ke AI saat percobaan ulang.
 * Kosong = tak ada masalah yang terdeteksi.
 */
export function diagnoseContent(raw: unknown, forceKind?: SiteKind): string[] {
  if (!raw || typeof raw !== "object") return ["balasan sebelumnya bukan objek JSON yang valid"];
  const { flat: r } = adaptNew(raw as Record<string, unknown>);
  const out: string[] = [];
  if (!str(r.brand, 40)) out.push('"brand.name" kosong');
  if (!str(r.headline, 90)) out.push('"hero.headline" kosong');
  const kind = forceKind ?? r.kind;
  const ok2 = (list: unknown, a: string, b: string, aMax: number, bMax: number): number =>
    Array.isArray(list)
      ? list.filter((x) => {
          const o = rec(x);
          return str(o.title, aMax) && str(o[a] ?? o[b], bMax);
        }).length
      : 0;
  if (kind === "artikel") {
    const n = Array.isArray(r.articles) ? r.articles.filter((x) => str(rec(x).title, 90) && (Array.isArray(rec(x).body) ? (rec(x).body as unknown[]).length > 0 : !!str(rec(x).excerpt ?? rec(x).desc, 200))).length : 0;
    if (n < 2) out.push('"articles" harus berisi minimal 2 artikel lengkap (title, excerpt, body berupa array paragraf)');
  } else if (ok2(r.features, "text", "desc", 50, 160) < 2) {
    out.push('"bento_features" harus berisi minimal 3 item lengkap (title dan desc)');
  }
  return out;
}

/** Batas artikel per situs (permintaan seperti "15 topik" harus muat). */
export const MAX_ARTICLES = 15;

export function normalizeContent(raw: unknown, forceKind?: SiteKind): SiteContent | null {
  if (!raw || typeof raw !== "object") return null;
  const { flat: r, isNew } = adaptNew(raw as Record<string, unknown>);

  const brand = str(r.brand, 40);
  const headline = str(r.headline, 90);
  const customIcons = normalizeIcons(r.icons);

  const features: SiteFeature[] = [];
  if (Array.isArray(r.features)) {
    for (const f of r.features.slice(0, 6)) {
      if (!f || typeof f !== "object") continue;
      const o = f as Record<string, unknown>;
      const title = str(o.title, 50);
      const text = str(o.text ?? o.desc, 160);
      const span: 1 | 2 = Number(o.col_span ?? o.span) === 2 ? 2 : 1;
      if (title && text) features.push({ icon: iconName(o.icon, FEATURE_FALLBACK_ICONS[features.length % 6], customIcons), title, text, span });
    }
  }
  // Toleran: model kecil kadang memberi <2 fitur. Lengkapi dari produk/langkah daripada gagal total.
  if (features.length < 2 && Array.isArray(r.items)) {
    for (const it of r.items.slice(0, 4)) {
      if (features.length >= 3 || !it || typeof it !== "object") continue;
      const o = it as Record<string, unknown>;
      const title = str(o.name, 50);
      if (title) features.push({ icon: iconName(o.icon, FEATURE_FALLBACK_ICONS[features.length % 6], customIcons), title, text: str(o.desc, 160) || str(r.subheadline, 160) || title });
    }
  }
  const kind: SiteKind = forceKind && KINDS.includes(forceKind) ? forceKind : KINDS.includes(r.kind as SiteKind) ? (r.kind as SiteKind) : "profil";

  const articles: SiteArticle[] = [];
  const aSeed = hash(brand || "x").toString(36);
  if (Array.isArray(r.articles)) {
    for (const ar of r.articles.slice(0, MAX_ARTICLES)) {
      if (!ar || typeof ar !== "object") continue;
      const o = ar as Record<string, unknown>;
      const title = str(o.title, 90);
      const rawBody: unknown[] = Array.isArray(o.body) ? o.body : typeof o.body === "string" ? o.body.split(/\n+/) : [];
      const body = rawBody.map((x) => str(x, 700)).filter(Boolean).slice(0, 8);
      const excerpt = str(o.excerpt ?? o.desc, 200) || (body[0] ?? "").slice(0, 180);
      if (!title || (!body.length && !excerpt)) continue;
      const words = (body.join(" ") || excerpt).split(/\s+/).length;
      const rm = Math.round(Number(o.read_min ?? o.readMin));
      articles.push({
        id: `a${aSeed}${articles.length}`,
        title,
        excerpt,
        category: str(o.category, 24),
        author: str(o.author, 40),
        readMin: Number.isFinite(rm) && rm > 0 ? Math.min(rm, 60) : Math.max(1, Math.round(words / 200)),
        body: body.length ? body : [excerpt],
      });
    }
  }

  if (!brand || !headline) return null;
  if (kind === "artikel") {
    if (articles.length < 2) return null;
    if (features.length < 2) features.length = 0;
  } else if (features.length < 2) return null;
  // Bento format baru: bila AI tak memberi kartu lebar, kartu pertama dibuat 2 kolom supaya tidak sama rata.
  if (isNew && features.length >= 3 && !features.some((f) => f.span === 2)) features[0].span = 2;

  const steps: SiteStep[] = [];
  if (Array.isArray(r.steps)) {
    for (const st of r.steps.slice(0, 4)) {
      if (!st || typeof st !== "object") continue;
      const o = st as Record<string, unknown>;
      const title = str(o.title, 40);
      const text = str(o.text, 120);
      if (title && text) steps.push({ title, text });
    }
  }

  const items: SiteItem[] = [];
  const seed = hash(brand).toString(36);
  if (Array.isArray(r.items)) {
    for (const it of r.items.slice(0, 12)) {
      if (!it || typeof it !== "object") continue;
      const o = it as Record<string, unknown>;
      const name = str(o.name, 60);
      if (!name) continue;
      const p = parsePrice(o.price);
      items.push({
        id: `s${seed}${items.length}`,
        name,
        desc: str(o.desc, 140),
        price: Number.isFinite(p) && p > 0 ? Math.min(Math.round(p), 999_999_999) : 0,
        category: str(o.category, 24),
        icon: iconName(o.icon, "package", customIcons),
        img: "",
        size: o.size === "large" ? "large" : "small",
        tag: str(o.tag, 20),
      });
    }
  }
  // Ukuran produk harus bervariasi: maksimal 2 kartu besar; format baru tanpa kartu besar → produk pertama jadi besar.
  if (isNew && items.length >= 3 && !items.some((i) => i.size === "large")) items[0].size = "large";
  let big = 0;
  for (const i of items) if (i.size === "large" && ++big > 2) i.size = "small";

  const h = hash(brand);
  const tplList = DEFAULT_TEMPLATE[kind];
  const palList = PALETTE_BY_KIND[kind];
  const template = isTemplateId(r.template) ? r.template : isNew ? palList[h % palList.length] : tplList[h % tplList.length];
  const hero: HeroLayout = isHeroLayout(r.hero) ? r.hero : isNew ? "split-bold" : (["split", "center", "left"] as const)[h % 3];
  const feat: FeatLayout = isFeatLayout(r.feat) ? r.feat : isNew ? "bento" : (["grid", "bento", "list"] as const)[(h >> 3) % 3];
  const tm = rec(r.testimonial);
  const tText = str(tm.text, 260);
  const slogan = str(r.slogan, 48).split(" ").slice(0, 5).join(" ");

  const wa = str(r.whatsapp, 20).replace(/\D/g, "");
  const email = str(r.email, 80);

  return {
    kind,
    template,
    accent: isHexColor(r.accent) ? r.accent.toLowerCase() : "",
    palette: isNew ? template : "",
    slogan,
    hover: r.hover === "tilt" ? "tilt" : "lift",
    testimonial: tText ? { text: tText, name: str(tm.name, 60) } : { text: "", name: "" },
    hero,
    feat,
    brand,
    brandIcon: iconName(r.brandIcon, "", customIcons),
    badge: str(r.badge, 40),
    headline,
    subheadline: str(r.subheadline, 220),
    ctaLabel: str(r.ctaLabel, 28) || (kind === "artikel" ? "Baca Artikel" : "Hubungi Kami"),
    features,
    itemsTitle: str(r.itemsTitle, 40) || (kind === "umkm" ? "Produk Kami" : kind === "portofolio" ? "Karya Pilihan" : kind === "event" ? "Rangkaian Acara" : kind === "artikel" ? "Artikel Terbaru" : "Layanan"),
    items,
    articles,
    stepsTitle: str(r.stepsTitle, 40) || "Cara Pesan",
    steps: steps.length >= 2 ? steps : [],
    aboutTitle: str(r.aboutTitle, 50) || "Tentang Kami",
    about: str(r.about, 600),
    whatsapp: /^\d{8,15}$/.test(wa) ? wa : "",
    email: /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(email) ? email : "",
    address: str(r.address, 140),
    hours: str(r.hours, 60),
    featuresTitle: str(r.featuresTitle, 50) || "Keunggulan",
    closing: str(r.closing, 60) || "Hubungi kami",
    closingText: str(r.closingText, 120),
    ...(normalizeLook(r.look) ? { look: normalizeLook(r.look) } : {}),
    ...(normSections(r.sections) ? { sections: normSections(r.sections) } : {}),
    ...(Object.keys(customIcons).length ? { icons: customIcons } : {}),
    ...(isIconStyle(r.iconStyle) ? { iconStyle: r.iconStyle } : {}),
    ...(normalizeIconAlt(r.iconAlt) ? { iconAlt: normalizeIconAlt(r.iconAlt) } : {}),
    ...(normalizeOrnaments(r.ornaments).length
      ? { ornaments: normalizeOrnaments(r.ornaments), ...(typeof r.ornFamily === "string" && /^[a-z0-9][a-z0-9-]{1,47}$/.test(r.ornFamily) ? { ornFamily: r.ornFamily } : {}) }
      : {}),
  };
}

/** Daftar ikon yang ditawarkan ke AI (tetap pendek supaya hemat token). Semua nama Lucide yang ada di LUCIDE tetap diterima. */
const PROMPT_ICONS =
  "store shopping-bag utensils coffee cake cookie soup pizza beef fish salad ice-cream-cone cup-soda croissant candy apple milk chef-hat wine leaf flower-2 sprout shirt scissors hammer wrench paintbrush palette camera music heart star award badge-check shield-check clock calendar map-pin phone mail message-circle truck package gift tag wallet smile users graduation-cap book-open code laptop smartphone globe rocket zap lightbulb target trending-up thumbs-up sun droplets flame house car dumbbell stethoscope printer headphones party-popper trophy briefcase handshake wand-sparkles";

/** Prompt sistem untuk AI. Format JSON baru: brand{}, hero{}, products[], bento_features[], testimonial{}, contact{}. */
export const SITE_SYSTEM_PROMPT = `Kamu Senior Product Designer + Frontend Engineer untuk Depup AI Web Builder. Tugasmu BUKAN membuat website generik buatan AI. Tugasmu membuat isi website statis kelas agensi. Balas HANYA satu objek JSON valid, tanpa markdown dan tanpa penjelasan. JSON ini dirender ke template premium, jadi kamu memilih komposisi dan menulis isi yang spesifik.

Bentuk JSON:
{"type":"umkm","brand":{"name":"","slogan":"","palette_id":"bakso"},"hero":{"layout":"split-bold","headline":"","sub":"","cta":"","badge":""},"hover_effect":"lift","products":[{"name":"","price":"","tag":"","size":"large","icon":"beef","desc":""}],"bento_features":[{"title":"","desc":"","icon":"clock-3","col_span":2}],"articles":[{"title":"","excerpt":"","category":"","author":"","read_min":4,"body":["","",""]}],"testimonial":{"text":"","name":""},"contact":{"wa":"","address":"","hours":"","email":""}}

Pilihan nilai:
- type: umkm (toko/warung/kuliner/produk jualan, ada katalog) | jasa | portofolio | event | profil | artikel (blog, majalah, berita, panduan: kumpulan artikel yang bisa dibaca).
- palette_id: bakso (kuliner hangat, krem + terakota) | kue (bakery/dessert, persik + pink tua) | barber (gelap pekat + kuning: barber, studio, otomotif, gaming) | tech (putih kebiruan + navy: jasa digital, konsultan, startup). Pilih yang paling dekat dengan karakter usaha. Untuk type artikel pakai majalah (terang, serif, merah editorial) atau jurnal (gelap, nyaman dibaca, amber). Untuk usaha yang tidak cocok dengan keempatnya boleh pakai: segar (herbal, kesehatan, tani) | elegan (butik, foto, kerajinan) | pastel (kreatif, kids) | tegas (event, promo).
- hero.layout: split-bold (teks besar di kiri, tumpukan kartu di kanan, 60/40) | asymmetric (1 kartu besar + 2 kecil) | editorial (headline raksasa, tipografi). DILARANG "center". Variasikan, jangan selalu split-bold.
- hover_effect: lift | tilt.
- products[].size: "large" atau "small". Buat variasi: tepat 1 produk "large" (best seller, tag "Best Seller" atau sejenisnya), sisanya "small". Jumlah produk untuk umkm: 5 atau 9 (agar grid bento rapi), kecuali pengguna menyebut jumlah tertentu: ikuti persis (maks 12). Untuk jasa/portofolio/event: 3 sampai 5 item (paket layanan, karya, atau acara), 1 di antaranya large. Untuk profil boleh []. Untuk artikel: [].
- products[].price: teks harga, mis. "Rp 15.000" atau "15rb". HANYA bila pengguna menyebut harga; selain itu "".
- bento_features: 3 sampai 5 item (untuk artikel boleh 0 sampai 3). col_span 2 untuk 1 atau 2 kartu penting, selebihnya 1. Jangan semua sama lebar.
- ikon (products[].icon, bento_features[].icon): satu nama ikon Lucide dari daftar ini saja: ${PROMPT_ICONS} clock-3. Pilih yang spesifik ke maknanya: bakso = beef, pedas = flame, jam = clock-3, segar = leaf, gunting = scissors. JANGAN memakai shopping-bag untuk semuanya. Jangan pernah memakai emoji.

Aturan isi (anti AI look):
- Bahasa mengikuti bahasa permintaan (default Indonesia). Tulis seperti pemilik usaha yang bicara apa adanya: kalimat pendek, konkret, spesifik (nama menu, gramasi, lokasi, jam, cara kerja).
- DILARANG membuka dengan "Selamat datang" atau "Kami menyediakan yang terbaik". Contoh benar: "Bakso urat 150gr, daging sapi asli, kuah kaldu 12 jam". Contoh salah: "Bakso enak".
- Pakai angka yang disebut pengguna (gramasi, harga, jam, tahun berdiri). Jangan mengarang angka statistik, penghargaan, jumlah pelanggan, atau klaim.
- DILARANG ungkapan generik: "solusi terbaik", "terpercaya", "berkualitas", "profesional", "terdepan", "inovatif", "tak tertandingi", "pengalaman tak terlupakan", "siap membantu", "yuk", "wujudkan", "nikmati", "sempurna". Tanpa seruan "!" berlebihan, tanpa tanda pisah em-dash, tanpa emoji.
- brand.slogan: maks 5 kata, punchy. hero.headline: maks 10 kata, 2 baris, punya sudut pandang. hero.sub: 1 sampai 2 kalimat pendek. hero.cta: maks 3 kata. hero.badge: fakta dari pengguna, maks 5 kata, mis. "Buka Hari Ini • 10-21 WIB" (hanya jika jam disebut, selain itu fakta lain atau "").
- bento_features: title maks 4 kata; desc maks 20 kata, berupa fakta, bukan klaim kosong.
- products[].desc: maks 14 kata, spesifik.
- articles (WAJIB bila type artikel, selain itu []): 3 sampai 4 artikel dengan topik berbeda, KECUALI pengguna meminta jumlah tertentu (mis. 15 topik): ikuti jumlah itu persis, maksimal 15, dan jangan menolaknya. Bila artikel lebih dari 6, tiap body cukup 2 paragraf pendek dan excerpt maks 18 kata supaya JSON tetap muat. title maks 12 kata, excerpt maks 25 kata, category 1 sampai 2 kata, read_min angka, body 3 sampai 4 paragraf (tiap paragraf 2 sampai 3 kalimat, konkret dan informatif; boleh satu paragraf berawalan "## " sebagai subjudul). author HANYA bila pengguna menyebut nama, selain itu "". Jangan mengarang statistik, kutipan ahli, atau klaim medis/hukum.
- testimonial: isi HANYA bila pengguna memberikan kutipan pelanggan yang nyata. Selain itu text dan name string kosong. Jangan mengarang testimoni.
- contact.wa (angka internasional tanpa +), contact.address, contact.hours, contact.email: isi HANYA jika pengguna menyebutkannya; selain itu string kosong. Jangan mengarang kontak.
- Pengguna bisa menyiapkan foto sendiri; gambar dipasang terpisah oleh sistem, jadi JANGAN menulis URL gambar dan jangan menolak permintaan karena jumlah gambar.
- Tolak (isi {"error":"alasan singkat"}) HANYA bila permintaan untuk phishing, meniru bank/instansi/merek lain, penipuan, judi, konten dewasa, atau melanggar hukum. Blog, event sekolah/kampus, usaha, portofolio, dan topik umum lainnya SELALU boleh. Jangan menolak karena jumlah item, jumlah artikel, atau permintaan yang banyak; sesuaikan saja isinya.`;

/* ---------- render ---------- */

const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const rgb = (hex: string): string => {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
};

/** Campur warna dengan putih (0..1). */
function mixWhite(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.round(v + (255 - v) * k).toString(16).padStart(2, "0");
  return "#" + f((n >> 16) & 255) + f((n >> 8) & 255) + f(n & 255);
}

/** Isian tipis dari sebuah warna (latar kotak ikon). */
const tint = (hex: string, dark: boolean): string => `rgba(${rgb(hex)},${dark ? ".24" : ".30"})`;

/**
 * Turunkan satu set warna permukaan (fg/muted/card/line/navBg/dark) dari satu warna latar bebas pilihan
 * pengguna (mode "Atur manual", lepas dari Template). Formula ini meniru pola THEMES.bersih (terang) dan
 * THEMES.gelap (gelap) di atas, supaya latar warna apa pun tetap kontras & terbaca tanpa pengguna perlu
 * mengatur fg/card/line satu-satu.
 */
function surfaceFromBg(bg: string): Partial<Theme> {
  const dark = relLum(bg) < 0.5;
  return {
    bg,
    fg: dark ? "#f4f6fb" : "#0b1220",
    muted: dark ? "rgba(244,246,251,.64)" : "rgba(11,18,32,.62)",
    card: dark ? "rgba(255,255,255,.045)" : "rgba(255,255,255,.75)",
    line: dark ? "rgba(255,255,255,.09)" : "rgba(11,18,32,.08)",
    navBg: rgb(bg),
    dark,
  };
}

/**
 * Markup hiasan hero murni dekoratif (aria-hidden, tanpa konten di dalamnya) untuk 5 hiasan bentuk baru.
 * "blobs"/"grid"/"orbs"/"none" tidak butuh markup tambahan — sudah ditangani lewat `.glow` di buildCss.
 */
function ornamentMarkup(deco: Deco): string {
  const spans = (n: number) => Array.from({ length: n }, () => `<span class="d"></span>`).join("");
  switch (deco) {
    case "dots":
      return `<div class="orn orn-dots" aria-hidden="true">${spans(6)}</div>`;
    case "plus":
      return `<div class="orn orn-plus" aria-hidden="true">${spans(5)}</div>`;
    case "rings":
      return `<div class="orn orn-rings" aria-hidden="true">${spans(3)}</div>`;
    case "triangles":
      return `<div class="orn orn-triangles" aria-hidden="true">${spans(5)}</div>`;
    case "scribble":
      return `<div class="orn orn-scribble" aria-hidden="true"><svg viewBox="0 0 400 120" fill="none"><path d="M4 60 Q60 10 110 60 T220 60 T330 60 T400 40" stroke="var(--a)" stroke-width="3" stroke-linecap="round"/></svg></div>`;
    default:
      return "";
  }
}

/** Luminans relatif WCAG (0..1) dari warna hex #rrggbb. */
function relLum(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * ch((n >> 16) & 255) + 0.7152 * ch((n >> 8) & 255) + 0.0722 * ch(n & 255);
}

/** Rasio kontras WCAG 2.x antara dua warna hex (1..21). Dipakai editor palet dan renderer. */
export function contrastRatio(a: string, b: string): number {
  const la = relLum(a);
  const lb = relLum(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Pilih teks hitam/putih dengan kontras WCAG tertinggi di atas warna aksen. */
function onColor(hex: string): string {
  return contrastRatio(hex, "#ffffff") >= contrastRatio(hex, "#111111") ? "#ffffff" : "#111111";
}

/**
 * Warna aksen untuk TEKS kecil: digelapkan di tema terang / dicerahkan di tema gelap
 * sampai kontrasnya terhadap latar halaman minimal 4,5:1 (WCAG AA).
 */
function readable(hex: string, dark: boolean, bg: string = dark ? "#0b0b0b" : "#ffffff"): string {
  let c = hex;
  for (let i = 0; i < 24; i++) {
    if (contrastRatio(c, bg) >= 4.5) break;
    const n = parseInt(c.slice(1), 16);
    const f = (v: number) => {
      const out = dark ? v + (255 - v) * 0.12 : v * 0.9;
      return Math.max(0, Math.min(255, Math.round(out)));
    };
    c = "#" + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => f(v).toString(16).padStart(2, "0")).join("");
  }
  return c;
}

type Deco = "orbs" | "grid" | "blobs" | "dots" | "plus" | "rings" | "triangles" | "scribble" | "none";
/** Hiasan murni di belakang judul hero — tidak membungkus konten apa pun, jadi tidak pernah memotong teks/gambar. */
export type DecorId = Deco;

interface Theme {
  bg: string; fg: string; muted: string;
  card: string; line: string; navBg: string;
  radius: string; shadow: string;
  display: string; body: string; mono: string;
  /** Huruf sub-judul (h2/h3: judul bagian, judul kartu). Kosong = ikut `display`. */
  sub?: string;
  /** Ketebalan Judul (h1 hero, brand, kutipan besar, dst). */
  headWeight: number;
  /** Ketebalan Sub-judul (h2, h3, judul kartu). Kosong = ikut headWeight. */
  subWeight?: number;
  /** Ketebalan teks Isi (body/paragraf). Kosong = 400 (reguler). */
  bodyWeight?: number;
  upper: boolean; gradientHead: boolean; brutal: boolean; dark: boolean;
  deco: Deco; pill: string;
  /** Tebal garis tepi kartu/nav/tombol dalam px (dipakai saat `brutal` mati). Kosong = 1px. */
  borderW?: number;
  /** Pengali ukuran judul hero & judul bagian (h1/h2). 1 = bawaan. Dipakai Gaya desain untuk bikin karakter beda jauh (lebih besar/kecil), bukan cuma beda bentuk. */
  heroScale?: number;
  /** Letter-spacing judul hero & judul bagian. Kosong = ikut aturan bawaan (serif rapat, sans agak rapat). */
  tracking?: string;
  /** Lebar maksimum kolom konten (`.wrap`) dalam px. Kosong = 1120. Lebih sempit = editorial/minimalis, lebih lebar = lega/teknis. */
  maxWidth?: number;
  /** Jarak vertikal antar section (clamp CSS). Kosong = clamp(56px,8vw,112px). */
  sectionGap?: string;
  /** Jarak antar kartu di grid/items/steps/bento. Kosong = 18px. */
  gridGap?: string;
  /** Padding dalam kartu (`.card`). Kosong = 26px. */
  cardPad?: string;
  /** Warna aksen kedua (palet kurasi): latar kotak ikon & sorot hero. */
  acc2?: string;
  /** Latar kotak ikon (lingkaran 40px). Kosong = aksen utama transparan. */
  ib?: string;
  /** Kartu efek kaca (backdrop blur). */
  glass?: boolean;
  /** Kartu bertekstur noise halus. */
  noise?: boolean;
}

const SANS = `"Inter","Segoe UI",system-ui,-apple-system,Roboto,"Helvetica Neue",Arial,sans-serif`;
const SERIF = `Georgia,"Iowan Old Style","Palatino Linotype",serif`;
const SLAB = `"Roboto Slab","Rockwell","Arvo",Georgia,serif`;
const MONO = `ui-monospace,"JetBrains Mono",SFMono-Regular,Menlo,Consolas,monospace`;
const DISPLAY = `"Arial Black",Impact,"Helvetica Neue",Arial,sans-serif`;

/** Kategori huruf per peran (Judul / Sub-judul / Isi), mode "Atur manual". Font sistem saja — SLAB
 *  jatuh ke Georgia di banyak perangkat karena "Roboto Slab"/"Arvo" jarang terpasang bawaan; tetap
 *  disediakan karena perangkat yang punya salah satunya akan menampilkannya. */
export type FontRoleId = "sans" | "serif" | "slab" | "mono" | "display";
export const FONT_ROLES: { id: FontRoleId; name: string; desc: string; stack: string }[] = [
  { id: "sans", name: "Sans-serif", desc: "Tanpa serif, bersih — Inter/Helvetica.", stack: SANS },
  { id: "serif", name: "Serif", desc: "Berkait klasik — Georgia.", stack: SERIF },
  { id: "slab", name: "Slab Serif", desc: "Kait tebal kotak. Fallback ke serif biasa bila tak terpasang.", stack: SLAB },
  { id: "mono", name: "Monospace", desc: "Lebar sama rata, kesan teknis/kode.", stack: MONO },
  { id: "display", name: "Display Tebal", desc: "Besar, tebal, menonjol — Arial Black/Impact.", stack: DISPLAY },
];

/** Ketebalan (variable font weight) untuk mode "Atur manual" — Judul, Sub-judul, dan Isi masing-masing bebas pilih sendiri, lepas dari jenis fontnya. */
export type FontWeightId = 400 | 500 | 600 | 700 | 800 | 900;
export const FONT_WEIGHTS: { id: FontWeightId; name: string }[] = [
  { id: 400, name: "Reguler" },
  { id: 500, name: "Medium" },
  { id: 600, name: "Semibold" },
  { id: 700, name: "Tebal" },
  { id: 800, name: "Ekstra Tebal" },
  { id: 900, name: "Hitam" },
];

/**
 * Gaya desain (gerakan visual) untuk mode "Atur manual". Independen dari Template: cuma menimpa
 * bentuk/bayangan/dekorasi di atas warna Template/Warna yang sedang aktif, warna & huruf tidak disentuh.
 * Didekati dari token yang sudah ada di mesin render (radius, shadow, pill, brutal, glass, noise, deco,
 * gradientHead, upper, headWeight) — bukan CSS baru per gaya, supaya tetap aman dipadukan dengan Template apa pun.
 */
export type DesignStyleId =
  | "brutalism" | "neo-brutalism" | "swiss" | "bauhaus" | "y2k"
  | "glassmorphism" | "neumorphism" | "futurism" | "minimalist" | "experimental";

export const DESIGN_STYLES: { id: DesignStyleId; name: string; desc: string; apply: (t: Theme) => Partial<Theme> }[] = [
  { id: "brutalism", name: "Brutalism", desc: "Mentah: sudut lancip, garis tebal hitam, judul raksasa kapital, tanpa bayangan halus, elemen dirapatkan.",
    apply: () => ({ radius: "0px", pill: "0px", shadow: "none", brutal: true, glass: false, noise: false, deco: "none", gradientHead: false, upper: true, headWeight: 900, borderW: 3, heroScale: 1.18, tracking: "-.01em",
      maxWidth: 1180, sectionGap: "clamp(40px,6vw,80px)", gridGap: "14px", cardPad: "22px" }) },
  { id: "neo-brutalism", name: "Neo-Brutalism", desc: "Brutalism yang lebih ramah: bayangan kotak geser warna-warni, sudut membulat, judul besar, grid rapat.",
    apply: () => ({ radius: "18px", pill: "999px", shadow: "7px 7px 0 #0a0a0a", brutal: true, glass: false, noise: false, deco: "none", gradientHead: false, upper: false, headWeight: 900, borderW: 3, heroScale: 1.1, tracking: "-.02em",
      maxWidth: 1140, sectionGap: "clamp(48px,7vw,96px)", gridGap: "16px", cardPad: "24px" }) },
  { id: "swiss", name: "Swiss / Grid", desc: "Kolom konten lebih sempit & lega, jarak antar section lapang, label kapital renggang — tipografi jadi fokus.",
    apply: () => ({ radius: "0px", pill: "0px", shadow: "none", brutal: false, glass: false, noise: false, deco: "none", gradientHead: false, upper: true, headWeight: 700, borderW: 1, heroScale: 0.92, tracking: ".04em",
      maxWidth: 980, sectionGap: "clamp(72px,10vw,140px)", gridGap: "28px", cardPad: "20px" }) },
  { id: "bauhaus", name: "Bauhaus", desc: "Kartu kotak tegas berdampingan dengan tombol bulat penuh — kontras bentuk geometris khas Bauhaus.",
    apply: () => ({ radius: "0px", pill: "999px", shadow: "none", brutal: false, glass: false, noise: false, deco: "none", gradientHead: false, upper: false, headWeight: 800, borderW: 2, heroScale: 1.05, tracking: "0em",
      maxWidth: 1120, sectionGap: "clamp(56px,8vw,112px)", gridGap: "20px", cardPad: "24px" }) },
  { id: "y2k", name: "Y2K", desc: "Serba membulat & mengilap, judul besar bergradasi warna, kartu lega, dekorasi gelembung lembut di latar.",
    apply: () => ({ radius: "999px", pill: "999px", shadow: "0 12px 28px rgba(0,0,0,.10)", brutal: false, glass: false, noise: false, deco: "blobs", gradientHead: true, upper: false, headWeight: 800, borderW: 1, heroScale: 1.12, tracking: "-.02em",
      maxWidth: 1160, sectionGap: "clamp(56px,8vw,112px)", gridGap: "20px", cardPad: "28px" }) },
  { id: "glassmorphism", name: "Glassmorphism", desc: "Kartu kaca buram lega tembus pandang di atas gelembung warna blur. Paling terlihat di Template/Warna gelap.",
    apply: (t) => ({
      radius: "22px", pill: "999px", shadow: "0 8px 32px rgba(0,0,0,.10)", brutal: false, glass: true, noise: false, deco: "blobs", gradientHead: false, upper: false, headWeight: 700, borderW: 1, heroScale: 1, tracking: "-.02em",
      maxWidth: 1160, sectionGap: "clamp(56px,8vw,112px)", gridGap: "20px", cardPad: "30px",
      card: `rgba(${rgb(t.card)},.55)`,
    }) },
  { id: "neumorphism", name: "Neumorphism", desc: "Tanpa garis tepi sama sekali, kartu longgar berjarak supaya bayangan ganda terbaca — elemen terasa timbul dari latar.",
    apply: (t) => ({
      radius: "26px", pill: "999px", brutal: false, glass: false, noise: false, deco: "none", gradientHead: false, upper: false, headWeight: 700, borderW: 0, heroScale: 0.92, tracking: "-.01em",
      maxWidth: 1080, sectionGap: "clamp(48px,7vw,96px)", gridGap: "26px", cardPad: "32px",
      card: t.bg,
      shadow: t.dark ? "10px 10px 20px rgba(0,0,0,.55), -8px -8px 18px rgba(255,255,255,.05)" : "10px 10px 20px rgba(0,0,0,.14), -8px -8px 18px rgba(255,255,255,.75)",
    }) },
  { id: "futurism", name: "Futuristik", desc: "Kolom lebar, grid rapat teknis, garis tegas, grid halus menyala di beberapa bagian, judul besar kapital renggang.",
    apply: () => ({ radius: "4px", pill: "4px", shadow: "none", brutal: false, glass: false, noise: false, deco: "grid", gradientHead: false, upper: true, headWeight: 800, borderW: 1, heroScale: 1.08, tracking: ".02em",
      maxWidth: 1220, sectionGap: "clamp(44px,6vw,88px)", gridGap: "14px", cardPad: "22px" }) },
  { id: "minimalist", name: "Minimalist", desc: "Kolom paling sempit, jarak antar section paling lapang — whitespace maksimal, judul lebih kecil & ramping.",
    apply: () => ({ radius: "10px", pill: "999px", shadow: "none", brutal: false, glass: false, noise: false, deco: "none", gradientHead: false, upper: false, headWeight: 500, borderW: 1, heroScale: 0.8, tracking: "-.01em",
      maxWidth: 960, sectionGap: "clamp(80px,11vw,160px)", gridGap: "32px", cardPad: "20px" }) },
  { id: "experimental", name: "Experimental", desc: "Judul paling besar & berani, kartu lega tak beraturan, gelembung warna blur di beberapa bagian, bayangan lembut.",
    apply: () => ({ radius: "32px", pill: "999px", shadow: "0 16px 40px rgba(0,0,0,.12)", brutal: false, glass: false, noise: false, deco: "blobs", gradientHead: true, upper: false, headWeight: 800, borderW: 1, heroScale: 1.28, tracking: "-.03em",
      maxWidth: 1160, sectionGap: "clamp(56px,8vw,112px)", gridGap: "24px", cardPad: "30px" }) },
];

/**
 * Hiasan (mode "Atur manual"): bentuk dekoratif murni di belakang judul hero, warna ikut Warna aktif
 * (var(--a)/var(--a2)). Tidak pernah membungkus teks/gambar/tombol — aman dipadukan dengan Gaya desain apa pun.
 * Independen dari Gaya desain: pilih gaya apa pun lalu tambah/ganti hiasan ini di atasnya.
 */
export const DECOR_OPTIONS: { id: DecorId; name: string; desc: string }[] = [
  { id: "none", name: "Tanpa hiasan", desc: "Bersih, tanpa bentuk tambahan di belakang judul." },
  { id: "blobs", name: "Gelembung", desc: "Gumpalan warna blur lembut di belakang judul." },
  { id: "grid", name: "Garis Grid", desc: "Garis grid halus menyala di belakang judul." },
  { id: "dots", name: "Titik-titik", desc: "Lingkaran kecil bertaburan di sekitar judul." },
  { id: "plus", name: "Tanda Plus", desc: "Tanda plus kecil bertaburan, kesan teknis/blueprint." },
  { id: "rings", name: "Cincin", desc: "Lingkaran garis besar mengambang di sudut." },
  { id: "triangles", name: "Segitiga", desc: "Segitiga kecil bertaburan dengan rotasi acak." },
  { id: "scribble", name: "Coretan", desc: "Satu garis lengkung seperti coretan tangan." },
];

const THEMES: Record<TemplateId, Theme> = {
  bersih: {
    bg: "#f7f9fd", fg: "#0b1220", muted: "#526078", card: "#ffffff", line: "#e5eaf3", navBg: "247,249,253",
    radius: "12px", shadow: "0 1px 0 rgba(15,23,42,.04)",
    display: SANS, body: SANS, mono: SANS, headWeight: 800, upper: false, gradientHead: false, brutal: false, dark: false, deco: "none", pill: "8px",
  },
  gelap: {
    bg: "#070a13", fg: "#f4f6fb", muted: "#97a3bb", card: "rgba(255,255,255,.045)", line: "rgba(255,255,255,.09)", navBg: "7,10,19",
    radius: "12px", shadow: "none",
    display: SANS, body: SANS, mono: SANS, headWeight: 800, upper: false, gradientHead: false, brutal: false, dark: true, deco: "none", pill: "8px",
  },
  hangat: {
    bg: "#fffaf2", fg: "#3a1808", muted: "#7d5a44", card: "#ffffff", line: "#f3e3cf", navBg: "255,250,242",
    radius: "14px", shadow: "0 1px 0 rgba(120,53,15,.06)",
    display: SERIF, body: SANS, mono: SANS, headWeight: 700, upper: false, gradientHead: false, brutal: false, dark: false, deco: "none", pill: "10px",
  },
  tegas: {
    bg: "#fde68a", fg: "#0a0a0a", muted: "#262626", card: "#ffffff", line: "#0a0a0a", navBg: "253,230,138",
    radius: "6px", shadow: "6px 6px 0 #0a0a0a",
    display: `"Arial Black",Impact,"Helvetica Neue",Arial,sans-serif`, body: SANS, mono: SANS, headWeight: 900, upper: true, gradientHead: false, brutal: true, dark: false, deco: "none", pill: "6px",
  },
  segar: {
    bg: "#f2fbf5", fg: "#0c2a1b", muted: "#4a6b5a", card: "#ffffff", line: "#d5ecdc", navBg: "242,251,245",
    radius: "12px", shadow: "0 1px 0 rgba(6,78,59,.05)",
    display: SANS, body: SANS, mono: SANS, headWeight: 800, upper: false, gradientHead: false, brutal: false, dark: false, deco: "none", pill: "10px",
  },
  elegan: {
    bg: "#faf7f2", fg: "#1c1917", muted: "#6b635a", card: "#fffdf9", line: "#e7dfd2", navBg: "250,247,242",
    radius: "4px", shadow: "0 1px 0 rgba(28,25,23,.04)",
    display: SERIF, body: SERIF, mono: SERIF, headWeight: 500, upper: false, gradientHead: false, brutal: false, dark: false, deco: "none", pill: "2px",
  },
  pastel: {
    bg: "#fdf4ff", fg: "#2e1065", muted: "#6b5b8c", card: "#ffffff", line: "#f0d9fb", navBg: "253,244,255",
    radius: "18px", shadow: "none",
    display: SANS, body: SANS, mono: SANS, headWeight: 800, upper: false, gradientHead: false, brutal: false, dark: false, deco: "none", pill: "14px",
  },
  neon: {
    bg: "#04050a", fg: "#e8fff7", muted: "#7fa595", card: "rgba(255,255,255,.03)", line: "rgba(0,255,170,.18)", navBg: "4,5,10",
    radius: "6px", shadow: "none",
    display: SANS, body: SANS, mono: MONO, headWeight: 800, upper: false, gradientHead: false, brutal: false, dark: true, deco: "grid", pill: "6px",
  },
  /* ---- palet kurasi: kartu 22px, border 1px halus, bayangan lembut, latar off-white/kaca ---- */
  bakso: {
    bg: "#FFFBF5", fg: "#1C1917", muted: "#6B5A4E", card: "#FFF6EA", line: "rgba(28,25,23,.09)", navBg: "255,251,245",
    radius: "22px", shadow: "0 10px 30px rgba(0,0,0,.05)",
    display: SANS, body: SANS, mono: SANS, headWeight: 800, upper: false, gradientHead: false, brutal: false, dark: false, deco: "none", pill: "999px",
    acc2: "#FDBA74", ib: "rgba(253,186,116,.40)", noise: true,
  },
  kue: {
    bg: "#FFF7ED", fg: "#422006", muted: "#7C5A45", card: "#FFF2E6", line: "rgba(66,32,6,.09)", navBg: "255,247,237",
    radius: "24px", shadow: "0 10px 30px rgba(0,0,0,.05)",
    display: SERIF, body: SANS, mono: SANS, headWeight: 700, upper: false, gradientHead: false, brutal: false, dark: false, deco: "none", pill: "999px",
    acc2: "#F9A8D4", ib: "rgba(249,168,212,.38)", noise: true,
  },
  barber: {
    bg: "#0A0A0A", fg: "#FAFAFA", muted: "#A1A1AA", card: "rgba(255,255,255,.04)", line: "rgba(255,255,255,.10)", navBg: "10,10,10",
    radius: "22px", shadow: "0 10px 30px rgba(0,0,0,.35)",
    display: SANS, body: SANS, mono: MONO, headWeight: 900, upper: true, gradientHead: false, brutal: false, dark: true, deco: "none", pill: "999px",
    acc2: "#27272A", ib: "#27272A", glass: true,
  },
  tech: {
    bg: "#F8FAFC", fg: "#020617", muted: "#475569", card: "#F1F5F9", line: "rgba(2,6,23,.08)", navBg: "248,250,252",
    radius: "22px", shadow: "0 10px 30px rgba(0,0,0,.05)",
    display: SANS, body: SANS, mono: SANS, headWeight: 800, upper: false, gradientHead: false, brutal: false, dark: false, deco: "none", pill: "999px",
    acc2: "#38BDF8", ib: "rgba(56,189,248,.20)",
  },
  majalah: {
    bg: "#FBFAF7", fg: "#141414", muted: "#5C5852", card: "#FFFFFF", line: "rgba(20,20,20,.12)", navBg: "251,250,247",
    radius: "8px", shadow: "0 1px 0 rgba(20,20,20,.04)",
    display: SERIF, body: SANS, mono: SANS, headWeight: 800, upper: false, gradientHead: false, brutal: false, dark: false, deco: "none", pill: "6px",
    acc2: "#FCA5A5", ib: "rgba(252,165,165,.35)",
  },
  jurnal: {
    bg: "#0F1115", fg: "#ECEBE8", muted: "#9CA0A8", card: "rgba(255,255,255,.04)", line: "rgba(255,255,255,.10)", navBg: "15,17,21",
    radius: "14px", shadow: "none",
    display: SERIF, body: SANS, mono: MONO, headWeight: 700, upper: false, gradientHead: false, brutal: false, dark: true, deco: "none", pill: "999px",
    acc2: "#B45309", ib: "rgba(245,158,11,.16)",
  },
};

/** Dua warna bawaan sebuah template: [utama, kedua]. Titik awal editor palet. */
export function defaultPalette(template: TemplateId): [string, string] {
  const tpl = TEMPLATES.find((x) => x.id === template)!;
  const second = THEMES[template].acc2 ?? mixWhite(tpl.accent, 0.5);
  return [tpl.accent, second];
}

/* ------------------------------------------------------------------ */
/* Gaya hasil latihan (SiteContent.look): token, elemen, dan CSS-nya   */
/* ------------------------------------------------------------------ */

/** Huruf condensed tanpa unduhan font: Impact/Bebas di desktop, HelveticaNeue-CondensedBlack di iOS, sans-serif-condensed di Android. */
const CONDENSED = `"Bebas Neue","Anton","Oswald","League Gothic",Impact,Haettenschweiler,"HelveticaNeue-CondensedBlack","Arial Narrow Bold","Arial Narrow","sans-serif-condensed",sans-serif`;
/** Grotesk rapat ala poster Swiss. */
const GROTESK = `"Helvetica Neue","Neue Haas Grotesk Display Pro",Helvetica,Arial,"Inter",sans-serif`;
/** Huruf lebar/extended ala streetwear futuristik. */
const WIDE = `"Eurostile Extended","Microgramma D Extended","Michroma","Syncopate","Arial Black",sans-serif`;
/** Huruf membulat ramah (SF Rounded di Apple, Nunito/Quicksand bila terpasang). */
const ROUNDED = `ui-rounded,"SF Pro Rounded","Nunito","Quicksand","Varela Round","Arial Rounded MT Bold","Hiragino Maru Gothic ProN",system-ui,sans-serif`;
/** Tulisan tangan / spidol untuk aksen kecil (stiker, catatan). */
const HAND = `"Bradley Hand","Segoe Print","Chalkboard SE","Marker Felt","Comic Neue","Comic Sans MS",cursive`;
const LOOK_STACK: Record<LookFontFamily, string> = { condensed: CONDENSED, grotesk: GROTESK, sans: SANS, serif: SERIF, slab: SLAB, mono: MONO, display: DISPLAY, wide: WIDE, rounded: ROUNDED, hand: HAND };
/** Perkiraan lebar rata-rata huruf kapital (em) per keluarga, untuk menghitung ukuran judul raksasa supaya muat. */
const LOOK_WIDTH: Record<LookFontFamily, number> = { condensed: 0.47, grotesk: 0.66, display: 0.76, sans: 0.64, serif: 0.62, slab: 0.68, mono: 0.62, wide: 0.92, rounded: 0.68, hand: 0.66 };

/** Campur dua warna hex, k = porsi warna b (0..1). */
function mixHex(a: string, b: string, k: number): string {
  const x = parseInt(a.slice(1), 16);
  const y = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round(((x >> s) & 255) * (1 - k) + ((y >> s) & 255) * k);
  return "#" + [16, 8, 0].map((s) => ch(s).toString(16).padStart(2, "0")).join("");
}

/** Terapkan gaya hasil latihan ke tema: warna, huruf, bentuk. Elemen & tata letak ditangani buildSite/lookCss. */
function applyLook(t: Theme, L: SiteLook): Theme {
  const dark = relLum(L.bg) < 0.4;
  // Neo: kartu sedikit lebih terang dari latar (kertas di atas meja); brutal: kartu = latar.
  const card = L.base === "neo" ? mixHex(L.bg, "#ffffff", dark ? 0.07 : 0.62) : L.bg;
  let muted = mixHex(L.fg, L.bg, 0.28);
  if (lookContrast(muted, L.bg) < 4.5 || lookContrast(muted, card) < 4.5) muted = L.fg;
  const sh = L.shape;
  return {
    ...t,
    bg: L.bg,
    fg: L.fg,
    muted,
    card,
    line: L.ink,
    navBg: rgb(L.bg),
    dark,
    radius: `${sh.radius}px`,
    pill: `${sh.radius}px`,
    shadow: sh.shadow === "hard" ? `${sh.offset ?? 6}px ${sh.offset ?? 6}px 0 ${L.ink}` : sh.shadow === "soft" ? "0 14px 34px rgba(0,0,0,.14)" : "none",
    display: LOOK_STACK[L.fonts.title.family],
    sub: LOOK_STACK[L.fonts.sub.family],
    body: LOOK_STACK[L.fonts.body.family],
    mono: LOOK_STACK[L.fonts.label.family],
    headWeight: L.fonts.title.weight,
    subWeight: L.fonts.sub.weight,
    bodyWeight: L.fonts.body.weight,
    upper: !!L.fonts.title.upper,
    tracking: `${L.fonts.title.tracking ?? 0}em`,
    heroScale: L.fonts.title.scale ?? 1,
    gradientHead: false,
    brutal: false,
    glass: false,
    noise: false,
    deco: "none",
    borderW: sh.border,
    gridGap: `${sh.gap}px`,
    cardPad: `${sh.pad}px`,
    maxWidth: sh.width,
    sectionGap: `clamp(${Math.round(sh.section * 0.55)}px,${(sh.section / 14).toFixed(1)}vw,${sh.section}px)`,
    acc2: L.accent2,
    ib: L.accent,
  };
}

const svgOpen = (vb: string, extra = "") => `<svg viewBox="${vb}" aria-hidden="true" focusable="false"${extra}>`;

/** Elemen dekoratif SVG (warna ikut currentColor / var(--a) / var(--ink)). */
function lookSvg(id: string, seed = 7): string {
  switch (id) {
    case "arrow":
      return `${svgOpen("0 0 48 48", ' fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="square"')}<path d="M11 37 35 13M15 12h21v21"/></svg>`;
    case "crosshair":
      return `${svgOpen("0 0 200 200", ' fill="none" stroke="currentColor" stroke-width="1.6"')}<path d="M0 100H200M100 0V200"/><circle cx="100" cy="100" r="22"/><circle cx="100" cy="100" r="44"/><circle cx="100" cy="100" r="66"/><circle cx="100" cy="100" r="88"/><circle cx="100" cy="100" r="8" fill="var(--a)" stroke="none"/><circle cx="36" cy="64" r="5.5" fill="currentColor" stroke="none"/><circle cx="153" cy="104" r="5.5" fill="currentColor" stroke="none"/><circle cx="126" cy="154" r="4.5" fill="currentColor" stroke="none"/><circle cx="118" cy="16" r="2.5" fill="currentColor" stroke="none"/></svg>`;
    case "barcode": {
      let x = 0;
      let h = seed >>> 0;
      const bars: string[] = [];
      while (x < 188) {
        h = (Math.imul(h ^ (h >>> 13), 1103515245) + 12345) >>> 0;
        const w = 1 + (h % 4);
        if ((h >> 5) % 3) bars.push(`<rect x="${x}" y="0" width="${w}" height="92"/>`);
        x += w + 1 + ((h >> 9) % 2);
      }
      const digits = String(seed).padStart(12, "0").slice(-12);
      return `${svgOpen("0 0 190 116", ' fill="currentColor"')}${bars.join("")}<text x="0" y="112" font-family="ui-monospace,Menlo,monospace" font-size="15" letter-spacing="3">${digits.slice(0, 1)} ${digits.slice(1, 7)} ${digits.slice(7)}</text></svg>`;
    }
    case "sunburst": {
      const lines: string[] = [];
      for (let i = 0; i <= 18; i++) {
        const ang = Math.PI * (i / 18);
        lines.push(`<path d="M100 200L${(100 - Math.cos(ang) * 140).toFixed(1)} ${(200 - Math.sin(ang) * 140).toFixed(1)}"/>`);
      }
      for (let i = 0; i < 9; i++) lines.push(`<path d="M${20 + i * 20} 0V${50 - Math.abs(4 - i) * 6}"/>`);
      return `${svgOpen("0 0 200 200", ' fill="none" stroke="currentColor" stroke-width="3"')}${lines.join("")}</svg>`;
    }
    case "asterisk":
      return `${svgOpen("0 0 100 100")}<rect width="100" height="100" fill="var(--a)"/><path d="M50 13V87M13 50H87M23.8 23.8 76.2 76.2M76.2 23.8 23.8 76.2" stroke="var(--ink)" stroke-width="11"/></svg>`;
    case "halftone": {
      const dots: string[] = [];
      for (let y = -46; y <= 46; y += 6)
        for (let x = -46; x <= 46; x += 6) {
          const d = Math.hypot(x, y);
          if (d > 46) continue;
          const shade = 1 - Math.hypot(x + 18, y + 18) / 96;
          const r = Math.max(0.5, 2.4 * shade);
          dots.push(`<circle cx="${50 + x}" cy="${50 + y}" r="${r.toFixed(2)}"/>`);
        }
      return `${svgOpen("0 0 100 100", ' fill="currentColor"')}${dots.join("")}</svg>`;
    }
    case "plus-grid": {
      const p: string[] = [];
      for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) p.push(`<path d="M${12 + c * 26} ${18 + r * 26}h12M${18 + c * 26} ${12 + r * 26}v12"/>`);
      return `${svgOpen("0 0 110 84", ' fill="none" stroke="currentColor" stroke-width="2"')}${p.join("")}</svg>`;
    }
    case "sparkle":
      return `${svgOpen("0 0 100 100", ' fill="currentColor"')}<path d="M50 0C53 30 70 47 100 50 70 53 53 70 50 100 47 70 30 53 0 50 30 47 47 30 50 0Z"/></svg>`;
    case "globe":
      return `${svgOpen("0 0 100 100", ' fill="none" stroke="currentColor" stroke-width="2.2"')}<circle cx="50" cy="50" r="46"/><ellipse cx="50" cy="50" rx="20" ry="46"/><ellipse cx="50" cy="50" rx="36" ry="46"/><path d="M4 50h92M10 27h80M10 73h80M50 4v92"/></svg>`;
    case "pixel": {
      let h = (seed >>> 0) || 1;
      const cells: string[] = [];
      const cols = ["var(--fg)", "var(--a)", "var(--a2)", "var(--muted)"];
      for (let y = 0; y < 10; y++)
        for (let x = 0; x < 10; x++) {
          h = (Math.imul(h ^ (h >>> 15), 2246822519) + 3266489917) >>> 0;
          const d = Math.hypot(x - 5.5, y - 4.5);
          if (d > 5.2 || h % 100 < 22 + d * 8) continue;
          const c = cols[h % 7 < 4 ? 0 : h % 7 < 5 ? 1 : h % 7 < 6 ? 2 : 3];
          cells.push(`<rect x="${x * 20 + 1}" y="${y * 20 + 1}" width="18" height="18" fill="${c}" opacity="${(0.55 + ((h >> 8) % 45) / 100).toFixed(2)}"/>`);
        }
      const grid = Array.from({ length: 11 }, (_, i) => `<path d="M${i * 20} 0V200M0 ${i * 20}H200"/>`).join("");
      return `${svgOpen("0 0 200 200")}<g stroke="currentColor" stroke-width=".6" opacity=".25">${grid}</g>${cells.join("")}</svg>`;
    }
    default:
      return "";
  }
}

/** Lencana teks melingkar (berputar pelan; berhenti bila pengguna memilih kurangi gerakan). */
function ringSvg(text: string, center: string): string {
  const t = esc(`${text} \u2731 `.repeat(Math.max(2, Math.ceil(40 / (text.length + 3)))).slice(0, 64).toUpperCase());
  return `<span class="ring" aria-hidden="true"><svg viewBox="0 0 200 200"><defs><path id="rgp" d="M100 100m-78 0a78 78 0 1 1 156 0a78 78 0 1 1-156 0"/></defs><text font-size="15" font-weight="700" letter-spacing="3" fill="currentColor"><textPath href="#rgp">${t}</textPath></text></svg><i>${center}</i></span>`;
}

const fontCss = (f: LookFont, size: string): string =>
  `font:${f.weight} ${size}/${f.leading ?? 1.06} ${LOOK_STACK[f.family]};letter-spacing:${f.tracking ?? 0}em;text-transform:${f.upper ? "uppercase" : "none"}`;

/** CSS tata letak "poster" & "index" (berlaku juga tanpa gaya latihan, memakai warna template). */
function posterCss(t: Theme): string {
  return `.h-poster{padding:clamp(18px,3vw,34px) 0 clamp(28px,4vw,48px);text-align:left}
.pst-meta{display:grid;grid-template-columns:1.2fr .9fr 1fr auto 1fr;gap:22px;align-items:start;padding-bottom:20px;border-bottom:var(--bw) solid var(--ink)}
.pst-meta p{margin:0}
.pm-k{font:${t.headWeight} clamp(15px,1.7vw,21px)/1.04 ${t.display};text-transform:uppercase;letter-spacing:${t.tracking ?? "-.01em"};max-width:16ch}
.pm-ln{display:flex;align-items:center;margin-top:12px}.pm-ln i{height:2px;flex:1;background:var(--fg)}.pm-ln b{width:18px;height:18px;border-radius:50%;background:var(--a);flex:none}
.pm-s{font:600 12px/1.4 ${t.mono};text-transform:uppercase;letter-spacing:.05em;max-width:22ch}
.pm-n{font:${t.headWeight} clamp(34px,4.8vw,62px)/.84 ${t.display};color:var(--at);padding-left:18px;border-left:2px solid var(--fg);letter-spacing:-.02em}
.pm-l{list-style:none;margin:0;padding:0;font:600 12px/1.95 ${t.mono};text-transform:uppercase;letter-spacing:.06em}
.pm-l li{display:flex;align-items:center;gap:8px}.pm-l svg{width:13px;height:13px;color:var(--at)}
.pst-g{display:flex;flex-direction:column;margin:clamp(14px,2vw,24px) 0 0;font-family:${t.display};font-weight:${t.headWeight};text-transform:${t.upper ? "uppercase" : "none"};color:var(--fg)}
.pst-g{gap:clamp(4px,.8vw,10px)}.pst-g span{display:block;padding:clamp(4px,.7vw,10px) 0}.pst-g svg{display:block;width:100%;height:auto;overflow:visible}
.pst-g.tone .inv{background:var(--ink);color:var(--bg);box-shadow:0 0 0 100vmax var(--ink);clip-path:inset(0 -100vmax)}
.pst-grid{display:grid;grid-template-columns:1fr 2fr 1fr;border:var(--bw) solid var(--ink);margin-top:clamp(16px,2.6vw,30px);background:var(--bg)}
.pc{position:relative;min-width:0;padding:clamp(18px,2.4vw,28px);border-right:var(--bw) solid var(--ink)}.pc:last-child{border-right:0}
.pc-ink{background:var(--ink);color:var(--bg)}
.h-poster .pc-ink .sub{color:inherit;opacity:.92;margin:0 0 18px;font-size:15px;max-width:none}
.pc-rule{display:block;width:44px;height:4px;background:var(--a);margin-bottom:18px}
.pc-ink svg{width:min(150px,70%);height:auto;margin-top:6px}
.pc-acc{background:var(--a);color:var(--on);padding-bottom:clamp(64px,7vw,84px)}
.h-poster .pc-acc h1{font-size:clamp(28px,3.7vw,54px);line-height:.98;margin:0 0 22px;max-width:none;color:inherit;-webkit-text-fill-color:currentColor;background:none}
.h-poster .pc-acc .row{justify-content:flex-start}
.pc-acc .btn{background:var(--ink);color:var(--bg);border-color:var(--ink);box-shadow:none}
.pc-acc .btn.ghost{background:transparent;color:inherit;border-color:currentColor}
.pc-arw{position:absolute;right:18px;bottom:16px;width:46px;height:46px;color:currentColor}
.pc-el{display:grid;place-items:center;color:var(--fg);min-height:200px;overflow:hidden}
.pc-el svg{width:100%;max-width:230px;height:auto}
.pc-el img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.idx{display:grid;grid-template-columns:.9fr 1.4fr;border:var(--bw) solid var(--ink)}
.idx-h{display:flex;flex-direction:column;gap:14px;padding:clamp(20px,3vw,36px);border-right:var(--bw) solid var(--ink)}
.idx-n{font:${t.headWeight} clamp(80px,13vw,170px)/.8 ${t.display};color:var(--at);letter-spacing:-.03em}
.idx-h h2{margin:0}.idx-h p{margin:0;color:var(--muted)}
.idx-l{list-style:none;margin:0;padding:0}
.idx-l li{display:grid;grid-template-columns:auto 1fr;gap:18px;padding:clamp(16px,2vw,22px) clamp(18px,2.6vw,30px);border-bottom:var(--bw) solid var(--ink);transition:background .15s,color .15s}
.idx-l li:last-child{border-bottom:0}
.idx-i{font:700 13px ${t.mono};color:var(--at);padding-top:5px}
.idx-l h3{font-size:clamp(18px,2vw,24px);line-height:1.1;margin:0 0 6px;${t.upper ? "text-transform:uppercase;" : ""}}
.idx-l p{margin:0;color:var(--muted)}
.idx-l li:hover{background:var(--a);color:var(--on)}.idx-l li:hover p,.idx-l li:hover .idx-i{color:inherit}
.tick{overflow:hidden;background:var(--a);color:var(--on);border-bottom:var(--bw) solid var(--ink)}
.tk{display:flex;width:max-content;animation:tk 36s linear infinite;padding:12px 0;font:700 14px/1 ${t.mono};text-transform:uppercase;letter-spacing:.08em;white-space:nowrap}
.tk span{padding-right:30px}
@keyframes tk{to{transform:translateX(-50%)}}
${heroExtraCss(t)}
@media(max-width:900px){.pst-meta{grid-template-columns:1fr auto}.pm-ln,.pm-s,.pm-l{display:none}.pst-grid{grid-template-columns:1fr}.pc{border-right:0;border-bottom:var(--bw) solid var(--ink)}.pc:last-child{border-bottom:0}.pc-el{min-height:180px}.idx{grid-template-columns:1fr}.idx-h{border-right:0;border-bottom:var(--bw) solid var(--ink)}}`;
}

/** CSS hero breaker / terminal / dashboard / label dan elemen pendukungnya. Berlaku juga tanpa gaya latihan. */
function heroExtraCss(t: Theme): string {
  const lab = `font:600 12px/1.35 ${t.mono};text-transform:uppercase;letter-spacing:.06em`;
  return `.h-breaker,.h-terminal,.h-dashboard,.h-label{padding:clamp(18px,3vw,36px) 0 clamp(28px,4vw,52px);text-align:left}
.brk{display:grid;grid-template-columns:1.3fr .95fr .8fr;gap:clamp(18px,2.6vw,34px);align-items:stretch}
.brk-t{display:flex;flex-direction:column;justify-content:center;min-width:0}
.h-breaker .brk-h{font-size:clamp(46px,7.4vw,124px);line-height:.88;letter-spacing:${t.tracking ?? "-.02em"};margin:0;max-width:none;${t.upper ? "text-transform:uppercase;" : ""}}
.brk-h em{font-style:normal;color:var(--hl)}
.brk-h .ast{display:inline-block;width:.62em;height:.62em;vertical-align:.08em;margin:0 .06em}.brk-h .ast svg{width:100%;height:100%}
.brk-v{position:relative;min-height:340px;background:var(--a);color:var(--on);display:grid;place-items:center;overflow:hidden;border-radius:var(--r)}
.brk-v>svg{width:62%;height:auto}.brk-v img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;mix-blend-mode:multiply;filter:grayscale(1) contrast(1.15)}
.brk-v .spk{position:absolute;width:44px;color:var(--ink)}.brk-v .spk:nth-of-type(1){left:-10px;bottom:24px}.brk-v .spk:nth-of-type(2){right:14px;top:16px;width:26px}
.brk-s{display:flex;flex-direction:column;gap:20px;justify-content:center}
.h-breaker .brk-s .sub{${lab};font-size:13.5px;line-height:1.55;color:var(--fg);margin:0;max-width:30ch}
.brk-s .row{justify-content:flex-start}
.brk-s .gl{width:clamp(70px,8vw,110px);color:var(--fg);margin-top:8px}
.trm{display:grid;grid-template-columns:auto 1.1fr 1fr;border:var(--bw) solid var(--ink)}
.trm-rail{display:flex;flex-direction:column;justify-content:space-between;align-items:center;padding:18px 10px;border-right:var(--bw) solid var(--ink);${lab};color:var(--at)}
.trm-rail span{writing-mode:vertical-rl;transform:rotate(180deg);max-height:220px;overflow:hidden}.trm-rail b{writing-mode:vertical-rl;transform:rotate(180deg);color:var(--fg)}
.trm-main{padding:clamp(22px,3.4vw,48px);display:flex;flex-direction:column;gap:18px;min-width:0}
.trm-n{${lab};color:var(--at);margin:0}
.trm-g{display:block;line-height:.84}.trm-g svg{display:block;width:100%;height:auto}
.h-terminal .trm-main h1{font:600 clamp(15px,1.5vw,19px)/1.35 ${t.mono};text-transform:uppercase;letter-spacing:.05em;color:var(--at);margin:0;max-width:none;-webkit-text-fill-color:currentColor;background:none}
.h-terminal .trm-main .sub{font:400 14.5px/1.65 ${t.mono};color:var(--fg);margin:0;max-width:48ch}
.trm-main .row{justify-content:flex-start}
.trm-art{position:relative;border-left:var(--bw) solid var(--ink);display:grid;place-items:center;padding:28px;min-height:360px;overflow:hidden}
.trm-art>svg{width:min(82%,380px);height:auto;color:var(--fg)}.trm-art img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.trm-st{position:absolute;left:18px;top:16px;${lab};font-size:11.5px;color:var(--fg)}.trm-st b{color:var(--at)}
.trm-co{position:absolute;right:0;bottom:56px;padding:12px 16px;background:var(--a);color:var(--on);font:600 13px/1.6 ${t.mono}}
.trm-sc{position:absolute;right:16px;bottom:16px;${lab};font-size:11.5px}
.dsh-top{display:flex;justify-content:space-between;gap:16px;padding-bottom:12px;border-bottom:var(--bw) solid var(--fg);${lab};font-size:11px}
.dsh-head{display:grid;grid-template-columns:1.4fr .6fr;gap:28px;align-items:start;margin:clamp(22px,3vw,40px) 0}
.h-dashboard .dsh-head h1{font-size:clamp(40px,6vw,92px);line-height:.95;margin:0 0 14px;max-width:none}
.h-dashboard .dsh-head .sub{margin:0 0 24px}
.dsh-head .row{justify-content:flex-start}
.dsh-brand{display:flex;align-items:center;justify-content:flex-end;gap:12px;${lab};font-size:14px}
.dsh-brand i{display:grid;place-items:center;width:44px;height:44px;color:var(--fg)}.dsh-brand i svg{width:100%;height:100%}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));border:var(--bw) solid var(--ink)}
.stat{position:relative;padding:18px 20px 16px;min-height:150px;display:flex;flex-direction:column;justify-content:space-between;border-right:var(--bw) solid var(--ink);min-width:0}
.stat:last-child{border-right:0}
.stat b{font:${t.headWeight} clamp(34px,4.4vw,60px)/.95 ${t.display};letter-spacing:-.03em;overflow-wrap:anywhere}
.stat span{${lab};font-size:11px;display:flex;justify-content:space-between;gap:10px;border-top:1px solid currentColor;padding-top:10px;opacity:.9}
.stat:first-child{background:var(--a);color:var(--on)}
.stat:nth-child(3){background:var(--ink);color:var(--bg)}
.stat i{position:absolute;right:14px;top:14px;width:20px;height:20px}.stat i svg{width:100%;height:100%}
.bignum{position:relative;overflow:hidden;aspect-ratio:1000/200;margin-bottom:-2px}
.bignum svg{position:absolute;left:0;bottom:0;width:100%;height:auto;color:var(--fg)}
.lbl{display:grid;grid-template-columns:minmax(120px,.55fr) 1fr 1.25fr;grid-template-rows:auto auto;border:var(--bw) solid var(--ink);background:var(--bg)}
.lbl>*{min-width:0;border-right:var(--bw) solid var(--ink);border-bottom:var(--bw) solid var(--ink)}
.lbl-a{display:grid;place-items:center;font:${t.headWeight} clamp(96px,14vw,210px)/.8 ${t.display};padding:18px;text-transform:uppercase}
.lbl-f{display:flex;flex-direction:column}
.lbl-f dl{margin:0;display:grid;grid-template-columns:auto 1fr}
.lbl-f dt,.lbl-f dd{margin:0;padding:10px 14px;border-bottom:1px solid var(--ink);${lab};font-size:11.5px}
.lbl-f dd{text-align:right;font-weight:700;overflow-wrap:anywhere}
.lbl-bc{padding:12px 14px;margin-top:auto;color:var(--fg)}.lbl-bc svg{width:100%;height:auto;max-height:70px}
.lbl-h{grid-column:3;grid-row:1/3;border-right:0;padding:clamp(20px,3vw,40px);display:flex;flex-direction:column;gap:16px;justify-content:space-between}
.lbl-k{${lab};margin:0;color:var(--at)}
.h-label .lbl-h h1{font-size:clamp(34px,4.6vw,72px);line-height:.92;margin:0;max-width:none}
.h-label .lbl-h .sub{margin:0}
.lbl-h .row{justify-content:flex-start}
.lbl-x{display:grid;place-items:center;padding:16px;color:var(--fg)}.lbl-x svg{width:min(120px,70%);height:auto}
.lbl-z{border-bottom:0}.lbl-z .hz{height:100%;min-height:90px;border:0}
.lbl .lbl-x,.lbl .lbl-z{border-bottom:0}
.hz{height:28px;background:repeating-linear-gradient(-45deg,var(--ink) 0 12px,transparent 12px 24px);border-bottom:var(--bw) solid var(--ink)}
.ck{height:22px;background:repeating-conic-gradient(var(--ink) 0 25%,transparent 0 50%) 0 0/22px 22px;border-top:var(--bw) solid var(--ink)}
.brkt{background-image:linear-gradient(var(--fg),var(--fg)),linear-gradient(var(--fg),var(--fg)),linear-gradient(var(--fg),var(--fg)),linear-gradient(var(--fg),var(--fg)),linear-gradient(var(--fg),var(--fg)),linear-gradient(var(--fg),var(--fg)),linear-gradient(var(--fg),var(--fg)),linear-gradient(var(--fg),var(--fg));background-position:left top,left top,right top,right top,left bottom,left bottom,right bottom,right bottom;background-size:22px 3px,3px 22px,22px 3px,3px 22px,22px 3px,3px 22px,22px 3px,3px 22px;background-repeat:no-repeat}
.ring{position:relative;display:inline-grid;place-items:center;width:clamp(96px,11vw,140px);aspect-ratio:1;color:var(--fg)}
.ring svg{position:absolute;inset:0;width:100%;height:100%;animation:rg 22s linear infinite}.ring i{width:34%;color:var(--hl,var(--a))}.ring i svg{position:static;animation:none;width:100%;height:auto}
@keyframes rg{to{transform:rotate(360deg)}}
@media(max-width:980px){.brk{grid-template-columns:1fr 1fr}.brk-t{grid-column:1/-1}.brk-v{min-height:260px}}
@media(max-width:900px){.trm{grid-template-columns:auto 1fr}.trm-art{grid-column:1/-1;border-left:0;border-top:var(--bw) solid var(--ink);min-height:280px}.dsh-head{grid-template-columns:1fr}.dsh-brand{justify-content:flex-start}.lbl{grid-template-columns:minmax(90px,.5fr) 1fr}.lbl-h{grid-column:1/-1;grid-row:auto;border-bottom:var(--bw) solid var(--ink)}.lbl-a{font-size:clamp(80px,22vw,140px)}}
@media(max-width:560px){.stats{grid-template-columns:1fr 1fr}.stat:last-child:nth-child(odd){grid-column:1/-1}.stat{min-height:118px}.brk{grid-template-columns:1fr}.trm-rail{display:none}.trm{grid-template-columns:1fr}.stat{border-bottom:var(--bw) solid var(--ink)}.stat:nth-child(2n){border-right:0}.stat:last-child{border-right:0}.lbl-f dt,.lbl-f dd{padding:8px 10px}}`;
}

/** CSS tambahan saat gaya hasil latihan aktif: semua komponen ikut karakter gaya (huruf, garis, sudut, blok terbalik). */
function lookCss(L: SiteLook): string {
  const B = L.shape.border;
  const R = L.shape.radius;
  const P = L.shape.pill ?? R;
  const lfContent =
    L.labelFmt === "slash" ? `"/" counter(sec,decimal-leading-zero)` : L.labelFmt === "hash" ? `"#" counter(sec,decimal-leading-zero)` : L.labelFmt === "bracket" ? `"[" counter(sec,decimal-leading-zero) "]"` : `"(" counter(sec,decimal-leading-zero) ")"`;
  // Bagian berselang "blocks": warna dibalik lewat variabel CSS, jadi kartu, teks, dan garis ikut terbalik.
  const invDark = relLum(L.ink) < 0.4;
  let invMuted = mixHex(L.bg, L.ink, 0.28);
  if (lookContrast(invMuted, L.ink) < 4.5) invMuted = L.bg;
  const invAt = readable(L.accent, invDark, L.ink);
  const F = L.fonts;
  const hard = L.shape.shadow === "hard";
  const gap0 = L.shape.gap === 0;
  const arrow = L.elements.includes("arrow");
  const lbl = (size: string) => fontCss({ ...F.label, leading: 1.2 }, size);
  return `
.lk .nav{background:var(--bg);border-bottom:${B}px solid var(--ink)}
.lk .brand{${fontCss({ ...F.title, leading: 1 }, "19px")}}
.lk .brand i{border-radius:${R}px;background:var(--ink);color:var(--bg);border:0}
.lk .links{${lbl("12.5px")};color:var(--fg)}
.lk .badge{${lbl("12px")};color:var(--fg);border:${Math.max(1, B - 1)}px solid var(--ink);border-radius:${R}px;padding:6px 10px}
.lk .btn{border-radius:${P}px;border:${B}px solid var(--ink);${lbl("13.5px")};padding:14px 20px;box-shadow:${hard ? "4px 4px 0 var(--ink)" : "none"};transition:background .12s,color .12s,transform .12s}
.lk .btn.ghost{background:transparent;color:var(--fg);border-color:var(--ink);box-shadow:none}
.lk .btn:hover{opacity:1;background:var(--ink);color:var(--bg);border-color:var(--ink)}
.lk .btn.sm{padding:9px 13px;font-size:12px}
${arrow ? `.lk .btn:not(.sm):not(.cartbtn):after{content:"\\2197";font-size:1.25em;line-height:.8;margin-left:2px}` : ""}
.lk h2{${fontCss(F.sub, `clamp(34px,6.2vw,${Math.round(82 * (F.title.scale ?? 1))}px)`)}}
.lk .card{border:${B}px solid var(--ink);border-radius:${R}px;box-shadow:${hard ? "6px 6px 0 var(--ink)" : "none"};background:var(--card)}
.lk .card h3,.lk .pbody h3{${fontCss({ ...F.sub, leading: 1.08 }, "clamp(19px,1.9vw,23px)")}}
.lk .ico,.lk .pico,.lk .vrow i,.lk .ci i,.lk .acard i,.lk .tqh .ico{border-radius:${R}px;background:var(--a);color:var(--on)}
.lk .feat:hover,.lk .prod:hover,.lk .scard:hover,.lk .acard:hover,.lk .post:hover{transform:none;box-shadow:${hard ? "8px 8px 0 var(--ink)" : "none"};border-color:var(--ink)}
.lk .feat:hover{background:var(--a);color:var(--on)}.lk .feat:hover p{color:inherit}.lk .feat:hover .ico{background:var(--ink);color:var(--bg)}
.lk .bento .feat:first-child{background:var(--ink);color:var(--bg)}.lk .bento .feat:first-child .ico{background:var(--a);color:var(--on)}
.lk .prod.large{background:var(--a);color:var(--on)}.lk .prod.large p,.lk .prod.large .pprice,.lk .prod.large .ptag{color:inherit;border-color:currentColor}
.lk .ptag{${lbl("11px")};border:1px solid var(--ink);border-radius:${R}px;color:var(--fg)}
.lk .ptag.hot{background:var(--ink);color:var(--bg)}
.lk .prod.large .ptag.hot{background:var(--ink);color:var(--bg);border-color:var(--ink)}
.lk .pprice{font-family:${LOOK_STACK[F.title.family]};font-weight:${F.title.weight};font-size:20px}
.lk .hero{border-bottom:${B}px solid var(--ink)}
.lk main>section{border-bottom:${B}px solid var(--ink)}
.lk .steps li{border-top:${B}px solid var(--ink);padding-top:16px}
.lk .steps b{${fontCss({ ...F.title, leading: 0.9 }, "clamp(44px,6vw,76px)")};color:var(--at);margin-bottom:12px}
.lk .ci small,.lk footer{${lbl("12px")}}
.lk .lead{color:var(--fg)}
.lk .tq blockquote p{${fontCss({ ...F.sub, leading: 1.1 }, "clamp(24px,3.4vw,40px)")}}
.lk .band{border-radius:${R}px;background:var(--ink);color:var(--bg);border:${B}px solid var(--ink);box-shadow:none}
.lk .band h2{${fontCss(F.title, "clamp(36px,6.4vw,84px)")};color:inherit}
.lk .band .btn{background:var(--a);color:var(--on);border-color:var(--a)}
.lk .band .btn.ghost{background:transparent;color:var(--bg);border-color:var(--bg)}
.lk .band .btn:hover{background:var(--bg);color:var(--ink);border-color:var(--bg)}
.bd-el{position:absolute;right:clamp(14px,3vw,36px);top:clamp(14px,3vw,30px);width:clamp(44px,6vw,72px);height:auto;z-index:0;opacity:.95}
.bd-el svg{width:100%;height:auto}
.lk .band>*:not(.bd-el){z-index:1}
.lk footer{border-top:0;color:var(--fg)}
.lk ::selection{background:var(--a);color:var(--on)}
.lk .glow,.lk .orn{display:none}
${lookContrast(L.accent, L.ink) < 1.6 ? `.pc-acc .btn,.stat:first-child,.lk .band .btn{background:var(--bg);color:var(--fg);border-color:var(--bg)}.pc-acc .btn.ghost{background:transparent;color:inherit;border-color:currentColor}.lk .ptag.hot{outline:1px solid var(--bg)}` : ""}
${gap0 ? `.lk-g0 .grid,.lk-g0 .items,.lk-g0 .bento,.lk-g0 .frows,.lk-g0 .posts{gap:0}
.lk-g0 .grid>.card,.lk-g0 .items>.card,.lk-g0 .bento>.card,.lk-g0 .frows>.card,.lk-g0 .posts>.card{margin:0 -${B}px -${B}px 0;box-shadow:none}
.lk-g0 .steps{gap:0 24px}` : ""}
.lk-idx main{counter-reset:sec}.lk-idx main>section{counter-increment:sec}
.lk-s1 main{counter-reset:sec 1}
.lk-idx main>section h2:before{content:${lfContent};display:block;margin-bottom:14px;${lbl("12px")};color:var(--at)}
.lk-idx .band h2:before{color:inherit;opacity:.7}
.lk-blk main>section:nth-of-type(even){--bg:${L.ink};--fg:${L.bg};--card:${L.ink};--muted:${invMuted};--ink:${L.bg};--line:${L.bg};--at:${invAt};background:var(--bg);color:var(--fg)}
.lk-blk main>section:nth-of-type(even) .band{background:var(--a);color:var(--on);border-color:var(--a)}
.lk-num .items{counter-reset:it}.lk-num .items>.card{counter-increment:it}
.lk-num .items>.card:before{content:counter(it,decimal-leading-zero);position:absolute;left:0;top:0;padding:5px 9px;background:var(--a);color:var(--on);${fontCss({ ...F.label, leading: 1 }, "12px")}}
.lk-num .items>.card{padding-top:44px}
.bd-ring{width:auto;opacity:1}.bd-ring .ring{color:var(--bg)}
.lk .ring{color:var(--fg)}.lk-idx .idx-h h2:before{display:none}
.lk .steps li{padding:18px 20px 22px}`;
}

/* ------------------------------------------------------------------ */
/* Neo brutalism: kartu membulat berbayang offset, banyak warna, stiker */
/* ------------------------------------------------------------------ */

/** Warna teks yang terbaca di atas warna isian: tinta gaya bila cukup kontras, selain itu hitam/putih. */
function textOn(fill: string, ink: string): string {
  return contrastRatio(fill, ink) >= 4.5 ? ink : onColor(fill);
}

/** Elemen yang butuh CSS hero neo (stiker, bentuk, bar pengumuman, ...) walau hero-nya bukan neo/kolase. */
const NEO_HERO_ELS: ReadonlySet<string> = new Set(["stickers", "marker", "topbar", "checks", "shapes"]);
/** Elemen neo yang bekerja lewat kelas body. */
const NEO_BODY_CLS: [LookElement, string][] = [
  ["tones", "lk-tone"],
  ["tiles", "lk-tiles"],
  ["tabs", "lk-tabs"],
  ["paper", "lk-paper"],
  ["dotgrid", "lk-dots"],
  ["pillnav", "lk-pill"],
  ["tilt", "lk-tilt"],
];

/**
 * Lima warna isian bergantian (kartu warna-warni, petak ikon, tab, stiker, ornamen --s1..--s5).
 * Urutan sumber: palet kustom pengguna (≥ 2 warna) > swatch gaya latihan > aksen & aksen kedua; sisanya dicampur.
 */
function siteSwatches(t: Theme, a: string, look: SiteLook | undefined, custom: string[]): string[] {
  const out: string[] = [];
  const add = (x?: string) => {
    const v = x?.toLowerCase();
    if (v && isHexColor(v) && !out.includes(v)) out.push(v);
  };
  // Palet kustom di atas gaya latihan = [aksen, aksen kedua, ...warna kartu] (urutan sama dengan panel Warna).
  if (look && custom.length >= 3) custom.slice(2).forEach(add);
  else if (custom.length >= 2) [...custom.slice(1), custom[0]].forEach(add);
  else (look?.swatches ?? []).forEach(add);
  add(a);
  add(t.acc2);
  const seeds = [...out];
  for (let k = 0; out.length < 5 && k < 16; k++) {
    const b = seeds[k % seeds.length];
    add(k < seeds.length ? mixHex(b, "#ffffff", 0.55) : mixHex(b, t.dark ? "#ffffff" : "#000000", 0.18 + 0.1 * k));
  }
  while (out.length < 5) out.push(out[out.length % Math.max(1, seeds.length)] ?? a);
  return out.slice(0, 5);
}

/** CSS dasar "neo" (menimpa dasar brutal): tombol timbul, kartu berbayang offset, blok ajakan berwarna, tag kapsul. */
function neoCss(L: SiteLook): string {
  const B = L.shape.border;
  const R = L.shape.radius;
  const P = L.shape.pill ?? R;
  const O = L.shape.offset ?? 6;
  const hard = L.shape.shadow === "hard";
  const sh = (o: number) => (hard && o > 0 ? `${o}px ${o}px 0 var(--ink)` : L.shape.shadow === "soft" ? "0 12px 28px rgba(0,0,0,.12)" : "none");
  const bo = Math.max(3, Math.round(O * 0.7));
  const F = L.fonts;
  const lbl = (size: string) => fontCss({ ...F.label, leading: 1.2 }, size);
  const btnFont = `font:700 15px/1.2 ${LOOK_STACK[F.body.family === "hand" ? "sans" : F.body.family]};letter-spacing:0;text-transform:none`;
  const tile = Math.min(R, 14);
  return `
.lk.lkn .nav{background:var(--bg);border-bottom:${B}px solid var(--ink)}
.lk.lkn .brand i{border-radius:${tile}px;background:var(--a);color:var(--on);border:${B}px solid var(--ink);box-shadow:${sh(3)}}
.lk.lkn .links{${lbl("12.5px")}}
.lk.lkn .btn{border-radius:${P}px;border:${B}px solid var(--ink);background:var(--a);color:var(--on);${btnFont};padding:13px 20px;box-shadow:${sh(bo)};transition:transform .12s,box-shadow .12s,background .12s}
.lk.lkn .btn:hover{opacity:1;transform:translate(-2px,-2px);box-shadow:${sh(bo + 2)};background:var(--a);color:var(--on);border-color:var(--ink)}
.lk.lkn .btn:active{transform:translate(${bo}px,${bo}px);box-shadow:none}
.lk.lkn .btn.ghost{background:var(--card);color:var(--fg)}
.lk.lkn .btn.ghost:hover{background:var(--s2);color:var(--s2t)}
.lk.lkn .btn.sm{padding:8px 13px;font-size:13px;box-shadow:${sh(2)}}
.lk.lkn .nav .wrap>.btn{padding:9px 16px;font-size:14px;box-shadow:${sh(3)}}
@media(max-width:520px){.lk.lkn .nav .wrap>.btn{padding:8px 12px;font-size:13px}}
.lk.lkn .btn:not(.sm):not(.cartbtn):after{content:none}
.lk.lkn .badge{border-radius:999px;border:${B}px solid var(--ink);background:var(--s2);color:var(--s2t);padding:7px 14px;box-shadow:${sh(2)};${lbl("12px")}}
.lk.lkn h2{${fontCss(F.sub, `clamp(30px,4.6vw,${Math.round(60 * (F.title.scale ?? 1))}px)`)}}
.lk.lkn .card{border:${B}px solid var(--ink);border-radius:${R}px;box-shadow:${sh(O)};background:var(--card);transition:transform .15s,box-shadow .15s}
.lk.lkn .feat:hover,.lk.lkn .prod:hover,.lk.lkn .scard:hover,.lk.lkn .acard:hover,.lk.lkn .post:hover{transform:translate(-3px,-3px);box-shadow:${sh(O + 3)};border-color:var(--ink);background:var(--card);color:inherit}
.lk.lkn .feat:hover p{color:var(--muted)}.lk.lkn .feat:hover .ico{background:var(--a);color:var(--on)}
.lk.lkn .ico,.lk.lkn .pico,.lk.lkn .vrow i,.lk.lkn .ci i,.lk.lkn .acard i,.lk.lkn .tqh .ico{border-radius:${tile}px;background:var(--a);color:var(--on);border:${Math.max(1, B - 1)}px solid var(--ink)}
.lk.lkn .bento .feat:first-child{background:var(--s1);color:var(--s1t)}.lk.lkn .bento .feat:first-child p{color:inherit;opacity:.88}
.lk.lkn .bento .feat:first-child .ico{background:var(--card);color:var(--fg)}
.lk.lkn .prod.large{background:var(--s1);color:var(--s1t)}.lk.lkn .prod.large .pico{background:var(--card);color:var(--fg)}
.lk.lkn .ptag{border-radius:999px;border:1.5px solid var(--ink);background:var(--card);color:var(--fg);${lbl("11px")}}
.lk.lkn .ptag.hot{background:var(--ink);color:var(--bg);border-color:var(--ink)}
.lk.lkn .prod.large .ptag{background:var(--card);color:var(--fg);border-color:var(--ink)}.lk.lkn .prod.large .ptag.hot{background:var(--ink);color:var(--bg)}
.lk.lkn .card .btn.sm{background:var(--card);color:var(--fg)}
.lk.lkn .hero,.lk.lkn main>section{border-bottom:0}
.lk.lkn .steps li{border:${B}px solid var(--ink);border-radius:${R}px;box-shadow:${sh(O)};padding:22px 22px 24px}
.lk.lkn .steps b{color:var(--at)}
.lk.lkn .tq{border:${B}px solid var(--ink);border-radius:${R}px;box-shadow:${sh(O)};background:var(--card);padding:clamp(22px,3vw,40px)}
.lk.lkn .band{border-radius:${R}px;background:var(--a2);color:var(--a2t);border:${B}px solid var(--ink);box-shadow:${sh(O + 2)}}
.lk.lkn .band h2{${fontCss(F.title, "clamp(30px,5vw,64px)")};color:inherit}
.lk.lkn .band p{color:inherit;opacity:.9}
.lk.lkn .band .btn{background:var(--a);color:var(--on);border-color:var(--ink)}
.lk.lkn .band .btn.ghost{background:var(--card);color:var(--fg)}
.lk.lkn .band .btn:hover{background:var(--a);color:var(--on);border-color:var(--ink)}
.lk.lkn .search{border:${B}px solid var(--ink);border-radius:${P}px;background:var(--card);box-shadow:${sh(3)}}
.lk.lkn .cat{border:1.5px solid var(--ink);border-radius:999px;background:var(--card);color:var(--fg)}.lk.lkn .cat.on{background:var(--ink);color:var(--bg)}
.lk.lkn .tick{border-top:${B}px solid var(--ink);border-bottom:${B}px solid var(--ink);background:var(--ink);color:var(--bg)}
.lk.lkn footer{border-top:${B}px solid var(--ink)}
.lk.lkn .stats{border:${B}px solid var(--ink);border-radius:${R}px;overflow:hidden;box-shadow:${sh(O)};background:var(--card)}
.lk.lkn .stat{border-color:var(--ink)}.lk.lkn .stat:first-child{background:var(--s1);color:var(--s1t)}.lk.lkn .stat:nth-child(2){background:var(--s2);color:var(--s2t)}.lk.lkn .stat:nth-child(3){background:var(--s3);color:var(--s3t)}
.lk.lkn .ring{color:var(--fg)}`;
}

/** CSS elemen neo yang bisa dipakai gaya mana pun: kartu berwarna, petak ikon, tab map, kertas, kapsul menu, miring. */
function neoElementsCss(L: SiteLook): string {
  const B = L.shape.border;
  const R = L.shape.radius;
  const n = 5;
  const cards = (sel: string) => [".grid>.card", ".bento>.card", ".items>.card", ".frows>.card", ".steps>li"].map((x) => `${sel} ${x}`);
  const out: string[] = [];
  const el = new Set(L.elements);
  if (el.has("tones")) {
    for (let i = 1; i <= n; i++) {
      const sel = cards(".lk-tone").map((x) => `${x}:nth-child(${n}n+${i})`).join(",");
      out.push(`${sel}{--card:var(--s${i});--fg:var(--s${i}t);--muted:var(--s${i}t);--at:var(--s${i}t);color:var(--s${i}t)}`);
    }
    out.push(`.lk-tone .card p,.lk-tone .card small{opacity:.9}.lk-tone .card .ico,.lk-tone .card .pico{background:var(--bg);color:var(--ink)}`);
  }
  if (el.has("tiles")) {
    for (let i = 1; i <= n; i++) {
      const sel = [".lk-tiles:not(.lk-tone) .grid>.card", ".lk-tiles:not(.lk-tone) .bento>.card", ".lk-tiles:not(.lk-tone) .items>.card", ".lk-tiles:not(.lk-tone) .frows>.card", ".lk-tiles .vrow", ".lk-tiles .ci"]
        .map((x) => `${x}:nth-child(${n}n+${i}) :is(.ico,.pico,i)`)
        .join(",");
      out.push(`${sel}{background:var(--s${i});color:var(--s${i}t)}`);
    }
    out.push(`.lk-tiles .ico,.lk-tiles .pico{box-shadow:3px 3px 0 var(--ink)}`);
  }
  if (el.has("tabs")) {
    const sel = [".lk-tabs .grid>.card", ".lk-tabs .bento>.card", ".lk-tabs .frows>.card"];
    out.push(`${sel.join(",")}{position:relative;margin-top:18px}`);
    out.push(
      `${sel.map((x) => `${x}::after`).join(",")}{content:"";position:absolute;left:18px;bottom:calc(100% + ${B}px);width:min(44%,150px);height:16px;background:var(--tab,var(--s1));border:${B}px solid var(--ink);border-bottom:0;border-radius:${Math.min(R, 12)}px ${Math.min(R, 12)}px 0 0}`,
    );
    for (let i = 1; i <= n; i++) out.push(`${sel.map((x) => `${x}:nth-child(${n}n+${i})`).join(",")}{--tab:var(--s${(i % n) + 1})}`);
  }
  if (el.has("paper"))
    out.push(`body.lk-paper{background-image:linear-gradient(var(--grid) 1px,transparent 1px),linear-gradient(90deg,var(--grid) 1px,transparent 1px);background-size:28px 28px;background-position:-1px -1px}`);
  if (el.has("dotgrid")) out.push(`.lk-dots .hero{background-image:radial-gradient(var(--grid) 1.6px,transparent 1.8px);background-size:22px 22px}`);
  if (el.has("pillnav"))
    out.push(
      `.lk-pill .links{border:${B}px solid var(--ink);border-radius:999px;padding:5px;gap:2px;background:var(--card);box-shadow:3px 3px 0 var(--ink)}.lk-pill .links a{padding:7px 14px;border-radius:999px;color:var(--fg)}.lk-pill .links a:hover{background:var(--s2);color:var(--s2t)}`,
    );
  if (el.has("tilt"))
    out.push(
      `.lk-tilt .grid>.card:nth-child(odd),.lk-tilt .steps>li:nth-child(odd){transform:rotate(-1.2deg)}.lk-tilt .grid>.card:nth-child(even),.lk-tilt .steps>li:nth-child(even){transform:rotate(1deg)}.lk-tilt .grid>.card:hover{transform:rotate(0) translate(-3px,-3px)}`,
    );
  return out.join("\n");
}

/** CSS hero "neo" (dua kolom + visual) dan "collage" (tengah + kartu miring), stiker, bentuk, bar pengumuman. */
function neoHeroCss(t: Theme): string {
  const lab = `font:700 12px/1.3 ${t.mono};text-transform:uppercase;letter-spacing:.05em`;
  const shadow = "var(--off) var(--off) 0 var(--ink)";
  return `.h-neo,.h-collage{padding:clamp(36px,6vw,84px) 0 clamp(44px,6vw,92px)}
.nh{display:grid;grid-template-columns:1.08fr .92fr;gap:clamp(30px,4.6vw,70px);align-items:center;text-align:left}
.nh-t{min-width:0}
.hero .nh-h{font-size:clamp(40px,6.2vw,90px);line-height:1.04;margin:18px 0 18px;max-width:none}
.hero.h-neo p.sub{margin:0 0 26px;max-width:46ch}
.h-neo .row{justify-content:flex-start}
.hlw{color:var(--hl);-webkit-text-fill-color:currentColor;font-style:normal}
.mk{font-style:normal;background:var(--s2);color:var(--s2t);-webkit-text-fill-color:currentColor;padding:0 .14em;margin:0 -.04em;border-radius:.16em;-webkit-box-decoration-break:clone;box-decoration-break:clone}
.nchk{list-style:none;display:flex;flex-wrap:wrap;gap:10px 22px;margin:24px 0 0;padding:0;${lab}}
.nchk li{display:flex;align-items:center;gap:7px}.nchk svg{width:16px;height:16px;flex:none;color:var(--at)}
.nh-v{position:relative;min-width:0}
.nv-art,.nv-img{position:relative;aspect-ratio:7/6;border:var(--bw) solid var(--ink);border-radius:var(--r);background:var(--card);box-shadow:${shadow};overflow:hidden}
.nv-art>svg{display:block;width:100%;height:100%}
.nv-img img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.nv-lbl{position:absolute;margin:0;right:-8px;top:22px;display:flex;align-items:center;gap:12px;max-width:min(78%,300px);padding:12px 14px;background:var(--ink);color:var(--bg);${lab};font-size:12.5px;line-height:1.35;box-shadow:4px 4px 0 var(--s2)}
.nv-lbl i{flex:none;display:grid;place-items:center;width:34px;height:34px;background:var(--s2);color:var(--s2t)}.nv-lbl i svg{width:18px;height:18px}
.nst{position:absolute;z-index:3;pointer-events:none;line-height:0}
.nst svg{display:block;width:100%;height:auto;overflow:visible}
.nst-l{line-height:1;padding:8px 15px;border:var(--bw) solid var(--ink);border-radius:999px;background:var(--s3);color:var(--s3t);${lab};font-size:13px;transform:rotate(var(--rt,-6deg));box-shadow:3px 3px 0 var(--ink);white-space:nowrap}
.nst-b{width:clamp(82px,9vw,116px)}
.nst-b text{font-family:${t.display};font-weight:900;text-transform:uppercase}
.nst-s{width:clamp(54px,6vw,78px)}
.nst-k{width:clamp(30px,3.4vw,44px)}
.nh-v .nst-b{left:-14px;top:-20px}.nh-v .nst-s{right:-12px;bottom:-18px}.nh-v .nst-l{left:7%;bottom:-16px}.nh-v .nst-k{right:24%;top:-18px}
.nc{text-align:center;position:relative}
.nc .badge{margin-left:auto;margin-right:auto}
.hero .nc-h{font-size:clamp(40px,6.6vw,98px);line-height:1.04;margin:18px auto 18px;max-width:17ch}
.hero.h-collage p.sub{margin:0 auto 26px;max-width:54ch}
.h-collage .row{justify-content:center}
.nc>.nst-l{position:relative;display:inline-block;margin:0 auto 14px}
.nc .nchk{justify-content:center}
.nc-row{position:relative;display:flex;justify-content:center;align-items:center;margin:clamp(40px,5.4vw,66px) auto 0;max-width:1000px}
.ncc{position:relative;flex:0 1 232px;min-width:0;margin:0 -8px;padding:18px;border:var(--bw) solid var(--ink);border-radius:var(--r);background:var(--card);box-shadow:${shadow};transform:rotate(var(--rt,0deg));text-align:left;display:flex;flex-direction:column;gap:12px;min-height:178px}
.ncc:nth-of-type(4n+1){background:var(--s1);color:var(--s1t)}.ncc:nth-of-type(4n+2){background:var(--s2);color:var(--s2t)}.ncc:nth-of-type(4n+3){background:var(--s3);color:var(--s3t)}.ncc:nth-of-type(4n+4){background:var(--s4);color:var(--s4t)}
.ncc i{width:46px;height:46px;display:grid;place-items:center;border:var(--bw) solid var(--ink);border-radius:12px;background:var(--bg);color:var(--ink)}
.ncc i svg{width:22px;height:22px}
.ncc b{font:${t.subWeight ?? t.headWeight} 19px/1.15 ${t.sub ?? t.display};overflow-wrap:anywhere}
.ncc em{margin-top:auto;font-style:normal;${lab};font-size:14px}
.ncc small{margin-top:auto;font-size:13.5px;line-height:1.45;opacity:.92}
.ncc-img{padding:0;overflow:hidden;flex-basis:270px;min-height:250px;z-index:1}.ncc-img img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.nsb{position:absolute;margin:0;z-index:4;left:6%;top:-26px;max-width:240px;padding:10px 14px;border:var(--bw) solid var(--ink);border-radius:14px;background:var(--card);color:var(--fg);${lab};font-size:12px;line-height:1.35;text-align:left;transform:rotate(-4deg);box-shadow:3px 3px 0 var(--ink)}
.nsb:after{content:"";position:absolute;left:22px;bottom:-12px;width:18px;height:18px;background:var(--card);border-right:var(--bw) solid var(--ink);border-bottom:var(--bw) solid var(--ink);transform:rotate(45deg)}
.nc-row .nst-s{right:3%;top:-30px}.nc-row .nst-k{left:-2%;bottom:-18px}.nc-row .nst-b{right:-10px;bottom:-26px}.nc-row .nst-l{left:38%;bottom:-20px}
.nshp{position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:0}
.nshp svg{position:absolute;height:auto}.nshp .sa{top:0;right:0;width:clamp(120px,15vw,210px)}.nshp .sb{bottom:0;left:0;width:clamp(80px,9vw,140px)}
.ntop{background:var(--a);color:var(--on);border-bottom:var(--bw) solid var(--ink);${lab};font-size:12px}
.ntop .wrap{display:flex;justify-content:space-between;gap:16px;padding-top:9px;padding-bottom:9px}
.ntop span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
@media(max-width:620px){.ntop span+span{display:none}.ntop .wrap{justify-content:center}}
.nstat{margin-top:clamp(36px,5vw,60px)}
@media(max-width:900px){.nh{grid-template-columns:1fr}.nh-v{max-width:560px}.nv-lbl{right:-4px}}
@media(max-width:700px){.nc-row{flex-wrap:wrap;gap:16px}.ncc{flex:1 1 calc(50% - 16px);margin:0;min-height:150px}.ncc-img{flex-basis:100%;min-height:220px}.nsb{top:-30px;left:4%}.nc-row .nst-b{right:-6px}.nshp .sa{width:96px;opacity:.75}.nshp .sb{display:none}}`;
}

/** Komposisi geometris hero neo (tanpa teks): tiga varian, warna dari --s1..--s4, garis tinta. */
function neoArt(seed: number): string {
  const v = seed % 3;
  const st = 'stroke="var(--ink)" stroke-width="4" stroke-linejoin="round"';
  const dots = (x0: number, y0: number, cols: number, rows: number) =>
    Array.from({ length: cols * rows }, (_, i) => `<circle cx="${x0 + (i % cols) * 18}" cy="${y0 + Math.floor(i / cols) * 18}" r="3.6" fill="var(--ink)"/>`).join("");
  const spark = (cx: number, cy: number, r: number, fill: string) =>
    `<path d="M${cx} ${cy - r}C${cx + r * 0.16} ${cy - r * 0.16} ${cx + r * 0.16} ${cy - r * 0.16} ${cx + r} ${cy}C${cx + r * 0.16} ${cy + r * 0.16} ${cx + r * 0.16} ${cy + r * 0.16} ${cx} ${cy + r}C${cx - r * 0.16} ${cy + r * 0.16} ${cx - r * 0.16} ${cy + r * 0.16} ${cx - r} ${cy}C${cx - r * 0.16} ${cy - r * 0.16} ${cx - r * 0.16} ${cy - r * 0.16} ${cx} ${cy - r}Z" fill="${fill}" ${st}/>`;
  let inner: string;
  if (v === 0) {
    inner = `<rect x="178" y="58" width="196" height="276" fill="var(--s2)" ${st}/><path d="M44 334V170a92 92 0 0 1 184 0v164Z" fill="var(--s1)" ${st}/><path d="M226 334V292h48v-46h48v-46h52v134Z" fill="var(--s3)" ${st}/>${dots(250, 92, 6, 4)}${spark(92, 74, 26, "var(--s4)")}`;
  } else if (v === 1) {
    inner = `<circle cx="156" cy="176" r="112" fill="var(--s1)" ${st}/><rect x="214" y="104" width="150" height="150" rx="10" transform="rotate(12 289 179)" fill="var(--s2)" ${st}/><path d="M64 334 168 196l104 138Z" fill="var(--s3)" ${st}/>${dots(292, 286, 5, 3)}${spark(356, 62, 28, "var(--s4)")}`;
  } else {
    inner = `<rect x="38" y="44" width="344" height="262" rx="20" fill="var(--card)" ${st}/><path d="M38 96H382" ${st}/><circle cx="70" cy="70" r="9" fill="var(--s1)" ${st}/><circle cx="98" cy="70" r="9" fill="var(--s2)" ${st}/><circle cx="126" cy="70" r="9" fill="var(--s3)" ${st}/><rect x="64" y="120" width="178" height="156" rx="12" fill="var(--s2)" ${st}/><circle cx="198" cy="160" r="16" fill="var(--s4)" ${st}/><path d="M64 262l52-66 38 44 26-28 62 62" fill="var(--s1)" ${st}/><rect x="262" y="120" width="96" height="44" rx="10" fill="var(--s1)" ${st}/><rect x="262" y="178" width="96" height="44" rx="10" fill="var(--s3)" ${st}/><rect x="262" y="236" width="62" height="40" rx="10" fill="var(--ink)" ${st}/><path d="M318 262l46 16-20 8 14 22-12 7-14-22-14 14Z" fill="var(--card)" ${st}/>`;
  }
  return `<svg viewBox="0 0 420 360" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">${inner}</svg>`;
}

/** Bentuk geometris rata (tanpa garis) di sudut hero: setengah lingkaran, cincin, bintang, bunga. */
function neoShapes(seed: number): string {
  const flip = seed % 2 === 1;
  const a = `<svg class="sa" viewBox="0 0 220 220" aria-hidden="true" focusable="false"><path d="M220 0V150A150 150 0 0 1 70 0Z" fill="var(--s${flip ? 2 : 1})"/><circle cx="58" cy="168" r="30" fill="none" stroke="var(--s${flip ? 3 : 2})" stroke-width="15"/><path d="M162 168c3 13 8 18 21 21-13 3-18 8-21 21-3-13-8-18-21-21 13-3 18-8 21-21Z" fill="var(--s3)"/><circle cx="34" cy="58" r="10" fill="var(--s4)"/></svg>`;
  const petals = Array.from({ length: 10 }, (_, i) => {
    const ang = (i / 10) * Math.PI * 2;
    return `<circle cx="${(70 + Math.cos(ang) * 30).toFixed(1)}" cy="${(150 + Math.sin(ang) * 30).toFixed(1)}" r="17" fill="var(--s4)"/>`;
  }).join("");
  const b = `<svg class="sb" viewBox="0 0 220 220" aria-hidden="true" focusable="false"><path d="M0 220V96A124 124 0 0 1 124 220Z" fill="var(--s${flip ? 1 : 3})" opacity=".9"/>${petals}<circle cx="70" cy="150" r="30" fill="var(--s4)"/><circle cx="170" cy="196" r="12" fill="var(--s2)"/></svg>`;
  return `<div class="nshp" aria-hidden="true">${a}${b}</div>`;
}

/** Stiker ledakan bintang (16 sudut) dengan teks pendek (dan baris kecil opsional di atasnya). */
function burstSticker(text: string, small = ""): string {
  const pts = (cx: number, cy: number) =>
    Array.from({ length: 32 }, (_, i) => {
      const r = i % 2 ? 44 : 58;
      const ang = (i / 32) * Math.PI * 2 - Math.PI / 2;
      return `${(cx + Math.cos(ang) * r).toFixed(1)},${(cy + Math.sin(ang) * r).toFixed(1)}`;
    }).join(" ");
  const len = Math.max(3, Array.from(text).length);
  const fs = Math.max(12, Math.min(26, Math.floor(150 / len)));
  const y = small ? 61 + fs * 0.62 : 61 + fs * 0.36;
  const top = small ? `<text x="61" y="${(y - fs * 0.98).toFixed(1)}" text-anchor="middle" font-size="12" letter-spacing="1" fill="var(--s3t)">${esc(small)}</text>` : "";
  return `<span class="nst nst-b" aria-hidden="true"><svg viewBox="0 0 128 128"><polygon points="${pts(65, 65)}" fill="var(--ink)"/><polygon points="${pts(61, 61)}" fill="var(--s3)" stroke="var(--ink)" stroke-width="3" stroke-linejoin="round"/>${top}<text x="61" y="${y.toFixed(1)}" text-anchor="middle" font-size="${fs}" fill="var(--s3t)">${esc(text)}</text></svg></span>`;
}

/** Stiker wajah senyum. */
const SMILEY_STICKER = `<span class="nst nst-s" aria-hidden="true"><svg viewBox="0 0 100 100"><circle cx="54" cy="54" r="43" fill="var(--ink)"/><circle cx="49" cy="49" r="43" fill="var(--s4)" stroke="var(--ink)" stroke-width="4"/><ellipse cx="35" cy="41" rx="5" ry="8" fill="var(--ink)"/><ellipse cx="63" cy="41" rx="5" ry="8" fill="var(--ink)"/><path d="M28 58c8 15 34 15 42 0" fill="none" stroke="var(--ink)" stroke-width="5" stroke-linecap="round"/></svg></span>`;
/** Stiker kilau empat sudut. */
const SPARK_STICKER = `<span class="nst nst-k" aria-hidden="true"><svg viewBox="0 0 100 100"><path d="M50 4C54 38 62 46 96 50 62 54 54 62 50 96 46 62 38 54 4 50 38 46 46 38 50 4Z" fill="var(--s2)" stroke="var(--ink)" stroke-width="5" stroke-linejoin="round"/></svg></span>`;

export interface RenderOpts {
  hero?: HeroLayout;
  feat?: FeatLayout;
  /** false = matikan katalog/keranjang/CRUD walau jenisnya UMKM. */
  shop?: boolean;
  /** Palet kustom: [utama, kedua, ...tambahan]. Kosong = ikuti template. */
  palette?: string[];
  /** Warna latar kustom (mode "Atur manual"). Kosong = ikuti warna latar bawaan template. */
  bg?: string;
  /** Gaya desain/gerakan visual kustom (mode "Atur manual"). Kosong = ikuti bentuk bawaan template. */
  style?: DesignStyleId;
  /** Hiasan hero kustom (mode "Atur manual"). Kosong = ikuti hiasan bawaan Gaya desain/Template. */
  decor?: DecorId;
  /**
   * Huruf per peran (mode "Atur manual"): tiap peran (Judul/Sub-judul/Isi) bebas pilih jenis huruf (family)
   * DAN ketebalan (weight) sendiri-sendiri — meniru sumbu variable-font. Kosong per bagian = ikut bawaan
   * Gaya desain/Template; Sub-judul yang kosong juga ikut Judul lebih dulu (lihat buildSite).
   */
  fonts?: {
    title?: { family?: FontRoleId; weight?: FontWeightId };
    sub?: { family?: FontRoleId; weight?: FontWeightId };
    body?: { family?: FontRoleId; weight?: FontWeightId };
  };
  /** false = abaikan gaya hasil latihan (content.look), mis. karena pengguna memilih Template/warna sendiri. */
  look?: boolean;
  /** Gaya ikon pilihan pengguna (mode "Atur manual"). Kosong = pilihan mesin, atau ciri khas Template. */
  iconStyle?: IconStyle;
  /** false = sembunyikan ornamen paket elemen (content.ornaments). */
  ornaments?: boolean;
  /** Gambar unggahan (data URL). */
  images?: SiteImages;
  /**
   * Mode editor (pratinjau di builder): teks diberi data-f="bidang", bagian data-sec, gambar data-img supaya kanvas
   * bisa diklik untuk mengubah. Jangan dipakai untuk publish/ekspor.
   */
  editable?: boolean;
  /** "inline" (default) = data URL tertanam di HTML; "files" = berkas terpisah di assets/img (untuk ZIP). */
  imageMode?: "inline" | "files";
}

export interface SiteAsset {
  path: string;
  data: Uint8Array;
}

export interface SiteBundle {
  /** Satu file index.html mandiri (CSS + JS tertanam). Dipakai untuk pratinjau & publish. */
  single: string;
  /** Versi terpisah untuk ekspor ZIP: index.html memuat assets/style.css dan assets/app.js. */
  index: string;
  css: string;
  js: string;
  hasJs: boolean;
  /** Berkas gambar (hanya terisi bila imageMode = "files"). */
  assets: SiteAsset[];
}

const SHOP_ICONS = [
  "package", "utensils", "coffee", "cake", "cookie", "soup", "pizza", "beef", "fish", "salad", "ice-cream-cone", "cup-soda",
  "croissant", "candy", "apple", "milk", "shirt", "gift", "tag", "shopping-bag", "leaf", "flower-2", "sprout", "scissors",
  "palette", "wrench", "star", "heart", "sparkles",
];
const RUNTIME_UI_ICONS = ["plus", "minus", "pencil", "trash-2", "x", "check", "download", "upload", "save", "rotate-ccw"];

const fmtRp = (n: number): string => "Rp " + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

function buildCss(t: Theme, a: string, hero: HeroLayout, shop: boolean, hover: HoverEffect, extra: string[], article: boolean, look?: SiteLook, poster = false, swatches: string[] = []): string {
  const A = rgb(a);
  const ink = look?.ink ?? (t.brutal ? "#0a0a0a" : t.fg);
  const sw = swatches.length ? swatches : siteSwatches(t, a, look, []);
  const swVars = sw.map((x, i) => `--s${i + 1}:${x};--s${i + 1}t:${textOn(x, ink)}`).join(";");
  const neoHero = hero === "neo" || hero === "collage" || !!look?.elements.some((e) => NEO_HERO_ELS.has(e));
  const aText = readable(a, t.dark, t.bg);
  const bd = t.brutal ? "3px solid #0a0a0a" : `${t.borderW ?? 1}px solid ${t.line}`;
  const grad = t.gradientHead
    ? `background:linear-gradient(120deg,var(--fg) 25%,var(--a) 135%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;`
    : "";
  const heroLeft = hero !== "center";
  // Blok ajakan gaya brutal: latar hitam, teks & garis tombol memakai warna latar halaman (bukan warna tetap),
  // atau putih bila latar halaman kurang kontras di atas hitam.
  const bandInk = contrastRatio(t.bg, "#0a0a0a") >= 4.5 ? t.bg : "#ffffff";

  return `:root{--bg:${t.bg};--fg:${t.fg};--muted:${t.muted};--card:${t.card};--line:${t.line};--a:${a};--at:${aText};--a-soft:rgba(${A},${t.dark ? ".16" : ".11"});--on:${onColor(a)};--r:${t.radius};--sh:${t.shadow};--pill:${t.pill};--a2:${t.acc2 ?? a};--ib:${t.ib ?? "var(--a-soft)"};--ink:${look?.ink ?? (t.brutal ? "#0a0a0a" : t.fg)};--hl:${look ? ([look.accent2, look.accent].find((x) => lookContrast(x, look.bg) >= 3) ?? look.fg) : a};--bw:${look ? look.shape.border : t.brutal ? 3 : Math.max(2, t.borderW ?? 1)}px;${swVars};--a2t:${textOn(t.acc2 ?? a, ink)};--off:${look?.shape.offset ?? 5}px;--grid:${mixHex(t.bg, ink, t.dark ? 0.2 : 0.1)}}
*{box-sizing:border-box}html{scroll-behavior:smooth;scroll-padding-top:96px}
body{margin:0;background:var(--bg);color:var(--fg);font:${t.bodyWeight ?? 400} 16px/1.65 ${t.body};-webkit-font-smoothing:antialiased;overflow-x:hidden}
.wrap{max-width:${t.maxWidth ?? 1120}px;margin:0 auto;padding:0 24px;position:relative}
h1{font-family:${t.display};margin:0}
h2,h3{font-family:${t.sub ?? t.display};margin:0}
a{color:inherit}
svg{display:block;flex:none}
.ic{display:inline-grid;place-items:center;flex:none}
.nav{position:sticky;top:0;z-index:20;background:rgb(${t.navBg});border-bottom:${bd}}
.nav .wrap{display:flex;align-items:center;gap:22px;height:68px}
.brand{display:flex;align-items:center;gap:10px;font:${t.headWeight} 18px ${t.display};letter-spacing:-.01em;text-decoration:none;${t.upper ? "text-transform:uppercase;" : ""}margin-right:auto;min-width:0}
.brand span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.brand i{display:grid;place-items:center;flex:none;width:34px;height:34px;border-radius:${t.brutal ? "4px" : "calc(var(--r) * .6)"};background:var(--a);color:var(--on);font:800 15px ${SANS};font-style:normal;${t.brutal ? "border:2px solid #0a0a0a;" : ""}}
.links{display:flex;gap:24px;flex-wrap:nowrap;white-space:nowrap;min-width:0;font-size:14.5px;font-weight:500;color:var(--muted)}
.links a{text-decoration:none;transition:color .2s;min-width:0;overflow:hidden;text-overflow:ellipsis}.links a:hover{color:var(--fg)}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;text-align:center;max-width:100%;background:var(--a);color:var(--on);padding:12px 22px;border-radius:var(--pill);font:600 15px ${SANS};text-decoration:none;border:${t.brutal ? "3px solid #0a0a0a" : "1px solid transparent"};box-shadow:${t.brutal ? "4px 4px 0 #0a0a0a" : "none"};transition:background .15s,border-color .15s,opacity .15s;cursor:pointer}
.btn:hover{${t.brutal ? "transform:translate(-1px,-1px);box-shadow:5px 5px 0 #0a0a0a;" : "opacity:.9;"}}
.btn:disabled{opacity:.45;cursor:not-allowed;transform:none;filter:none}
.btn.ghost{background:${t.dark ? "rgba(255,255,255,.06)" : t.brutal ? "#fff" : "transparent"};color:var(--fg);border:${t.brutal ? "3px solid #0a0a0a" : `1px solid ${t.dark ? "rgba(255,255,255,.18)" : "var(--line)"}`};box-shadow:${t.brutal ? "4px 4px 0 #0a0a0a" : "none"}}
.btn.danger{background:#dc2626;color:#fff;box-shadow:none}
.btn.sm{padding:8px 14px;font-size:13px;gap:6px}
.nav .wrap>.btn{padding:10px 20px;font-size:14px;white-space:nowrap;flex:none}
.cartbtn{position:relative;padding:10px 14px!important}
.cartbtn b{position:absolute;top:-6px;right:-6px;min-width:20px;height:20px;border-radius:99px;background:var(--a);color:var(--on);font:700 11px/20px ${SANS};text-align:center;padding:0 5px;border:2px solid var(--bg)}
.hero{position:relative;padding:clamp(56px,9vw,120px) 0 clamp(56px,8vw,104px);border-bottom:${bd};${heroLeft ? "" : "text-align:center"}}
.glow{position:absolute;inset:0;overflow:hidden;pointer-events:none;-webkit-mask-image:linear-gradient(to bottom,#000 55%,transparent);mask-image:linear-gradient(to bottom,#000 55%,transparent)}
.orb{display:none}
${t.deco === "orbs" || t.deco === "grid" ? `.orb{border-radius:50%;filter:blur(70px);opacity:${t.dark ? ".5" : ".55"}}` : ""}
${t.deco === "grid" ? `.glow:after{content:"";position:absolute;inset:0;background-image:linear-gradient(var(--line) 1px,transparent 1px),linear-gradient(90deg,var(--line) 1px,transparent 1px);background-size:44px 44px;-webkit-mask-image:radial-gradient(ellipse at 50% 30%,#000 20%,transparent 70%);mask-image:radial-gradient(ellipse at 50% 30%,#000 20%,transparent 70%)}` : ""}
.orn{position:absolute;inset:0;overflow:hidden;pointer-events:none}
.orn .d{position:absolute}
.orn-dots .d{border-radius:50%;background:var(--a)}
.orn-dots .d:nth-child(1){width:10px;height:10px;top:18%;left:8%;opacity:.45}
.orn-dots .d:nth-child(2){width:16px;height:16px;top:64%;left:14%;background:var(--a2);opacity:.35}
.orn-dots .d:nth-child(3){width:7px;height:7px;top:30%;left:92%;background:var(--a2);opacity:.5}
.orn-dots .d:nth-child(4){width:12px;height:12px;top:78%;left:88%;opacity:.4}
.orn-dots .d:nth-child(5){width:9px;height:9px;top:8%;left:48%;opacity:.3}
.orn-dots .d:nth-child(6){width:14px;height:14px;top:88%;left:46%;background:var(--a2);opacity:.3}
.orn-plus .d{width:18px;height:18px}
.orn-plus .d:before,.orn-plus .d:after{content:"";position:absolute;background:var(--a);border-radius:2px}
.orn-plus .d:before{width:100%;height:3px;top:50%;left:0;transform:translateY(-50%)}
.orn-plus .d:after{width:3px;height:100%;left:50%;top:0;transform:translateX(-50%)}
.orn-plus .d:nth-child(1){top:20%;left:10%;opacity:.4}
.orn-plus .d:nth-child(2){top:70%;left:16%;opacity:.3;transform:scale(.8)}
.orn-plus .d:nth-child(3){top:14%;left:90%;opacity:.35;transform:scale(1.25)}
.orn-plus .d:nth-child(4){top:82%;left:86%;opacity:.3}
.orn-plus .d:nth-child(5){top:46%;left:50%;opacity:.25;transform:scale(.7)}
.orn-rings .d{border-radius:50%;border:2px solid var(--a);background:none}
.orn-rings .d:nth-child(1){width:90px;height:90px;top:4%;left:2%;opacity:.3}
.orn-rings .d:nth-child(2){width:130px;height:130px;top:52%;left:84%;border-color:var(--a2);opacity:.22}
.orn-rings .d:nth-child(3){width:50px;height:50px;top:76%;left:10%;opacity:.3}
.orn-triangles .d{width:0;height:0;border-left:10px solid transparent;border-right:10px solid transparent;border-bottom:16px solid var(--a);opacity:.35}
.orn-triangles .d:nth-child(1){top:16%;left:9%;transform:rotate(12deg)}
.orn-triangles .d:nth-child(2){top:68%;left:15%;transform:rotate(-20deg);border-bottom-color:var(--a2)}
.orn-triangles .d:nth-child(3){top:22%;left:90%;transform:rotate(160deg)}
.orn-triangles .d:nth-child(4){top:80%;left:86%;transform:rotate(-100deg);border-bottom-color:var(--a2)}
.orn-triangles .d:nth-child(5){top:8%;left:50%;transform:rotate(45deg)}
.orn-scribble svg{position:absolute;top:8%;left:5%;width:90%;height:60%;opacity:.3;overflow:visible}


.badge{display:inline-block;padding:5px 12px;border-radius:calc(var(--pill) * .6);color:var(--muted);font:600 12.5px ${t.mono};letter-spacing:.02em;border:${t.brutal ? "2px solid #0a0a0a" : `1px solid ${t.dark ? "rgba(255,255,255,.18)" : "var(--line)"}`};margin-bottom:22px}

.hero h1{font-size:clamp(${Math.round(32 * (t.heroScale ?? 1))}px,${(hero === "split" ? 5.4 : 7) * (t.heroScale ?? 1)}vw,${Math.round((hero === "split" ? 60 : 72) * (t.heroScale ?? 1))}px);line-height:1.06;letter-spacing:${t.tracking ?? (t.display === SERIF ? "-.02em" : "-.035em")};font-weight:${t.headWeight};max-width:${heroLeft ? "780px" : "900px"};margin:0 ${heroLeft ? "0" : "auto"} 22px;${t.upper ? "text-transform:uppercase;" : ""}${grad}padding-bottom:.06em;overflow-wrap:break-word}
.hero p.sub{font-size:clamp(16px,2.2vw,20px);color:var(--muted);max-width:640px;margin:0 ${heroLeft ? "0" : "auto"} 32px}
.row{display:flex;flex-wrap:wrap;gap:12px;${heroLeft ? "" : "justify-content:center"}}
.chips{display:none}
.chip{display:inline-flex;align-items:center;gap:8px;padding:9px 16px;border-radius:var(--pill);background:var(--card);border:${bd};font:600 14px ${SANS};box-shadow:${t.brutal ? "3px 3px 0 #0a0a0a" : "var(--sh)"};${t.dark ? "backdrop-filter:blur(8px);" : ""}}
.chip svg{color:var(--at)}
.hsplit{display:grid;gap:48px;grid-template-columns:1.1fr .9fr;align-items:center}
.visual{display:block;background:var(--card);border:${bd};border-radius:var(--r);box-shadow:var(--sh);overflow:hidden}
.vrow{display:flex;align-items:center;gap:14px;padding:16px 18px;border-bottom:1px solid ${t.dark ? "rgba(255,255,255,.08)" : t.line}}.vrow:last-child{border-bottom:0}

.vrow i{display:grid;place-items:center;flex:none;width:40px;height:40px;color:var(--at)}
.vrow>div{min-width:0}
.vrow b{display:block;overflow-wrap:break-word;font:700 15.5px ${SANS};line-height:1.3}
.vrow small{display:block;color:var(--muted);font-size:13px;line-height:1.4}
.vrow em{flex:none;margin-left:auto;font:700 13px ${t.mono};font-style:normal;color:var(--at);white-space:nowrap}

section{padding:${t.sectionGap ?? "clamp(56px,8vw,112px)"} 0}
.eyebrow{display:none}
h2{font-size:clamp(${Math.round(28 * (t.heroScale ?? 1))}px,${4.4 * (t.heroScale ?? 1)}vw,${Math.round(42 * (t.heroScale ?? 1))}px);line-height:1.12;letter-spacing:${t.tracking ?? "-.025em"};font-weight:${t.subWeight ?? t.headWeight};margin-bottom:32px;${t.upper ? "text-transform:uppercase;" : ""}}
.grid{display:grid;gap:${t.gridGap ?? "18px"};grid-template-columns:repeat(auto-fit,minmax(260px,1fr))}
.card{background:var(--card);border:${bd};border-radius:var(--r);padding:${t.cardPad ?? "26px"};box-shadow:var(--sh);transition:border-color .15s;min-width:0;overflow-wrap:break-word}
.feat:hover,.prod:hover{border-color:${t.brutal ? "#0a0a0a" : "var(--a)"}}
.ico{display:flex;align-items:center;justify-content:${t.brutal ? "center" : "flex-start"};width:auto;height:auto;color:var(--at);margin-bottom:14px;${t.brutal ? "width:46px;height:46px;border:2px solid #0a0a0a;background:var(--a);color:var(--on);" : ""}}
.card h3{font-size:19px;font-weight:${t.subWeight ?? (t.headWeight === 900 ? 900 : 700)};letter-spacing:-.01em;margin-bottom:8px}
.card p{margin:0;color:var(--muted);font-size:15.5px}
.bento{display:grid;gap:${t.gridGap ?? "18px"};grid-template-columns:repeat(6,1fr)}
.bento .feat{grid-column:span 2}
.bento.b4 .feat{grid-column:span 3}.bento.b5 .feat:nth-child(-n+2){grid-column:span 3}.bento.b2 .feat{grid-column:span 3}
.bento .feat:first-child{background:var(--a);color:var(--on);border-color:${t.brutal ? "#0a0a0a" : "transparent"}}
.bento .feat:first-child p{color:inherit;opacity:.86}
.bento .feat:first-child .ico{background:${t.brutal ? "none" : "rgba(255,255,255,.18)"};color:inherit;${t.brutal ? "border-color:var(--on);" : ""}}
.flist{display:grid;gap:44px;grid-template-columns:.8fr 1.2fr;align-items:start}
.flist .head{position:sticky;top:104px}.flist .head h2{margin-bottom:14px}.flist .head p{margin:0;color:var(--muted)}
.frows{display:grid;gap:14px}
.frow{display:grid;grid-template-columns:auto 1fr;gap:18px;align-items:center;padding:20px 22px}
.frow .ico{margin:0}.frow h3{margin-bottom:4px}
.steps{list-style:none;margin:0;padding:0;display:grid;gap:${t.gridGap ?? "18px"};grid-template-columns:repeat(auto-fit,minmax(240px,1fr))}
.steps li{padding:18px 0 0;background:none;border:0;border-top:${bd};border-radius:0;box-shadow:none}
.steps b{display:block;margin-bottom:10px;font:700 13px ${t.mono};letter-spacing:.08em;color:var(--at)}
.items{display:grid;gap:${t.gridGap ?? "18px"};grid-template-columns:repeat(auto-fill,minmax(250px,1fr))}
.prod{position:relative;display:flex;flex-direction:column;gap:14px;padding:22px}
.pico{display:flex;align-items:center;justify-content:${t.brutal ? "center" : "flex-start"};width:auto;height:auto;color:var(--at);${t.brutal ? "width:52px;height:52px;border:2px solid #0a0a0a;background:var(--a);color:var(--on);" : ""}}
.pico svg{width:24px;height:24px}
.pimg{margin:0}.pimg img{width:100%;height:170px;object-fit:cover;border-radius:calc(var(--r) * .6);display:block}
.pbody{flex:1}.pbody h3{font-size:18px;margin:6px 0 6px}.pbody p{font-size:14.5px}
.ptag{display:inline-block;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:600 11.5px ${t.mono};letter-spacing:.04em;color:var(--muted);border:1px solid ${t.dark ? "rgba(255,255,255,.16)" : t.line};padding:2px 8px;border-radius:calc(var(--pill) * .5)}
.pfoot{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px}
.pprice{font:800 17px ${SANS};color:var(--fg);white-space:nowrap}
.shop-tools{display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between;margin:-8px 0 24px}
.search{position:relative;flex:1 1 220px;max-width:340px}
.search svg{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--muted);width:18px;height:18px}
.search input{width:100%;padding:11px 16px 11px 42px;border-radius:var(--pill);border:${bd};background:var(--card);color:var(--fg);font:500 14.5px ${SANS};outline:none}
.search input:focus{border-color:var(--a)}
#wb-cats{display:flex;flex-wrap:wrap;gap:8px}
.cat{padding:8px 16px;border-radius:var(--pill);border:${bd};background:transparent;color:var(--muted);font:600 13.5px ${SANS};cursor:pointer}
.cat.on{background:var(--a);color:var(--on);border-color:${t.brutal ? "#0a0a0a" : "var(--a)"}}
.empty{color:var(--muted);text-align:center;margin:18px 0;grid-column:1/-1}
.split{display:grid;gap:36px;grid-template-columns:1.15fr .85fr;align-items:center}
.lead{font-size:clamp(16px,2vw,19px);color:var(--muted);margin:0;max-width:620px}
.info{display:grid;gap:18px}
.ci{display:flex;gap:14px;align-items:flex-start}
.ci i{display:grid;place-items:center;flex:none;width:30px;height:30px;color:var(--at)}
.ci svg{width:20px;height:20px}
.ci small{display:block;color:var(--muted);font-size:12.5px;font-weight:600;letter-spacing:.04em;text-transform:uppercase}
.ci span{font-weight:600;word-break:break-word}
.info.one{max-width:520px;margin:0 auto}
.band{position:relative;overflow:hidden;padding:clamp(32px,5vw,56px);border-radius:var(--r);background:${t.brutal ? "#0a0a0a" : "var(--a)"};color:${t.brutal ? bandInk : "var(--on)"};display:flex;flex-wrap:wrap;gap:20px 32px;align-items:center;justify-content:space-between;${t.brutal ? "box-shadow:8px 8px 0 var(--a);" : ""}}
.band .orn{--a:var(--on);--a2:var(--on);opacity:.5}
.band>*{position:relative;z-index:1}

.band h2{margin:0 0 6px;color:inherit;-webkit-text-fill-color:currentColor;font-size:clamp(24px,3.6vw,34px)}
.band p{margin:0;opacity:.88}
.band .row{justify-content:flex-start}
.band .btn{background:${t.brutal ? "var(--a)" : "#fff"};color:${t.brutal ? "var(--on)" : "#111"};box-shadow:${t.brutal ? `4px 4px 0 ${bandInk}` : "none"};${t.brutal ? `border-color:${bandInk};` : ""}}
.band .btn.ghost{background:transparent;color:inherit;border:2px solid ${t.brutal ? bandInk : "rgba(255,255,255,.65)"};box-shadow:none}
footer{padding:34px 0 44px;border-top:${bd};color:var(--muted);font-size:13.5px}
footer .wrap{display:flex;flex-wrap:wrap;gap:8px 20px;justify-content:space-between}
${extraCss(t, bd, hover, extra)}
.orn-div{background-repeat:repeat-x;background-position:center;border-bottom:${bd}}
.bd-art{flex:none;width:clamp(84px,11vw,150px);color:currentColor;position:relative;z-index:1}.bd-art svg{width:100%;height:auto;display:block}
.bd-el{position:absolute;right:clamp(14px,3vw,36px);top:clamp(14px,3vw,30px);width:clamp(44px,6vw,72px);height:auto;z-index:0}.bd-el svg{width:100%;height:auto;display:block}
.band>.row,.band>div:not(.orn){position:relative;z-index:1}
.bd-txt{display:flex;align-items:center;gap:clamp(14px,2vw,24px);min-width:0}
.bd-txt>div{min-width:0}.band h2{overflow-wrap:break-word}
@media(max-width:420px){.bd-txt{flex-direction:column;align-items:flex-start}}
${
  // Ornamen di blok ajakan berlatar aksen: aksen ⇄ warna teks-di-atas-aksen ditukar supaya stiker tetap kontras
  // (isian jadi warna teks, detail jadi warna aksen). Gambar memakai warna latar blok untuk bidang "potongan".
  !look && !t.brutal ? `.band .bd-badge,.band .bd-art{--a:${onColor(a)};--a2:${onColor(a)};--on:${a}}.band .bd-art{--bg:${a}}` : !look ? ".band .bd-art{--bg:#0a0a0a}" : ""
}
.bd-badge{flex:none;width:clamp(56px,7vw,88px);transform:rotate(-8deg)}.bd-badge svg{width:100%;height:auto;display:block}
.orcw{position:absolute;inset:0;overflow:hidden;pointer-events:none}
.orc{position:absolute;top:0;right:0;width:clamp(110px,15vw,210px);line-height:0}
.orc svg{width:100%;height:auto;display:block}
.h-split .orc,.h-split-bold .orc,.h-asymmetric .orc{width:clamp(90px,10vw,140px)}
@media(max-width:620px){.orc,.h-split .orc,.h-split-bold .orc,.h-asymmetric .orc{width:68px;opacity:.6}}
@media(max-width:620px){.bd-art{display:none}}
${poster ? posterCss(t) : ""}
${look ? lookCss(look) : ""}
${look?.base === "neo" ? neoCss(look) : ""}
${look ? neoElementsCss(look) : ""}
${neoHero ? neoHeroCss(t) : ""}
${article ? articleCss(t, bd) : ""}
${shop ? shopCss(t, bd) : ""}


@media(max-width:900px){.hsplit{grid-template-columns:1fr;gap:36px}.vrow:nth-child(n){margin:0}.flist{grid-template-columns:1fr;gap:24px}.flist .head{position:static}.bento{grid-template-columns:repeat(2,1fr)}.bento .feat,.bento.b4 .feat,.bento.b5 .feat:nth-child(-n+2),.bento.b2 .feat{grid-column:span 1}.bento .feat:first-child{grid-column:span 2}}
.mnav{display:none;flex:none}
.mnav summary{list-style:none;display:grid;place-items:center;width:44px;height:44px;border-radius:calc(var(--pill) * .6);border:1px solid var(--line);cursor:pointer;color:var(--fg)}
.mnav summary::-webkit-details-marker{display:none}
.mnav[open] summary{background:var(--fg);color:var(--bg);border-color:var(--fg)}
.mlinks{position:absolute;left:12px;right:12px;top:calc(100% + 6px);display:grid;gap:2px;padding:10px 16px 16px;background:var(--bg);color:var(--fg);border:1px solid var(--line);border-radius:var(--r);box-shadow:0 18px 40px rgba(0,0,0,.18);z-index:30;max-height:calc(100dvh - 90px);overflow:auto}
.mlinks a:not(.btn){display:flex;align-items:center;min-height:48px;padding:0 4px;border-bottom:1px solid var(--line);text-decoration:none;font-weight:600;font-size:16px}
.mlinks .btn{margin-top:12px;width:100%}
@media(max-width:980px){.links{display:none}.mnav{display:block}}
@media(max-width:820px){.split{grid-template-columns:1fr}}
@media(max-width:520px){.wrap{padding:0 18px}.nav .wrap{height:62px;gap:12px}.nav .wrap>.btn{padding:9px 16px}.card{padding:24px}.bento{grid-template-columns:1fr}.bento .feat:first-child{grid-column:span 1}.frow{grid-template-columns:1fr}}
.skip{position:absolute;left:12px;top:-80px;z-index:100;background:var(--a);color:var(--on);padding:10px 16px;border-radius:10px;font:600 14px ${SANS};text-decoration:none}.skip:focus{top:12px}
a:focus-visible,button:focus-visible,summary:focus-visible,[tabindex]:focus-visible,.search input:focus-visible,.fld input:focus-visible,.fld textarea:focus-visible,.fld select:focus-visible{outline:3px solid var(--at);outline-offset:3px}
main:focus{outline:none}
@media(max-width:480px){.nav .wrap>.btn:not(.cartbtn){display:none}.nav .brand{font-size:17px}}
@media(max-width:600px){.ptag,.lk .ptag,.lk.lkn .ptag{font-size:12px!important}.h-terminal .trm-main h1{font-size:17px}}
.brand{min-height:44px}
.post{position:relative}.post h3 a::after{content:"";position:absolute;inset:0;border-radius:inherit}.post h3 a:focus-visible{outline:none}.post:focus-within{outline:3px solid var(--at);outline-offset:3px}
@media(max-width:1100px){.orc{width:clamp(70px,11vw,120px);opacity:.8}.nshp .sa{width:clamp(90px,13vw,140px)}}
@media(max-width:640px){.btn{min-height:44px}.btn.sm{min-height:40px}.cat{min-height:40px}.search input,.fld input,.fld textarea,.fld select{font-size:16px}.dsh-top,.stat span{font-size:12px}}
@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}`;
}

function extraCss(t: Theme, bd: string, hover: HoverEffect, extra: string[]): string {
  const dk = t.dark;
  const lift = dk ? "0 18px 40px rgba(0,0,0,.45)" : "0 18px 40px rgba(0,0,0,.10)";
  const move = hover === "tilt" ? "transform:perspective(900px) rotateX(2.5deg) rotateY(-3.5deg) translateY(-4px)" : "transform:translateY(-6px)";
  const noise = t.noise
    ? `.card,.scard,.acard{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .06 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")}`
    : "";
  // Gelembung (deco "blobs"/"orbs"): warna sama dengan glow biasa, cuma lebih besar/pekat/buram supaya
  // kelihatan sebagai bentuk gelembung sungguhan, bukan cuma pendar tipis — ini yang bikin gaya seperti
  // Y2K/Glassmorphism/Experimental akhirnya beda dari gaya lain, bukan cuma beda radius.
  const blobby = t.deco === "blobs" || t.deco === "orbs";
  const glowOpacity = blobby ? (dk ? ".30" : ".5") : dk ? ".14" : ".38";
  const glowOpacity2 = blobby ? (dk ? ".24" : ".4") : dk ? ".12" : ".26";
  const spots = ["8% 100%", "50% -10%", "100% 90%", "0% 0%"];
  const layers: string[] = [];
  if (t.acc2) layers.push(`radial-gradient(${blobby ? "42% 55%" : "55% 70%"} at 88% 0%,rgba(${rgb(t.acc2)},${glowOpacity}),transparent 70%)`);
  extra.slice(0, 4).forEach((c, i) => layers.push(`radial-gradient(${blobby ? "32% 42%" : "42% 55%"} at ${spots[i]},rgba(${rgb(c)},${glowOpacity2}),transparent 70%)`));
  const glow = layers.length ? `.glow{background:${layers.join(",")};${blobby ? "filter:blur(36px);" : ""}}` : "";
  const look = t.brutal
    ? ""
    : `.ico,.pico,.vrow i,.ci i,.acard i,.tqh .ico{display:grid;place-items:center;place-content:center;justify-content:center;align-items:center;flex:none;width:40px;height:40px;border-radius:50%;background:var(--ib);color:var(--at)}
.ico svg,.pico svg,.vrow i svg,.ci svg,.acard i svg,.tqh .ico svg{width:20px;height:20px}
.feat,.prod,.scard,.acard,.post{transition:transform .3s ease,box-shadow .3s ease,border-color .3s ease}
.feat:hover,.prod:hover,.scard:hover,.acard:hover,.post:hover{${move};box-shadow:${lift}}
.feat[style] .ico,.prod[style] .pico{background:var(--tb);color:var(--tt)}
${noise}
${t.glass ? ".card,.scard,.acard{-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px)}" : ""}
${glow}`;
  return `${look}
.items{grid-auto-flow:dense}
.ptags{display:flex;flex-wrap:wrap;gap:6px}
.ptag.hot{background:var(--a);color:var(--on);border-color:transparent}
.prod.large{grid-column:span 2;grid-row:span 2;padding:30px;justify-content:space-between;background:linear-gradient(var(--a-soft),var(--a-soft)),var(--card)}
.prod.large .pico{margin-bottom:auto}
.prod.large .pbody h3{font-size:clamp(24px,3vw,36px);line-height:1.1;letter-spacing:-.025em;margin:12px 0 10px}
.prod.large .pbody p{font-size:16.5px;max-width:36ch}
.prod.large .pprice{font-size:24px}
.bento.bx{grid-template-columns:repeat(3,1fr);grid-auto-flow:dense}
.bento.bx .feat{grid-column:span 1}.bento.bx .feat.s2{grid-column:span 2}
.hsplit>*{min-width:0}
.hbold{grid-template-columns:1.5fr 1fr;gap:clamp(32px,5vw,80px)}
.hero.h-split-bold h1{font-size:clamp(36px,5vw,68px);line-height:1;letter-spacing:-.045em;max-width:none}
.stack{display:grid;gap:14px}
.scard{border:${bd};border-radius:var(--r);box-shadow:var(--sh);background:var(--card);padding:18px 20px}
.scard:nth-child(1){transform:rotate(-.8deg)}
.scard:nth-child(2){transform:rotate(.6deg)}
.scard:nth-child(3){transform:rotate(-.3deg)}
.hasym{grid-template-columns:1.15fr 1fr;gap:clamp(32px,5vw,72px)}
.hero.h-asymmetric h1{font-size:clamp(36px,5.2vw,70px);line-height:1.02;letter-spacing:-.04em;max-width:none}
.agrid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.acard{display:flex;flex-direction:column;gap:14px;justify-content:space-between;padding:22px;background:var(--card);border:${bd};border-radius:var(--r);box-shadow:var(--sh)}
.acard.big{grid-column:span 2;min-height:220px;background:var(--a);color:var(--on);border-color:transparent}
.acard.big i{background:rgba(255,255,255,.18);color:inherit}
.acard b{display:block;font:700 16px/1.3 ${SANS}}
.acard small{display:block;margin-top:4px;color:var(--muted);font-size:13.5px;line-height:1.45}
.acard.big b{font:${t.headWeight} clamp(22px,2.8vw,32px)/1.1 ${t.display};letter-spacing:-.02em}
.acard.big small{color:inherit;opacity:.85;font-size:15px}
.acard .ap{font:800 18px ${SANS};color:var(--at)}.acard.big .ap{color:inherit;font-size:24px}
.hero.h-editorial h1{font-size:clamp(34px,8vw,112px);line-height:.95;letter-spacing:-.05em;max-width:none;margin:0 0 clamp(28px,5vw,56px)}
.hed-top{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:12px 20px;padding-bottom:18px;border-bottom:${bd};margin-bottom:clamp(28px,5vw,64px)}
.hed-top .badge{margin:0}
.slo{font:600 13px ${t.mono};letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
.hed-bot{display:grid;grid-template-columns:1fr 1fr;gap:28px 40px;align-items:start;border-top:${bd};padding-top:28px}
.hed-bot .sub{margin:0;max-width:46ch}.hed-bot .row{justify-content:flex-end}
.fedlist{list-style:none;margin:0;padding:0}
.fe{display:grid;grid-template-columns:72px minmax(0,.9fr) minmax(0,1.1fr);gap:24px;align-items:baseline;padding:28px 0;border-top:${bd};transition:padding-left .3s ease}
.fe:last-child{border-bottom:${bd}}.fe:hover{padding-left:12px}
.fn{font:700 14px ${t.mono};letter-spacing:.08em;color:var(--at)}
.fe h3{font-size:clamp(20px,2.4vw,28px);letter-spacing:-.02em}
.fe p{margin:0;color:var(--muted)}
.tq{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,3fr);gap:32px;align-items:start}
.tqh{display:grid;gap:12px;justify-items:start}.tqh small{color:var(--muted);font:600 12.5px ${t.mono};letter-spacing:.08em;text-transform:uppercase}
.tq .ico{margin:0}
.tq blockquote{margin:0;max-width:820px}
.tq blockquote p{margin:0 0 24px;font:${t.headWeight === 900 ? 800 : t.headWeight} clamp(22px,3.4vw,38px)/1.25 ${t.display};letter-spacing:-.02em}
.tq cite{display:flex;align-items:center;gap:12px;font:600 14px ${SANS};font-style:normal;color:var(--muted)}
.tq cite:before{content:"";width:32px;height:1px;background:var(--at)}
@media(max-width:900px){.bento.bx{grid-template-columns:repeat(2,1fr)}.hbold,.hasym{grid-template-columns:1fr}.scard:nth-child(n){transform:none}.hed-bot{grid-template-columns:1fr}.hed-bot .row{justify-content:flex-start}}
@media(max-width:700px){.fe{grid-template-columns:44px 1fr;gap:6px 14px}.fe p{grid-column:2}.tq{grid-template-columns:1fr;gap:18px}}
@media(max-width:640px){.prod.large{grid-column:span 1;grid-row:auto}}
.himg{border-radius:var(--r);overflow:hidden;border:${bd};box-shadow:var(--sh);background:var(--card)}
.himg img{display:block;width:100%;height:100%;aspect-ratio:16/10;object-fit:cover}
.hero>.wrap>.himg{margin-top:clamp(32px,5vw,56px)}
.visual .himg{border:0;border-radius:0;box-shadow:none}
.stack .himg img{aspect-ratio:16/9}
.agrid .himg{grid-column:span 2}.agrid .himg img{aspect-ratio:16/8}
.brand i.logo{background:transparent;width:auto;max-width:110px;border:0}
.brand i.logo img{display:block;height:34px;width:auto;max-width:110px;object-fit:contain}
.prod.large .pimg img{height:clamp(200px,24vw,300px)}
@media(max-width:520px){.bento.bx{grid-template-columns:1fr}.bento.bx .feat.s2{grid-column:span 1}.agrid{grid-template-columns:1fr}.acard.big{grid-column:span 1}}`;
}

function articleCss(t: Theme, bd: string): string {
  return `.posts{display:grid;gap:18px;grid-template-columns:repeat(6,minmax(0,1fr))}
.post{position:relative;display:flex;flex-direction:column;padding:0;overflow:hidden;grid-column:span 2}
.card.post{padding:0}
.post.s3{grid-column:span 3}.post.s6{grid-column:span 6}
.acov{overflow:hidden;background:var(--a-soft)}
.post .acov{aspect-ratio:16/10}
.acov img{display:block;width:100%;height:100%;object-fit:cover}
.acov.ph{display:grid;place-items:center;background:linear-gradient(135deg,var(--a-soft),var(--ib));color:var(--at)}
.acov.ph i{display:grid;place-items:center;width:56px;height:56px;border-radius:50%;background:var(--card);font-style:normal}
.acov.ph svg{width:26px;height:26px}
.pcont{display:flex;flex-direction:column;gap:10px;padding:22px;flex:1;min-width:0}
.post h3{font-size:clamp(18px,2vw,21px);line-height:1.25;margin:0}
.post h3 a{text-decoration:none}
.post h3 a:after{content:"";position:absolute;inset:0;z-index:1}
.post p{font-size:15px}
.pmeta{margin-top:auto;padding-top:6px;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:6px 12px;color:var(--muted);font-size:13px}
.more{display:inline-flex;align-items:center;gap:4px;color:var(--at);font-weight:700}
.more svg{width:16px;height:16px;transition:transform .2s}.post:hover .more svg{transform:translateX(3px)}
.post.top{grid-column:1/-1;flex-direction:row}
.post.s6{flex-direction:row}.post.s6 .acov{flex:0 0 40%;aspect-ratio:auto;min-height:220px}
.post.top .acov{flex:0 0 52%;aspect-ratio:auto;min-height:300px}
.post.top .pcont{justify-content:center;padding:clamp(24px,4vw,44px)}
.post.top h3{font-size:clamp(24px,3.2vw,38px);letter-spacing:-.025em;line-height:1.12}
.post.top p{font-size:17px}
.reader{display:none;position:fixed;inset:0;z-index:60;overflow-y:auto;background:var(--bg);color:var(--fg);overscroll-behavior:contain}
.reader:target{display:block}
html:has(.reader:target){overflow:hidden}
.rbar{position:sticky;top:0;z-index:2;background:rgb(${t.navBg});border-bottom:${bd}}
.rw{display:flex;align-items:center;justify-content:space-between;gap:16px;height:60px}
.rbrand{font:${t.headWeight} 15px ${t.display};min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--muted)}
.rbody{max-width:760px;margin:0 auto;padding:clamp(28px,6vw,64px) 24px 96px}
.rhead{display:grid;gap:14px;justify-items:start;margin-bottom:28px}
.rhead h1{font-size:clamp(30px,5.4vw,50px);line-height:1.08;letter-spacing:-.03em;font-weight:${t.headWeight};overflow-wrap:break-word}
.rmeta{margin:0;color:var(--muted);font-size:14.5px}
.rcov{border-radius:var(--r);margin:0 0 32px;aspect-ratio:16/9}
.prose{font:19px/1.85 ${SERIF}}
.prose p{margin:0 0 1.3em}
.prose h3{font:${t.subWeight ?? t.headWeight} clamp(21px,3vw,26px)/1.25 ${t.display};margin:1.8em 0 .6em;letter-spacing:-.015em}
.rnav{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:56px}
.rnav a{text-decoration:none;display:grid;gap:4px;padding:16px 18px;min-width:0}
.rnav small{color:var(--muted);font-size:12px;letter-spacing:.06em;text-transform:uppercase}
.rnav b{font:700 15px/1.35 ${SANS};overflow-wrap:break-word}
.rnav a:nth-child(2){text-align:right}
@media(max-width:900px){.posts{grid-template-columns:repeat(2,minmax(0,1fr))}.post,.post.s3{grid-column:auto}.post.s6,.post.top{grid-column:1/-1}.post.s6{flex-direction:column}.post.s6 .acov{flex:none;aspect-ratio:16/10;min-height:0}.post.top{flex-direction:column}.post.top .acov{flex:none;aspect-ratio:16/10;min-height:0}}
@media(max-width:600px){.posts{grid-template-columns:1fr}.post.s6,.post.top{grid-column:auto}.rnav{grid-template-columns:1fr}.rnav a:nth-child(2){text-align:left}.rbody{padding-left:18px;padding-right:18px}.prose{font-size:17.5px}}`;
}

function shopCss(t: Theme, bd: string): string {
  return `.adminbar{display:none;position:sticky;top:68px;z-index:19;background:var(--a);color:var(--on)}
.wb-admin .adminbar{display:block}
.abar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding-top:10px;padding-bottom:10px}
.alabel{display:inline-flex;align-items:center;gap:8px;font:700 13px ${SANS};margin-right:auto}
.adminbar .btn{background:var(--on);color:var(--a);box-shadow:none;border-color:transparent}
.adminbar .btn.ghost{background:transparent;color:var(--on);border:1px solid rgba(255,255,255,.55)}
.padm{position:absolute;top:12px;right:12px;display:flex;gap:6px;z-index:2}
.wb-admin .prod{padding-top:60px}
.ib{display:grid;place-items:center;width:34px;height:34px;border-radius:10px;border:${bd};background:var(--card);color:var(--fg);cursor:pointer}
.ib:hover{border-color:var(--a)}.ib.bad{color:#dc2626}
.ib svg{width:16px;height:16px}
.addnew{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;min-height:200px;border-style:dashed;color:var(--at);font:600 15px ${SANS};cursor:pointer;background:transparent}
.cback{display:none;position:fixed;inset:0;z-index:40;background:rgba(0,0,0,.45)}
.cdrawer.open+.cback{display:block}
.cdrawer{position:fixed;top:0;right:0;bottom:0;z-index:41;width:min(400px,100%);display:flex;flex-direction:column;background:${t.dark ? t.bg : "var(--bg)"};border-left:${bd};transform:translateX(105%);visibility:hidden;transition:transform .28s,visibility .28s}
.cdrawer.open{transform:none;visibility:visible}
.chead{display:flex;align-items:center;justify-content:space-between;padding:18px 20px;border-bottom:${bd}}
.chead h3{font-size:20px}
.clines{flex:1;overflow:auto;padding:12px 20px}
.line{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 0;border-bottom:1px solid ${t.dark ? "rgba(255,255,255,.08)" : "rgba(0,0,0,.06)"}}
.lname b{display:block;font-size:15px;line-height:1.35}.lname small{color:var(--muted)}
.qty{display:flex;align-items:center;gap:10px}
.qty button{display:grid;place-items:center;width:30px;height:30px;border-radius:9px;border:${bd};background:var(--card);color:var(--fg);cursor:pointer}
.qty svg{width:15px;height:15px}.qty span{min-width:18px;text-align:center;font-weight:700}
.cfoot{display:grid;gap:10px;padding:18px 20px;border-top:${bd}}
.csum{display:flex;justify-content:space-between;font-size:16px}.csum b{font-weight:800}
.modal{position:fixed;inset:0;z-index:60;display:grid;place-items:center;padding:16px}
.mback{position:absolute;inset:0;background:rgba(0,0,0,.55)}
.mbox{position:relative;width:min(460px,100%);max-height:92vh;overflow:auto;background:${t.dark ? "#0e1220" : "var(--card)"};color:var(--fg);border:${bd};border-radius:var(--r);padding:22px;display:grid;gap:16px;${t.brutal ? "background:#fff;" : ""}}
.mhead{display:flex;align-items:center;justify-content:space-between}.mhead h3{font-size:20px}
.mform{display:grid;gap:12px}
.fld{display:grid;gap:6px;font:600 13px ${SANS};color:var(--muted)}
.fld input,.fld textarea,.fld select{width:100%;padding:10px 12px;border-radius:10px;border:${bd};background:${t.dark ? "rgba(255,255,255,.05)" : "#fff"};color:var(--fg);font:500 14.5px ${SANS};outline:none}
.fld input:focus,.fld textarea:focus,.fld select:focus{border-color:var(--a)}
.two{display:grid;gap:12px;grid-template-columns:1fr 1fr}
.ferr{margin:0;color:#dc2626;font-size:13px;min-height:1em}
.mtext{margin:0;color:var(--muted)}
.mact{display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap}
.toast{position:fixed;left:50%;bottom:24px;z-index:70;transform:translate(-50%,30px);opacity:0;pointer-events:none;background:#111;color:#fff;padding:11px 18px;border-radius:99px;font:600 13.5px ${SANS};transition:.25s;max-width:90vw;text-align:center}
.toast.on{opacity:1;transform:translate(-50%,0)}
@media(max-width:520px){.adminbar{top:62px}.two{grid-template-columns:1fr}.shop-tools{margin-top:0}}`;
}

/** Aman disisipkan di dalam <script type="application/json">. */
const jsonForScript = (v: unknown): string => JSON.stringify(v).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");

const okDataUrl = (u: string): boolean => /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(u);

function decodeDataUrl(u: string): { ext: string; data: Uint8Array } | null {
  const m = /^data:image\/(png|jpeg|webp|gif);base64,([A-Za-z0-9+/=]+)$/.exec(u);
  if (!m) return null;
  const bin = atob(m[2]);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return { ext: m[1] === "jpeg" ? "jpg" : m[1], data: out };
}

/** Urutan/sembunyi bagian dari data yang tidak dipercaya: hanya id dikenal, tanpa duplikat. */
function normSections(v: unknown): SiteContent["sections"] | undefined {
  if (!v || typeof v !== "object") return undefined;
  const o = v as { order?: unknown; hidden?: unknown };
  const list = (x: unknown): SectionId[] => (Array.isArray(x) ? [...new Set(x.filter(isSectionId))] : []);
  const order = list(o.order);
  const hidden = list(o.hidden);
  if (!order.length && !hidden.length) return undefined;
  return { ...(order.length ? { order } : {}), ...(hidden.length ? { hidden } : {}) };
}

export function buildSite(content: SiteContent, template: TemplateId, accent?: string, opts: RenderOpts = {}): SiteBundle {
  const base = THEMES[template];
  const custom = (opts.palette ?? []).filter(isHexColor).map((x) => x.toLowerCase()).slice(0, MAX_PALETTE);
  // Gaya hasil latihan: dipakai kecuali dimatikan (pengguna memilih Template/warna/gaya sendiri).
  const look = opts.look === false ? undefined : content.look;
  // Gaya ikon: pilihan manual > pilihan mesin (selama Template/gaya yang dipilih mesin masih dipakai) > ciri khas
  // Template. Isi lama tanpa iconStyle tetap "garis" supaya website yang sudah terbit tidak berubah sendiri.
  const iconStyle: IconStyle =
    opts.iconStyle && isIconStyle(opts.iconStyle)
      ? opts.iconStyle
      : content.iconStyle
        ? look || template === content.template
          ? content.iconStyle
          : templateIconStyle(template)
        : "garis";
  // Ikon impor (content.icons) memakai pembungkus Lucide yang sama; nama bawaan tetap dari LUCIDE.
  const customIcons = content.icons ?? {};
  const iconInner = (name: string): string => {
    const n = isIconName(name) || customIcons[name] ? name : "sparkles";
    const inner = isIconName(n) ? LUCIDE[n] : customIcons[n];
    const alt = iconStyle === "garis" ? undefined : (content.iconAlt?.[iconStyle]?.[n] ?? (iconStyle === "piksel" ? pixelIcon(n) : undefined));
    return treatIcon(inner, iconStyle, alt);
  };
  const ico = (name: string, size = 24): string =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconInner(name)}</svg>`;
  const ornaments = opts.ornaments === false ? [] : (content.ornaments ?? []);
  const a =
    custom[0] ??
    (look
      ? isHexColor(content.accent) && content.accent
        ? content.accent
        : look.accent
      : isHexColor(accent)
        ? accent
        : isHexColor(content.accent) && content.accent
          ? content.accent
          : TEMPLATES.find((x) => x.id === template)!.accent);
  // Palet kustom: warna ke-2 menggantikan aksen kedua template; warna ke-3 dst. menjadi warna tambahan (ikon bergantian + sorot hero).
  let t: Theme = look ? applyLook(base, look) : base;
  // Warna latar kustom (mode "Atur manual"): diterapkan lebih dulu, supaya aksen/gaya/huruf di bawah ini
  // semuanya menimpa di atas latar yang benar (termasuk status terang/gelap untuk kontras teks & kartu).
  if (opts.bg && isHexColor(opts.bg)) t = { ...t, ...surfaceFromBg(opts.bg) };
  if (custom.length >= 2) t = { ...t, acc2: custom[1], ib: tint(custom[1], t.dark) };
  // Gaya desain kustom (mode "Atur manual"): timpa bentuk/bayangan/dekorasi di atas warna Template/Warna di atas.
  // Glass & Neumorphism butuh mengintip t.card/t.bg yang sedang aktif (lewat `apply`) supaya kartu benar-benar
  // tembus pandang / menyatu dengan latar — bukan sekadar beda radius, karena itu yang bikin gaya terasa mirip.
  const stylePick = DESIGN_STYLES.find((s) => s.id === opts.style);
  if (stylePick) t = { ...t, ...stylePick.apply(t) };
  // Hiasan kustom (mode "Atur manual"): pilihan eksplisit pengguna menang di atas hiasan bawaan Gaya desain/Template.
  if (opts.decor) t = { ...t, deco: opts.decor };
  // Huruf per peran (mode "Atur manual"): jenis huruf & ketebalan masing-masing bebas, mirip sumbu variable-font.
  // Sub-judul kosong → ikut Judul yang terpilih (family & weight) → baru ikut bawaan Gaya desain/Template.
  const roleStack = (id: FontRoleId | undefined): string | undefined => FONT_ROLES.find((r) => r.id === id)?.stack;
  const titleFamily = roleStack(opts.fonts?.title?.family) ?? t.display;
  const subFamily = roleStack(opts.fonts?.sub?.family) ?? titleFamily;
  const bodyFamily = roleStack(opts.fonts?.body?.family) ?? t.body;
  const titleWeight = opts.fonts?.title?.weight ?? t.headWeight;
  const subWeight = opts.fonts?.sub?.weight ?? titleWeight;
  const bodyWeight = opts.fonts?.body?.weight ?? t.bodyWeight ?? 400;
  if (opts.fonts) t = { ...t, display: titleFamily, sub: subFamily, body: bodyFamily, headWeight: titleWeight, subWeight, bodyWeight };
  const extra = custom.slice(2);
  const swatches = siteSwatches(t, a, look, custom);
  const cyc = custom.length >= 3 ? custom.slice(1) : [];
  const toneStyle = (i: number): string => {
    if (!cyc.length || t.brutal) return "";
    const col = cyc[i % cyc.length];
    return ` style="--tb:${tint(col, t.dark)};--tt:${readable(col, t.dark, t.bg)}"`;
  };

  const c = content;
  /** Penanda bidang untuk editor kanvas (hanya di mode editable). */
  const ef = (f: string): string => (opts.editable ? ` data-f="${f}"` : "");
  const efImg = (k: string): string => (opts.editable ? ` data-img="${esc(k)}"` : "");
  const hiddenSec = new Set<SectionId>(c.sections?.hidden ?? []);
  const heroL = opts.hero ?? c.hero;
  const featL = opts.feat ?? c.feat;
  const shop = hasShop(c) && opts.shop !== false;

  /* ----- gambar unggahan ----- */
  const files = opts.imageMode === "files";
  const imgs = opts.images ?? {};
  const assets: SiteAsset[] = [];
  const seen = new Map<string, string>();
  const imgSrc = (key: string): string => {
    const u = imgs[key];
    if (!u || !okDataUrl(u)) return "";
    if (!files) return u;
    const hit = seen.get(key);
    if (hit) return hit;
    const d = decodeDataUrl(u);
    if (!d) return "";
    const path = `assets/img/${key.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase()}.${d.ext}`;
    assets.push({ path, data: d.data });
    seen.set(key, path);
    return path;
  };
  const items: SiteItem[] = c.items.map((i) => ({ ...i, img: imgSrc(`item:${i.id}`) || i.img }));
  const hasItems = items.length > 0;
  const arts = c.articles ?? [];
  const isArticle = c.kind === "artikel" && arts.length > 0;
  const hasContact = !!(c.address || c.hours || c.whatsapp || c.email);
  const hasFeatures = c.features.length >= 2;

  const wa = c.whatsapp ? `https://wa.me/${c.whatsapp}` : "";
  const mail = c.email ? `mailto:${esc(c.email)}` : "";
  // Bagian pertama yang benar-benar tampil (ikut urutan & sembunyi dari editor) = tujuan tombol kedua di hero.
  const secShown: Record<SectionId, boolean> = {
    katalog: hasItems && !isArticle,
    artikel: isArticle,
    fitur: hasFeatures,
    testimoni: !!c.testimonial?.text,
    cara: c.steps.length > 0,
    tentang: !!c.about || hasContact,
    kontak: !!(wa || mail),
  };
  const firstSec = sectionOrder(c, shop).find((id) => secShown[id] && !hiddenSec.has(id));
  const firstId = firstSec === "katalog" ? (shop ? "katalog" : "layanan") : (firstSec ?? "kontak");
  const ctaHref = isArticle && !hiddenSec.has("artikel") ? "#artikel" : wa || mail || `#${firstId}`;
  const logo = imgSrc("logo");
  const brandMark = logo ? `<img src="${esc(logo)}" alt="">` : c.brandIcon ? ico(c.brandIcon, 20) : esc(Array.from(c.brand)[0]?.toUpperCase() ?? "•");

  const nav = [
    isArticle && !hiddenSec.has("artikel") ? `<a href="#artikel">${esc(c.itemsTitle)}</a>` : "",
    hasItems && shop && !hiddenSec.has("katalog") ? `<a href="#katalog">Katalog</a>` : "",
    hasFeatures && !hiddenSec.has("fitur") ? `<a href="#fitur">Keunggulan</a>` : "",
    hasItems && !shop && !isArticle && !hiddenSec.has("katalog") ? `<a href="#layanan">${esc(c.itemsTitle)}</a>` : "",
    c.steps.length && !hiddenSec.has("cara") ? `<a href="#cara">${esc(c.stepsTitle)}</a>` : "",
    c.about && !hiddenSec.has("tentang") ? `<a href="#tentang">${esc(c.aboutTitle)}</a>` : "",
    (wa || mail) && !hiddenSec.has("kontak") ? `<a href="#kontak">Kontak</a>` : c.address && !hiddenSec.has("tentang") ? `<a href="#tentang">Kontak</a>` : "",
  ]
    .filter(Boolean)
    .slice(0, 5)
    .join("");

  /* ----- hero ----- */
  const heroRows = isArticle
    ? arts.slice(0, 3).map((x) => ({ icon: "book-open", title: x.title, text: x.excerpt, tail: `${x.readMin} mnt` }))
    : shop || (hasItems && items.some((i) => i.price > 0))
      ? items.slice(0, 3).map((i) => ({ icon: i.icon, title: i.name, text: i.desc, tail: i.price > 0 ? fmtRp(i.price) : "" }))
      : c.features.slice(0, 3).map((f) => ({ icon: f.icon, title: f.title, text: f.text, tail: "" }));
  const clip = (t0: string, n: number): string => (t0.length > n ? t0.slice(0, n - 2).trimEnd() + "…" : t0);
  const heroImg = imgSrc("hero");
  const himg = heroImg ? `<div class="himg"><img src="${esc(heroImg)}" alt="${esc(c.brand)}" fetchpriority="high" decoding="async"></div>` : "";
  const visualRows = heroRows
    .map((r) => `<div class="vrow"><i>${ico(r.icon, 20)}</i><div><b>${esc(r.title)}</b><small>${esc(clip(r.text, 60))}</small></div>${r.tail ? `<em>${esc(r.tail)}</em>` : ""}</div>`)
    .join("");

  const ghost = isArticle
    ? c.about || hasContact
      ? { label: "Tentang kami", href: "#tentang" }
      : null
    : firstSec && firstSec !== "kontak"
      ? { label: firstSec === "katalog" ? (shop ? "Lihat katalog" : `Lihat ${c.itemsTitle.toLowerCase()}`.slice(0, 32)) : firstSec === "fitur" ? "Lihat keunggulan" : "Lihat selengkapnya", href: `#${firstId}` }
      : null;
  const badgeHtml = c.badge ? `<div class="badge">${esc(c.badge)}</div>` : "<div></div>";
  const subHtml = c.subheadline ? `<p class="sub">${esc(c.subheadline)}</p>` : "<div></div>";
  const ctaRow = `<div class="row"><a class="btn" href="${ctaHref}">${esc(c.ctaLabel)}</a>${ghost ? `<a class="btn ghost" href="${ghost.href}">${ghost.label}</a>` : ""}</div>`;
  const heroText = `${badgeHtml}<h1>${esc(c.headline)}</h1>${subHtml}${ctaRow}`;

  /* Poster: baris meta, nama raksasa (dua nada bila "bands"), lalu grid sel bergaris: teks terbalik | blok aksen + judul + tombol | elemen. */
  const els = new Set<string>(look ? look.elements : ["meta", "arrow", "crosshair"]);
  const pad2 = (n: number) => String(n).padStart(2, "0");
  const lf = look?.labelFmt ?? "paren";
  const secLabel = (n: number): string => (lf === "slash" ? `/${pad2(n)}` : lf === "hash" ? `#${pad2(n)}` : lf === "bracket" ? `[${pad2(n)}]` : `(${pad2(n)})`);
  const year = String(new Date().getFullYear());
  const titleFam: LookFontFamily = look?.fonts.title.family ?? (t.display === DISPLAY ? "display" : t.display === SERIF ? "serif" : "sans");
  /** Satu baris teks raksasa sebagai SVG yang direntangkan pas selebar kolom (muat di font apa pun). */
  const fitLine = (w: string, cls = "", upper = t.upper): string => {
    const n = Math.max(3, Array.from(w).length);
    const fs = Math.min(300, Math.round(1000 / (n * LOOK_WIDTH[titleFam])));
    const h = Math.round(fs * (upper ? 0.8 : 1.02));
    const y = Math.round(fs * (upper ? 0.77 : 0.8));
    return `<span${cls ? ` class="${cls}"` : ""}><svg viewBox="0 0 1000 ${h}" focusable="false"><text x="0" y="${y}" textLength="1000" lengthAdjust="spacingAndGlyphs" font-size="${fs}" font-weight="${look?.fonts.title.weight ?? t.headWeight}" fill="currentColor" style="font-family:${esc(t.display).replace(/&quot;/g, "'")}">${esc(upper ? w.toUpperCase() : w)}</text></svg></span>`;
  };
  /** Angka nyata dari isi website (tanpa mengarang klaim): harga mulai, jumlah item, jumlah keunggulan, edisi. */
  const statList = (): { v: string; k: string }[] => {
    const prices = items.map((i) => i.price).filter((x) => x > 0);
    const out: { v: string; k: string }[] = [];
    if (prices.length) {
      const m = Math.min(...prices);
      out.push({ v: m >= 1_000_000 ? `${(m / 1_000_000).toFixed(m % 1_000_000 ? 1 : 0)}jt` : m >= 1000 ? `${Math.round(m / 1000)}rb` : String(m), k: "Harga mulai" });
    }
    if (items.length) out.push({ v: String(items.length).padStart(2, "0"), k: clip(c.itemsTitle, 22) });
    if (arts.length) out.push({ v: String(arts.length).padStart(2, "0"), k: "Artikel" });
    if (c.features.length) out.push({ v: String(c.features.length).padStart(2, "0"), k: clip(c.featuresTitle, 22) });
    if (c.steps.length && out.length < 3) out.push({ v: String(c.steps.length).padStart(2, "0"), k: clip(c.stepsTitle, 22) });
    out.push({ v: year, k: "Edisi" });
    return out.slice(0, 3);
  };
  const statsHtml = (): string =>
    `<div class="stats">${statList()
      .map((x, i) => `<div class="stat">${i === 0 && els.has("crosshair") ? `<i aria-hidden="true">${lookSvg("crosshair")}</i>` : i === 1 && els.has("sparkle") ? `<i aria-hidden="true">${lookSvg("sparkle")}</i>` : ""}<b>${esc(x.v)}</b><span><em>${esc(x.k)}</em><em aria-hidden="true">${pad2(i + 1)}</em></span></div>`)
      .join("")}</div>`;
  /** Warna sorot kata di judul: aksen yang paling kontras dengan latar (min. 3:1 untuk teks besar). */
  const hlColor = look ? ([look.accent2, look.accent].find((x) => lookContrast(x, look.bg) >= 3) ?? look.fg) : a;
  const ornOf = (slot: SiteOrnament["slot"]) => ornaments.find((o) => o.slot === slot);
  const ornSvg = (o: SiteOrnament, cls: string) => `<span class="${cls}" aria-hidden="true"><svg viewBox="${o.vb}" focusable="false">${o.svg}</svg></span>`;
  const art = (pref: string[], fallback = "crosshair"): string => {
    const oa = ornOf("art");
    if (oa) return `<svg viewBox="${oa.vb}" aria-hidden="true" focusable="false">${oa.svg}</svg>`;
    const id = pref.find((x) => els.has(x)) ?? fallback;
    return id === "ring" ? ringSvg(c.brand, lookSvg(els.has("asterisk") ? "asterisk" : "sparkle")) : lookSvg(id, hash(c.brand) % 1e12);
  };

  const breakerHero = (): string => {
    const words = c.headline.split(/\s+/).filter(Boolean);
    const hi = look && look.hl >= 0 ? Math.min(words.length - 1, [...words.keys()].sort((x, y) => Array.from(words[y]).length - Array.from(words[x]).length)[look.hl % Math.min(3, words.length)]) : -1;
    const astAt = els.has("asterisk") ? Math.min(1, words.length - 1) : -1;
    const hiWord = (w: string): string => {
      const m = /^([^\p{L}\p{N}]*)(.*?)([^\p{L}\p{N}]*)$/u.exec(w);
      return m && m[2] ? `${esc(m[1])}<em>${esc(m[2])}</em>${esc(m[3])}` : esc(w);
    };
    const h1 = words
      .map((w, i) => `${i === hi ? hiWord(w) : esc(w)}${i === astAt ? ` <span class="ast" aria-hidden="true">${lookSvg(els.has("sparkle") ? "sparkle" : "asterisk")}</span>` : ""}`)
      .join(" ");
    // Judul panjang diperkecil supaya kolom tidak menjulang: 6 kata = ukuran penuh, lebih panjang menyusut.
    const k = Math.min(1, Math.sqrt(6 / Math.max(6, words.length)) * Math.min(1, 26 / Math.max(26, Math.max(...words.map((w) => Array.from(w).length)) * 2.6)));
    const visual = heroImg ? `<img src="${esc(heroImg)}" alt="${esc(c.brand)}">` : art(["globe", "halftone", "pixel", "crosshair", "sunburst"], "globe");
    const spk = els.has("sparkle") ? `<span class="spk" aria-hidden="true">${lookSvg("sparkle")}</span><span class="spk" aria-hidden="true">${lookSvg("sparkle")}</span>` : "";
    const side = els.has("ring") ? ringSvg(c.brand, lookSvg(els.has("asterisk") ? "asterisk" : "sparkle")) : els.has("globe") ? `<span class="gl" aria-hidden="true">${lookSvg("globe")}</span>` : "";
    return `<div class="brk"><div class="brk-t">${c.badge ? badgeHtml : ""}<h1 class="brk-h" style="font-size:clamp(${Math.round(40 * k)}px,${(7.4 * k).toFixed(2)}vw,${Math.round(124 * k)}px)">${h1}</h1></div><div class="brk-v${els.has("brackets") ? " brkt" : ""}" aria-hidden="${heroImg ? "false" : "true"}">${visual}${spk}</div><div class="brk-s">${c.subheadline ? `<p class="sub">${esc(c.subheadline)}</p>` : ""}${ctaRow}${side}</div></div>`;
  };

  const terminalHero = (): string => {
    const h = hash(c.brand);
    const co = [((h % 9000) / 100).toFixed(4), (-((h >> 7) % 9000) / 100).toFixed(4), (((h >> 13) % 9000) / 100).toFixed(4)];
    const pct = 60 + (h % 39);
    const giant = (t.upper ? c.brand.toUpperCase() : c.brand).split(/\s+/).filter(Boolean);
    const lines = giant.length <= 3 ? giant : [giant.slice(0, Math.ceil(giant.length / 2)).join(" "), giant.slice(Math.ceil(giant.length / 2)).join(" ")];
    const visual = heroImg ? `<img src="${esc(heroImg)}" alt="${esc(c.brand)}">` : art(["pixel", "globe", "crosshair", "halftone"], "pixel");
    return `<div class="trm"><aside class="trm-rail" aria-hidden="true"><span>${esc(look?.kicker || c.slogan || c.brand)}</span><b>${year}</b></aside><div class="trm-main"><p class="trm-n" aria-hidden="true">${secLabel(1)}</p><div class="trm-g" aria-hidden="true">${lines.map((w) => fitLine(w)).join("")}</div><h1>${esc(c.headline)}</h1>${c.subheadline ? `<p class="sub">${esc(c.subheadline)}</p>` : ""}${ctaRow}</div><div class="trm-art${els.has("brackets") ? " brkt" : ""}">${visual}<span class="trm-st" aria-hidden="true">&gt; ${esc((look?.meta[0] || "memuat").toUpperCase())}<br><b>${pct}%</b></span><span class="trm-co" aria-hidden="true">X_${co[0]}<br>Y_${co[1]}<br>Z_${co[2]}</span><span class="trm-sc" aria-hidden="true">//${esc((c.brand.split(/\s+/)[0] || "SCN").toUpperCase().slice(0, 8))}_01</span></div></div>`;
  };

  const dashboardHero = (): string => {
    const mark = c.brandIcon ? ico(c.brandIcon, 40) : lookSvg("sparkle");
    return `<div class="dsh"><div class="dsh-top"><span>${esc(look?.meta[0] || c.slogan || c.brand)}</span><span>${esc(look?.meta[1] || "")}${look?.meta[1] ? " · " : ""}${year}</span></div><div class="dsh-head"><div>${c.badge ? badgeHtml : ""}<h1>${esc(c.headline)}</h1>${c.subheadline ? `<p class="sub">${esc(c.subheadline)}</p>` : ""}${ctaRow}</div><div class="dsh-brand" aria-hidden="true"><i>${mark}</i><span>| ${esc(c.brand)}</span></div></div>${statsHtml()}</div>`;
  };

  const labelHero = (): string => {
    const h = hash(c.brand);
    const initial = Array.from(c.brand.trim())[0] ?? "A";
    const kindName: Record<SiteKind, string> = { umkm: "Toko", jasa: "Jasa", portofolio: "Portofolio", event: "Acara", profil: "Profil", artikel: "Artikel" };
    const rows: [string, string][] = [
      ["Subjek", c.brand],
      ["Edisi", year],
      ["Jenis", kindName[c.kind]],
      ["No.", `#${String(h % 1000).padStart(3, "0")}`],
    ];
    if (c.address || look?.meta.find((m) => !/\d{4}/.test(m))) rows.splice(3, 0, ["Asal", clip(c.address || look!.meta.find((m) => !/\d{4}/.test(m))!, 24)]);
    const x = heroImg ? `<img src="${esc(heroImg)}" alt="" style="width:100%;height:100%;object-fit:cover">` : art(["globe", "crosshair", "sparkle", "asterisk"], "globe");
    return `<div class="lbl"><div class="lbl-a" aria-hidden="true">${esc(initial)}</div><div class="lbl-f"><dl>${rows.map(([k, v]) => `<dt>${esc(k)}:</dt><dd>${esc(v)}</dd>`).join("")}</dl><div class="lbl-bc" aria-hidden="true">${lookSvg("barcode", h % 1e12)}</div></div><div class="lbl-h"><p class="lbl-k">${esc(look?.kicker || c.slogan || c.badge || "")}</p><div><h1>${esc(c.headline)}</h1></div>${c.subheadline ? `<p class="sub">${esc(c.subheadline)}</p>` : ""}${ctaRow}</div><div class="lbl-x${els.has("brackets") ? " brkt" : ""}" aria-hidden="true">${x}</div><div class="lbl-z" aria-hidden="true"><div class="${els.has("checker") ? "ck" : "hz"}" style="height:100%;border:0"></div></div></div>`;
  };

  const posterHero = (): string => {
    const metaLabels = (look?.meta.length ? look.meta : c.features.slice(0, 4).map((f) => clip(f.title, 26))).slice(0, 4);
    const numTxt = (look?.num || year).slice(0, 4);
    const kicker = look?.kicker || c.slogan || c.badge || "";
    const meta = els.has("meta")
      ? `<div class="pst-meta"><p class="pm-k">${esc(c.slogan || c.brand)}</p><span class="pm-ln" aria-hidden="true"><i></i><b></b></span><p class="pm-s">${esc(c.badge || kicker)}</p><p class="pm-n" aria-hidden="true">${esc(numTxt.slice(0, 2))}<br>${esc(numTxt.slice(2))}</p><ul class="pm-l">${metaLabels
          .map((m) => `<li>${lookSvg("arrow")}${esc(m)}</li>`)
          .join("")}</ul></div>`
      : "";
    // Judul raksasa = nama usaha, satu kata per baris (≤ 3 kata). Ukuran dihitung dari kata terpanjang supaya muat.
    const giant = (t.upper ? c.brand.toUpperCase() : c.brand).split(/\s+/).filter(Boolean);
    const lines = giant.length <= 3 ? giant : [giant.slice(0, Math.ceil(giant.length / 2)).join(" "), giant.slice(Math.ceil(giant.length / 2)).join(" ")];
    // Tiap baris = SVG dengan textLength: huruf dirapatkan/diregangkan tepat selebar kolom, di font apa pun (tanpa unduhan font).
    const tone = els.has("bands") && lines.length >= 2;
    const half = Math.ceil(lines.length / 2);
    const giantHtml = `<div class="pst-g${tone ? " tone" : ""}" aria-hidden="true">${lines.map((w, i) => fitLine(w, tone && i < half ? "inv" : "")).join("")}</div>`;
    const inkArt = els.has("halftone") ? lookSvg("halftone") : els.has("plus-grid") ? lookSvg("plus-grid") : els.has("sparkle") ? lookSvg("sparkle") : "";
    const elArt = heroImg ? `<img src="${esc(heroImg)}" alt="${esc(c.brand)}">` : art(["crosshair", "barcode", "sunburst", "asterisk", "globe", "pixel", "ring", "sparkle"]);
    const grid = `<div class="pst-grid"><div class="pc pc-ink${els.has("brackets") ? " brkt" : ""}">${c.subheadline ? `<p class="sub">${esc(c.subheadline)}</p>` : ""}<span class="pc-rule" aria-hidden="true"></span>${inkArt}</div><div class="pc pc-acc">${c.badge && !els.has("meta") ? badgeHtml : ""}<h1>${esc(c.headline)}</h1>${ctaRow}${els.has("arrow") ? `<span class="pc-arw" aria-hidden="true">${lookSvg("arrow")}</span>` : ""}</div><div class="pc pc-el">${elArt}</div></div>`;
    return `<div class="pst">${meta}${giantHtml}${grid}</div>`;
  };

  /* Neo brutalism: judul dengan kata disorot (stabilo / warna), daftar centang, visual berbingkai + stiker. */
  const neoEls = look ? els : new Set<string>(["checks", "stickers"]);
  const markedHeadline = (): string => {
    const words = c.headline.split(/\s+/).filter(Boolean);
    const order = [...words.keys()].sort((x, y) => Array.from(words[y]).length - Array.from(words[x]).length);
    const hi = look ? (look.hl >= 0 ? order[look.hl % Math.min(3, words.length)] : -1) : order[0];
    const cls = neoEls.has("marker") ? "mk" : "hlw";
    return words
      .map((w, i) => {
        if (i !== hi) return esc(w);
        const m = /^([^\p{L}\p{N}]*)(.*?)([^\p{L}\p{N}]*)$/u.exec(w);
        return m && m[2] ? `${esc(m[1])}<span class="${cls}">${esc(m[2])}</span>${esc(m[3])}` : esc(w);
      })
      .join(" ");
  };
  /** Ukuran judul supaya kata terpanjang muat di kolom (colPx di desktop, ~320px di ponsel) dan judul panjang menyusut. */
  const neoSize = (maxBase: number, colPx: number): string => {
    const words = c.headline.split(/\s+/).filter(Boolean);
    const longest = Math.max(4, ...words.map((w) => Array.from(w).length));
    const wEm = LOOK_WIDTH[titleFam] * (t.upper ? 1 : 0.88);
    const many = Math.min(1, Math.sqrt(4.5 / Math.max(4.5, words.length)));
    // Maks. ±3,6 baris di kolom desktop untuk judul panjang.
    const chars = Array.from(c.headline).length;
    const max = Math.max(30, Math.round(Math.min(maxBase * (t.heroScale ?? 1) * many, colPx / (longest * wEm), (3.6 * colPx) / (chars * wEm))));
    const min = Math.min(max, Math.max(24, Math.round(Math.min(40 * many, 318 / (longest * wEm)))));
    return ` style="font-size:clamp(${min}px,${(max / 12.8).toFixed(2)}vw,${max}px)"`;
  };
  const checkSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 12.5 9.5 18 20 6.5"/></svg>`;
  const checksHtml = (): string => {
    const xs = (c.features.length ? c.features.map((f) => f.title) : items.map((i) => i.name)).slice(0, 3).map((x) => clip(x, 26));
    return neoEls.has("checks") && xs.length ? `<ul class="nchk">${xs.map((x) => `<li>${checkSvg}${esc(x)}</li>`).join("")}</ul>` : "";
  };
  /** Stiker: ledakan (harga mulai bila ada, selain itu teks stiker gaya), kapsul miring, wajah senyum, kilau. */
  const stickerParts = (): { burst: string; pill: string; smile: string; spark: string } => {
    if (!neoEls.has("stickers")) return { burst: "", pill: "", smile: "", spark: "" };
    const st = look?.stickers ?? [];
    const first = statList()[0];
    const price = first && first.k === "Harga mulai" ? first.v : "";
    const h = hash(c.brand);
    return {
      burst: price ? burstSticker(price, "mulai") : st[0] ? burstSticker(st[0]) : "",
      pill: st[price ? 0 : 1] ? `<span class="nst nst-l" aria-hidden="true" style="--rt:${h % 2 ? -6 : 5}deg">${esc(st[price ? 0 : 1])}</span>` : "",
      smile: h % 3 !== 2 ? SMILEY_STICKER : "",
      spark: SPARK_STICKER,
    };
  };
  const neoStats = (): string => (els.has("stats") ? `<div class="nstat">${statsHtml()}</div>` : "");

  const neoHero = (): string => {
    const oa = ornOf("art");
    const visual = heroImg
      ? `<div class="nv-img"><img src="${esc(heroImg)}" alt="${esc(c.brand)}"></div>`
      : `<div class="nv-art" aria-hidden="true">${oa ? `<svg viewBox="${oa.vb}" focusable="false">${oa.svg}</svg>` : neoArt(hash(c.brand + c.headline))}</div>`;
    const kick = look?.kicker || c.slogan || "";
    const lbl = kick ? `<p class="nv-lbl"><i aria-hidden="true">${ico(c.brandIcon || "sparkles", 18)}</i><span>${esc(clip(kick, 48))}</span></p>` : "";
    const sp = stickerParts();
    return `<div class="nh"><div class="nh-t">${c.badge ? badgeHtml : ""}<h1 class="nh-h"${neoSize(84, 560)}>${markedHeadline()}</h1>${c.subheadline ? `<p class="sub">${esc(c.subheadline)}</p>` : ""}${ctaRow}${checksHtml()}</div><div class="nh-v">${visual}${lbl}${sp.burst}${sp.smile}${sp.pill}${sp.spark}</div></div>${neoStats()}`;
  };

  const collageHero = (): string => {
    const rot = [-5, 3, -2, 4];
    const cards = heroRows.slice(0, 3).map(
      (r) =>
        `<div class="ncc"><i aria-hidden="true">${ico(r.icon, 22)}</i><b>${esc(clip(r.title, 40))}</b>${r.tail ? `<em>${esc(r.tail)}</em>` : r.text ? `<small>${esc(clip(r.text, 56))}</small>` : ""}</div>`,
    );
    if (heroImg) cards.splice(Math.min(1, cards.length), 0, `<div class="ncc ncc-img"><img src="${esc(heroImg)}" alt="${esc(c.brand)}"></div>`);
    const tilted = cards.map((x, i) => x.replace(/^<div class="ncc/, `<div style="--rt:${rot[i % rot.length]}deg" class="ncc`));
    const kick = look?.kicker || c.slogan || "";
    const sp = stickerParts();
    const row = tilted.length
      ? `<div class="nc-row">${kick ? `<p class="nsb" aria-hidden="true">${esc(clip(kick, 60))}</p>` : ""}${tilted.join("")}${sp.smile}${sp.spark}${sp.burst}${sp.pill}</div>`
      : "";
    return `<div class="nc">${tilted.length ? "" : sp.pill}${c.badge ? badgeHtml : ""}<h1 class="nc-h"${neoSize(92, 900)}>${markedHeadline()}</h1>${c.subheadline ? `<p class="sub">${esc(c.subheadline)}</p>` : ""}${ctaRow}${checksHtml()}${row}</div>${neoStats()}`;
  };

  let heroInner = heroText + himg;
  if (heroL === "split") {
    heroInner = `<div class="hsplit"><div>${heroText}</div><div class="visual">${himg}${visualRows}</div></div>`;
  } else if (heroL === "split-bold") {
    const cards = heroRows
      .map((r) => `<div class="scard vrow"><i>${ico(r.icon, 20)}</i><div><b>${esc(r.title)}</b><small>${esc(clip(r.text, 60))}</small></div>${r.tail ? `<em>${esc(r.tail)}</em>` : ""}</div>`)
      .join("");
    heroInner = `<div class="hsplit hbold"><div>${heroText}</div><div class="stack">${himg}${cards}</div></div>`;
  } else if (heroL === "asymmetric") {
    const card = (r: (typeof heroRows)[number], cls: string, n: number): string =>
      `<div class="acard ${cls}"><i>${ico(r.icon, 20)}</i><div><b>${esc(r.title)}</b><small>${esc(clip(r.text, n))}</small></div>${r.tail ? `<span class="ap">${esc(r.tail)}</span>` : ""}</div>`;
    const cards = heroRows.map((r, i) => card(r, i === 0 ? "big" : "", i === 0 ? 100 : 48)).join("");
    heroInner = `<div class="hsplit hasym"><div>${heroText}</div><div class="agrid">${himg}${cards}</div></div>`;
  } else if (heroL === "poster") {
    heroInner = posterHero();
  } else if (heroL === "breaker") {
    heroInner = breakerHero();
  } else if (heroL === "terminal") {
    heroInner = terminalHero();
  } else if (heroL === "dashboard") {
    heroInner = dashboardHero();
  } else if (heroL === "label") {
    heroInner = labelHero();
  } else if (heroL === "neo") {
    heroInner = neoHero();
  } else if (heroL === "collage") {
    heroInner = collageHero();
  } else if (heroL === "editorial") {
    heroInner = `<div class="hed"><div class="hed-top"><span class="slo">${esc(c.slogan || c.brand)}</span>${c.badge ? badgeHtml : ""}</div><h1>${esc(c.headline)}</h1><div class="hed-bot">${subHtml}${ctaRow}</div></div>${himg}`;
  }

  const tickText = look?.elements.includes("ticker") ? look.ticker || c.slogan || c.brand : "";
  const sep = els.has("asterisk") ? "\u2731" : els.has("sparkle") ? "\u2726" : "\u25CF";
  const tickWords = [tickText, ...c.features.slice(0, 4).map((f) => f.title)].filter(Boolean);
  const ticker = tickText
    ? `<div class="tick" aria-hidden="true"><div class="tk">${Array.from({ length: 3 }, () => tickWords.map((w) => `<span>${esc(w)}</span><span>${sep}</span>`).join("")).join("")}${Array.from({ length: 3 }, () => tickWords.map((w) => `<span>${esc(w)}</span><span>${sep}</span>`).join("")).join("")}</div></div>`
    : "";
  const bignum = look && els.has("bignum") ? `<div class="wrap bignum" aria-hidden="true">${fitLine(year.slice(-3), "", false)}</div>` : "";
  const hazard = look && els.has("hazard") ? `<div class="hz" aria-hidden="true"></div>` : "";
  // Ornamen "divider": pita motif selebar layar di bawah hero (gambar latar berulang, warna sudah diselesaikan).
  const pal = { fg: t.fg, bg: t.bg, a, a2: t.acc2 ?? a, ink: look?.ink ?? t.fg, on: onColor(a), s1: swatches[0], s2: swatches[1], s3: swatches[2], s4: swatches[3], s5: swatches[4] };
  const od = ornOf("divider");
  const odVb = od ? od.vb.split(" ").map(Number) : [];
  const divider = od
    ? `<div class="orn-div" aria-hidden="true" style="background-image:url(&quot;${svgDataUri(od.vb, resolveSvgColors(od.svg, pal))}&quot;);background-size:auto 100%;height:${Math.max(16, Math.min(64, Math.round((odVb[3] / odVb[2]) * 240)))}px"></div>`
    : "";
  // Ornamen "corner": bentuk dekoratif di sudut hero (di belakang isi, terpotong rapi di tepi). Hanya tanpa gaya
  // visual, karena hero gaya (poster, terminal, ...) sudah padat elemen.
  // Hero neo/kolase cukup lega, jadi ornamen sudut tetap boleh tampil di gaya latihan (kecuali sudah ada bentuk geometris).
  const neoL = heroL === "neo" || heroL === "collage";
  // Hero padat (poster, judul pecah, terminal, dasbor, label) tidak diberi hiasan sudut supaya tidak menimpa judul.
  const denseHero = ["poster", "breaker", "terminal", "dashboard", "label"].includes(heroL);
  const oc = denseHero || (look && !(neoL && !els.has("shapes"))) ? undefined : ornOf("corner");
  const shapes = look && els.has("shapes") && !denseHero ? neoShapes(hash(c.brand)) : "";
  const corner = oc ? `<div class="orcw" aria-hidden="true"><div class="orc"><svg viewBox="${oc.vb}" focusable="false">${oc.svg}</svg></div></div>` : "";
  if (opts.editable) {
    // Editor kanvas: judul, sub-judul, lencana, dan foto utama bisa diklik.
    heroInner = heroInner
      .replace(/<h1(?=[\s>])/, '<h1 data-f="headline"')
      .replace('<p class="sub">', '<p class="sub" data-f="subheadline">')
      .replace('<div class="badge">', '<div class="badge" data-f="badge">');
    if (heroImg) heroInner = heroInner.split(`<img src="${esc(heroImg)}"`).join(`<img data-img="hero" src="${esc(heroImg)}"`);
  }
  const hero = `<div class="hero h-${heroL}"${opts.editable ? ' data-sec="hero"' : ""}><div class="glow"></div>${ornamentMarkup(t.deco)}${shapes}${corner}${bignum}<div class="wrap">${heroInner}</div></div>${hazard}${ticker}${divider}`;

  /* ----- katalog / layanan ----- */
  const priceLabel = (i: SiteItem) => (i.price > 0 ? fmtRp(i.price) : "Tanya harga");
  const itemCard = (i: SiteItem, n: number): string =>
    `<article class="card prod${i.size === "large" ? " large" : ""}"${toneStyle(n)}>${
      i.img ? `<div class="pimg"${efImg(`item:${i.id}`)}><img src="${esc(i.img)}" alt="${esc(i.name)}" loading="lazy"></div>` : `<div class="pico"${efImg(`item:${i.id}`)}>${ico(i.icon, 20)}</div>`
    }<div class="pbody">${i.tag || i.category ? `<div class="ptags">${i.tag ? `<span class="ptag hot">${esc(i.tag)}</span>` : ""}${i.category ? `<span class="ptag">${esc(i.category)}</span>` : ""}</div>` : ""}<h3${shop ? "" : ef(`items.${n}.name`)}>${esc(i.name)}</h3>${i.desc ? `<p${shop ? "" : ef(`items.${n}.desc`)}>${esc(i.desc)}</p>` : ""}</div>${
      shop
        ? `<div class="pfoot"><strong class="pprice">${esc(priceLabel(i))}</strong><button type="button" class="btn sm add">${ico("plus", 16)}Tambah</button></div>`
        : i.price > 0
          ? `<div class="pfoot"><strong class="pprice">${esc(fmtRp(i.price))}</strong></div>`
          : ""
    }</article>`;

  const catalog = !hasItems
    ? ""
    : shop
      ? `<section id="katalog"><div class="wrap"><h2${ef("itemsTitle")}>${esc(c.itemsTitle)}</h2><div class="shop-tools"><label class="search">${ico("search", 18)}<input id="wb-q" type="search" placeholder="Cari produk…" aria-label="Cari produk" autocomplete="off"></label><div id="wb-cats" data-wb-dyn></div></div><div id="wb-grid" class="items" data-wb-dyn>${items.map(itemCard).join("")}</div></div></section>`
      : `<section id="layanan"><div class="wrap"><h2${ef("itemsTitle")}>${esc(c.itemsTitle)}</h2><div class="items">${items.map(itemCard).join("")}</div></div></section>`;

  /* ----- artikel: daftar + halaman baca (murni CSS :target, tanpa skrip) ----- */
  const artMeta = (x: SiteArticle): string => [x.author, `${x.readMin} mnt baca`].filter(Boolean).map(esc).join(" · ");
  const artCover = (x: SiteArticle): string => {
    const s0 = imgSrc(`article:${x.id}`);
    return s0 ? `<div class="acov"><img src="${esc(s0)}" alt="" loading="lazy"></div>` : `<div class="acov ph" aria-hidden="true"><i>${ico("book-open", 26)}</i></div>`;
  };
  const rest = arts.length - 1;
  const tailSpan = (i: number): string => {
    if (i === 0 || rest <= 0) return "";
    if (rest % 3 === 1 && i === arts.length - 1) return " s6";
    if (rest % 3 === 2 && i >= arts.length - 2) return " s3";
    return "";
  };
  const postCard = (x: SiteArticle, i: number): string =>
    `<article class="card post${i === 0 ? " top" : tailSpan(i)}">${artCover(x)}<div class="pcont">${x.category ? `<div class="ptags"><span class="ptag hot">${esc(x.category)}</span></div>` : ""}<h3><a href="#a-${x.id}">${esc(x.title)}</a></h3><p>${esc(x.excerpt)}</p><div class="pmeta"><span>${artMeta(x)}</span><span class="more">Baca${ico("arrow-right", 16)}</span></div></div></article>`;
  const articlesSec = isArticle ? `<section id="artikel"><div class="wrap"><h2${ef("itemsTitle")}>${esc(c.itemsTitle)}</h2><div class="posts">${arts.map(postCard).join("")}</div></div></section>` : "";
  const readers = isArticle
    ? arts
        .map((x, i) => {
          const prev = arts[i - 1];
          const next = arts[i + 1];
          const cov = imgSrc(`article:${x.id}`);
          const body = x.body.map((p) => (p.startsWith("## ") ? `<h3>${esc(p.slice(3))}</h3>` : `<p>${esc(p)}</p>`)).join("");
          return `<article id="a-${x.id}" class="reader" aria-label="${esc(x.title)}"><div class="rbar"><div class="wrap rw"><a class="btn ghost sm" href="#artikel">${ico("arrow-left", 16)}Semua artikel</a><span class="rbrand">${esc(c.brand)}</span></div></div><div class="rbody"><header class="rhead">${x.category ? `<span class="ptag hot">${esc(x.category)}</span>` : ""}<h1>${esc(x.title)}</h1><p class="rmeta">${artMeta(x)}</p></header>${cov ? `<div class="acov rcov"><img src="${esc(cov)}" alt=""></div>` : ""}<div class="prose">${body}</div><nav class="rnav" aria-label="Artikel lainnya">${prev ? `<a class="card" href="#a-${prev.id}"><small>Sebelumnya</small><b>${esc(prev.title)}</b></a>` : "<span></span>"}${next ? `<a class="card" href="#a-${next.id}"><small>Berikutnya</small><b>${esc(next.title)}</b></a>` : "<span></span>"}</nav></div></article>`;
        })
        .join("\n")
    : "";

  /* ----- fitur ----- */
  const featCard = (f: SiteFeature, n: number, cls = "") => `<article class="card feat ${cls}${f.span === 2 ? " s2" : ""}"${toneStyle(n + 1)}><div class="ico">${ico(f.icon, 20)}</div><div><h3${ef(`features.${n}.title`)}>${esc(f.title)}</h3><p${ef(`features.${n}.text`)}>${esc(f.text)}</p></div></article>`;
  const featBody =
    featL === "index"
      ? `<div class="idx"><div class="idx-h"><b class="idx-n" aria-hidden="true">${pad2(c.features.length)}</b><h2${ef("featuresTitle")}>${esc(c.featuresTitle)}</h2>${c.slogan ? `<p>${esc(c.slogan)}</p>` : ""}</div><ol class="idx-l">${c.features
          .map((f, i) => `<li><span class="idx-i">${pad2(i + 1)}</span><div><h3${ef(`features.${i}.title`)}>${esc(f.title)}</h3><p${ef(`features.${i}.text`)}>${esc(f.text)}</p></div></li>`)
          .join("")}</ol></div>`
      : featL === "bento"
      ? `<h2${ef("featuresTitle")}>${esc(c.featuresTitle)}</h2><div class="bento ${c.features.some((f) => f.span === 2) ? "bx" : `b${c.features.length}`}">${c.features.map((f, n) => featCard(f, n)).join("")}</div>`
      : featL === "editorial"
        ? `<div class="flist"><div class="head"><h2${ef("featuresTitle")}>${esc(c.featuresTitle)}</h2>${c.slogan ? `<p>${esc(c.slogan)}</p>` : ""}</div><ol class="fedlist">${c.features
            .map((f, i) => `<li class="fe"><span class="fn">${String(i + 1).padStart(2, "0")}</span><h3${ef(`features.${i}.title`)}>${esc(f.title)}</h3><p${ef(`features.${i}.text`)}>${esc(f.text)}</p></li>`)
            .join("")}</ol></div>`
        : featL === "list"
          ? `<div class="flist"><div class="head"><h2${ef("featuresTitle")}>${esc(c.featuresTitle)}</h2>${c.subheadline ? `<p>${esc(c.subheadline)}</p>` : ""}</div><div class="frows">${c.features.map((f, n) => featCard(f, n, "frow")).join("")}</div></div>`
          : `<h2${ef("featuresTitle")}>${esc(c.featuresTitle)}</h2><div class="grid">${c.features.map((f, n) => featCard(f, n)).join("")}</div>`;
  const features = hasFeatures ? `<section id="fitur"><div class="wrap">${featBody}</div></section>` : "";

  const steps = c.steps.length
    ? `<section id="cara"><div class="wrap"><h2${ef("stepsTitle")}>${esc(c.stepsTitle)}</h2><ol class="steps">${c.steps
        .map((s0, i) => `<li class="card"><b>${String(i + 1).padStart(2, "0")}</b><h3${ef(`steps.${i}.title`)}>${esc(s0.title)}</h3><p${ef(`steps.${i}.text`)}>${esc(s0.text)}</p></li>`)
        .join("")}</ol></div></section>`
    : "";

  const quoteIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z"/><path d="M5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z"/></svg>`;
  const testi = c.testimonial?.text
    ? `<section id="testimoni"><div class="wrap"><div class="tq"><div class="tqh"><div class="ico">${quoteIcon}</div><small>Kata pelanggan</small></div><blockquote><p${ef("testimonial.text")}>${esc(c.testimonial.text)}</p>${c.testimonial.name ? `<cite${ef("testimonial.name")}>${esc(c.testimonial.name)}</cite>` : ""}</blockquote></div></div></section>`
    : "";

  const contactItems = [
    c.address ? `<div class="ci"><i>${ico("map-pin", 20)}</i><div><small>Alamat</small><span>${esc(c.address)}</span></div></div>` : "",
    c.hours ? `<div class="ci"><i>${ico("clock", 20)}</i><div><small>Jam buka</small><span>${esc(c.hours)}</span></div></div>` : "",
    c.whatsapp ? `<div class="ci"><i>${ico("message-circle", 20)}</i><div><small>WhatsApp</small><span>+${esc(c.whatsapp)}</span></div></div>` : "",
    c.email ? `<div class="ci"><i>${ico("mail", 20)}</i><div><small>Email</small><span>${esc(c.email)}</span></div></div>` : "",
  ].join("");

  const about = c.about
    ? `<section id="tentang"><div class="wrap split"><div><h2${ef("aboutTitle")}>${esc(c.aboutTitle)}</h2><p class="lead"${ef("about")}>${esc(c.about)}</p></div>${
        contactItems ? `<div class="card info">${contactItems}</div>` : ""
      }</div></section>`
    : contactItems
      ? `<section id="tentang"><div class="wrap"><div class="card info one">${contactItems}</div></div></section>`
      : "";

  const buttons = [
    wa ? `<a class="btn" href="${wa}" rel="noopener">${ico("message-circle", 18)}${esc(/wa|whatsapp/i.test(c.ctaLabel) ? c.ctaLabel : `${c.ctaLabel} via WhatsApp`)}</a>` : "",
    mail ? `<a class="btn ${wa ? "ghost" : ""}" href="${mail}">${ico("mail", 18)}${wa || isArticle ? "Kirim Email" : esc(c.ctaLabel)}</a>` : "",
  ].join("");

  // Ornamen "pattern": motif tipis di latar blok ajakan, warnanya ikut warna teks blok.
  const op = ornOf("pattern");
  const bandText = look ? (look.base === "neo" ? textOn(t.acc2 ?? a, look.ink) : look.bg) : t.brutal ? (contrastRatio(t.bg, "#0a0a0a") >= 4.5 ? t.bg : "#ffffff") : onColor(a);
  const bandPattern = op
    ? ` style="background-image:url(&quot;${svgDataUri(op.vb, `<g opacity=".16">${resolveSvgColors(op.svg, { ...pal, fg: bandText, ink: bandText })}</g>`)}&quot;);background-size:${Math.round(Number(op.vb.split(" ")[2]) * 0.6)}px auto"`
    : "";
  const band = buttons
    ? `<section id="kontak"><div class="wrap"><div class="band"${bandPattern}>${ornamentMarkup(t.deco)}${ornOf("badge") ? "" : look && els.has("ring") ? `<span class="bd-el bd-ring">${ringSvg(c.brand, lookSvg(els.has("asterisk") ? "asterisk" : "sparkle"))}</span>` : look && (els.has("asterisk") || els.has("arrow") || els.has("sparkle")) ? `<span class="bd-el" aria-hidden="true">${lookSvg(els.has("asterisk") ? "asterisk" : els.has("sparkle") ? "sparkle" : "arrow")}</span>` : ""}<div class="bd-txt">${ornOf("badge") ? ornSvg(ornOf("badge")!, "bd-badge") : ""}<div><h2${ef("closing")}>${esc(c.closing)}</h2>${c.closingText ? `<p${ef("closingText")}>${esc(c.closingText)}</p>` : ""}</div></div>${ornOf("art") && !look ? ornSvg(ornOf("art")!, "bd-art") : ""}<div class="row">${buttons}</div></div></div></section>`
    : "";

  /* ----- urutan bagian: UMKM = katalog dulu; artikel = daftar artikel dulu; lainnya = keunggulan dulu ----- */
  const secHtml: Record<SectionId, string> = { katalog: isArticle ? "" : catalog, artikel: articlesSec, fitur: features, testimoni: testi, cara: steps, tentang: about, kontak: band };
  const sections = sectionOrder(c, shop)
    .filter((id) => !hiddenSec.has(id) && secHtml[id])
    .map((id) => (opts.editable ? secHtml[id].replace(/^<section /, `<section data-sec="${id}" `) : secHtml[id]));

  /* ----- keranjang + data untuk skrip ----- */
  const cartBtn = shop ? `<button type="button" id="wb-cartbtn" class="btn ghost cartbtn" aria-label="Buka keranjang">${ico("shopping-cart", 18)}<b id="wb-count" style="display:none">0</b></button>` : "";
  const cartUi = shop
    ? `<div id="wb-adminbar" class="adminbar"></div>
<aside id="wb-cart" class="cdrawer" aria-hidden="true" aria-label="Keranjang"><div class="chead"><h3>Keranjang</h3><button type="button" id="wb-cartclose" class="ib" aria-label="Tutup keranjang">${ico("x", 16)}</button></div><div id="wb-lines" class="clines" data-wb-dyn></div><div class="cfoot"><div class="csum"><span>Total</span><b id="wb-sum">-</b></div><button type="button" id="wb-order" class="btn" disabled>${ico(wa ? "message-circle" : "save", 18)}${wa ? "Pesan via WhatsApp" : "Salin pesanan"}</button><button type="button" id="wb-clear" class="btn ghost sm">Kosongkan keranjang</button></div></aside><div id="wb-cartback" class="cback"></div>
<div id="wb-toast" class="toast" role="status" aria-live="polite"></div>`
    : "";

  let dataScript = "";
  if (shop) {
    const used = new Set<string>([...SHOP_ICONS, ...RUNTIME_UI_ICONS, ...items.map((i) => i.icon)]);
    const icons: Record<string, string> = {};
    // Isi ikon sudah diberi gaya ikon website ini, karena skrip katalog menggambar ulang kartu produk di browser.
    for (const n of used) if (LUCIDE[n] || customIcons[n]) icons[n] = iconInner(n);
    dataScript = `<script type="application/json" id="wb-data">${jsonForScript({
      shop: true,
      key: hash(c.brand).toString(36),
      brand: c.brand,
      wa: c.whatsapp,
      items,
      pick: SHOP_ICONS,
      icons,
    })}</script>`;
  }

  const css = buildCss(t, a, heroL, shop, c.hover ?? "lift", extra, isArticle, look, ["poster", "breaker", "terminal", "dashboard", "label"].includes(heroL) || featL === "index" || !!ticker || !!hazard || (neoL && els.has("stats")), swatches);
  const js = shop ? SHOP_RUNTIME_JS : "";

  const bodyCls = look
    ? ` class="lk lk-${esc(look.style)}${heroL === "terminal" ? " lk-s1" : ""}${look.shape.gap === 0 ? " lk-g0" : ""}${look.elements.includes("index") ? " lk-idx" : ""}${look.elements.includes("blocks") ? " lk-blk" : ""}${look.elements.includes("numbers") ? " lk-num" : ""}${look.base === "neo" ? " lkn" : ""}${NEO_BODY_CLS.filter(([e]) => look.elements.includes(e)).map(([, k]) => ` ${k}`).join("")}"`
    : "";
  // Deskripsi untuk mesin pencari & pratinjau tautan (WhatsApp, Facebook): maks. ±155 karakter.
  const metaDesc = clip(c.subheadline || c.headline, 155);
  const favInitial = esc((Array.from(c.brand.trim())[0] ?? "•").toUpperCase());
  const favicon = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${a}"/><text x="32" y="44" font-family="Arial,Helvetica,sans-serif" font-size="34" font-weight="700" text-anchor="middle" fill="${onColor(a)}">${favInitial}</text></svg>`)}`;
  const head = `<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(c.brand)} | ${esc(clip(c.headline, 70))}</title>
<meta name="description" content="${esc(metaDesc)}">
<meta name="theme-color" content="${t.bg}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(c.brand)}">
<meta property="og:description" content="${esc(metaDesc)}">
<meta property="og:locale" content="id_ID">
<meta name="twitter:card" content="summary">
<link rel="icon" href="${favicon}">`;

  const topbar =
    look && els.has("topbar")
      ? `<div class="ntop"><div class="wrap"><span>${esc(clip(look.ticker || look.kicker || c.slogan || c.brand, 70))}</span>${c.hours ? `<span>${esc(clip(c.hours, 40))}</span>` : c.address ? `<span>${esc(clip(c.address, 40))}</span>` : ""}</div></div>\n`
      : "";
  // Menu HP: tautan bagian + tombol utama di panel lipat (tanpa skrip; satu baris skrip menutupnya setelah diklik).
  const burger = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>`;
  const mnav = nav ? `<details class="mnav"><summary aria-label="Buka menu">${burger}</summary><nav class="mlinks" aria-label="Menu">${nav}<a class="btn" href="${ctaHref}">${esc(c.ctaLabel)}</a></nav></details>` : "";
  const mnavJs = nav ? `<script>document.addEventListener("click",function(e){var t=e.target,d=document.querySelector(".mnav[open]");if(!d)return;if(!t.closest||!t.closest(".mnav")||t.closest(".mlinks a"))d.open=false;});</script>` : "";
  const body = `<a class="skip" href="#main">Lewati ke konten</a>\n${topbar}<header class="nav"><div class="wrap"><a class="brand" href="#"><i${logo ? ' class="logo"' : ""}${efImg("logo")}>${brandMark}</i><span${ef("brand")}>${esc(c.brand)}</span></a><nav class="links" aria-label="Menu utama">${nav}</nav>${cartBtn}<a class="btn" href="${ctaHref}">${esc(c.ctaLabel)}</a>${mnav}</div></header>
<main id="main" tabindex="-1">
${hero}
${sections.join("\n")}
</main>
${look && els.has("checker") ? `<div class="ck" aria-hidden="true"></div>` : ""}<footer><div class="wrap"><span>© ${esc(c.brand)}${c.slogan ? ` · ${esc(c.slogan)}` : ""}</span><span>Dibuat dengan Depup AI Web Builder</span></div></footer>
${readers}
${cartUi}
${dataScript}
${mnavJs}`;

  const single = `<!doctype html>
<html lang="id">
<head>
${head}
<style>
${css}
</style>
</head>
<body${bodyCls}>
${body}
${js ? `<script>\n${js}\n</script>` : ""}
</body>
</html>`;

  const index = `<!doctype html>
<html lang="id">
<head>
${head}
<link rel="stylesheet" href="assets/style.css">
</head>
<body${bodyCls}>
${body}
${js ? `<script src="assets/app.js" defer></script>` : ""}
</body>
</html>`;

  return { single, index, css, js, hasJs: !!js, assets };
}

/** Satu file HTML mandiri (pratinjau & publish). */
export function renderSite(content: SiteContent, template: TemplateId, accent?: string, opts?: RenderOpts): string {
  return buildSite(content, template, accent, opts).single;
}

/* ------------------------------------------------------------------ */
/* Contoh isi untuk pratinjau instan (tanpa memanggil AI)              */
/* ------------------------------------------------------------------ */

const SAMPLE_BASE = {
  template: "bersih" as TemplateId,
  accent: "#2563EB",
  hero: "center" as HeroLayout,
  feat: "grid" as FeatLayout,
  brandIcon: "",
  badge: "",
  items: [] as SiteItem[],
  itemsTitle: "",
  steps: [] as SiteStep[],
  stepsTitle: "Cara kerjanya",
  whatsapp: "",
  email: "halo@contoh.id",
  address: "Bandung, Jawa Barat",
  hours: "Senin – Sabtu, 09.00 – 17.00",
};

/**
 * Isi contoh yang dirender langsung di pratinjau sebelum pengguna menekan "Buat website".
 * Tidak pernah dipublish atau diekspor; hanya untuk melihat efek template, warna, dan tata letak.
 */
export function sampleContent(kind: SiteKind = "jasa"): SiteContent {
  const feats = (rows: [string, string, string][]): SiteFeature[] => rows.map(([icon, title, text]) => ({ icon, title, text }));
  switch (kind) {
    case "umkm":
      return {
        ...SAMPLE_BASE,
        kind,
        brand: "Warung Contoh",
        slogan: "Enak, cepat, harga bersahabat",
        badge: "Buka setiap hari",
        headline: "Masakan rumahan yang bikin kangen",
        subheadline: "Dimasak segar setiap pagi dengan bahan pilihan, siap diantar ke rumahmu.",
        ctaLabel: "Lihat menu",
        featuresTitle: "Kenapa pilih kami",
        features: feats([
          ["leaf", "Bahan segar", "Belanja langsung dari pasar setiap pagi."],
          ["clock", "Cepat saji", "Pesanan siap dalam hitungan menit."],
          ["truck", "Antar ke rumah", "Gratis ongkir untuk area sekitar."],
        ]),
        itemsTitle: "Menu favorit",
        items: [
          { id: "s1", name: "Paket Hemat", desc: "Nasi, lauk, dan sayur pilihan.", price: 18000, category: "Paket", icon: "utensils", img: "", size: "large", tag: "Best Seller" },
          { id: "s2", name: "Sup Hangat", desc: "Kuah gurih dengan isian lengkap.", price: 15000, category: "Makanan", icon: "soup", img: "" },
          { id: "s3", name: "Es Teh Manis", desc: "Segar dan manisnya pas.", price: 5000, category: "Minuman", icon: "cup-soda", img: "" },
        ],
        steps: [
          { title: "Pilih menu", text: "Pilih makanan dan minuman favoritmu." },
          { title: "Kirim pesanan", text: "Pesan lewat WhatsApp dengan sekali klik." },
          { title: "Tinggal santap", text: "Pesanan datang masih hangat." },
        ],
        aboutTitle: "Tentang kami",
        about: "Kami usaha keluarga yang percaya makanan enak tidak harus mahal. Setiap porsi dimasak dengan resep yang sama sejak awal.",
        closing: "Lapar? Pesan sekarang",
        closingText: "Hubungi kami dan pesananmu langsung kami siapkan.",
        testimonial: { text: "Rasanya konsisten dan pengantarannya cepat. Langganan sejak buka.", name: "Rina, pelanggan" },
      };
    case "portofolio":
      return {
        ...SAMPLE_BASE,
        kind,
        brand: "Nama Kamu",
        slogan: "Desainer & pengembang web",
        badge: "Terbuka untuk proyek baru",
        headline: "Saya membangun produk digital yang rapi dan mudah dipakai",
        subheadline: "Fokus pada antarmuka yang jelas, performa cepat, dan hasil yang bisa diukur.",
        ctaLabel: "Lihat karya",
        featuresTitle: "Keahlian",
        features: feats([
          ["code", "Pengembangan web", "React, Next.js, dan Tailwind CSS."],
          ["palette", "Desain antarmuka", "Prototipe, sistem desain, dan uji pengguna."],
          ["users", "Kerja tim", "Terbiasa dengan Git, review kode, dan dokumentasi."],
        ]),
        steps: [
          { title: "Diskusi", text: "Memahami tujuan dan kebutuhanmu." },
          { title: "Rancang", text: "Membuat desain dan prototipe." },
          { title: "Bangun", text: "Mengembangkan dan merilis hasilnya." },
        ],
        aboutTitle: "Tentang saya",
        about: "Saya senang mengubah ide menjadi produk yang benar-benar dipakai orang, dengan perhatian pada detail kecil.",
        closing: "Punya proyek?",
        closingText: "Ceritakan idemu, saya balas secepatnya.",
      };
    case "event":
      return {
        ...SAMPLE_BASE,
        kind,
        brand: "Festival Contoh",
        slogan: "Satu hari penuh seru",
        badge: "Sabtu, 15 November",
        headline: "Festival komunitas terbesar tahun ini",
        subheadline: "Musik, kuliner, dan workshop gratis untuk semua umur.",
        ctaLabel: "Daftar sekarang",
        featuresTitle: "Yang menunggumu",
        features: feats([
          ["music", "Penampil lokal", "Belasan penampil dari kota sendiri."],
          ["utensils", "Bazar kuliner", "Puluhan stan makanan dan minuman."],
          ["ticket", "Tiket gratis", "Daftar online, kuota terbatas."],
        ]),
        steps: [
          { title: "Daftar", text: "Isi data singkat secara online." },
          { title: "Datang", text: "Tunjukkan kode pendaftaran di pintu masuk." },
          { title: "Nikmati", text: "Ikuti acara dari pagi sampai malam." },
        ],
        aboutTitle: "Tentang acara",
        about: "Festival tahunan yang mempertemukan warga, pelaku usaha kecil, dan seniman dalam satu tempat.",
        closing: "Jangan sampai ketinggalan",
        closingText: "Kuota terbatas, amankan tempatmu hari ini.",
        address: "Lapangan Kota",
        hours: "10.00 – 22.00",
      };
    case "profil":
      return {
        ...SAMPLE_BASE,
        kind,
        brand: "Komunitas Contoh",
        slogan: "Tumbuh bersama",
        headline: "Wadah belajar dan berbagi untuk semua anggota",
        subheadline: "Kami mengadakan pertemuan rutin, pelatihan, dan kegiatan sosial.",
        ctaLabel: "Gabung",
        featuresTitle: "Kegiatan kami",
        features: feats([
          ["users", "Pertemuan rutin", "Berkumpul dan berbagi setiap bulan."],
          ["graduation-cap", "Pelatihan", "Kelas singkat dari anggota berpengalaman."],
          ["hand-heart", "Aksi sosial", "Kegiatan bermanfaat untuk lingkungan sekitar."],
        ]),
        steps: [
          { title: "Kenalan", text: "Hadiri pertemuan terbuka pertama." },
          { title: "Daftar", text: "Isi formulir keanggotaan." },
          { title: "Terlibat", text: "Ikut kegiatan sesuai minatmu." },
        ],
        aboutTitle: "Tentang kami",
        about: "Berdiri dari sekelompok teman yang ingin saling membantu, kini kami memiliki ratusan anggota aktif.",
        closing: "Mau bergabung?",
        closingText: "Pendaftaran terbuka untuk siapa saja.",
      };
    case "artikel":
      return {
        ...SAMPLE_BASE,
        kind,
        template: "majalah",
        brand: "Catatan Contoh",
        slogan: "Tulisan yang layak dibaca",
        headline: "Cerita, ide, dan catatan harian",
        subheadline: "Tulisan singkat seputar hal yang sedang saya pelajari.",
        ctaLabel: "Baca artikel",
        featuresTitle: "Topik",
        features: feats([
          ["pen-tool", "Menulis", "Tips dan proses di balik tulisan."],
          ["lightbulb", "Ide", "Gagasan kecil yang layak dicoba."],
          ["book-open", "Bacaan", "Buku dan artikel yang menginspirasi."],
        ]),
        articles: [
          { id: "a1", title: "Mulai menulis tanpa menunggu siap", excerpt: "Kebiasaan kecil yang membuat tulisan terus jalan.", category: "Menulis", author: "Penulis", readMin: 4, body: ["Mulai dari satu paragraf sehari.", "## Kenapa kecil lebih baik", "Target kecil lebih mudah dijaga dalam jangka panjang."] },
          { id: "a2", title: "Tiga catatan dari buku bulan ini", excerpt: "Hal yang paling membekas dari bacaan terakhir.", category: "Bacaan", author: "Penulis", readMin: 3, body: ["Satu ide sederhana bisa mengubah cara kerja.", "Catat hal yang benar-benar kamu pakai."] },
        ],
        stepsTitle: "Cara berlangganan",
        steps: [
          { title: "Pilih topik", text: "Temukan tulisan yang kamu suka." },
          { title: "Baca", text: "Tiap artikel selesai dalam beberapa menit." },
        ],
        aboutTitle: "Tentang blog ini",
        about: "Blog pribadi tempat saya mencatat hal-hal yang sedang dipelajari.",
        closing: "Tetap terhubung",
        closingText: "Hubungi saya untuk kolaborasi atau sekadar menyapa.",
      };
    default:
      return {
        ...SAMPLE_BASE,
        kind: "jasa",
        brand: "Layanan Contoh",
        slogan: "Rapi, tepat waktu, terpercaya",
        badge: "Terima pesanan baru",
        headline: "Layanan profesional untuk kebutuhanmu",
        subheadline: "Dikerjakan oleh tim berpengalaman dengan harga yang jelas sejak awal.",
        ctaLabel: "Hubungi kami",
        featuresTitle: "Kenapa memilih kami",
        features: feats([
          ["shield-check", "Terpercaya", "Garansi pengerjaan dan layanan purna jual."],
          ["clock", "Tepat waktu", "Jadwal jelas dan dikerjakan sesuai kesepakatan."],
          ["badge-check", "Berpengalaman", "Ratusan pekerjaan selesai dengan hasil memuaskan."],
        ]),
        steps: [
          { title: "Konsultasi", text: "Ceritakan kebutuhanmu, gratis." },
          { title: "Penawaran", text: "Terima rincian harga yang transparan." },
          { title: "Pengerjaan", text: "Kami kerjakan dan laporkan progresnya." },
        ],
        aboutTitle: "Tentang kami",
        about: "Kami tim kecil yang mengutamakan kualitas kerja dan komunikasi yang jujur dengan setiap klien.",
        closing: "Siap memulai?",
        closingText: "Hubungi kami hari ini untuk konsultasi gratis.",
        testimonial: { text: "Pekerjaan rapi dan sesuai jadwal. Pasti pakai lagi.", name: "Budi, klien" },
      };
  }
}
