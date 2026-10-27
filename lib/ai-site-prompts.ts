/**
 * Prompt tambahan untuk AI Web Builder: contoh isi per jenis situs, daftar ungkapan terlarang,
 * dan prompt untuk mode "ubah dengan perintah". Murni (tanpa import Node/React), aman dipakai server dan browser.
 */

import { SITE_SYSTEM_PROMPT, TEMPLATES, HERO_LAYOUTS, FEAT_LAYOUTS, type SiteContent, type SiteKind } from "@/lib/ai-site-templates";

/* ---------- contoh isi (gaya dan kedalaman, bukan untuk disalin) ---------- */

export const SITE_EXAMPLES: Record<SiteKind, object> = {
  umkm: {
    type: "umkm",
    brand: { name: "Bakso Pak Slamet", slogan: "Kuah kaldu, bukan penyedap", palette_id: "bakso" },
    hero: { layout: "split-bold", headline: "Bakso urat 150 gram, kuah kaldu 12 jam", sub: "Warung di Banjar. Pesan lewat WhatsApp, kami siapkan sebelum kamu tiba.", cta: "Pesan Sekarang", badge: "Buka 10-21 WIB" },
    hover_effect: "lift",
    products: [
      { name: "Bakso Urat", price: "Rp 15.000", tag: "Best Seller", size: "large", icon: "beef", desc: "Urat sapi 150gr, kenyal, kuah kaldu." },
      { name: "Bakso Telur", price: "Rp 18.000", tag: "", size: "small", icon: "soup", desc: "Telur puyuh utuh di tengah bakso." },
      { name: "Mie Ayam", price: "Rp 14.000", tag: "", size: "small", icon: "utensils", desc: "Mie kuning, ayam cincang kecap." },
      { name: "Es Teler", price: "Rp 12.000", tag: "", size: "small", icon: "ice-cream-cone", desc: "Alpukat, nangka, kelapa muda." },
      { name: "Es Jeruk", price: "Rp 5.000", tag: "", size: "small", icon: "cup-soda", desc: "Jeruk peras tanpa sirup." },
    ],
    bento_features: [
      { title: "Kaldu 12 jam", desc: "Tulang sapi direbus semalaman, bukan bumbu instan.", icon: "flame", col_span: 2 },
      { title: "Buka 10-21", desc: "Setiap hari, termasuk tanggal merah.", icon: "clock-3", col_span: 1 },
      { title: "Pesan via WA", desc: "Kirim pesanan, ambil tanpa antre.", icon: "message-circle", col_span: 1 },
    ],
    articles: [],
    testimonial: { text: "", name: "" },
    contact: { wa: "6281234567890", address: "", hours: "10.00-21.00", email: "" },
  },
  jasa: {
    type: "jasa",
    brand: { name: "Studio Kita", slogan: "Logo jadi dalam 3 hari", palette_id: "tech" },
    hero: { layout: "editorial", headline: "Logo dan branding untuk usaha kecil", sub: "Revisi tanpa batas sampai kamu puas. Proses 3 hari kerja.", cta: "Minta Penawaran", badge: "" },
    hover_effect: "tilt",
    products: [
      { name: "Paket Logo", price: "", tag: "Paling dicari", size: "large", icon: "palette", desc: "3 konsep awal, revisi tanpa batas, file siap cetak." },
      { name: "Paket Branding", price: "", tag: "", size: "small", icon: "paintbrush", desc: "Logo, palet warna, huruf, dan panduan pemakaian." },
      { name: "Kemasan Produk", price: "", tag: "", size: "small", icon: "package", desc: "Label dan kemasan sesuai ukuran produkmu." },
    ],
    bento_features: [
      { title: "3 hari kerja", desc: "Konsep pertama dikirim di hari ketiga.", icon: "clock-3", col_span: 2 },
      { title: "Revisi tanpa batas", desc: "Sampai kamu bilang cukup.", icon: "badge-check", col_span: 1 },
      { title: "Khusus UMKM", desc: "Harga disesuaikan modal usaha kecil.", icon: "store", col_span: 1 },
    ],
    articles: [],
    testimonial: { text: "", name: "" },
    contact: { wa: "", address: "", hours: "", email: "hello@studiokita.id" },
  },
  portofolio: {
    type: "portofolio",
    brand: { name: "Raka Pratama", slogan: "Web dev dan UI design", palette_id: "barber" },
    hero: { layout: "asymmetric", headline: "Saya membuat antarmuka yang jelas dan cepat", sub: "Mahasiswa Teknik Informatika. Fokus React dan desain UI.", cta: "Lihat Karya", badge: "Terbuka untuk magang" },
    hover_effect: "tilt",
    products: [
      { name: "Aplikasi Kas Kelas", price: "", tag: "Terbaru", size: "large", icon: "wallet", desc: "Catat iuran kelas, dibuat dengan Next.js." },
      { name: "Redesain Situs Kampus", price: "", tag: "", size: "small", icon: "laptop", desc: "Studi kasus navigasi untuk mahasiswa baru." },
      { name: "Landing Page UMKM", price: "", tag: "", size: "small", icon: "store", desc: "Satu halaman, dua minggu pengerjaan." },
    ],
    bento_features: [
      { title: "React dan Next.js", desc: "Dipakai di tiga proyek kuliah dan satu proyek nyata.", icon: "code", col_span: 2 },
      { title: "Desain UI", desc: "Prototipe Figma sebelum masuk kode.", icon: "palette", col_span: 1 },
      { title: "Kerja tim", desc: "Terbiasa review kode lewat Git.", icon: "users", col_span: 1 },
    ],
    articles: [],
    testimonial: { text: "", name: "" },
    contact: { wa: "", address: "", hours: "", email: "raka@email.com" },
  },
  event: {
    type: "event",
    brand: { name: "Soundwave 2026", slogan: "Satu hari, delapan panggung", palette_id: "barber" },
    hero: { layout: "split-bold", headline: "Festival musik kampus, 14 Desember", sub: "Delapan penampil di Lapangan Utama. Tiket early bird sudah dibuka.", cta: "Beli Tiket", badge: "14 Desember 2026" },
    hover_effect: "lift",
    products: [
      { name: "Tiket Early Bird", price: "", tag: "Terbatas", size: "large", icon: "ticket", desc: "Harga lebih rendah, jumlah terbatas." },
      { name: "Panggung Utama", price: "", tag: "", size: "small", icon: "music", desc: "Delapan penampil dari sore sampai malam." },
      { name: "Bazar Kuliner", price: "", tag: "", size: "small", icon: "utensils", desc: "Stan makanan dari komunitas kampus." },
    ],
    bento_features: [
      { title: "8 penampil", desc: "Band kampus dan satu bintang tamu.", icon: "music", col_span: 2 },
      { title: "Lapangan Utama", desc: "Pintu masuk dari gerbang barat.", icon: "map-pin", col_span: 1 },
      { title: "Bazar kuliner", desc: "Makanan dan minuman dari mahasiswa.", icon: "utensils", col_span: 1 },
    ],
    articles: [],
    testimonial: { text: "", name: "" },
    contact: { wa: "", address: "Lapangan Utama", hours: "", email: "" },
  },
  profil: {
    type: "profil",
    brand: { name: "Karang Taruna Sukamaju", slogan: "Warga muda, kerja nyata", palette_id: "tech" },
    hero: { layout: "split-bold", headline: "Organisasi pemuda RW 05 sejak 2012", sub: "Kami mengurus kebersihan lingkungan, olahraga, dan acara 17 Agustus.", cta: "Gabung", badge: "" },
    hover_effect: "lift",
    products: [],
    bento_features: [
      { title: "Kerja bakti bulanan", desc: "Setiap Minggu pertama, mulai pukul 07.00.", icon: "hand-heart", col_span: 2 },
      { title: "Turnamen voli", desc: "Digelar tiap Agustus antar RT.", icon: "trophy", col_span: 1 },
      { title: "Terbuka untuk remaja", desc: "Usia 15 sampai 30 tahun.", icon: "users", col_span: 1 },
    ],
    articles: [],
    testimonial: { text: "", name: "" },
    contact: { wa: "", address: "", hours: "", email: "" },
  },
  artikel: {
    type: "artikel",
    brand: { name: "Catatan Kopi Nusantara", slogan: "Seduh, baca, ulangi", palette_id: "majalah" },
    hero: { layout: "editorial", headline: "Panduan seduh kopi untuk pemula", sub: "Terbit tiap Senin. Dari V60 sampai profil petani Gayo.", cta: "Baca Artikel", badge: "Terbit tiap Senin" },
    hover_effect: "lift",
    products: [],
    bento_features: [],
    articles: [
      { title: "Seduh V60 di rumah dengan alat seadanya", excerpt: "Rasio, suhu air, dan satu kebiasaan yang sering terlewat.", category: "Panduan", author: "", read_min: 4, body: ["Mulai dari rasio 1 banding 15: 15 gram kopi untuk 225 ml air.", "## Suhu air", "Air yang baru mendidih sebaiknya didiamkan sekitar 30 detik sebelum dituang.", "Tuang melingkar pelan, jangan langsung habis dalam sekali tuang."] },
      { title: "Bertemu petani kopi di dataran tinggi Gayo", excerpt: "Cerita panen, penjemuran, dan harga yang diterima petani.", category: "Profil", author: "", read_min: 5, body: ["Panen dilakukan tangan, hanya buah yang sudah merah.", "Penjemuran memakan waktu beberapa hari, tergantung cuaca."] },
      { title: "Grinder manual atau listrik untuk pemula", excerpt: "Perbandingan sederhana dari sisi harga, hasil, dan tenaga.", category: "Ulasan", author: "", read_min: 3, body: ["Grinder manual lebih murah dan mudah dibawa.", "Grinder listrik lebih cepat, cocok bila menyeduh setiap pagi."] },
    ],
    testimonial: { text: "", name: "" },
    contact: { wa: "", address: "", hours: "", email: "halo@kopinusantara.id" },
  },
};

