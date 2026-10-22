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
import { LUCIDE, isIconName, svgIcon } from "@/lib/lucide-icons";
import { SHOP_RUNTIME_JS } from "@/lib/ai-site-runtime";

export type TemplateId = "bersih" | "gelap" | "hangat" | "tegas" | "segar" | "elegan" | "pastel" | "neon" | "bakso" | "kue" | "barber" | "tech" | "majalah" | "jurnal";
export type SiteKind = "umkm" | "jasa" | "portofolio" | "event" | "profil" | "artikel";
/** center/left/split = lawas; split-bold (60/40 + tumpukan kartu), asymmetric (1 kartu besar + 2 kecil), editorial (headline raksasa) = baru. */
export type HeroLayout = "center" | "left" | "split" | "split-bold" | "asymmetric" | "editorial";
export type FeatLayout = "grid" | "bento" | "list" | "editorial";
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
];

export const FEAT_LAYOUTS: { id: FeatLayout; name: string }[] = [
  { id: "grid", name: "Kartu" },
  { id: "bento", name: "Bento" },
  { id: "list", name: "Daftar" },
  { id: "editorial", name: "Editorial 01" },
];

const KINDS: SiteKind[] = ["umkm", "jasa", "portofolio", "event", "profil", "artikel"];

export function isTemplateId(v: unknown): v is TemplateId {
  return typeof v === "string" && TEMPLATES.some((t) => t.id === v);
}
export function isHeroLayout(v: unknown): v is HeroLayout {
  return v === "center" || v === "left" || v === "split" || v === "split-bold" || v === "asymmetric" || v === "editorial";
}
export function isFeatLayout(v: unknown): v is FeatLayout {
  return v === "grid" || v === "bento" || v === "list" || v === "editorial";
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
function iconName(v: unknown, fallback: string): string {
  // "Clock3" / "ShoppingBag" → "clock-3" / "shopping-bag"; "chef_hat" → "chef-hat"
  const t = typeof v === "string" ? v.trim().replace(/([a-z])([A-Z0-9])/g, "$1-$2").toLowerCase().replace(/[_\s]+/g, "-") : "";
  const alias = /^clock-(?:[1-9]|1[0-2])$/.test(t) ? "clock" : t;
  return isIconName(alias) ? alias : fallback;
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

export function normalizeContent(raw: unknown, forceKind?: SiteKind): SiteContent | null {
  if (!raw || typeof raw !== "object") return null;
  const { flat: r, isNew } = adaptNew(raw as Record<string, unknown>);

  const brand = str(r.brand, 40);
  const headline = str(r.headline, 90);

  const features: SiteFeature[] = [];
  if (Array.isArray(r.features)) {
    for (const f of r.features.slice(0, 6)) {
      if (!f || typeof f !== "object") continue;
      const o = f as Record<string, unknown>;
      const title = str(o.title, 50);
      const text = str(o.text ?? o.desc, 160);
      const span: 1 | 2 = Number(o.col_span ?? o.span) === 2 ? 2 : 1;
      if (title && text) features.push({ icon: iconName(o.icon, FEATURE_FALLBACK_ICONS[features.length % 6]), title, text, span });
    }
  }
  // Toleran: model kecil kadang memberi <2 fitur. Lengkapi dari produk/langkah daripada gagal total.
  if (features.length < 2 && Array.isArray(r.items)) {
    for (const it of r.items.slice(0, 4)) {
      if (features.length >= 3 || !it || typeof it !== "object") continue;
      const o = it as Record<string, unknown>;
      const title = str(o.name, 50);
      if (title) features.push({ icon: iconName(o.icon, FEATURE_FALLBACK_ICONS[features.length % 6]), title, text: str(o.desc, 160) || str(r.subheadline, 160) || title });
    }
  }
  const kind: SiteKind = forceKind && KINDS.includes(forceKind) ? forceKind : KINDS.includes(r.kind as SiteKind) ? (r.kind as SiteKind) : "profil";

  const articles: SiteArticle[] = [];
  const aSeed = hash(brand || "x").toString(36);
  if (Array.isArray(r.articles)) {
    for (const ar of r.articles.slice(0, 6)) {
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
        icon: iconName(o.icon, "package"),
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
    brandIcon: iconName(r.brandIcon, ""),
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
- products[].size: "large" atau "small". Buat variasi: tepat 1 produk "large" (best seller, tag "Best Seller" atau sejenisnya), sisanya "small". Jumlah produk untuk umkm: 5 atau 9 (agar grid bento rapi). Untuk jasa/portofolio/event: 3 sampai 5 item (paket layanan, karya, atau acara), 1 di antaranya large. Untuk profil boleh []. Untuk artikel: [].
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
- articles (WAJIB bila type artikel, selain itu []): 3 sampai 4 artikel dengan topik berbeda. title maks 12 kata, excerpt maks 25 kata, category 1 sampai 2 kata, read_min angka, body 3 sampai 4 paragraf (tiap paragraf 2 sampai 3 kalimat, konkret dan informatif; boleh satu paragraf berawalan "## " sebagai subjudul). author HANYA bila pengguna menyebut nama, selain itu "". Jangan mengarang statistik, kutipan ahli, atau klaim medis/hukum.
- testimonial: isi HANYA bila pengguna memberikan kutipan pelanggan yang nyata. Selain itu text dan name string kosong. Jangan mengarang testimoni.
- contact.wa (angka internasional tanpa +), contact.address, contact.hours, contact.email: isi HANYA jika pengguna menyebutkannya; selain itu string kosong. Jangan mengarang kontak.
- Tolak (isi {"error":"alasan singkat"}) bila permintaan untuk phishing, meniru bank/instansi/merek lain, penipuan, judi, konten dewasa, atau melanggar hukum.`;

/* ---------- render ---------- */

const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const rgb = (hex: string): string => {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
};

const lum = (hex: string): number => {
  const n = parseInt(hex.slice(1), 16);
  return (((n >> 16) & 255) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000;
};

/** Campur warna dengan putih (0..1). */
function mixWhite(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.round(v + (255 - v) * k).toString(16).padStart(2, "0");
  return "#" + f((n >> 16) & 255) + f((n >> 8) & 255) + f(n & 255);
}

/** Isian tipis dari sebuah warna (latar kotak ikon). */
const tint = (hex: string, dark: boolean): string => `rgba(${rgb(hex)},${dark ? ".24" : ".30"})`;

/** Pilih teks hitam/putih yang terbaca di atas warna aksen. */
function onColor(hex: string): string {
  return lum(hex) > 150 ? "#111111" : "#ffffff";
}

/** Warna aksen untuk TEKS kecil: digelapkan di tema terang / dicerahkan di tema gelap agar kontras cukup. */
function readable(hex: string, dark: boolean): string {
  let c = hex;
  for (let i = 0; i < 8; i++) {
    const l = lum(c);
    if (dark ? l >= 120 : l <= 125) break;
    const n = parseInt(c.slice(1), 16);
    const k = dark ? 1.18 : 0.86;
    const f = (v: number) => Math.max(0, Math.min(255, Math.round(dark ? v * k + 18 : v * k)));
    c = "#" + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => f(v).toString(16).padStart(2, "0")).join("");
  }
  return c;
}

type Deco = "orbs" | "grid" | "blobs" | "none";

interface Theme {
  bg: string; fg: string; muted: string;
  card: string; line: string; navBg: string;
  radius: string; shadow: string;
  display: string; body: string; mono: string;
  headWeight: number; upper: boolean; gradientHead: boolean; brutal: boolean; dark: boolean;
  deco: Deco; pill: string;
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
const MONO = `ui-monospace,"JetBrains Mono",SFMono-Regular,Menlo,Consolas,monospace`;

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

export interface RenderOpts {
  hero?: HeroLayout;
  feat?: FeatLayout;
  /** false = matikan katalog/keranjang/CRUD walau jenisnya UMKM. */
  shop?: boolean;
  /** Palet kustom: [utama, kedua, ...tambahan]. Kosong = ikuti template. */
  palette?: string[];
  /** Gambar unggahan (data URL). */
  images?: SiteImages;
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

function buildCss(t: Theme, a: string, hero: HeroLayout, shop: boolean, hover: HoverEffect, extra: string[], article: boolean): string {
  const A = rgb(a);
  const aText = readable(a, t.dark);
  const bd = t.brutal ? "3px solid #0a0a0a" : `1px solid ${t.line}`;
  const grad = t.gradientHead
    ? `background:linear-gradient(120deg,var(--fg) 25%,var(--a) 135%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;`
    : "";
  const heroLeft = hero !== "center";

  return `:root{--bg:${t.bg};--fg:${t.fg};--muted:${t.muted};--card:${t.card};--line:${t.line};--a:${a};--at:${aText};--a-soft:rgba(${A},${t.dark ? ".16" : ".11"});--on:${onColor(a)};--r:${t.radius};--sh:${t.shadow};--pill:${t.pill};--a2:${t.acc2 ?? a};--ib:${t.ib ?? "var(--a-soft)"}}
*{box-sizing:border-box}html{scroll-behavior:smooth;scroll-padding-top:96px}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.65 ${t.body};-webkit-font-smoothing:antialiased;overflow-x:hidden}
.wrap{max-width:1120px;margin:0 auto;padding:0 24px;position:relative}
h1,h2,h3{font-family:${t.display};margin:0}
a{color:inherit}
svg{display:block;flex:none}
.ic{display:inline-grid;place-items:center;flex:none}
.nav{position:sticky;top:0;z-index:20;background:rgb(${t.navBg});border-bottom:${bd}}
.nav .wrap{display:flex;align-items:center;gap:22px;height:68px}
.brand{display:flex;align-items:center;gap:10px;font:${t.headWeight} 18px ${t.display};letter-spacing:-.01em;text-decoration:none;${t.upper ? "text-transform:uppercase;" : ""}margin-right:auto;min-width:0}
.brand span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.brand i{display:grid;place-items:center;flex:none;width:34px;height:34px;border-radius:${t.brutal ? "4px" : "calc(var(--r) * .6)"};background:var(--a);color:var(--on);font:800 15px ${SANS};font-style:normal;${t.brutal ? "border:2px solid #0a0a0a;" : ""}}
.links{display:flex;gap:24px;flex-wrap:nowrap;white-space:nowrap;min-width:0;font-size:14.5px;font-weight:500;color:var(--muted)}
.links a{text-decoration:none;transition:color .2s}.links a:hover{color:var(--fg)}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;text-align:center;max-width:100%;background:var(--a);color:var(--on);padding:12px 22px;border-radius:var(--pill);font:600 15px ${SANS};text-decoration:none;border:${t.brutal ? "3px solid #0a0a0a" : "1px solid transparent"};box-shadow:${t.brutal ? "4px 4px 0 #0a0a0a" : "none"};transition:background .15s,border-color .15s,opacity .15s;cursor:pointer}
.btn:hover{${t.brutal ? "transform:translate(-1px,-1px);box-shadow:5px 5px 0 #0a0a0a;" : "opacity:.9;"}}
.btn:disabled{opacity:.45;cursor:not-allowed;transform:none;filter:none}
.btn.ghost{background:${t.dark ? "rgba(255,255,255,.06)" : t.brutal ? "#fff" : "transparent"};color:var(--fg);border:${t.brutal ? "3px solid #0a0a0a" : `1px solid ${t.dark ? "rgba(255,255,255,.18)" : "var(--line)"}`};box-shadow:${t.brutal ? "4px 4px 0 #0a0a0a" : "none"}}
.btn.danger{background:#dc2626;color:#fff;box-shadow:none}
.btn.sm{padding:8px 14px;font-size:13px;gap:6px}
.nav .btn{padding:10px 20px;font-size:14px;white-space:nowrap;flex:none}
.cartbtn{position:relative;padding:10px 14px!important}
.cartbtn b{position:absolute;top:-6px;right:-6px;min-width:20px;height:20px;border-radius:99px;background:var(--a);color:var(--on);font:700 11px/20px ${SANS};text-align:center;padding:0 5px;border:2px solid var(--bg)}
.hero{position:relative;padding:clamp(56px,9vw,120px) 0 clamp(56px,8vw,104px);border-bottom:${bd};${heroLeft ? "" : "text-align:center"}}
.glow{position:absolute;inset:0;overflow:hidden;pointer-events:none;-webkit-mask-image:linear-gradient(to bottom,#000 55%,transparent);mask-image:linear-gradient(to bottom,#000 55%,transparent)}
.orb{display:none}
${t.deco === "orbs" || t.deco === "grid" ? `.orb{border-radius:50%;filter:blur(70px);opacity:${t.dark ? ".5" : ".55"}}` : ""}
${t.deco === "grid" ? `.glow:after{content:"";position:absolute;inset:0;background-image:linear-gradient(var(--line) 1px,transparent 1px),linear-gradient(90deg,var(--line) 1px,transparent 1px);background-size:44px 44px;-webkit-mask-image:radial-gradient(ellipse at 50% 30%,#000 20%,transparent 70%);mask-image:radial-gradient(ellipse at 50% 30%,#000 20%,transparent 70%)}` : ""}


.badge{display:inline-block;padding:5px 12px;border-radius:calc(var(--pill) * .6);color:var(--muted);font:600 12.5px ${t.mono};letter-spacing:.02em;border:${t.brutal ? "2px solid #0a0a0a" : `1px solid ${t.dark ? "rgba(255,255,255,.18)" : "var(--line)"}`};margin-bottom:22px}

.hero h1{font-size:clamp(32px,${hero === "split" ? "5.4" : "7"}vw,${hero === "split" ? "60" : "72"}px);line-height:1.06;letter-spacing:${t.display === SERIF ? "-.02em" : "-.035em"};font-weight:${t.headWeight};max-width:${heroLeft ? "780px" : "900px"};margin:0 ${heroLeft ? "0" : "auto"} 22px;${t.upper ? "text-transform:uppercase;" : ""}${grad}padding-bottom:.06em;overflow-wrap:break-word}
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

section{padding:clamp(56px,8vw,112px) 0}
.eyebrow{display:none}
h2{font-size:clamp(28px,4.4vw,42px);line-height:1.12;letter-spacing:-.025em;font-weight:${t.headWeight};margin-bottom:32px;${t.upper ? "text-transform:uppercase;" : ""}}
.grid{display:grid;gap:18px;grid-template-columns:repeat(auto-fit,minmax(260px,1fr))}
.card{background:var(--card);border:${bd};border-radius:var(--r);padding:26px;box-shadow:var(--sh);transition:border-color .15s;min-width:0;overflow-wrap:break-word}
.feat:hover,.prod:hover{border-color:${t.brutal ? "#0a0a0a" : "var(--a)"}}
.ico{display:flex;align-items:center;justify-content:${t.brutal ? "center" : "flex-start"};width:auto;height:auto;color:var(--at);margin-bottom:14px;${t.brutal ? "width:46px;height:46px;border:2px solid #0a0a0a;background:var(--a);color:var(--on);" : ""}}
.card h3{font-size:19px;font-weight:${t.headWeight === 900 ? 900 : 700};letter-spacing:-.01em;margin-bottom:8px}
.card p{margin:0;color:var(--muted);font-size:15.5px}
.bento{display:grid;gap:18px;grid-template-columns:repeat(6,1fr)}
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
.steps{list-style:none;margin:0;padding:0;display:grid;gap:18px;grid-template-columns:repeat(auto-fit,minmax(240px,1fr))}
.steps li{padding:18px 0 0;background:none;border:0;border-top:${bd};border-radius:0;box-shadow:none}
.steps b{display:block;margin-bottom:10px;font:700 13px ${t.mono};letter-spacing:.08em;color:var(--at)}
.items{display:grid;gap:18px;grid-template-columns:repeat(auto-fill,minmax(250px,1fr))}
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
.band{padding:clamp(32px,5vw,56px);border-radius:var(--r);background:${t.brutal ? "#0a0a0a" : "var(--a)"};color:${t.brutal ? "#fde68a" : "var(--on)"};display:flex;flex-wrap:wrap;gap:20px 32px;align-items:center;justify-content:space-between;${t.brutal ? "box-shadow:8px 8px 0 var(--a);" : ""}}

.band h2{margin:0 0 6px;color:inherit;-webkit-text-fill-color:currentColor;font-size:clamp(24px,3.6vw,34px)}
.band p{margin:0;opacity:.88}
.band .row{justify-content:flex-start}
.band .btn{background:${t.brutal ? "var(--a)" : "#fff"};color:${t.brutal ? "var(--on)" : "#111"};box-shadow:${t.brutal ? "4px 4px 0 #fde68a" : "none"};${t.brutal ? "border-color:#fde68a;" : ""}}
.band .btn.ghost{background:transparent;color:inherit;border:2px solid ${t.brutal ? "#fde68a" : "rgba(255,255,255,.65)"};box-shadow:none}
footer{padding:34px 0 44px;border-top:${bd};color:var(--muted);font-size:13.5px}
footer .wrap{display:flex;flex-wrap:wrap;gap:8px 20px;justify-content:space-between}
${extraCss(t, bd, hover, extra)}
${article ? articleCss(t, bd) : ""}
${shop ? shopCss(t, bd) : ""}


@media(max-width:900px){.hsplit{grid-template-columns:1fr;gap:36px}.vrow:nth-child(n){margin:0}.flist{grid-template-columns:1fr;gap:24px}.flist .head{position:static}.bento{grid-template-columns:repeat(2,1fr)}.bento .feat,.bento.b4 .feat,.bento.b5 .feat:nth-child(-n+2),.bento.b2 .feat{grid-column:span 1}.bento .feat:first-child{grid-column:span 2}}
@media(max-width:980px){.links{display:none}}
@media(max-width:820px){.split{grid-template-columns:1fr}}
@media(max-width:520px){.wrap{padding:0 18px}.nav .wrap{height:62px;gap:12px}.nav .btn{padding:9px 16px}.card{padding:24px}.bento{grid-template-columns:1fr}.bento .feat:first-child{grid-column:span 1}.frow{grid-template-columns:1fr}}
@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}`;
}

function extraCss(t: Theme, bd: string, hover: HoverEffect, extra: string[]): string {
  const dk = t.dark;
  const lift = dk ? "0 18px 40px rgba(0,0,0,.45)" : "0 18px 40px rgba(0,0,0,.10)";
  const move = hover === "tilt" ? "transform:perspective(900px) rotateX(2.5deg) rotateY(-3.5deg) translateY(-4px)" : "transform:translateY(-6px)";
  const noise = t.noise
    ? `.card,.scard,.acard{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .06 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")}`
    : "";
  const spots = ["8% 100%", "50% -10%", "100% 90%", "0% 0%"];
  const layers: string[] = [];
  if (t.acc2) layers.push(`radial-gradient(55% 70% at 88% 0%,rgba(${rgb(t.acc2)},${dk ? ".14" : ".38"}),transparent 70%)`);
  extra.slice(0, 4).forEach((c, i) => layers.push(`radial-gradient(42% 55% at ${spots[i]},rgba(${rgb(c)},${dk ? ".12" : ".26"}),transparent 70%)`));
  const glow = layers.length ? `.glow{background:${layers.join(",")}}` : "";
  const look = t.brutal
    ? ""
    : `.ico,.pico,.vrow i,.ci i,.acard i,.tqh .ico{display:grid;place-items:center;flex:none;width:40px;height:40px;border-radius:50%;background:var(--ib);color:var(--at)}
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
.prose h3{font:${t.headWeight} clamp(21px,3vw,26px)/1.25 ${t.display};margin:1.8em 0 .6em;letter-spacing:-.015em}
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

/** Ikon inline dengan ukuran tertentu. */
const ico = (name: string, size = 24): string => svgIcon(name, size);

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

export function buildSite(content: SiteContent, template: TemplateId, accent?: string, opts: RenderOpts = {}): SiteBundle {
  const base = THEMES[template];
  const custom = (opts.palette ?? []).filter(isHexColor).map((x) => x.toLowerCase()).slice(0, MAX_PALETTE);
  const a =
    custom[0] ??
    (isHexColor(accent) ? accent : isHexColor(content.accent) && content.accent ? content.accent : TEMPLATES.find((x) => x.id === template)!.accent);
  // Palet kustom: warna ke-2 menggantikan aksen kedua template; warna ke-3 dst. menjadi warna tambahan (ikon bergantian + sorot hero).
  const t: Theme = custom.length >= 2 ? { ...base, acc2: custom[1], ib: tint(custom[1], base.dark) } : base;
  const extra = custom.slice(2);
  const cyc = custom.length >= 3 ? custom.slice(1) : [];
  const toneStyle = (i: number): string => {
    if (!cyc.length || t.brutal) return "";
    const col = cyc[i % cyc.length];
    return ` style="--tb:${tint(col, t.dark)};--tt:${readable(col, t.dark)}"`;
  };

  const c = content;
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
  const firstId = isArticle ? "artikel" : shop ? "katalog" : "fitur";
  const ctaHref = isArticle ? "#artikel" : wa || mail || `#${firstId}`;
  const logo = imgSrc("logo");
  const brandMark = logo ? `<img src="${esc(logo)}" alt="">` : c.brandIcon ? ico(c.brandIcon, 20) : esc(Array.from(c.brand)[0]?.toUpperCase() ?? "•");

  const nav = [
    isArticle ? `<a href="#artikel">${esc(c.itemsTitle)}</a>` : "",
    hasItems && shop ? `<a href="#katalog">Katalog</a>` : "",
    hasFeatures ? `<a href="#fitur">Keunggulan</a>` : "",
    hasItems && !shop ? `<a href="#layanan">${esc(c.itemsTitle)}</a>` : "",
    c.steps.length ? `<a href="#cara">${esc(c.stepsTitle)}</a>` : "",
    c.about ? `<a href="#tentang">${esc(c.aboutTitle)}</a>` : "",
    wa || mail || c.address ? `<a href="#kontak">Kontak</a>` : "",
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
  const himg = heroImg ? `<div class="himg"><img src="${esc(heroImg)}" alt="${esc(c.brand)}"></div>` : "";
  const visualRows = heroRows
    .map((r) => `<div class="vrow"><i>${ico(r.icon, 20)}</i><div><b>${esc(r.title)}</b><small>${esc(clip(r.text, 60))}</small></div>${r.tail ? `<em>${esc(r.tail)}</em>` : ""}</div>`)
    .join("");

  const ghost = isArticle
    ? c.about || hasContact
      ? { label: "Tentang kami", href: "#tentang" }
      : null
    : { label: shop ? "Lihat katalog" : "Lihat keunggulan", href: `#${firstId}` };
  const badgeHtml = c.badge ? `<div class="badge">${esc(c.badge)}</div>` : "<div></div>";
  const subHtml = c.subheadline ? `<p class="sub">${esc(c.subheadline)}</p>` : "<div></div>";
  const ctaRow = `<div class="row"><a class="btn" href="${ctaHref}">${esc(c.ctaLabel)}</a>${ghost ? `<a class="btn ghost" href="${ghost.href}">${ghost.label}</a>` : ""}</div>`;
  const heroText = `${badgeHtml}<h1>${esc(c.headline)}</h1>${subHtml}${ctaRow}`;

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
  } else if (heroL === "editorial") {
    heroInner = `<div class="hed"><div class="hed-top"><span class="slo">${esc(c.slogan || c.brand)}</span>${c.badge ? badgeHtml : ""}</div><h1>${esc(c.headline)}</h1><div class="hed-bot">${subHtml}${ctaRow}</div></div>${himg}`;
  }

  const hero = `<div class="hero h-${heroL}"><div class="glow"></div><div class="wrap">${heroInner}</div></div>`;

  /* ----- katalog / layanan ----- */
  const priceLabel = (i: SiteItem) => (i.price > 0 ? fmtRp(i.price) : "Tanya harga");
  const itemCard = (i: SiteItem, n: number): string =>
    `<article class="card prod${i.size === "large" ? " large" : ""}"${toneStyle(n)}>${
      i.img ? `<div class="pimg"><img src="${esc(i.img)}" alt="${esc(i.name)}" loading="lazy"></div>` : `<div class="pico">${ico(i.icon, 20)}</div>`
    }<div class="pbody">${i.tag || i.category ? `<div class="ptags">${i.tag ? `<span class="ptag hot">${esc(i.tag)}</span>` : ""}${i.category ? `<span class="ptag">${esc(i.category)}</span>` : ""}</div>` : ""}<h3>${esc(i.name)}</h3>${i.desc ? `<p>${esc(i.desc)}</p>` : ""}</div>${
      shop
        ? `<div class="pfoot"><strong class="pprice">${esc(priceLabel(i))}</strong><button type="button" class="btn sm add">${ico("plus", 16)}Tambah</button></div>`
        : i.price > 0
          ? `<div class="pfoot"><strong class="pprice">${esc(fmtRp(i.price))}</strong></div>`
          : ""
    }</article>`;

  const catalog = !hasItems
    ? ""
    : shop
      ? `<section id="katalog"><div class="wrap"><h2>${esc(c.itemsTitle)}</h2><div class="shop-tools"><label class="search">${ico("search", 18)}<input id="wb-q" type="search" placeholder="Cari produk…" aria-label="Cari produk" autocomplete="off"></label><div id="wb-cats" data-wb-dyn></div></div><div id="wb-grid" class="items" data-wb-dyn>${items.map(itemCard).join("")}</div></div></section>`
      : `<section id="layanan"><div class="wrap"><h2>${esc(c.itemsTitle)}</h2><div class="items">${items.map(itemCard).join("")}</div></div></section>`;

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
  const articlesSec = isArticle ? `<section id="artikel"><div class="wrap"><h2>${esc(c.itemsTitle)}</h2><div class="posts">${arts.map(postCard).join("")}</div></div></section>` : "";
  const readers = isArticle
    ? arts
        .map((x, i) => {
          const prev = arts[i - 1];
          const next = arts[i + 1];
          const cov = imgSrc(`article:${x.id}`);
          const body = x.body.map((p) => (p.startsWith("## ") ? `<h3>${esc(p.slice(3))}</h3>` : `<p>${esc(p)}</p>`)).join("");
          return `<article id="a-${x.id}" class="reader" aria-label="${esc(x.title)}"><div class="rbar"><div class="wrap rw"><a class="btn ghost sm" href="#artikel">${ico("arrow-left", 16)}Semua artikel</a><span class="rbrand">${esc(c.brand)}</span></div></div><div class="rbody"><header class="rhead">${x.category ? `<span class="ptag hot">${esc(x.category)}</span>` : ""}<h1>${esc(x.title)}</h1><p class="rmeta">${artMeta(x)}</p></header>${cov ? `<div class="acov rcov"><img src="${esc(cov)}" alt=""></div>` : ""}<div class="prose">${body}</div><nav class="rnav">${prev ? `<a class="card" href="#a-${prev.id}"><small>Sebelumnya</small><b>${esc(prev.title)}</b></a>` : "<span></span>"}${next ? `<a class="card" href="#a-${next.id}"><small>Berikutnya</small><b>${esc(next.title)}</b></a>` : "<span></span>"}</nav></div></article>`;
        })
        .join("\n")
    : "";

  /* ----- fitur ----- */
  const featCard = (f: SiteFeature, n: number, cls = "") => `<article class="card feat ${cls}${f.span === 2 ? " s2" : ""}"${toneStyle(n + 1)}><div class="ico">${ico(f.icon, 20)}</div><div><h3>${esc(f.title)}</h3><p>${esc(f.text)}</p></div></article>`;
  const featBody =
    featL === "bento"
      ? `<h2>${esc(c.featuresTitle)}</h2><div class="bento ${c.features.some((f) => f.span === 2) ? "bx" : `b${c.features.length}`}">${c.features.map((f, n) => featCard(f, n)).join("")}</div>`
      : featL === "editorial"
        ? `<div class="flist"><div class="head"><h2>${esc(c.featuresTitle)}</h2>${c.slogan ? `<p>${esc(c.slogan)}</p>` : ""}</div><ol class="fedlist">${c.features
            .map((f, i) => `<li class="fe"><span class="fn">${String(i + 1).padStart(2, "0")}</span><h3>${esc(f.title)}</h3><p>${esc(f.text)}</p></li>`)
            .join("")}</ol></div>`
        : featL === "list"
          ? `<div class="flist"><div class="head"><h2>${esc(c.featuresTitle)}</h2>${c.subheadline ? `<p>${esc(c.subheadline)}</p>` : ""}</div><div class="frows">${c.features.map((f, n) => featCard(f, n, "frow")).join("")}</div></div>`
          : `<h2>${esc(c.featuresTitle)}</h2><div class="grid">${c.features.map((f, n) => featCard(f, n)).join("")}</div>`;
  const features = hasFeatures ? `<section id="fitur"><div class="wrap">${featBody}</div></section>` : "";

  const steps = c.steps.length
    ? `<section id="cara"><div class="wrap"><h2>${esc(c.stepsTitle)}</h2><ol class="steps">${c.steps
        .map((s0, i) => `<li class="card"><b>${String(i + 1).padStart(2, "0")}</b><h3>${esc(s0.title)}</h3><p>${esc(s0.text)}</p></li>`)
        .join("")}</ol></div></section>`
    : "";

  const quoteIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z"/><path d="M5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z"/></svg>`;
  const testi = c.testimonial?.text
    ? `<section id="testimoni"><div class="wrap"><div class="tq"><div class="tqh"><div class="ico">${quoteIcon}</div><small>Kata pelanggan</small></div><blockquote><p>${esc(c.testimonial.text)}</p>${c.testimonial.name ? `<cite>${esc(c.testimonial.name)}</cite>` : ""}</blockquote></div></div></section>`
    : "";

  const contactItems = [
    c.address ? `<div class="ci"><i>${ico("map-pin", 20)}</i><div><small>Alamat</small><span>${esc(c.address)}</span></div></div>` : "",
    c.hours ? `<div class="ci"><i>${ico("clock", 20)}</i><div><small>Jam buka</small><span>${esc(c.hours)}</span></div></div>` : "",
    c.whatsapp ? `<div class="ci"><i>${ico("message-circle", 20)}</i><div><small>WhatsApp</small><span>+${esc(c.whatsapp)}</span></div></div>` : "",
    c.email ? `<div class="ci"><i>${ico("mail", 20)}</i><div><small>Email</small><span>${esc(c.email)}</span></div></div>` : "",
  ].join("");

  const about = c.about
    ? `<section id="tentang"><div class="wrap split"><div><h2>${esc(c.aboutTitle)}</h2><p class="lead">${esc(c.about)}</p></div>${
        contactItems ? `<div class="card info">${contactItems}</div>` : ""
      }</div></section>`
    : contactItems
      ? `<section id="tentang"><div class="wrap"><div class="card info one">${contactItems}</div></div></section>`
      : "";

  const buttons = [
    wa ? `<a class="btn" href="${wa}" rel="noopener">${ico("message-circle", 18)}${esc(/wa|whatsapp/i.test(c.ctaLabel) ? c.ctaLabel : `${c.ctaLabel} via WhatsApp`)}</a>` : "",
    mail ? `<a class="btn ${wa ? "ghost" : ""}" href="${mail}">${ico("mail", 18)}${wa || isArticle ? "Kirim Email" : esc(c.ctaLabel)}</a>` : "",
  ].join("");

  const band = buttons
    ? `<section id="kontak"><div class="wrap"><div class="band"><div><h2>${esc(c.closing)}</h2>${c.closingText ? `<p>${esc(c.closingText)}</p>` : ""}</div><div class="row">${buttons}</div></div></div></section>`
    : "";

  /* ----- urutan bagian: UMKM = katalog dulu; artikel = daftar artikel dulu; lainnya = keunggulan dulu ----- */
  const sections = isArticle ? [articlesSec, features, testi, steps, about, band] : shop ? [catalog, features, testi, steps, about, band] : [features, catalog, testi, steps, about, band];

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
    for (const n of used) if (LUCIDE[n]) icons[n] = LUCIDE[n];
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

  const css = buildCss(t, a, heroL, shop, c.hover ?? "lift", extra, isArticle);
  const js = shop ? SHOP_RUNTIME_JS : "";

  const head = `<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(c.brand)} | ${esc(c.headline)}</title>
<meta name="description" content="${esc(c.subheadline || c.headline)}">
<meta name="theme-color" content="${t.bg}">`;

  const body = `<header class="nav"><div class="wrap"><a class="brand" href="#"><i${logo ? ' class="logo"' : ""}>${brandMark}</i><span>${esc(c.brand)}</span></a><nav class="links">${nav}</nav>${cartBtn}<a class="btn" href="${ctaHref}">${esc(c.ctaLabel)}</a></div></header>
<main>
${hero}
${sections.join("\n")}
</main>
<footer><div class="wrap"><span>© ${esc(c.brand)}${c.slogan ? ` · ${esc(c.slogan)}` : ""}</span><span>Dibuat dengan Depup AI Web Builder</span></div></footer>
${readers}
${cartUi}
${dataScript}`;

  const single = `<!doctype html>
<html lang="id">
<head>
${head}
<style>
${css}
</style>
</head>
<body>
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
<body>
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
