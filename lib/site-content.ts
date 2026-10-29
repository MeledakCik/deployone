/**
 * Sumber tunggal konten publik Depup untuk SEO dan ringkasan AI.
 *
 * Dipakai oleh: halaman /fitur dan /fitur/[slug], sitemap, JSON-LD di layout,
 * blok "Sekilas Depup" di beranda, FAQ beranda, serta /llms.txt dan /llms-full.txt.
 * Mengubah fitur di sini otomatis memperbarui semuanya, jadi tidak ada versi yang saling bertentangan.
 *
 * Aturan: tulis hanya hal yang benar-benar ada di kode. Angka batas diambil dari
 * app/api/_lib/* (db-adapter.ts, sites.ts, tunnel.ts) dan README.md.
 * Murni data (tanpa import React/Node) supaya aman dipakai di server maupun klien.
 */

export const SITE_NAME = "Depup";

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "https://depup.cloud"
).replace(/\/+$/, "");

/** Judul beranda (<title>). Dipakai layout (default) dan app/page.tsx. */
export const HOME_TITLE = "Depup: Dashboard Deploy Indonesia untuk Vercel, Cloudflare & Railway";

export const SITE_TAGLINE = "Dashboard Deploy Indonesia untuk Vercel, Cloudflare Pages & Railway";

/** Satu kalimat definisi. Kalimat inilah yang paling sering dikutip mesin pencari dan asisten AI. */
export const SITE_DEFINITION =
  "Depup (depup.cloud) adalah dashboard deploy buatan Indonesia untuk menayangkan dan mengelola website di Vercel, Cloudflare Pages, dan Railway dari satu tempat.";

export const SITE_DESCRIPTION =
  "Depup adalah dashboard deploy buatan Indonesia. Tempel link GitHub atau upload zip, Depup memeriksa isi repo lalu deploy ke Vercel, Cloudflare Pages, atau Railway. Ada juga Link Instan, AI Web Builder, Database, dan konektor MCP untuk Claude.";

export const CONTACT_EMAIL = "depupdev@gmail.com";

export const PLATFORMS = [
  { name: "Vercel", fit: "Next.js dan situs frontend lain" },
  { name: "Cloudflare Pages", fit: "Situs statis, Vite, dan Astro" },
  { name: "Railway", fit: "Server Node.js, Docker, Python, Go, PHP, dan bahasa lain" },
] as const;

export interface FeatureFaq {
  q: string;
  a: string;
}

export interface Feature {
  /** Dipakai di URL: /fitur/<slug>. Jangan diubah setelah dipublikasikan. */
  slug: string;
  name: string;
  /** Satu kalimat, dipakai di kartu, llms.txt, dan featureList JSON-LD. */
  summary: string;
  /** Judul halaman (tanpa nama situs; template di layout menambahkannya). Usahakan di bawah 55 karakter. */
  seoTitle: string;
  /** Meta description, 120 sampai 160 karakter. */
  seoDescription: string;
  /** Ringkasan 2 sampai 3 kalimat untuk blok "Ringkasan singkat" di halaman fitur. */
  tldr: string;
  /** Untuk siapa fitur ini paling berguna. */
  audience: string;
  /** Poin-poin kemampuan. Hanya fakta yang ada di kode. */
  points: string[];
  /** Batas dan hal yang perlu diketahui. Jujur soal keterbatasan. */
  limits: string[];
  /** Langkah singkat memakai fitur. */
  steps: string[];
  faqs: FeatureFaq[];
  /** Slug fitur terkait untuk tautan internal. */
  related: string[];
  /** Halaman dokumentasi yang lebih dalam, bila ada. */
  docsHref?: string;
}