/** Prompt sistem pembuatan situs + contoh isi yang relevan (semua jenis bila jenis belum dipilih). */
export function siteSystemPrompt(kind?: SiteKind): string {
  const kinds: SiteKind[] = kind ? [kind] : (["umkm", "jasa", "artikel"] as SiteKind[]);
  const ex = kinds.map((k) => JSON.stringify(SITE_EXAMPLES[k])).join("\n");
  return `${SITE_SYSTEM_PROMPT}

Contoh isi yang BENAR untuk menunjukkan gaya dan kedalaman (BUKAN untuk disalin; semua nama, angka, dan fakta di bawah hanya ilustrasi, ganti seluruhnya sesuai permintaan pengguna dan jangan memakai fakta yang tidak disebut pengguna):
${ex}`;
}

/* ---------- ungkapan terlarang ---------- */

/** Ungkapan generik yang dilarang di prompt sistem. Dicek ulang di hasil karena model kecil kadang melanggar. */
export const BANNED_PHRASES: string[] = [
  "solusi terbaik", "terpercaya", "berkualitas", "profesional", "terdepan", "inovatif", "tak tertandingi",
  "pengalaman tak terlupakan", "siap membantu", "yuk", "wujudkan", "nikmati", "sempurna", "selamat datang",
  "menyediakan yang terbaik",
];

