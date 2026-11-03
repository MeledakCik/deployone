/**
 * Mesin AI Web Builder milik Depup — tanpa layanan AI luar.
 *
 * Cara kerja (semuanya deterministik dan berjalan di server Depup sendiri):
 *  1. TRAINING  (trainModel): "paket domain" (contoh per jenis usaha: kata kunci, contoh permintaan, bank frasa,
 *     produk, fitur, langkah, artikel) + contoh dari pengguna (feedback) → model JSON:
 *       - klasifikasi Naive Bayes (unigram + bigram) untuk memilih domain/jenis usaha dari deskripsi;
 *       - leksikon ikon (kata → ikon Lucide) yang dipelajari dari pasangan kata–ikon di data latih;
 *       - bank frasa per domain, diperkaya isi website yang diterima pengguna.
 *  2. GENERATE  (generateSite): deskripsi → ekstraksi entitas (nama usaha, kota, produk + harga, WA, email,
 *     jam buka, alamat, topik) → klasifikasi → isi website disusun dari bank frasa dengan slot {brand} {city} ...
 *     Variasi ("buat ulang") memakai seed berbeda, jadi hasilnya bisa diulang persis.
 *  3. EDIT      (editSite): perintah bahasa Indonesia ("ganti nama jadi X", "tambah menu Es Teh 5rb", ...)
 *     diurai dengan aturan menjadi patch.
 *
 * File ini MANDIRI (tanpa import) supaya bisa dipakai di route Next.js, di skrip training Node, dan di tes.
 * Keluaran generate/edit berupa objek mentah; pemanggil menormalisasinya dengan normalizeContent().
 */

/* ======================================================================== */
/*  Tipe                                                                     */
/* ======================================================================== */

export type Kind = "umkm" | "jasa" | "portofolio" | "event" | "profil" | "artikel";
export const KINDS: Kind[] = ["umkm", "jasa", "portofolio", "event", "profil", "artikel"];

export interface PackItem {
  name: string;
  desc: string;
  price?: number;
  category?: string;
  icon?: string;
  tag?: string;
}
export interface PackFeature {
  icon: string;
  title: string;
  text: string;
}
export interface PackStep {
  title: string;
  text: string;
}
export interface PackArticle {
  title: string;
  excerpt: string;
  category: string;
  body: string[];
}
export interface PackTestimonial {
  text: string;
  name: string;
}

/** Satu paket domain = pengetahuan mesin tentang satu jenis usaha/kegiatan. Semua teks boleh memakai slot. */
export interface DomainPack {
  id: string;
  kind: Kind;
  label: string;
  /** true = paket umum untuk jenisnya (dipakai bila domain tidak dikenali). */
  generic?: boolean;
  /** Contoh deskripsi pengguna; bahan utama klasifikasi. */
  prompts: string[];
  keywords: string[];
  brandIcon: string;
  templates: string[];
  heroes: string[];
  feats: string[];
  brandFallback: string[];
  badges: string[];
  slogans: string[];
  headlines: string[];
  subheadlines: string[];
  cta: string[];
  featuresTitle: string[];
  features: PackFeature[];
  itemsTitle: string[];
  items: PackItem[];
  stepsTitle: string[];
  steps: PackStep[];
  aboutTitle: string[];
  about: string[];
  testimonials: PackTestimonial[];
  closing: string[];
  closingText: string[];
  /** Untuk jenis artikel. */
  articles?: PackArticle[];
  /** Subtopik untuk menyusun artikel tambahan bila diminta lebih banyak dari contoh. */
  subtopics?: string[];
  /** Jumlah item bawaan. */
  itemCount?: number;
}

/** Contoh dari pengguna: deskripsi + isi website yang ia terima/publikasikan. */
export interface FeedbackExample {
  prompt: string;
  content: Record<string, unknown>;
  at?: number;
}

export interface ClassModel {
  id: string;
  kind: Kind;
  logPrior: number;
  /** log P(token | kelas) untuk token yang pernah muncul di kelas ini. */
  logp: Record<string, number>;
  /** log P(token tak dikenal | kelas). */
  unk: number;
}

export interface SiteModel {
  version: 1;
  trainedAt: string;
  stats: { packs: number; feedback: number; vocab: number; prompts: number };
  domains: ClassModel[];
  kinds: ClassModel[];
  /** kata (stem) → ikon Lucide. */
  iconLex: Record<string, string>;
  packs: Record<string, DomainPack>;
}

/* ======================================================================== */
/*  Teks: normalisasi, token, stem, acak deterministik                       */
/* ======================================================================== */

const STOP = new Set(
  (
    "yang dan di ke dari untuk dengan ini itu ada adalah atau juga saya aku kami kita kamu dia mereka buat buatkan bikin bikinkan " +
    "tolong mau ingin website situs web halaman landing page punya sebuah satu dua tiga para pada dalam oleh akan bisa sudah " +
    "agar supaya karena jadi seperti sangat lebih paling banyak sedikit tentang nya lah kah pun saja aja dong ya tidak bukan " +
    "namanya bernama nama usaha bisnis toko kecil baru lama sendiri setiap hari jam buka mulai sampai hingga harga rp ribu rb " +
    "kota daerah jalan jl wa whatsapp nomor email alamat tolong please yg dgn utk tdk sy"
  ).split(" "),
);