export const FEATURES: Feature[] = [
  {
    slug: "deploy-github",
    name: "Deploy dari GitHub",
    summary:
      "Tempel link repo GitHub, Depup memeriksa isinya, lalu men-deploy ke Vercel, Cloudflare Pages, atau Railway dan memantau prosesnya sampai selesai.",
    seoTitle: "Deploy GitHub ke Vercel, Cloudflare & Railway",
    seoDescription:
      "Tempel link repo GitHub, biarkan Depup memeriksa isinya, lalu deploy ke Vercel, Cloudflare Pages, atau Railway dari satu dashboard berbahasa Indonesia.",
    tldr:
      "Depup membaca isi repo GitHub-mu sebelum deploy dan memberi tahu platform mana yang cocok. Kalau pilihanmu tidak cocok, kamu langsung tahu alasannya, jadi waktu tidak terbuang untuk deploy yang pasti gagal. Setelah itu Depup memantau progres sampai alamat situsmu muncul.",
    audience: "Pelajar, freelancer, dan siapa saja yang ingin website online tanpa mempelajari tiga dashboard sekaligus.",
    points: [
      "Deploy repo publik maupun private (isi GitHub Token dengan izin repo di Settings).",
      "Pemeriksaan repo sebelum deploy: mengenali HTML biasa, Node.js, Next.js, Docker, Python, dan lainnya, lalu menyarankan platform yang cocok.",
      "Tiga tujuan dalam satu form: Vercel, Cloudflare Pages, dan Railway.",
      "Pemantauan progres deploy, daftar Projects, tombol deploy ulang, dan riwayat deploy.",
      "Khusus Railway: Depup menambahkan file kecil yang kurang dalam satu commit (misalnya Staticfile, script start, Procfile, atau .dockerignore). File buatanmu tidak pernah ditimpa.",
      "Project di subfolder (misalnya frontend/) didukung di Railway lewat pengaturan Root Directory otomatis.",
      "Pesan error berbahasa Indonesia dengan kotak langkah perbaikan yang spesifik.",
    ],
    limits: [
      "Project di subfolder belum didukung otomatis di Vercel dan Cloudflare Pages.",
      "Cloudflare Pages tidak cocok untuk server Node.js; Vercel bersyarat untuk server; Docker dan bahasa selain JavaScript cocoknya ke Railway.",
      "Biaya platform tujuan mengikuti aturan masing-masing (Railway berbasis pemakaian).",
      "Dashboard menyimpan 10 deploy terakhir di riwayat.",
    ],
    steps: [
      "Masuk dengan akun Google di depup.cloud.",
      "Buka Settings, isi token platform yang ingin dipakai, lalu tekan Test Koneksi.",
      "Buka Deploy, tempel link repo GitHub, pilih platform, lalu klik Deploy.",
      "Tunggu progres selesai. Alamat situs dan project-nya muncul di daftar Projects.",
    ],
    faqs: [
      {
        q: "Pilih Vercel, Cloudflare Pages, atau Railway?",
        a: "Vercel paling mudah untuk Next.js dan situs frontend lain. Cloudflare Pages unggul untuk situs statis, Vite, dan Astro. Railway dipakai untuk backend yang harus jalan terus, seperti Express, Python, atau Docker. Depup menjelaskan alasannya bila pilihanmu tidak cocok dengan isi repo.",
      },
      {
        q: "Repo saya private, apakah bisa di-deploy?",
        a: "Bisa. Isi GitHub Token dengan izin repo di menu Settings, lalu Depup bisa membaca repo private-mu.",
      },
      {
        q: "Kenapa deploy ke Railway diblokir karena security vulnerabilities?",
        a: "Railway menolak project yang memakai versi dependency dengan celah keamanan, misalnya Next.js 14 di bawah 14.2.35. Perbarui versinya di package.json lalu deploy lagi.",
      },
    ],
    related: ["upload-zip", "domain-dan-environment", "asisten-bantuan"],
  },
  {
    slug: "upload-zip",
    name: "Upload ZIP atau folder",
    summary:
      "Tarik file .zip atau folder project ke Depup; isinya dikirim ke repo GitHub baru, lalu pilih upload saja atau langsung deploy.",
    seoTitle: "Upload ZIP atau Folder Project ke GitHub & Deploy",
    seoDescription:
      "Belum punya repo GitHub? Tarik file ZIP atau folder project ke Depup, kirim ke repo baru, lalu langsung deploy ke Vercel, Cloudflare Pages, atau Railway.",
    tldr:
      "Cara tercepat kalau project masih ada di komputermu. Depup mengekstrak ZIP atau folder, membuat repo GitHub baru, dan bila kamu mau langsung men-deploy-nya. File .env tidak ikut ke GitHub; isinya dibaca di komputermu dan diisikan ke kolom Environment variables.",
    audience: "Pengguna yang belum punya repo GitHub atau belum nyaman memakai git.",
    points: [
      "Menerima file .zip atau seluruh folder project.",
      "Repo baru bisa Private atau Public, dengan opsi menimpa repo yang sudah ada.",
      "Pilihan: Upload saja, atau Langsung deploy ke platform pilihan.",
      "Folder node_modules, .git, dan hasil build otomatis dilewati.",
      "File .env tidak dikirim ke GitHub; isinya dipasang ke platform sebagai environment variables.",
    ],
    limits: [
      "Butuh GitHub Token dengan izin repo di Settings.",
      "Batas ukuran: sampai 3.000 file, total 150 MB, dan maksimal 50 MB per file.",
      "Nama repo yang sudah dipakai ditolak, kecuali kamu mencentang opsi menimpa.",
    ],
    steps: [
      "Buka menu Upload dan tarik ZIP atau folder project.",
      "Atur nama repo dan pilih Private atau Public.",
      "Pilih Upload saja atau Langsung deploy.",
      "Repo baru muncul di GitHub-mu; bila memilih deploy, situs langsung diproses.",
    ],
    faqs: [
      {
        q: "Apakah file .env saya ikut terkirim ke GitHub?",
        a: "Tidak. File .env dibaca di komputermu dan otomatis diisikan ke kolom Environment variables, lalu dipasang ke platform saat deploy.",
      },
      {
        q: "Berapa batas ukuran upload?",
        a: "Sampai 3.000 file, total 150 MB, dan maksimal 50 MB per file.",
      },
    ],
    related: ["deploy-github", "domain-dan-environment"],
  },
  {
    slug: "link-instan",
    name: "Link Instan",
    summary:
      "Upload website statis (HTML, CSS, JavaScript) dan dapatkan link publik sementara di subdomain depup.web.id tanpa repo dan tanpa token platform.",
    seoTitle: "Link Instan: Hosting HTML Gratis Sementara",
    seoDescription:
      "Upload file HTML, CSS, dan JavaScript lalu dapatkan link publik sementara dalam hitungan detik. Cocok untuk demo, tugas kuliah, dan preview ke klien.",
    tldr:
      "Link Instan mengubah website statis menjadi link publik tanpa perlu repo atau deploy ke platform. Pilih masa aktif dari 1 jam sampai 7 hari. Pemilik bisa melihat daftar file dan statistik kunjungan, dan link bisa diperbarui tanpa mengganti alamatnya.",
    audience: "Mahasiswa, freelancer, dan siapa pun yang butuh demo atau pratinjau website cepat untuk dikirim ke dosen atau klien.",
    points: [
      "Menayangkan situs statis yang memiliki index.html, sampai beberapa halaman dan file.",
      "Masa aktif link dapat dipilih: 1, 6, 24, 72, atau 168 jam (1 jam sampai 7 hari).",
      "Dapat dibuat dari dashboard, dari AI Web Builder, atau lewat konektor MCP dari chat AI.",
      "Situs lama bisa diganti atau diperbarui di tempat sehingga alamat tetap sama.",
      "Statistik kunjungan dan daftar file tersedia untuk pemilik link.",
      "Laporan penyalahgunaan lewat halaman /laporkan; admin dapat menurunkan link bermasalah.",
    ],
    limits: [
      "Hanya situs statis; tidak ada server atau database di sisi link.",
      "Link bersifat sementara dan otomatis kedaluwarsa.",
      "Jumlah link aktif per akun dan ukuran situs dibatasi (default 3 link aktif per akun; ukuran mengikuti batas server).",
      "Subdomain depup.web.id adalah situs buatan pengguna dan tidak diindeks mesin pencari.",
    ],
    steps: [
      "Buka menu Link Instan di dashboard.",
      "Upload ZIP atau folder website statis yang berisi index.html.",
      "Pilih masa aktif link.",
      "Salin link publik dan bagikan.",
    ],
    faqs: [
      {
        q: "Berapa lama Link Instan aktif?",
        a: "Kamu memilih sendiri: 1 jam, 6 jam, 24 jam, 3 hari, atau 7 hari. Setelah itu link otomatis kedaluwarsa.",
      },
      {
        q: "Apakah Link Instan bisa menjalankan backend atau database?",
        a: "Tidak. Link Instan hanya menyajikan file statis. Untuk server, deploy ke Railway; untuk data, gunakan fitur Database Depup.",
      },
      {
        q: "Apakah situs di Link Instan muncul di Google?",
        a: "Tidak. Subdomain depup.web.id sengaja diberi tanda noindex karena berisi situs buatan pengguna.",
      },
    ],
    related: ["ai-web-builder", "konektor-mcp", "link-gaib"],
  },
  {
    slug: "ai-web-builder",
    name: "AI Web Builder",
    summary:
      "Ceritakan usaha atau topik blogmu; AI menentukan jenis situs, gaya, dan isinya, lalu kamu publish ke Link Instan atau ekspor file.",
    seoTitle: "AI Web Builder: Buat Website dengan Deskripsi",
    seoDescription:
      "Ceritakan usaha atau topikmu, AI di Depup menyusun website lengkap dengan gaya dan isi. Atur tampilan, ubah dengan perintah, lalu publish atau ekspor.",
    tldr:
      "AI Web Builder membuat website dari deskripsi berbahasa Indonesia. AI memilih jenis situs (UMKM, jasa, portofolio, event, profil, atau artikel), menyusun isi, dan kamu tinggal mengatur palet warna, tata letak, serta gambar. Hasilnya bisa dipublish sebagai Link Instan atau diekspor sebagai file.",
    audience: "Pemilik UMKM, mahasiswa, dan kreator yang butuh website sederhana tanpa menulis kode.",
    points: [
      "Enam jenis situs: UMKM, jasa, portofolio, event, profil, dan artikel/blog.",
      "Pilihan palet warna, tata letak hero dan fitur, serta pengelolaan gambar.",
      "Mode Ubah dengan perintah: revisi cukup dengan kalimat biasa.",
      "Pratinjau langsung sebelum dipublish.",
      "Publish ke Link Instan atau ekspor sebagai file.",
      "Memakai token Groq milik pengguna (disimpan terenkripsi) atau jatah coba gratis harian per akun bila diaktifkan server.",
    ],
    limits: [
      "Hasil berupa situs statis.",
      "Kualitas isi bergantung pada deskripsi yang kamu tulis; periksa kembali sebelum dipublikasikan.",
      "Jatah coba gratis per hari ditentukan pengelola Depup dan bisa tidak aktif.",
    ],
    steps: [
      "Buka menu AI Web Builder.",
      "Ceritakan usaha atau topik blogmu dan, bila mau, pasang token Groq.",
      "Atur tampilan dan gambar pada pratinjau.",
      "Publish ke Link Instan atau ekspor file.",
    ],
    faqs: [
      {
        q: "Apakah AI Web Builder butuh token sendiri?",
        a: "Kamu bisa memasang token Groq milik sendiri di menu AI Web Builder. Bila pengelola Depup mengaktifkan jatah coba gratis, ada kuota harian per akun yang memakai kunci server.",
      },
      {
        q: "Bisakah mengubah hasil AI tanpa mengulang dari awal?",
        a: "Bisa. Gunakan Ubah dengan perintah, misalnya mengganti judul, warna, atau menambah bagian, tanpa membuat ulang seluruh situs.",
      },
    ],
    related: ["link-instan", "konektor-mcp"],
  },
  {
    slug: "link-gaib",
    name: "Link Gaib (bagikan localhost)",
    summary:
      "Jalankan npx depup-share share untuk membagikan localhost lewat link HTTPS sementara tanpa deploy.",
    seoTitle: "Link Gaib: Bagikan Localhost dengan npx depup-share",
    seoDescription:
      "Bagikan project di localhost ke dosen atau klien lewat link HTTPS sementara. Cukup jalankan npx depup-share share, tanpa deploy dan tanpa konfigurasi.",
    tldr:
      "Link Gaib membuat terowongan dari komputermu ke internet. Jalankan project seperti biasa, ketik npx depup-share share di terminal lain, dan kamu mendapat link HTTPS untuk dikirim ke siapa saja. Link mati saat kamu menekan Ctrl+C atau otomatis setelah 2 jam.",
    audience: "Developer yang ingin memamerkan hasil kerja yang masih berjalan di localhost.",
    points: [
      "Satu perintah: npx depup-share share, atau npx depup-share share 8000 untuk port tertentu.",
      "Opsi --name untuk awalan nama link dan --ttl untuk masa aktif dalam menit.",
      "Link HTTPS sementara; mati otomatis setelah 2 jam secara bawaan (maksimal 8 jam).",
      "Pengunjung melihat halaman peringatan sekali sebelum lanjut ke websitemu.",
    ],
    limits: [
      "Link hanya hidup selama komputermu menyala dan perintah share masih berjalan.",
      "Belum mendukung WebSocket (live reload atau chat realtime).",
      "Upload file dibatasi sekitar 600 KB.",
      "Siapa pun yang punya link bisa membuka websitemu; jangan bagikan project berisi data rahasia.",
    ],
    steps: [
      "Jalankan project di komputermu, misalnya di localhost:8000.",
      "Di terminal lain ketik npx depup-share share.",
      "Salin link HTTPS yang muncul dan kirim ke siapa saja.",
      "Tekan Ctrl+C bila selesai; link langsung mati.",
    ],
    faqs: [
      {
        q: "Bagaimana cara membagikan localhost tanpa deploy?",
        a: "Jalankan project-mu, lalu di terminal lain ketik npx depup-share share. Kamu mendapat link HTTPS sementara yang bisa dikirim ke dosen atau client.",
      },
      {
        q: "Apakah depup-share sama dengan paket npm depup untuk memperbarui dependency?",
        a: "Bukan. Depup di sini adalah layanan web di depup.cloud, dan CLI resminya bernama depup-share.",
      },
    ],
    related: ["link-instan", "deploy-github"],
  },
  {
    slug: "domain-dan-environment",
    name: "Domain & Environment Variables",
    summary:
      "Pasang domain kustom dengan petunjuk DNS yang jelas dan simpan environment variables per project, lalu kirim ke platform dengan deploy ulang otomatis.",
    seoTitle: "Domain Kustom & Environment Variables Terpusat",
    seoDescription:
      "Pasang domain sendiri dengan record DNS yang jelas dan kelola environment variables per project untuk Vercel, Cloudflare Pages, dan Railway di satu tempat.",
    tldr:
      "Setelah website live, Depup menyimpan domain dan rahasia project di satu tempat. Kamu menambah domain dan mendapat record DNS yang tepat untuk diisi di registrar. Environment variables disimpan terenkripsi, disembunyikan secara bawaan, dan bisa dikirim ke platform tujuan; project otomatis dideploy ulang agar nilai baru terpakai.",
    audience: "Pemilik project yang sudah online dan butuh domain sendiri atau mengelola API key dan URL database.",
    points: [
      "Tambahkan domain kustom ke project dan lihat record DNS yang harus diisi.",
      "Pengecekan apakah domain sudah aktif.",
      "Environment variables per project; nilai disembunyikan sampai ikon mata ditekan.",
      "Kirim variabel ke Vercel, Cloudflare Pages, atau Railway; project dideploy ulang otomatis.",
      "Variabel yang dibutuhkan repo dapat terdeteksi otomatis.",
      "Token dan nilai variabel disimpan terenkripsi dan hanya bisa dipakai oleh akunmu.",
    ],
    limits: [
      "Perubahan DNS di registrar bisa butuh waktu untuk menyebar.",
      "Nama variabel memakai huruf besar dan garis bawah, misalnya NEXT_PUBLIC_API_URL.",
    ],
    steps: [
      "Buka menu Domains, pilih project, lalu tambahkan domainmu.",
      "Isi record DNS yang ditampilkan di tempat kamu membeli domain.",
      "Buka menu Environment, tambahkan variabel, lalu kirim ke platform.",
      "Tunggu deploy ulang selesai agar nilai baru berlaku.",
    ],
    faqs: [
      {
        q: "Bisakah memakai domain sendiri?",
        a: "Bisa. Tambahkan domain ke sebuah project di menu Domains, lalu isi record DNS yang ditampilkan Depup di tempat kamu membeli domain. Depup membantu mengecek apakah domainnya sudah aktif.",
      },
      {
        q: "Apakah environment variable saya aman?",
        a: "Nilainya disimpan terenkripsi dan hanya dapat dipakai oleh akunmu. Token juga tidak pernah dikirim ke AI.",
      },
    ],
    related: ["deploy-github", "database"],
  },
  {
    slug: "database",
    name: "Database (Turso/SQLite)",
    summary:
      "Buat database Turso (SQLite) pribadi dengan panel admin ala phpMyAdmin, REST API, serta impor dan ekspor data.",
    seoTitle: "Database SQLite Gratis dengan Panel Admin & REST API",
    seoDescription:
      "Buat database Turso (SQLite) pribadi di Depup: telusuri tabel, jalankan SQL, impor dan ekspor data, serta akses lewat REST API dengan API key.",
    tldr:
      "Fitur Database memberi kamu database SQLite berbasis Turso lengkap dengan panel admin untuk menelusuri tabel, mengubah struktur, dan menjalankan SQL. Data bisa diimpor dan diekspor, diakses aplikasi lewat REST API dengan API key, dan kredensialnya bisa dikirim ke project sebagai environment variables.",
    audience: "Developer yang butuh database ringan untuk project kecil, tugas kuliah, atau prototipe.",
    points: [
      "Database Turso (SQLite) pribadi per akun.",
      "Panel admin: telusuri baris, kelola struktur tabel, dan jalankan perintah SQL.",
      "Impor dan ekspor data.",
      "Akses dari aplikasi lewat REST API dengan API key.",
      "Kirim kredensial ke project sebagai environment variables.",
    ],
    limits: [
      "Maksimal 3 database per akun.",
      "Kuota penyimpanan 100 MB total per akun.",
      "Jatah dan kuota bisa berubah mengikuti kebijakan pengelola.",
    ],
    steps: [
      "Buka menu Database lalu klik Create Database.",
      "Simpan kredensial dan API key yang ditampilkan sekali.",
      "Buat tabel atau impor data lewat panel admin.",
      "Hubungkan ke aplikasi lewat REST API atau kirim kredensial sebagai environment variables.",
    ],
    faqs: [
      {
        q: "Berapa banyak database yang bisa dibuat?",
        a: "Sampai 3 database per akun dengan kuota penyimpanan total 100 MB.",
      },
      {
        q: "Bagaimana aplikasi saya mengakses database ini?",
        a: "Lewat REST API Depup memakai API key yang kamu buat di panel database, atau lewat kredensial yang dikirim ke project sebagai environment variables.",
      },
    ],
    related: ["domain-dan-environment", "deploy-github"],
  },
  {
    slug: "konektor-mcp",
    name: "Konektor MCP untuk AI",
    summary:
      "Hubungkan Depup ke Claude, Cursor, Codex, Gemini, OpenCode, atau DeepSeek Harness agar AI bisa mempublikasikan website dan men-deploy repo atas permintaanmu.",
    seoTitle: "Konektor MCP: Publish Website dari Claude & Cursor",
    seoDescription:
      "Hubungkan Depup ke Claude, Cursor, Codex, Gemini, OpenCode, dan DeepSeek lewat MCP. Minta AI publish website jadi link publik atau deploy repo GitHub.",
    tldr:
      "Dengan konektor MCP, kamu cukup berkata \"publish ke Depup\" di chat AI dan mendapat link publik. Depup menyediakan tool untuk menayangkan, memperbarui, memeriksa, dan menghapus Link Instan, serta men-deploy repo GitHub. Akses memakai OAuth 2.1 dengan PKCE dan bisa dicabut kapan saja.",
    audience: "Pengguna AI yang ingin hasil website langsung online tanpa download dan upload manual.",
    points: [
      "Tool: deploy_website, update_website, inspect_website, list_websites, delete_website, connector_status, dan deploy_project.",
      "Mendukung Claude (web, app HP, Claude Code), Cursor, Codex, Gemini (web dan CLI), OpenCode, serta DeepSeek Harness (dsh).",
      "Website besar dapat dicicil bertahap dan diedit cepat dengan URL tetap sama.",
      "OAuth 2.1 dengan PKCE, atau Bearer Token dengan masa aktif 1 sampai 365 hari, serta opsi membuat OAuth client sendiri.",
      "Akses dapat dicabut kapan saja lewat tombol Cabut semua akses.",
      "Konektor tidak menampilkan token platformmu ke AI.",
    ],
    limits: [
      "DeepSeek Harness memakai Bearer Token lewat paket resmi @deepseek-ai/dsh-mcp-client (bukan OAuth otomatis) dan masih developer preview, jadi format konfigurasinya bisa berubah.",
      "Aturan Link Instan berlaku: situs statis, link sementara, kuota per akun.",
      "Deploy repo lewat konektor memakai token platform yang kamu simpan di Settings.",
    ],
    steps: [
      "Buka Settings, Konektor AI (MCP) di dashboard untuk menyalin URL konektor atau membuat token.",
      "Tambahkan URL ke klien AI-mu (misalnya Settings, Connectors di claude.ai) lalu login dengan Google dan izinkan.",
      "Minta AI membuat website lalu bilang \"publish ke Depup\".",
    ],
    faqs: [
      {
        q: "Klien AI apa saja yang didukung konektor MCP Depup?",
        a: "Claude (web, app HP, dan Claude Code), Cursor, OpenAI Codex, Google Gemini (web dan CLI), OpenCode, serta DeepSeek Harness (dsh).",
      },
      {
        q: "Bagaimana menghubungkan DeepSeek Harness ke Depup?",
        a: "Buat Bearer Token di Settings, Konektor AI (MCP), pilih DeepSeek. Pasang paket @deepseek-ai/dsh-mcp-client ke profil dsh, isi token lewat variabel lingkungan, lalu tambahkan blok konfigurasi streamable-http ke cordis.patch.yml. DeepSeek Harness masih developer preview, jadi ikuti panduan terbaru di /docs/mcp.",
      },
      {
        q: "Apakah AI bisa melihat token platform saya?",
        a: "Tidak. Token platform dibaca hanya di server saat dibutuhkan dan tidak dikembalikan sebagai hasil tool.",
      },
    ],
    related: ["link-instan", "ai-web-builder"],
    docsHref: "/docs/mcp",
  },
  {
    slug: "asisten-bantuan",
    name: "Asisten Bantuan (AI)",
    summary:
      "Chat bantuan berbahasa Indonesia yang bisa memeriksa akunmu saat kamu melaporkan masalah deploy.",
    seoTitle: "Asisten Bantuan AI untuk Masalah Deploy",
    seoDescription:
      "Tanya soal deploy, token, domain, atau error ke Asisten Bantuan Depup. Bila kamu melapor masalah, asisten memeriksa akunmu dan bisa meneruskan ke developer.",
    tldr:
      "Asisten Bantuan menjawab pertanyaan seputar deploy dalam bahasa Indonesia. Saat kamu melaporkan masalah seperti deploy gagal, asisten memeriksa apakah token masih valid, apakah platform sedang gangguan, dan apakah deploy terakhir gagal, lalu menjawab berdasarkan hasil itu. Token tidak pernah dikirim ke AI.",
    audience: "Semua pengguna yang buntu saat deploy.",
    points: [
      "Jawaban singkat dalam bahasa Indonesia tentang deploy, token, domain, dan error.",
      "Pemeriksaan akun di server: validitas token, gangguan platform, dan status deploy terakhir.",
      "Tombol Laporkan ke developer mengirim percakapan dan hasil pemeriksaan.",
      "Tombol Salin percakapan untuk dikirim lewat jalur lain.",
    ],
    limits: [
      "Asisten adalah AI dan bisa keliru; untuk hal penting cek ulang di Docs atau dashboard platform.",
      "Jangan menempel token atau password di chat.",
      "Riwayat chat hilang saat halaman di-refresh, kecuali kamu menekan Laporkan ke developer.",
    ],
    steps: [
      "Klik tombol Bantuan di pojok kanan bawah dashboard.",
      "Ceritakan masalahmu, misalnya deploy gagal.",
      "Baca kartu Hasil pemeriksaan akunmu bila muncul.",
      "Tekan Laporkan ke developer bila masalah belum selesai.",
    ],
    faqs: [
      {
        q: "Apakah token saya dikirim ke AI saat asisten memeriksa akun?",
        a: "Tidak. Pemeriksaan berjalan di server dan hanya hasil ringkasnya, seperti valid atau ditolak, yang dipakai asisten.",
      },
    ],
    related: ["deploy-github", "domain-dan-environment"],
  },
];