const BANNED_RE = BANNED_PHRASES.map((w) => ({ w, re: new RegExp(`(?<![\\p{L}])${w.replace(/ /g, "\\s+")}(?![\\p{L}])`, "iu") }));

export interface BannedHit {
  /** Lokasi bidang, mis. "headline" atau "features[1].text". */
  field: string;
  word: string;
}

/**
 * Cari ungkapan terlarang pada teks buatan AI. Kata yang memang ditulis pengguna di deskripsinya dilewati
 * (mis. pengguna menulis "fotografer profesional"), supaya istilah miliknya tidak dihapus.
 */
export function findBanned(c: SiteContent, userText: string): BannedHit[] {
  const mine = userText.toLowerCase();
  const rules = BANNED_RE.filter((b) => !mine.includes(b.w));
  const hits: BannedHit[] = [];
  const check = (field: string, v: unknown) => {
    if (typeof v !== "string" || !v) return;
    for (const b of rules) if (b.re.test(v)) hits.push({ field, word: b.w });
  };
  check("slogan", c.slogan);
  check("badge", c.badge);
  check("headline", c.headline);
  check("subheadline", c.subheadline);
  check("ctaLabel", c.ctaLabel);
  check("featuresTitle", c.featuresTitle);
  check("itemsTitle", c.itemsTitle);
  check("stepsTitle", c.stepsTitle);
  check("aboutTitle", c.aboutTitle);
  check("about", c.about);
  check("closing", c.closing);
  check("closingText", c.closingText);
  c.features.forEach((f, i) => { check(`features[${i}].title`, f.title); check(`features[${i}].text`, f.text); });
  c.items.forEach((it, i) => check(`items[${i}].desc`, it.desc));
  c.steps.forEach((st, i) => { check(`steps[${i}].title`, st.title); check(`steps[${i}].text`, st.text); });
  (c.articles ?? []).forEach((a, i) => {
    check(`articles[${i}].title`, a.title);
    check(`articles[${i}].excerpt`, a.excerpt);
    a.body.forEach((p, j) => check(`articles[${i}].body[${j}]`, p));
  });
  return hits;
}

