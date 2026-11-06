/**
 * Bahasa untuk website buatan AI Web Builder. Isi website (judul, produk, dsb.) ditulis mesin dalam bahasa yang
 * diminta; file ini hanya mengurus label tetap di website (navigasi, keranjang, kontak) dan format harga.
 * Mandiri (tanpa import) supaya bisa dipakai renderer, mesin, dan tes.
 */
export type SiteLang = "id" | "en";

/** Label tetap di website: kunci = teks Indonesia. */
const SITE_EN: Record<string, string> = {
  Katalog: "Catalog",
  Keunggulan: "Highlights",
  Kontak: "Contact",
  "Tentang kami": "About us",
  "Lihat katalog": "See the catalog",
  "Lihat keunggulan": "See highlights",
  "Lihat selengkapnya": "See more",
  Lihat: "See",
  "Harga mulai": "From",
  mulai: "from",
  Artikel: "Articles",
  Edisi: "Edition",
  mnt: "min",
  "mnt baca": "min read",
  "Tanya harga": "Ask for price",
  Tambah: "Add",
  "Cari produk…": "Search products…",
  "Cari produk": "Search products",
  Baca: "Read",
  "Semua artikel": "All articles",
  "Artikel lainnya": "More articles",
  Sebelumnya: "Previous",
  Berikutnya: "Next",
  "Kata pelanggan": "What customers say",
  Alamat: "Address",
  "Jam buka": "Opening hours",
  "Kirim Email": "Send email",
  "via WhatsApp": "on WhatsApp",
  "Buka keranjang": "Open cart",
  Keranjang: "Cart",
  "Tutup keranjang": "Close cart",
  Total: "Total",
  "Pesan via WhatsApp": "Order on WhatsApp",
  "Salin pesanan": "Copy order",
  "Kosongkan keranjang": "Empty cart",
  "Buka menu": "Open menu",
  Menu: "Menu",
  "Menu utama": "Main menu",
  "Lewati ke konten": "Skip to content",
  "Dibuat dengan Depup AI Web Builder": "Made with Depup AI Web Builder",
  Toko: "Shop",
  Jasa: "Services",
  Portofolio: "Portfolio",
  Acara: "Event",
  Profil: "Profile",
  Subjek: "Subject",
  Jenis: "Type",
  Kota: "City",
  Tahun: "Year",
  Asal: "Origin",
  // judul bawaan normalizeContent
  "Baca Artikel": "Read articles",
  "Hubungi Kami": "Contact us",
  "Produk Kami": "Our products",
  "Karya Pilihan": "Selected work",
  "Rangkaian Acara": "Program",
  "Artikel Terbaru": "Latest articles",
  Layanan: "Services",
  "Cara Pesan": "How to order",
  "Tentang Kami": "About us",
  "Hubungi kami": "Contact us",
};