export function getFeature(slug: string): Feature | undefined {
  return FEATURES.find((f) => f.slug === slug);
}

export const FEATURE_LIST_SCHEMA: string[] = FEATURES.map((f) => `${f.name}: ${f.summary}`);

/** FAQ beranda. Sumber tunggal untuk tampilan FAQ dan FAQPage JSON-LD (jangan duplikasi di tempat lain). */
export const HOME_FAQS: FeatureFaq[] = [
  {
    q: "Apa itu Depup?",
    a: "Depup (depup.cloud) adalah dashboard deploy buatan Indonesia. Kamu menempelkan link GitHub atau mengupload ZIP, Depup memeriksa isinya, lalu men-deploy ke Vercel, Cloudflare Pages, atau Railway. Ada juga Link Instan, AI Web Builder, Database, Link Gaib, dan konektor MCP untuk AI.",
  },
  {
    q: "Apakah Depup gratis?",
    a: "Depup gratis dipakai. Donasi lewat menu Donasi (QRIS, via Saweria) sepenuhnya sukarela. Platform tujuan punya aturan biayanya sendiri. Railway, misalnya, berbayar berdasarkan pemakaian, jadi pastikan akun Railway-mu punya kredit atau metode pembayaran aktif.",
  },
  {
    q: "Project jenis apa saja yang bisa di-deploy?",
    a: "Website HTML, CSS, dan JavaScript biasa bisa ke ketiga platform (cukup ada index.html). Aplikasi Node.js dengan package.json seperti React, Vue, atau Next.js juga bisa, pastikan ada script build. Server (Express, NestJS), Docker, Python, Go, PHP, dan bahasa lain cocoknya ke Railway. Sebelum deploy, Depup memeriksa isi repo dan memberi tahu platform mana yang cocok.",
  },
  {
    q: "Pilih Vercel, Cloudflare Pages, atau Railway?",
    a: "Vercel paling mudah untuk Next.js dan situs frontend lain. Cloudflare Pages unggul untuk situs statis, Vite, dan Astro. Railway dipakai untuk backend yang harus jalan terus, seperti Express, Python, atau Docker. Kalau pilihanmu tidak cocok dengan isi repo, Depup menjelaskan alasannya dan menyarankan platform lain.",
  },
  {
    q: "Repo saya private, apakah bisa?",
    a: "Bisa. Isi GitHub Token dengan izin repo di menu Settings, lalu Depup bisa membaca repo private-mu.",
  },
  {
    q: "Saya belum punya repo GitHub. Bagaimana?",
    a: "Pakai menu Upload. Tarik file .zip atau folder project ke Depup, lalu isinya dikirim ke repo GitHub baru dan bisa langsung di-deploy. File .env tidak ikut ke GitHub. Batasnya sampai 3.000 file, total 150 MB, dan maksimal 50 MB per file.",
  },
  {
    q: "Bisa membuat link website sementara tanpa deploy?",
    a: "Bisa lewat Link Instan: upload website statis (HTML, CSS, JavaScript) dan dapatkan link publik di subdomain depup.web.id dengan masa aktif 1 jam sampai 7 hari. Link juga bisa dibuat dari AI Web Builder atau lewat konektor MCP dari chat AI seperti Claude.",
  },
  {
    q: "Bisa membuat website dengan AI di Depup?",
    a: "Bisa. AI Web Builder menyusun website dari deskripsi usaha atau topikmu (UMKM, jasa, portofolio, event, profil, atau artikel). Kamu mengatur tampilan dan gambar, lalu publish ke Link Instan atau ekspor file.",
  },
  {
    q: "Bisa membagikan localhost tanpa deploy?",
    a: "Bisa lewat Link Gaib. Jalankan project-mu, lalu di terminal lain ketik npx depup-share share. Kamu mendapat link HTTPS untuk dikirim ke dosen atau client. Link mati saat kamu menekan Ctrl+C, atau otomatis setelah 2 jam.",
  },
  {
    q: "Apakah ada database di Depup?",
    a: "Ada. Kamu bisa membuat database Turso (SQLite) pribadi dengan panel admin ala phpMyAdmin, impor dan ekspor data, serta REST API. Batasnya 3 database per akun dengan kuota total 100 MB.",
  },
  {
    q: "Bisakah Claude atau AI lain memakai Depup?",
    a: "Bisa lewat konektor MCP. Claude, Cursor, Codex, Gemini, OpenCode, dan DeepSeek Harness dapat mempublikasikan website sebagai Link Instan atau men-deploy repo GitHub atas permintaanmu. Akses memakai OAuth 2.1 dan bisa dicabut kapan saja.",
  },
  {
    q: "Apakah token dan environment variable saya aman?",
    a: "Kamu masuk lewat akun Google, jadi Depup tidak menyimpan password. Token platform dan nilai environment variable disimpan terenkripsi dan hanya bisa dipakai oleh akunmu. Token yang kamu ketik langsung di form deploy tidak disimpan, dan token yang tersimpan bisa kamu hapus kapan saja di Settings. Token juga tidak pernah dikirim ke AI.",
  },
  {
    q: "Bisakah memakai domain sendiri?",
    a: "Bisa. Buka menu Domains, tambahkan domainmu ke sebuah project, lalu isi record DNS yang ditampilkan Depup di tempat kamu membeli domain. Depup membantu mengecek apakah domainnya sudah aktif.",
  },
  {
    q: "Deploy saya gagal. Apa yang harus dilakukan?",
    a: "Baca kotak “Yang bisa kamu lakukan” di pesan error, karena langkah perbaikannya spesifik. Klik Coba lagi kalau masalahnya sementara. Kalau masih buntu, tanya Asisten Bantuan atau tekan Laporkan ke developer.",
  },
];