/** Instruksi otomatis untuk menulis ulang bidang yang melanggar (dipakai lewat jalur "ubah"). */
export function polishInstruction(hits: BannedHit[]): string {
  const lines = hits.slice(0, 14).map((h) => `- ${h.field} (memakai "${h.word}")`);
  return `Tulis ulang HANYA bidang berikut karena memakai ungkapan generik yang dilarang. Ganti dengan kalimat konkret dan spesifik, pertahankan makna dan panjangnya, jangan menambah klaim atau fakta baru:\n${lines.join("\n")}`;
}

/* ---------- mode ubah dengan perintah ---------- */

export const EDITABLE_KEYS = [
  "template", "accent", "hero", "feat", "hover", "brand", "brandIcon", "slogan", "badge", "headline", "subheadline", "ctaLabel",
  "featuresTitle", "features", "itemsTitle", "items", "articles", "stepsTitle", "steps", "aboutTitle", "about",
  "testimonial", "whatsapp", "email", "address", "hours", "closing", "closingText",
] as const;
export type EditableKey = (typeof EDITABLE_KEYS)[number];

export const EDIT_SYSTEM_PROMPT = `Kamu editor isi website untuk Depup AI Web Builder. Pengguna memberi isi website saat ini (JSON) dan satu perintah perubahan. Balas HANYA satu objek JSON valid, tanpa markdown dan tanpa penjelasan.

Isi website saat ini memakai kunci berikut (semua boleh kamu ubah): ${EDITABLE_KEYS.join(", ")}.
Bentuk bidang bersarang:
- features: [{"icon":"","title":"","text":"","span":1}] (span 1 atau 2)
- items: [{"name":"","desc":"","price":15000,"category":"","icon":"","size":"small","tag":""}] (price angka rupiah, 0 bila tak disebut; maks 12 item; size "large" untuk maks 2 item)
- articles: [{"title":"","excerpt":"","category":"","author":"","readMin":4,"body":["paragraf","## subjudul","paragraf"]}] (maks 15 artikel)
- steps: [{"title":"","text":""}] (2 sampai 4)
- testimonial: {"text":"","name":""}
Nilai yang sah: template = ${TEMPLATES.map((t) => t.id).join(" | ")}; hero = ${HERO_LAYOUTS.map((h) => h.id).join(" | ")}; feat = ${FEAT_LAYOUTS.map((f) => f.id).join(" | ")}; hover = lift | tilt; accent = warna hex 6 digit seperti #1d4ed8 ("" = ikuti template).

Aturan balasan:
- Sertakan HANYA kunci yang berubah. Untuk kunci berupa daftar (features, items, articles, steps), kirim DAFTAR LENGKAP versi baru, termasuk elemen yang tidak berubah.
- Tambahkan kunci "note": satu kalimat Indonesia pendek (maks 90 karakter) yang menjelaskan apa yang kamu ubah.
- Perubahan warna atau suasana ("lebih gelap", "lebih ceria") dilakukan dengan mengganti template dan/atau accent.
- Jangan mengubah hal yang tidak diminta. Jangan mengarang harga, nomor WhatsApp, alamat, testimoni, statistik, atau klaim baru yang tidak disebut pengguna; bila diminta menambah produk tanpa harga, pakai price 0.
- Gaya tulisan: Indonesia, kalimat pendek dan konkret, tanpa emoji, tanpa tanda pisah em-dash, tanpa seruan berlebihan. DILARANG ungkapan generik: ${BANNED_PHRASES.join(", ")}.
- Ikon hanya nama Lucide yang umum (mis. beef, soup, cup-soda, star, clock, map-pin, phone, users, code, palette, music, ticket).
- Bila perintah tidak bisa dilakukan lewat isi teks (mis. mengganti foto, menambah halaman baru), balas {"note":"alasan singkat"} tanpa kunci lain.`;