/** Teks di skrip katalog/keranjang (string literal di kode kita sendiri, bukan isi pengguna). */
const RUNTIME_EN: [string, string][] = [
  ['"Tanya harga"', '"Ask for price"'],
  ['"Tambah "+it.name+" ke keranjang"', '"Add "+it.name+" to cart"'],
  ['"Tambah"', '"Add"'],
  ['"Ditambahkan ke keranjang"', '"Added to cart"'],
  ['"Halo "+D.brand+", saya mau pesan:\\n"', '"Hi "+D.brand+", I\'d like to order:\\n"'],
  ['"Total: "', '"Total: "'],
  ['"Terima kasih!"', '"Thank you!"'],
  ['" + item tanya harga"', '" + items to price"'],
  ['"0 = tanya harga"', '"0 = ask for price"'],
  ['"Harga (Rp)"', '"Price"'],
  ['"Nama"', '"Name"'],
  ['"Kategori"', '"Category"'],
  ['"Deskripsi"', '"Description"'],
  ['"Ikon"', '"Icon"'],
  ['"URL gambar"', '"Image URL"'],
  ['" produk dimuat"', '" products loaded"'],
  ['"File JSON tidak valid."', '"Invalid JSON file."'],
  ['"Batal"', '"Cancel"'],
  ['"Belum ada produk."', '"No products yet."'],
  ['"Gambar harus berupa URL http(s) atau gambar bawaan situs."', '"The image must be an http(s) URL or one of the site\'s images."'],
  ['"Hapus produk?"', '"Delete product?"'],
  ['"Hapus "', '"Delete "'],
  ['"Hapus"', '"Delete"'],
  ['"Kembalikan ke produk awal?"', '"Restore the original products?"'],
  ['"Keranjang masih kosong."', '"Your cart is empty."'],
  ['"Mode kelola"', '"Manage mode"'],
  ['"Nama produk wajib diisi."', '"Product name is required."'],
  ['"Pesanan disalin. Kirim ke penjual."', '"Order copied. Send it to the seller."'],
  ['"Produk baru"', '"New product"'],
  ['"Produk dihapus"', '"Product deleted"'],
  ['"Produk diperbarui"', '"Product updated"'],
  ['"Produk ditambahkan"', '"Product added"'],
  ['"Reset"', '"Reset"'],
  ['"Selesai"', '"Done"'],
  ['"Semua perubahan produk di browser ini dibuang dan katalog kembali seperti saat situs dibuat."', '"All product changes in this browser will be discarded and the catalog returns to how the site was created."'],
  ['"Simpan"', '"Save"'],
  ['"Tambah produk"', '"Add product"'],
  ['"Tidak ada produk yang cocok."', '"No matching products."'],
  ['"Tidak bisa menyalin otomatis."', '"Couldn\'t copy automatically."'],
  ['"Tutup"', '"Close"'],
  ['"Ubah produk"', '"Edit product"'],
  ['"Ubah "', '"Edit "'],
  ['"Unduh situs"', '"Download site"'],
  ['"index.html terbaru diunduh. Upload ulang untuk memperbarui situs."', '"Latest index.html downloaded. Upload it again to update the site."'],
  ['"Semua"', '"All"'],
  ['" akan dihapus dari katalog."', '" will be removed from the catalog."'],
  ['" produk"', '" products"'],
  ['"Deskripsi singkat"', '"Short description"'],
  ['"Ekspor JSON"', '"Export JSON"'],
  ['"Impor JSON"', '"Import JSON"'],
  ['"Gambar unggahan dipakai (isi URL untuk mengganti)"', '"Uploaded image in use (enter a URL to replace it)"'],
  ['"Katalog dikembalikan"', '"Catalog restored"'],
  ['"Kembalikan"', '"Restore"'],
  ['"Kurangi"', '"Decrease"'],
  ['"Nama produk"', '"Product name"'],
];

export function siteText(lang: SiteLang | undefined, s: string): string {
  return lang === "en" ? SITE_EN[s] ?? s : s;
}

/** Skrip katalog dalam bahasa website. */
export function localizeRuntime(js: string, lang: SiteLang | undefined, currency?: string): string {
  let out = js;
  const cur = (currency || "IDR").toUpperCase();
  if (cur !== "IDR") {
    const sym = JSON.stringify(SYMBOL[cur] ?? "");
    const suf = JSON.stringify(SYMBOL[cur] ? "" : " " + cur);
    out = out.replace(
      'function rp(n){return"Rp "+String(Math.round(n)).replace(/\\B(?=(\\d{3})+(?!\\d))/g,".")}',
      `function rp(n){var f=Math.round(n*100)%100!==0;return ${sym}+(f?n.toFixed(2):String(Math.round(n))).replace(/\\B(?=(\\d{3})+(?!\\d))/g,",")+${suf}}`,
    );
    out = out.replace('field("Harga (Rp)",priceI)', `field("Harga (${cur})",priceI)`).replace('step:"500"', 'step:"0.01"');
  }
  if (lang !== "en") return out;
  for (const [a, b] of RUNTIME_EN) out = out.split(a).join(b);
  return out.replace(`"Harga (${cur})"`, '"Price"');
}