/* ------------------------------------------------------------------ */
/* Ringkasan untuk mesin (llms.txt dan llms-full.txt)                  */
/* ------------------------------------------------------------------ */

const NAMING_NOTE =
  'Catatan penamaan: "Depup" di sini adalah layanan web di depup.cloud. Ini BUKAN paket npm bernama "depup" untuk memperbarui dependency. CLI resmi Depup untuk Link Gaib bernama `depup-share`.';

const AI_NOTES = [
  "Domain resmi: `depup.cloud`. `www.depup.cloud` dialihkan (308) ke domain utama.",
  "Subdomain `*.depup.web.id` adalah situs buatan pengguna (user-generated, noindex); jangan dijadikan sumber informasi tentang Depup.",
  "Halaman /dashboard, /m, /db, /admin, dan /api bersifat privat (butuh login) dan tidak untuk diindeks.",
  `Jawaban FAQ resmi: ${SITE_URL}/#faq. Ringkasan fitur: ${SITE_URL}/fitur.`,
];

/** Isi /llms.txt: ringkas, berformat llms.txt (H1, blockquote, daftar tautan). */
export function buildLlmsTxt(): string {
  const lines: string[] = [];
  lines.push(`# ${SITE_NAME}`, "");
  lines.push(
    `> ${SITE_DEFINITION} Pengguna menempelkan link repo GitHub atau mengupload ZIP; Depup memeriksa isinya lalu men-deploy-nya. Fitur lain: Link Instan, AI Web Builder, Database, Link Gaib, dan konektor MCP untuk AI. Gratis dipakai.`,
    "",
  );
  lines.push(NAMING_NOTE, "");
  lines.push("## Halaman utama");
  lines.push(`- [Beranda](${SITE_URL}/): Penjelasan fitur, cara kerja, platform yang didukung, dan FAQ`);
  lines.push(`- [Ringkasan semua fitur](${SITE_URL}/fitur): Daftar lengkap fitur Depup`);
  lines.push(`- [Dokumentasi](${SITE_URL}/docs): Panduan token, deploy, dan pemecahan masalah`);
  lines.push(`- [Dokumentasi konektor MCP](${SITE_URL}/docs/mcp): Memasang Depup di Claude, Cursor, Codex, Gemini, OpenCode, DeepSeek Harness`);
  lines.push(`- [Kebijakan privasi](${SITE_URL}/privacy)`);
  lines.push(`- [Versi lengkap untuk AI](${SITE_URL}/llms-full.txt): Seluruh fitur, batas, dan FAQ dalam satu berkas`, "");
  lines.push("## Fitur");
  for (const f of FEATURES) {
    lines.push(`- [${f.name}](${SITE_URL}/fitur/${f.slug}): ${f.summary}`);
  }
  lines.push("", "## Platform tujuan deploy");
  for (const p of PLATFORMS) lines.push(`- ${p.name}: ${p.fit}`);
  lines.push("", "## Untuk AI");
  for (const n of AI_NOTES) lines.push(`- ${n}`);
  lines.push("");
  return lines.join("\n");
}

