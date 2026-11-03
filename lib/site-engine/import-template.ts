/**
 * Contoh file impor yang bisa diunduh dari Panel Admin → Mesin AI.
 * Contoh ini harus selalu lolos validasi impor (diuji di tests/site-engine.test.mjs).
 */

export const PACK_TEMPLATE = [
  {
    id: "umkm-es-teh",
    kind: "umkm",
    label: "Es teh dan minuman segar",
    prompts: [
      "jualan es teh jumbo di depan sekolah",
      "booth es teh dan es jeruk di pasar malam",
      "usaha minuman teh rasa buah kekinian",
      "franchise es teh murah untuk anak kos",
      "kedai teh tarik dan es teh susu",
      "minuman segar gelas besar harga lima ribuan",
    ],
    keywords: ["es teh", "teh", "jumbo", "teh susu", "teh tarik", "minuman", "es jeruk", "lemon tea"],
    brandIcon: "cup-soda",
    templates: ["segar", "pastel", "tegas"],
    heroes: ["split", "center"],
    feats: ["grid", "bento"],
    brandFallback: ["Es Teh {city}", "Teh Jumbo Mantap"],
    badges: ["Gelas jumbo", "Buka sampai malam"],
    slogans: ["Segar sampai tetes terakhir", "Gelas besar, harga kecil"],
    headlines: ["Es teh jumbo {brand}, pelepas haus di {city}", "Segelas besar teh segar, harga pas di kantong"],
    subheadlines: ["Teh diseduh tiap pagi, bukan bubuk instan. Pilih rasa original, lemon, atau susu, lalu ambil di booth terdekat."],
    cta: ["Pesan lewat WhatsApp", "Lihat menu"],
    featuresTitle: ["Kenapa {brand}"],
    features: [
      { icon: "leaf", title: "Teh seduh asli", text: "Daun teh diseduh setiap pagi, rasanya pekat tanpa perisa buatan." },
      { icon: "wallet", title: "Mulai lima ribuan", text: "Gelas 22 oz dengan harga yang ramah untuk pelajar." },
      { icon: "clock", title: "Buka sampai malam", text: "Mampir sepulang sekolah atau kerja, es masih penuh." },
    ],
    itemsTitle: ["Menu {brand}"],
    items: [
      { name: "Es Teh Original", desc: "Teh melati manis gelas jumbo.", price: 5000, category: "Teh", icon: "cup-soda" },
      { name: "Lemon Tea", desc: "Teh dengan perasan lemon segar.", price: 7000, category: "Teh", icon: "citrus" },
      { name: "Teh Susu", desc: "Teh pekat dengan susu kental manis.", price: 8000, category: "Teh", icon: "cup-soda" },
    ],
    stepsTitle: ["Cara pesan"],
    steps: [
      { title: "Pilih rasa", text: "Lihat menu dan tentukan ukuran gelas." },
      { title: "Kirim pesanan", text: "Chat WhatsApp dengan jam ambil atau alamat antar." },
      { title: "Ambil pesanan", text: "Pesanan siap dalam lima menit, masih dingin." },
    ],
    aboutTitle: ["Tentang {brand}"],
    about: ["{brand} mulai dari satu booth kecil di {city}. Sampai sekarang tehnya tetap diseduh sendiri setiap pagi."],
    testimonials: [{ text: "Gelasnya besar, manisnya pas. Tiap pulang sekolah pasti beli.", name: "Dimas" }],
    closing: ["Haus siang ini?"],
    closingText: ["Chat sekarang, pesananmu kami siapkan."],
  },
];

export const FEEDBACK_TEMPLATE = [
  {
    prompt: "es teh jumbo di depan kampus, ada rasa lemon dan leci",
    content: {
      kind: "umkm",
      headline: "Es teh jumbo dekat kampus, siap dalam lima menit",
      subheadline: "Teh diseduh tiap pagi. Pilih original, lemon, atau leci.",
      badge: "Gelas 22 oz",
      ctaLabel: "Pesan sekarang",
      features: [{ icon: "clock", title: "Cepat", text: "Pesanan siap sebelum kelas berikutnya mulai." }],
      items: [{ name: "Lychee Tea", desc: "Teh dengan buah leci.", price: 8000, category: "Teh" }],
      about: "Booth kecil yang menemani mahasiswa sejak semester pertama.",
      closing: "Kelas siang bikin haus?",
      closingText: "Mampir ke booth kami di depan gerbang.",
      testimonial: { text: "Lecinya terasa, bukan cuma sirup.", name: "Ayu" },
    },
  },
];

export const packTemplateText = () => JSON.stringify(PACK_TEMPLATE, null, 2) + "\n";
export const feedbackTemplateText = () => FEEDBACK_TEMPLATE.map((f) => JSON.stringify(f)).join("\n") + "\n";