const SYMBOL: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", AUD: "A$", CAD: "C$", SGD: "S$", MYR: "RM", JPY: "¥", INR: "₹" };

/** Harga sesuai mata uang website. Rupiah tetap "Rp 15.000"; lainnya "$9" / "$9.50". */
export function formatMoney(n: number, currency?: string): string {
  const cur = (currency || "IDR").toUpperCase();
  if (cur === "IDR") return "Rp " + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const frac = Math.round(n * 100) % 100 !== 0;
  const num = (frac ? n.toFixed(2) : String(Math.round(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const sym = SYMBOL[cur];
  return sym ? `${sym}${num}` : `${num} ${cur}`;
}

/** Harga singkat untuk statistik/stiker: "15rb", "1,5jt" atau "$9". */
export function shortMoney(n: number, currency?: string): string {
  const cur = (currency || "IDR").toUpperCase();
  if (cur !== "IDR") return formatMoney(n, cur);
  return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(n % 1_000_000 ? 1 : 0)}jt` : n >= 1000 ? `${Math.round(n / 1000)}rb` : String(n);
}

export function isCurrency(v: unknown): v is string {
  return typeof v === "string" && /^[A-Z]{3}$/.test(v);
}

const EN_WORDS = /\b(the|a|an|and|with|for|of|in|on|at|to|is|are|our|my|your|we|i|i'm|it|this|that|by|from|near|open|until|order|orders|welcome|contact|shop|store|selling|sells|offer|offers|services?|menu|price|prices|business|bakery|coffee|restaurant|portfolio|blog|about|event|tickets?|community|located|called|named|daily|every|am|pm|guides?|reviews?|beginners|student|design|development)\b/gi;
const ID_WORDS = /\b(yang|dan|dengan|untuk|di|ke|dari|saya|aku|kami|jual|jualan|menjual|toko|warung|kedai|usaha|buka|harga|pesan|lewat|setiap|tiap|hari|sampai|bernama|namanya|tentang|acara|komunitas|rb|ribu|jt|juta|kue|bakso|jasa|layanan|buat|bikin|mahasiswa|kota|terima|pesanan|via|wa)\b/gi;

/** Bahasa deskripsi pengguna. Imbang/ragu → hint (bahasa tampilan), lalu Indonesia. */
export function detectSiteLang(text: string, hint?: SiteLang): SiteLang {
  const t = String(text || "").toLowerCase();
  const en = (t.match(EN_WORDS) || []).length;
  const id = (t.match(ID_WORDS) || []).length;
  if (en >= 2 && en > id * 1.3) return "en";
  if (id >= 2 && id > en * 1.3) return "id";
  if (/\$\s?\d|€\s?\d|£\s?\d/.test(t) && !/\brp\b|\d\s?(rb|ribu|jt)\b/.test(t)) return "en";
  if (/\brp\b|\d\s?(rb|ribu|jt)\b/.test(t)) return "id";
  return hint ?? "id";
}

/** Mata uang dari deskripsi. */
export function detectCurrency(text: string, lang: SiteLang): string {
  const t = String(text || "");
  if (/\bRp\.?\s?\d|\d\s?(rb|ribu|jt|juta)\b|\bIDR\b/i.test(t)) return "IDR";
  if (/€|\bEUR\b|\beuros?\b/i.test(t)) return "EUR";
  if (/£|\bGBP\b|\bpounds?\b/i.test(t)) return "GBP";
  if (/\bA\$|\bAUD\b/.test(t)) return "AUD";
  if (/\bS\$|\bSGD\b/.test(t)) return "SGD";
  if (/\bRM\s?\d|\bMYR\b|\bringgit\b/i.test(t)) return "MYR";
  if (/\$|\bUSD\b|\bdollars?\b/i.test(t)) return "USD";
  return lang === "en" ? "USD" : "IDR";
}