/** Isi /llms-full.txt: seluruh fitur, batas, langkah, dan FAQ dalam satu berkas teks. */
export function buildLlmsFullTxt(): string {
  const lines: string[] = [];
  lines.push(`# ${SITE_NAME}: ringkasan lengkap`, "");
  lines.push(`> ${SITE_DEFINITION}`, "");
  lines.push(NAMING_NOTE, "");
  lines.push("## Ringkasan dalam satu paragraf", "");
  lines.push(
    "Depup membantu orang menayangkan website ke internet tanpa belajar tiga dashboard sekaligus. Pengguna masuk dengan akun Google, menyimpan token platform di Settings, lalu menempelkan link repo GitHub atau mengupload ZIP. Depup memeriksa isi repo, menyarankan platform yang cocok, men-deploy ke Vercel, Cloudflare Pages, atau Railway, dan memantau prosesnya. Setelah live, domain, environment variables, dan riwayat deploy dikelola dari satu tempat. Di luar deploy, Depup menyediakan Link Instan (hosting statis sementara), AI Web Builder, Database SQLite (Turso), Link Gaib untuk membagikan localhost, konektor MCP untuk AI, dan Asisten Bantuan. Depup gratis dipakai; donasi bersifat sukarela.",
    "",
  );
  lines.push("## Platform tujuan deploy");
  for (const p of PLATFORMS) lines.push(`- ${p.name}: ${p.fit}`);
  lines.push("");
  lines.push("## Fitur");
  for (const f of FEATURES) {
    lines.push("", `### ${f.name}`, "", `URL: ${SITE_URL}/fitur/${f.slug}`, "", f.tldr, "", `Untuk siapa: ${f.audience}`, "");
    lines.push("Kemampuan:");
    for (const p of f.points) lines.push(`- ${p}`);
    lines.push("", "Batas dan catatan:");
    for (const l of f.limits) lines.push(`- ${l}`);
    lines.push("", "Cara memakai:");
    f.steps.forEach((s, i) => lines.push(`${i + 1}. ${s}`));
    if (f.faqs.length) {
      lines.push("", "Tanya jawab:");
      for (const q of f.faqs) lines.push(`- ${q.q} ${q.a}`);
    }
  }
  lines.push("", "## Fitur pendukung");
  lines.push("- Dashboard: ringkasan jumlah deploy, yang berhasil dan gagal, serta riwayat deploy terbaru.");
  lines.push("- Projects: semua project yang pernah di-deploy, dapat dibuka, di-deploy ulang, dihapus, atau diimpor dari Vercel, Cloudflare, dan Railway.");
  lines.push("- Settings: menyimpan token platform dengan tombol Test Koneksi dan Hapus.");
  lines.push("- Docs: panduan di dalam aplikasi untuk token, GitHub-ke-Cloudflare, jenis repo, dan pemecahan masalah.");
  lines.push("- Komunitas dan Donasi: saluran WhatsApp, Instagram, TikTok, LinkedIn, dan donasi QRIS lewat Saweria.");
  lines.push("- Tampilan mobile khusus di /m untuk penggunaan lewat ponsel.");
  lines.push("", "## Keamanan dan privasi");
  lines.push("- Login memakai akun Google; Depup tidak menyimpan password.");
  lines.push("- Token platform, GitHub PAT, dan environment variables disimpan terenkripsi (AES-256-GCM) dan hanya dibaca di server saat dibutuhkan.");
  lines.push("- Token tidak pernah dikirim ke AI, hanya hasil ringkas pemeriksaan.");
  lines.push("- Akses konektor MCP memakai OAuth dengan PKCE dan dapat dicabut kapan saja.");
  lines.push(`- Kebijakan privasi lengkap: ${SITE_URL}/privacy`);
  lines.push("", "## Tanya jawab umum");
  for (const f of HOME_FAQS) lines.push("", `**${f.q}**`, f.a);
  lines.push("", "## Untuk AI");
  for (const n of AI_NOTES) lines.push(`- ${n}`);
  lines.push("", `Kontak: ${CONTACT_EMAIL}`, "");
  return lines.join("\n");
}