/** Huruf kecil, tanpa aksen/tanda baca. */
export function normText(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Stemmer ringan bahasa Indonesia (cukup untuk mengelompokkan kata: "menjual" ~ "jual", "kopinya" ~ "kopi"). */
export function stem(w: string): string {
  let t = w;
  if (t.length <= 4) return t;
  t = t.replace(/(lah|kah|pun|nya|ku|mu)$/, "");
  if (t.length > 5) t = t.replace(/(kan|an|i)$/, "");
  if (t.length > 5) {
    const m = /^(meng|meny|mem|men|me|peng|peny|pem|pen|pe|ber|be|ter|te|di|ke|se)(.+)$/.exec(t);
    if (m && m[2].length >= 3) t = m[2];
  }
  return t;
}

export function tokens(s: string): string[] {
  return normText(s)
    .split(" ")
    .filter((w) => w.length >= 2 && !STOP.has(w) && !/^\d+$/.test(w))
    .map(stem);
}

/** Token + bigram (bigram memberi bobot pada frasa seperti "mie ayam", "coffee shop"). */
export function features(s: string): string[] {
  const t = tokens(s);
  const out = [...t];
  for (let i = 0; i + 1 < t.length; i++) out.push(t[i] + "_" + t[i + 1]);
  return out;
}

export function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** PRNG kecil (mulberry32): seed sama → urutan sama. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(r: () => number, list: T[]): T {
  return list[Math.floor(r() * list.length) % list.length];
}

function shuffle<T>(r: () => number, list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function titleCase(s: string): string {
  return s.replace(/\S+/g, (w) => (w.length <= 2 && /^(di|ke|&)$/.test(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)));
}

/* ======================================================================== */
/*  TRAINING                                                                 */
/* ======================================================================== */

function nbClass(id: string, kind: Kind, docs: string[][], vocab: Set<string>, total: number, alpha = 0.6): ClassModel {
  const counts: Record<string, number> = {};
  let n = 0;
  for (const d of docs)
    for (const t of d) {
      counts[t] = (counts[t] ?? 0) + 1;
      n++;
    }
  const V = Math.max(1, vocab.size);
  const denom = n + alpha * V;
  const logp: Record<string, number> = {};
  for (const [t, c] of Object.entries(counts)) logp[t] = Math.log((c + alpha) / denom);
  return { id, kind, logPrior: Math.log(Math.max(1, docs.length) / Math.max(1, total)), logp, unk: Math.log(alpha / denom) };
}

/** Isi website hasil pengguna → teks untuk memperkaya bank frasa paket terdekat. */
function absorbFeedback(pack: DomainPack, c: Record<string, unknown>): void {
  const s = (v: unknown, max = 200) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");
  const push = (arr: string[], v: string) => {
    if (v && !arr.includes(v) && arr.length < 40) arr.push(v);
  };
  push(pack.headlines, s(c.headline, 90));
  push(pack.subheadlines, s(c.subheadline, 220));
  push(pack.badges, s(c.badge, 40));
  push(pack.cta, s(c.ctaLabel, 28));
  push(pack.about, s(c.about, 600));
  push(pack.closing, s(c.closing, 60));
  push(pack.closingText, s(c.closingText, 120));
  if (Array.isArray(c.features))
    for (const f of c.features as Record<string, unknown>[]) {
      const title = s(f?.title, 50);
      const text = s(f?.text, 160);
      if (title && text && !pack.features.some((x) => x.title === title) && pack.features.length < 24)
        pack.features.push({ icon: s(f.icon, 40) || pack.brandIcon, title, text });
    }
  if (Array.isArray(c.items))
    for (const it of c.items as Record<string, unknown>[]) {
      const name = s(it?.name, 60);
      if (name && !pack.items.some((x) => x.name.toLowerCase() === name.toLowerCase()) && pack.items.length < 40)
        pack.items.push({
          name,
          desc: s(it.desc, 140),
          price: typeof it.price === "number" ? it.price : 0,
          category: s(it.category, 24),
          icon: s(it.icon, 40) || pack.brandIcon,
        });
    }
  const t = c.testimonial as Record<string, unknown> | undefined;
  if (t && s(t.text) && pack.testimonials.length < 20) pack.testimonials.push({ text: s(t.text, 260), name: s(t.name, 60) });
}

/**
 * Latih model dari paket domain + contoh pengguna.
 * Contoh pengguna dimasukkan ke domain hasil klasifikasi model sementara (tanpa contoh), lalu:
 * deskripsinya menambah data klasifikasi, isinya memperkaya bank frasa domain itu.
 */
export function trainModel(packsIn: DomainPack[], feedback: FeedbackExample[] = []): SiteModel {
  const packs: Record<string, DomainPack> = {};
  for (const p of packsIn) packs[p.id] = JSON.parse(JSON.stringify(p));

  const docsOf = (p: DomainPack): string[][] => [
    ...p.prompts.map(features),
    // kata kunci dihitung dua kali: sinyal kuat tapi tidak mengalahkan contoh kalimat
    features(p.keywords.join(" ")),
    features(p.keywords.join(" ")),
    features(p.label),
  ];

  const build = (extra: Record<string, string[][]>) => {
    const vocab = new Set<string>();
    const all: Record<string, string[][]> = {};
    let total = 0;
    for (const p of Object.values(packs)) {
      const d = [...docsOf(p), ...(extra[p.id] ?? [])];
      all[p.id] = d;
      total += d.length;
      for (const doc of d) doc.forEach((t) => vocab.add(t));
    }
    const domains = Object.values(packs).map((p) => nbClass(p.id, p.kind, all[p.id], vocab, total));
    const byKind: Record<string, string[][]> = {};
    for (const p of Object.values(packs)) (byKind[p.kind] ??= []).push(...all[p.id]);
    const kinds = KINDS.filter((k) => byKind[k]).map((k) => nbClass(k, k, byKind[k], vocab, total));
    return { domains, kinds, vocab };
  };

  // Tahap 1: model dari paket saja, untuk menempatkan contoh pengguna.
  const base = build({});
  const extra: Record<string, string[][]> = {};
  let used = 0;
  for (const fb of feedback) {
    if (!fb || typeof fb.prompt !== "string" || !fb.content || typeof fb.content !== "object") continue;
    const kindHint = KINDS.includes(fb.content.kind as Kind) ? (fb.content.kind as Kind) : undefined;
    const top = classify({ domains: base.domains, kinds: base.kinds } as SiteModel, fb.prompt, kindHint)[0];
    if (!top) continue;
    (extra[top.id] ??= []).push(features(fb.prompt));
    absorbFeedback(packs[top.id], fb.content);
    used++;
  }
  const final = used ? build(extra) : base;

  // Leksikon ikon: kata pada nama/teks item & fitur → ikon yang dipakainya. Ambil ikon terbanyak per kata.
  const tally: Record<string, Record<string, number>> = {};
  const learn = (text: string, icon?: string) => {
    if (!icon) return;
    for (const t of tokens(text)) {
      tally[t] ??= {};
      tally[t][icon] = (tally[t][icon] ?? 0) + 1;
    }
  };
  for (const p of Object.values(packs)) {
    p.items.forEach((i) => learn(i.name, i.icon));
    p.features.forEach((f) => learn(f.title, f.icon));
    learn(p.keywords.join(" "), p.brandIcon);
  }
  const iconLex: Record<string, string> = {};
  for (const [t, m] of Object.entries(tally)) {
    const best = Object.entries(m).sort((a, b) => b[1] - a[1])[0];
    if (best) iconLex[t] = best[0];
  }

  return {
    version: 1,
    trainedAt: new Date().toISOString(),
    stats: {
      packs: Object.keys(packs).length,
      feedback: used,
      vocab: final.vocab.size,
      prompts: Object.values(packs).reduce((n, p) => n + p.prompts.length, 0) + used,
    },
    domains: final.domains,
    kinds: final.kinds,
    iconLex,
    packs,
  };
}

/* ======================================================================== */
/*  Klasifikasi                                                              */
/* ======================================================================== */

export interface Scored {
  id: string;
  kind: Kind;
  /** Probabilitas posterior (0..1). */
  p: number;
  /** Jumlah token deskripsi yang dikenal kelas ini (ukuran "bukti"). */
  hits: number;
}

function scoreAll(classes: ClassModel[], feats: string[]): Scored[] {
  const raw = classes.map((c) => {
    let s = c.logPrior;
    let hits = 0;
    for (const t of feats) {
      const v = c.logp[t];
      if (v !== undefined) {
        s += v;
        hits++;
      } else s += c.unk;
    }
    return { id: c.id, kind: c.kind, s, hits };
  });
  const max = Math.max(...raw.map((r) => r.s));
  const z = raw.reduce((n, r) => n + Math.exp(r.s - max), 0);
  return raw.map((r) => ({ id: r.id, kind: r.kind, p: Math.exp(r.s - max) / z, hits: r.hits })).sort((a, b) => b.p - a.p);
}

/** Domain terurut dari yang paling cocok. kindHint membatasi ke jenis tertentu. */
export function classify(model: Pick<SiteModel, "domains" | "kinds">, prompt: string, kindHint?: Kind): Scored[] {
  const f = features(prompt);
  const classes = kindHint ? model.domains.filter((d) => d.kind === kindHint) : model.domains;
  return scoreAll(classes, f);
}

export function classifyKind(model: Pick<SiteModel, "kinds">, prompt: string): Scored[] {
  return scoreAll(model.kinds, features(prompt));
}

/* ======================================================================== */
/*  Ekstraksi entitas dari deskripsi                                         */
/* ======================================================================== */

export interface Extracted {
  brand: string;
  city: string;
  whatsapp: string;
  email: string;
  hours: string;
  address: string;
  products: { name: string; price: number }[];
  topic: string;
  /** Kata benda utama (mis. "keripik pisang") untuk slot {product} di paket umum. */
  subject: string;
}

const CITIES =
  "jakarta bandung surabaya medan semarang makassar palembang malang yogyakarta jogja yogya solo surakarta bogor depok bekasi tangerang denpasar bali " +
  "padang pekanbaru batam pontianak banjarmasin balikpapan samarinda manado kupang mataram lombok ambon jayapura jambi bengkulu lampung bandar lampung " +
  "serang cilegon cirebon tasikmalaya garut sukabumi purwokerto tegal pekalongan magelang salatiga kudus jepara madiun kediri blitar jember banyuwangi " +
  "sidoarjo gresik mojokerto pasuruan probolinggo batu bukittinggi aceh banda aceh palu kendari gorontalo ternate sorong";
const CITY_LIST = CITIES.split(" ")
  .reduce<string[]>((acc, w, i, arr) => {
    // gabungkan nama dua kata yang ditulis berurutan di daftar
    if (w === "bandar" || w === "banda") acc.push(w + " " + arr[i + 1]);
    else if (!(arr[i - 1] === "bandar" || arr[i - 1] === "banda")) acc.push(w);
    return acc;
  }, [])
  .sort((a, b) => b.length - a.length);

const BIZ_WORDS =
  "warung|kedai|toko|studio|bengkel|klinik|laundry|kafe|cafe|coffee|kopi|barbershop|barber|salon|rumah makan|resto|restoran|bakery|katering|catering|butik|apotek|kios|depot|rumah|griya|sanggar|bimbel|kursus|komunitas|yayasan|festival|seminar|workshop";

function cleanName(s: string): string {
  return s
    .replace(/\s+(?:di|yang|dan|untuk|dengan|di daerah|di kota|menjual|jual|buka|adalah)\b.*$/i, "")
    .replace(/^[\s"'“”‘’]+|[\s"'“”‘’.,!?:;]+$/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 40)
    .trim();
}

/** Harga dari teks: "15rb", "15k", "Rp15.000", "1,5jt". 0 = tidak disebut. */
export function parseRupiah(t: string): number {
  const m = /(?:rp\.?\s*)?(\d+(?:[.,]\d+)*)\s*(rb|ribu|k|jt|juta)?\b/i.exec(t);
  if (!m) return 0;
  const unit = (m[2] ?? "").toLowerCase();
  if (!unit) {
    const n = parseInt(m[1].replace(/[.,]/g, ""), 10);
    return n >= 500 ? n : 0; // angka kecil tanpa satuan biasanya bukan harga
  }
  const n = parseFloat(m[1].replace(/\./g, "").replace(",", "."));
  return Math.round(n * (unit === "jt" || unit === "juta" ? 1_000_000 : 1000));
}

export function extract(prompt: string): Extracted {
  const p = prompt.replace(/\s+/g, " ").trim();
  const low = p.toLowerCase();

  // Nama usaha
  let brand = "";
  const named =
    /(?:bernama|namanya|dengan nama|nama\s+(?:usaha|toko|warung|brand|bisnis|studio|kedai|komunitas|acara|event|blog|kafe|bengkel)(?:ku|nya)?(?:\s+adalah|\s*:)?)\s+["“']?([^,."”'\n(]{2,40})/i.exec(p);
  if (named) brand = cleanName(named[1]);
  if (!brand) {
    const q = /["“]([^"”]{2,40})["”]/.exec(p);
    if (q) brand = cleanName(q[1]);
  }
  if (!brand) {
    const re = new RegExp(`\\b(${BIZ_WORDS})\\s+((?:[A-Z][\\w'&.-]*|\\d+)(?:\\s+(?:[A-Z][\\w'&.-]*|\\d+)){0,3})`);
    const m = re.exec(p);
    if (m) brand = cleanName(titleCase(m[1]) + " " + m[2]);
  }
  if (!brand) {
    // Frasa berhuruf kapital di tengah kalimat (bukan awal kalimat, bukan nama kota).
    const caps = [...p.matchAll(/(?<=[a-z,]\s)((?:[A-Z][\w'&-]+)(?:\s+[A-Z][\w'&-]+){0,3})/g)].map((m) => m[1]);
    const found = caps.find((c) => !CITY_LIST.includes(c.toLowerCase()) && c.length >= 3);
    if (found) brand = cleanName(found);
  }

  // Kota
  let city = "";
  for (const c of CITY_LIST) {
    if (new RegExp(`(?<![a-z])${c}(?![a-z])`).test(low)) {
      city = titleCase(c);
      break;
    }
  }
  if (!city) {
    const m = /\bdi\s+(?:kota\s+|daerah\s+|kabupaten\s+|kab\.\s*)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/.exec(p);
    if (m && !brand.includes(m[1])) city = m[1];
  }
  if (city === "Jogja" || city === "Yogya") city = "Yogyakarta";

  // Kontak
  const wa = /(?:\+?62|0)\s?8[\d\s-]{7,14}\d/.exec(p);
  const whatsapp = wa ? wa[0].replace(/\D/g, "").replace(/^0/, "62") : "";
  const em = /[^\s@<>"',;:()]+@[^\s@<>"',;:()]+\.[a-z]{2,}/i.exec(p);
  const email = em ? em[0] : "";
  const hr = /(?:buka|jam(?:\s+buka)?|operasional)\s*(?:setiap hari\s*|tiap hari\s*)?(?:jam\s*|pukul\s*)?(\d{1,2})(?:[.:](\d{2}))?\s*(?:-|–|sampai|s\/d|sd|hingga)\s*(\d{1,2})(?:[.:](\d{2}))?/i.exec(p);
  const hhmm = (h: string, m?: string) => `${h.padStart(2, "0")}.${m ?? "00"}`;
  const everyDay = /setiap hari|tiap hari/i.test(p);
  const hours = hr ? `${everyDay ? "Setiap hari " : ""}${hhmm(hr[1], hr[2])}–${hhmm(hr[3], hr[4])}` : "";
  const ad = /\b(?:jl\.?|jalan)\s+[^,.\n]{3,60}/i.exec(p);
  const address = ad ? titleCase(ad[0].replace(/^jl\.?\s*/i, "Jl. ").replace(/^jalan\s+/i, "Jl. ")) + (city ? `, ${city}` : "") : city;

  // Produk yang disebut: "menjual A, B, dan C" / "menu: A (15rb), B"
  const products: { name: string; price: number }[] = [];
  const list = /(?:menjual|jual|jualan|menu(?:nya)?|produk(?:nya)?|layanan(?:nya)?|menyediakan|melayani|jasa|paket(?:nya)?|koleksi(?:nya)?)\s*:?\s+([^.!?\n]{3,240})/i.exec(p);
  if (list) {
    const parts = list[1]
      .split(/,|;|\s+dan\s+|\s+&\s+|\s+serta\s+|\/(?!\d)/i)
      .map((x) => x.trim())
      .filter(Boolean);
    for (const part of parts.slice(0, 12)) {
      const price = parseRupiah(part);
      const name = cleanName(
        part
          .replace(/\(?\s*(?:harga\s*|seharga\s*|@\s*)?(?:rp\.?\s*)?\d+(?:[.,]\d+)*\s*(?:rb|ribu|k|jt|juta)?\s*\)?/gi, "")
          .replace(/^(?:aneka|berbagai|macam-macam|seperti)\s+/i, ""),
      );
      if (name.length >= 3 && name.split(" ").length <= 6 && !/^(di|yang|untuk|dengan|buka|jam|harga|mulai|dll|dsb|lain|lainnya|dan lain)\b/i.test(name)) {
        products.push({ name: titleCase(name), price });
      }
    }
  }

  const tp = /(?:tentang|seputar|membahas|bertema|topik(?:nya)?)\s+([^.,!?\n]{3,60})/i.exec(p);
  const topic = tp ? cleanName(tp[1]) : "";

  // Subjek utama: setelah kata kerja usaha, atau produk pertama, atau topik.
  let subject = products[0]?.name.toLowerCase() ?? "";
  if (!subject) {
    const sj = /(?:usaha|jualan|bisnis|toko|jasa|layanan)\s+([a-z][a-z\s-]{2,30}?)(?=\s+(?:di|yang|dan|untuk|dengan|bernama|namanya)\b|[.,]|$)/i.exec(p);
    if (sj) subject = sj[1].trim().toLowerCase();
  }
  if (!subject && topic) subject = topic.toLowerCase();

  return { brand, city, whatsapp: /^\d{8,15}$/.test(whatsapp) ? whatsapp : "", email, hours, address, products, topic, subject };
}

/* ======================================================================== */
/*  GENERATE                                                                 */
/* ======================================================================== */

export interface GenerateOptions {
  variant?: number;
  kind?: Kind;
  wantItems?: number | null;
  wantArticles?: number | null;
}

export interface GenerateResult {
  /** Isi mentah (bentuk datar); normalisasi di pemanggil. */
  raw: Record<string, unknown>;
  domain: string;
  confidence: number;
  extracted: Extracted;
}

const DEFAULT_ITEMS: Record<Kind, number> = { umkm: 6, jasa: 4, portofolio: 4, event: 4, profil: 3, artikel: 0 };

function fill(tpl: string, slots: Record<string, string>): string {
  return tpl
    .replace(/\{(\w+)\}/g, (_, k: string) => slots[k] ?? "")
    .replace(/\s+([,.])/g, "$1")
    .replace(/\(\s*\)/g, "")
    .replace(/\s{2,}/g, " ")
    // kata depan yang kehilangan pasangannya karena slot kosong ("di {city}" tanpa kota)
    .replace(/\s+(?:di|dari|ke|untuk|warga|sejak)\s*(?=[,.]|$)/g, "")
    .replace(/,\s*(?=[.]|$)/g, "")
    .trim();
}

/** Ikon untuk nama produk: leksikon terlatih, lalu ikon paket. */
function iconFor(model: SiteModel, text: string, fallback: string): string {
  for (const t of tokens(text)) if (model.iconLex[t]) return model.iconLex[t];
  return fallback;
}

/** Cari item paket yang mirip dengan nama produk pengguna (untuk deskripsi & harga wajar). */
function similarItem(pack: DomainPack, name: string): PackItem | undefined {
  const a = new Set(tokens(name));
  let best: PackItem | undefined;
  let bestScore = 0;
  for (const it of pack.items) {
    const b = tokens(it.name);
    const inter = b.filter((t) => a.has(t)).length;
    const score = inter / Math.max(1, Math.min(a.size, b.length));
    if (score > bestScore) {
      bestScore = score;
      best = it;
    }
  }
  return bestScore >= 0.5 ? best : undefined;
}

function chooseDomain(model: SiteModel, prompt: string, kind?: Kind): { pack: DomainPack; confidence: number } {
  const ranked = classify(model, prompt, kind);
  const top = ranked[0];
  const generics = Object.values(model.packs).filter((p) => p.generic);
  const genericFor = (k: Kind) => generics.find((g) => g.kind === k);
  // Bukti lemah (tak satu pun kata dikenali domain teratas) → paket umum untuk jenis yang paling mungkin.
  if (!top || top.hits === 0) {
    const k = kind ?? classifyKind(model, prompt)[0]?.kind ?? "jasa";
    const g = genericFor(k) ?? generics[0];
    return { pack: g, confidence: 0 };
  }
  const pack = model.packs[top.id];
  if (pack.generic || top.p >= 0.35 || top.hits >= 2) return { pack, confidence: top.p };
  return { pack: genericFor(pack.kind) ?? pack, confidence: top.p };
}

export function generateSite(model: SiteModel, prompt: string, opts: GenerateOptions = {}): GenerateResult {
  const variant = Math.max(0, Math.floor(opts.variant ?? 0));
  const r = rng(hash(normText(prompt)) + variant * 7919);
  const ex = extract(prompt);
  const { pack, confidence } = chooseDomain(model, prompt, opts.kind);
  const kind: Kind = opts.kind ?? pack.kind;

  const subject = ex.subject || pack.label.toLowerCase();
  const city = ex.city;
  const slotsBase: Record<string, string> = {
    city,
    product: subject,
    Product: titleCase(subject),
    topic: ex.topic || subject,
    Topic: titleCase(ex.topic || subject),
  };
  // Nama cadangan: hanya pola yang semua slotnya terisi; subjek panjang dipendekkan supaya nama tidak bertele-tele.
  const shortSubject = titleCase(subject.split(" ").slice(0, 2).join(" "));
  const fallbacks = pack.brandFallback.filter((t) => (city || !t.includes("{city}")) && (subject || !/\{product\}/i.test(t)));
  const brand =
    ex.brand ||
    (fallbacks.length ? fill(pick(r, fallbacks), { ...slotsBase, Product: shortSubject, product: shortSubject.toLowerCase(), brand: "" }) : "") ||
    shortSubject ||
    pack.label;
  const slots = { ...slotsBase, brand };
  const brandLow = brand.toLowerCase();
  // Pilih pola yang tidak mengulang nama: "Keripik Pisang buatan Keripik Pisang Lampung" dihindari.
  const F = (list: string[]) => {
    if (!list.length) return "";
    const order = shuffle(r, list);
    for (const t of order) {
      const out = fill(t, slots);
      const repeats = subject && brandLow.includes(subject.toLowerCase()) && /\{brand\}/.test(t) && /\{product\}/i.test(t);
      // Tanpa nama asli, hindari kalimat orang pertama seperti "Halo, saya {brand}".
      const fakeSelf = !ex.brand && /saya\s+\{brand\}/i.test(t);
      if (!repeats && !fakeSelf && !(city === "" && /\{city\}/.test(t) && out.split(" ").length < 4)) return out;
    }
    return fill(order[0], slots);
  };

  // Produk/layanan: yang disebut pengguna dulu, lalu pelengkap dari paket.
  const target = Math.max(1, Math.min(12, opts.wantItems ?? (ex.products.length > (DEFAULT_ITEMS[kind] || 0) ? ex.products.length : DEFAULT_ITEMS[kind] || 0)));
  const items: Record<string, unknown>[] = [];
  for (const pr of ex.products.slice(0, 12)) {
    const sim = similarItem(pack, pr.name);
    items.push({
      name: pr.name,
      desc: sim ? fill(sim.desc, slots) : fill(pick(r, ["{name} buatan {brand}, dibuat setiap hari.", "Pilihan {name} dari {brand}.", "{name} dengan resep andalan {brand}."]), { ...slots, name: pr.name }),
      price: pr.price || sim?.price || 0,
      category: sim?.category ?? "",
      icon: iconFor(model, pr.name, sim?.icon ?? pack.brandIcon),
    });
  }
  if (kind !== "artikel") {
    for (const it of shuffle(r, pack.items)) {
      if (items.length >= target) break;
      if (items.some((x) => String(x.name).toLowerCase() === it.name.toLowerCase())) continue;
      items.push({ name: fill(it.name, slots), desc: fill(it.desc, slots), price: it.price ?? 0, category: it.category ?? "", icon: it.icon ?? pack.brandIcon, tag: it.tag ?? "" });
    }
  }
  if (items.length >= 3) {
    items[0].size = "large";
    if (!items[0].tag) items[0].tag = kind === "umkm" ? "Paling laris" : kind === "jasa" ? "Paling dipilih" : "";
  }

  // Fitur: 3–5, kartu pertama lebar di bento.
  const feat = pick(r, pack.feats.length ? pack.feats : ["bento"]);
  const nFeat = feat === "bento" ? (r() < 0.5 ? 4 : 5) : r() < 0.5 ? 3 : 4;
  const features = shuffle(r, pack.features)
    .slice(0, nFeat)
    .map((f, i) => ({ icon: f.icon, title: fill(f.title, slots), text: fill(f.text, slots), span: feat === "bento" && i === 0 ? 2 : 1 }));

  // Artikel
  let articles: Record<string, unknown>[] | undefined;
  if (kind === "artikel") {
    const want = Math.max(2, Math.min(15, opts.wantArticles ?? 4));
    const pool = shuffle(r, pack.articles ?? []);
    articles = pool.slice(0, want).map((a) => ({ title: fill(a.title, slots), excerpt: fill(a.excerpt, slots), category: fill(a.category, slots), author: brand, body: a.body.map((b) => fill(b, slots)) }));
    const subs = shuffle(r, pack.subtopics ?? [subject]);
    const TITLE = ["Panduan singkat {sub} untuk pemula", "{Sub}: hal yang jarang dibahas", "5 catatan penting soal {sub}", "Kesalahan umum saat {sub}", "Mulai {sub} dengan modal kecil"];
    let i = 0;
    while (articles.length < want && i < 40) {
      const sub = fill(subs[i % subs.length], slots).toLowerCase();
      const s2 = { ...slots, sub, Sub: titleCase(sub) };
      const title = fill(TITLE[(i + variant) % TITLE.length], s2);
      if (!articles.some((a) => a.title === title))
        articles.push({
          title,
          excerpt: fill("Ringkasan praktis tentang {sub}, ditulis dari pengalaman {brand}.", s2),
          category: titleCase(ex.topic || pack.label).slice(0, 24),
          author: brand,
          body: [
            fill("Banyak pembaca bertanya soal {sub}. Tulisan ini merangkum hal yang paling sering kami temui, tanpa istilah yang berbelit.", s2),
            "## Mulai dari yang paling dasar",
            fill("Langkah pertama untuk {sub} adalah memahami tujuanmu sendiri. Catat apa yang ingin dicapai, lalu tentukan satu hal kecil yang bisa dicoba minggu ini.", s2),
            "## Yang perlu dihindari",
            fill("Jangan terburu-buru meniru cara orang lain. Setiap situasi berbeda, jadi uji sedikit demi sedikit dan perhatikan hasilnya.", s2),
          ],
        });
      i++;
    }
  }

  const testimonial = pack.testimonials.length && r() < 0.85 ? pick(r, pack.testimonials) : null;

  const raw: Record<string, unknown> = {
    kind,
    template: pack.templates[(hash(brand) + variant) % pack.templates.length],
    accent: "",
    hero: pack.heroes[(hash(brand) + variant * 3) % pack.heroes.length],
    feat,
    brand,
    brandIcon: pack.brandIcon,
    slogan: F(pack.slogans),
    badge: F(pack.badges),
    headline: F(pack.headlines),
    subheadline: F(pack.subheadlines),
    ctaLabel: F(pack.cta),
    featuresTitle: F(pack.featuresTitle),
    features,
    itemsTitle: F(pack.itemsTitle),
    items,
    articles,
    stepsTitle: F(pack.stepsTitle),
    steps: shuffle(r, [pack.steps]).flat().slice(0, 3).map((s) => ({ title: fill(s.title, slots), text: fill(s.text, slots) })),
    aboutTitle: F(pack.aboutTitle),
    about: F(pack.about),
    testimonial: testimonial ? { text: fill(testimonial.text, slots), name: fill(testimonial.name, slots) } : { text: "", name: "" },
    whatsapp: ex.whatsapp,
    email: ex.email,
    address: ex.address,
    hours: ex.hours,
    closing: F(pack.closing),
    closingText: F(pack.closingText),
    hover: r() < 0.3 ? "tilt" : "lift",
  };
  return { raw, domain: pack.id, confidence, extracted: ex };
}

/* ======================================================================== */
/*  EDIT: perintah bahasa Indonesia → patch                                  */
/* ======================================================================== */

export interface EditResult {
  /** Isi lengkap setelah perubahan (mentah; normalisasi di pemanggil). */
  raw: Record<string, unknown> | null;
  /** Ringkasan perubahan untuk pengguna. */
  note: string;
}

const COLOR_WORDS: Record<string, string> = {
  merah: "#dc2626", biru: "#2563eb", "biru muda": "#0ea5e9", hijau: "#16a34a", kuning: "#ca8a04", oranye: "#ea580c", orange: "#ea580c",
  ungu: "#7c3aed", pink: "#db2777", "merah muda": "#db2777", hitam: "#111827", coklat: "#92400e", cokelat: "#92400e", emas: "#b45309",
  tosca: "#0d9488", toska: "#0d9488", abu: "#4b5563", "abu-abu": "#4b5563", navy: "#1e3a8a", maroon: "#7f1d1d",
};

const FIELD_ALIASES: [RegExp, string][] = [
  [/\b(?:nama(?:\s+(?:usaha|toko|brand|warung|bisnis|situs|website))?|brand)\b/, "brand"],
  [/\b(?:judul(?:\s+utama)?|headline)\b/, "headline"],
  [/\b(?:sub\s*judul|subjudul|subheadline|deskripsi(?:\s+utama)?|kalimat pembuka)\b/, "subheadline"],
  [/\b(?:slogan|tagline)\b/, "slogan"],
  [/\b(?:tombol|cta|ajakan)\b/, "ctaLabel"],
  [/\b(?:label|badge|lencana)\b/, "badge"],
  [/\b(?:tentang(?:\s+kami)?|about|cerita)\b/, "about"],
  [/\b(?:alamat|lokasi)\b/, "address"],
  [/\b(?:jam(?:\s+buka)?|jam operasional)\b/, "hours"],
  [/\b(?:email|surel)\b/, "email"],
  [/\b(?:wa|whatsapp|nomor(?:\s+(?:wa|hp|telepon))?|no\.?\s*(?:wa|hp))\b/, "whatsapp"],
  [/\b(?:judul\s+(?:produk|menu|katalog|layanan))\b/, "itemsTitle"],
  [/\b(?:penutup|judul penutup)\b/, "closing"],
];

const TEMPLATE_IDS = ["bersih", "gelap", "hangat", "tegas", "segar", "elegan", "pastel", "neon", "bakso", "kue", "barber", "tech", "majalah", "jurnal"];
const HERO_IDS = ["center", "left", "split", "split-bold", "asymmetric", "editorial"];

function sameName(a: unknown, b: string): boolean {
  return normText(String(a ?? "")) === normText(b);
}

/**
 * Terapkan satu atau beberapa perintah (dipisah "lalu", ";", atau baris baru).
 * Perintah yang tidak dikenali dilaporkan di note; bila tak satu pun dikenali, raw = null.
 */
export function editSite(model: SiteModel, current: Record<string, unknown>, instruction: string): EditResult {
  const c: Record<string, unknown> = JSON.parse(JSON.stringify(current));
  const done: string[] = [];
  const skipped: string[] = [];
  const parts = instruction
    .split(/\n|;|\s+(?:lalu|terus|kemudian|setelah itu)\s+/i)
    .map((x) => x.trim())
    .filter(Boolean);

  for (const part of parts) {
    const low = part.toLowerCase();
    const value = (() => {
      const m = /(?:jadi|menjadi|dengan|ke|=|:)\s+["“']?(.+?)["”']?\s*$/i.exec(part);
      return m ? m[1].trim() : "";
    })();

    // Warna
    if (/\b(warna|aksen)\b/.test(low)) {
      const hex = /#[0-9a-f]{6}\b/i.exec(part)?.[0];
      const word = Object.keys(COLOR_WORDS)
        .sort((a, b) => b.length - a.length)
        .find((w) => low.includes(w));
      const col = hex ?? (word ? COLOR_WORDS[word] : "");
      if (col) {
        c.accent = col.toLowerCase();
        done.push(`warna aksen ${word ?? col}`);
        continue;
      }
    }
    // Template / tampilan
    if (/\b(template|tema|gaya|tampilan)\b/.test(low)) {
      const t = TEMPLATE_IDS.find((id) => new RegExp(`\\b${id}\\b`).test(low));
      if (t) {
        c.template = t;
        done.push(`template ${t}`);
        continue;
      }
    }
    if (/\bhero\b/.test(low)) {
      const h = HERO_IDS.find((id) => low.includes(id));
      if (h) {
        c.hero = h;
        done.push(`tata letak hero ${h}`);
        continue;
      }
    }

    // Hapus bagian
    if (/\b(hapus|hilangkan|buang)\b/.test(low)) {
      if (/testimoni/.test(low)) {
        c.testimonial = { text: "", name: "" };
        done.push("testimoni dihapus");
        continue;
      }
      if (/\b(langkah|cara pesan|cara order)\b/.test(low)) {
        c.steps = [];
        done.push("bagian langkah dihapus");
        continue;
      }
      const target = /(?:hapus|hilangkan|buang)\s+(?:produk|menu|item|layanan|paket|karya|artikel)?\s*["“']?(.+?)["”']?\s*$/i.exec(part)?.[1];
      if (target) {
        const before = Array.isArray(c.items) ? (c.items as unknown[]).length : 0;
        if (Array.isArray(c.items)) c.items = (c.items as Record<string, unknown>[]).filter((it) => !sameName(it.name, target));
        if (Array.isArray(c.articles)) c.articles = (c.articles as Record<string, unknown>[]).filter((a) => !sameName(a.title, target));
        const after = Array.isArray(c.items) ? (c.items as unknown[]).length : 0;
        if (after < before) {
          done.push(`"${target}" dihapus`);
          continue;
        }
      }
    }

    // Ubah harga
    const hp = /harga\s+["“']?(.+?)["”']?\s+(?:jadi|menjadi|=)\s+(.+)$/i.exec(part);
    if (hp && Array.isArray(c.items)) {
      const price = parseRupiah(hp[2]);
      const it = (c.items as Record<string, unknown>[]).find((x) => sameName(x.name, hp[1]));
      if (it && price) {
        it.price = price;
        done.push(`harga ${it.name}`);
        continue;
      }
    }

    // Tambah produk: "tambah menu Es Teh 5rb, Es Jeruk 7rb" / "tambah 3 menu minuman"
    const add = /\b(?:tambah(?:kan)?|masukkan)\s+(?:(\d{1,2})\s+)?(?:produk|menu|item|layanan|paket|karya)\s*:?\s*(.*)$/i.exec(part);
    if (add) {
      const items = Array.isArray(c.items) ? (c.items as Record<string, unknown>[]) : [];
      const n = add[1] ? Math.min(12, parseInt(add[1], 10)) : 0;
      const rest = add[2].trim();
      const before = items.length;
      if (n > 0) {
        // "tambah 3 menu minuman": ambil dari paket domain yang paling cocok dengan kata setelahnya.
        const cat = rest;
        const ranked = classify(model, `${String(c.brand ?? "")} ${cat} ${(items[0]?.name as string) ?? ""}`, (KINDS.includes(c.kind as Kind) ? c.kind : undefined) as Kind | undefined);
        const pool = ranked.flatMap((s) => model.packs[s.id]?.items ?? []);
        const catTokens = new Set(tokens(cat));
        const preferred = pool.filter((it) => tokens(`${it.name} ${it.category ?? ""} ${it.desc}`).some((t) => catTokens.has(t)));
        for (const it of [...preferred, ...pool]) {
          if (items.length - before >= n || items.length >= 12) break;
          if (items.some((x) => sameName(x.name, it.name))) continue;
          items.push({ name: it.name, desc: it.desc.replace(/\{brand\}/g, String(c.brand ?? "")).replace(/\{\w+\}/g, ""), price: it.price ?? 0, category: it.category ?? "", icon: it.icon ?? "package" });
        }
      } else if (rest) {
        for (const raw of rest.split(/,|\s+dan\s+|\s+&\s+/)) {
          const price = parseRupiah(raw);
          const name = titleCase(cleanName(raw.replace(/\(?\s*(?:harga\s*|seharga\s*)?(?:rp\.?\s*)?\d+(?:[.,]\d+)*\s*(?:rb|ribu|k|jt|juta)?\s*\)?/gi, "")));
          if (name.length < 2 || items.length >= 12 || items.some((x) => sameName(x.name, name))) continue;
          items.push({ name, desc: "", price, category: "", icon: iconFor(model, name, String(c.brandIcon || "package")) });
        }
      }
      if (items.length > before) {
        c.items = items;
        done.push(`${items.length - before} item ditambahkan`);
        continue;
      }
    }

    // Testimoni baru: "tambah testimoni: 'enak sekali' - Budi"
    const tm = /testimoni\s*(?:jadi|:|dari)?\s*["“']?(.+?)["”']?\s*(?:-|—|oleh|dari)\s*([^-—]{2,40})$/i.exec(part);
    if (tm) {
      c.testimonial = { text: tm[1].trim(), name: tm[2].trim() };
      done.push("testimoni");
      continue;
    }

    // Ganti bidang teks: "ganti nama jadi X", "ubah nomor wa ke 0812..."
    if (/\b(ganti|ubah|ganti(?:kan)?|set|atur|tulis|isi)\b/.test(low) && value) {
      const field = FIELD_ALIASES.find(([re]) => re.test(low))?.[1];
      if (field) {
        let v: string = value;
        if (field === "whatsapp") v = v.replace(/\D/g, "").replace(/^0/, "62");
        // Nama baru ikut diganti di semua teks yang menyebut nama lama ("Tentang Bakso Pak Kumis", dst.).
        const old = typeof c.brand === "string" ? c.brand : "";
        if (field === "brand" && old && old !== v) {
          const re = new RegExp(old.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
          const swap = (x: unknown): unknown =>
            typeof x === "string" ? x.replace(re, v) : Array.isArray(x) ? x.map(swap) : x && typeof x === "object" ? Object.fromEntries(Object.entries(x).map(([k, y]) => [k, swap(y)])) : x;
          for (const k of Object.keys(c)) if (k !== "brand") c[k] = swap(c[k]);
        }
        c[field] = v;
        done.push(field === "brand" ? "nama" : field);
        continue;
      }
    }
    skipped.push(part);
  }

  if (!done.length) {
    return {
      raw: null,
      note:
        "Perintah belum dikenali mesin Depup. Contoh yang bisa: \"ganti nama jadi Kopi Senja\", \"ubah judul jadi …\", \"tambah menu Es Teh 5rb, Es Jeruk 7rb\", \"tambah 3 menu minuman\", \"hapus Es Teh\", \"harga Es Teh jadi 6rb\", \"ganti warna jadi hijau\", \"pakai template gelap\", \"ganti nomor wa jadi 0812…\", \"hapus testimoni\".",
    };
  }
  return { raw: c, note: `Diubah: ${done.join(", ")}.${skipped.length ? ` Tidak dikenali: "${skipped.join('", "')}".` : ""}` };
}
