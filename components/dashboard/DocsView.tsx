"use client";

import { PageTitle } from "@/components/ui/primitives";
import * as React from "react";
import { CloudflareIcon, RailwayIcon, VercelIcon } from "@/components/ui/PlatformIcon";
import {
  AlertTriangle,
  ChevronDown,
  CircleAlert,
  ExternalLink,
  FolderKanban,
  Globe,
  HelpCircle,
  KeyRound,
  Link2,
  Lock,
  MessageCircle,
  Rocket,
  Search,
  Settings2,
  ShieldCheck,
  UploadCloud,
  X,
} from "@/components/ui/icons";
import { Github } from "lucide-react";
import { ViewFade } from "@/components/ui/ViewFade";
import { Surface } from "@/components/ui/Surface";

type CategoryId = "start" | "features" | "tokens" | "trouble" | "more" | "admin";

interface Guide {
  icon: React.ElementType;
  category: CategoryId;
  title: string;
  desc: string;
  /** Opsional: tidak semua panduan butuh link keluar (mis. panduan yang membahas menu Depup sendiri). */
  link?: { label: string; href: string };
  steps: (string | React.ReactNode)[];
}

const CATEGORIES: { id: CategoryId; label: string; desc: string }[] = [
  { id: "start", label: "Mulai di sini", desc: "Baru pertama kali? Mulai dari panduan ini." },
  { id: "features", label: "Fitur Depup", desc: "Cara memakai tiap menu di dashboard." },
  { id: "tokens", label: "Token dan keamanan", desc: "Cara mendapatkan token dan menjaga datamu tetap aman." },
  { id: "trouble", label: "Masalah dan error", desc: "Deploy gagal, situs kosong, atau muncul pesan error." },
  { id: "more", label: "Lainnya", desc: "Pertanyaan umum dan cara melapor." },
  { id: "admin", label: "Untuk admin Depup", desc: "Hanya relevan kalau kamu menjalankan Depup sendiri." },
];

const GUIDES: Guide[] = [
  // ─────────────────────────── Mulai di sini ───────────────────────────
  {
    icon: Rocket,
    category: "start",
    title: "Pertama kali pakai Depup — mulai dari mana?",
    desc: "Lima langkah dari akun baru sampai situsmu online.",
    steps: [
      "Masuk dengan akun Google lewat tombol Masuk di halaman utama. Depup tidak menyimpan password-mu.",
      'Buka Settings, lalu isi token untuk platform yang ingin kamu pakai (Vercel, Cloudflare, atau Railway). Cara mendapatkannya ada di grup "Token dan keamanan" di halaman ini.',
      'Tekan "Test Koneksi" di samping token untuk memastikan tokennya benar.',
      "Buka Deploy, tempel link repo GitHub (contoh: https://github.com/username/repo), pilih platform, lalu klik Deploy.",
      "Tunggu progresnya selesai. Alamat situsmu muncul di layar, dan project-nya masuk ke daftar Projects.",
      "Belum memiliki repo GitHub? Pakai menu Upload. Hanya mau menunjukkan hasil sementara ke dosen atau client? Pakai Link Instan atau Link Gaib (lihat panduan perbandingannya di bawah).",
      "Token tidak wajib disimpan di Settings. Kamu juga bisa mengetiknya langsung di form deploy; token yang diketik di sana hanya dipakai untuk deploy itu dan tidak disimpan.",
    ],
  },
  {
    icon: HelpCircle,
    category: "start",
    title: "Deploy, Upload, Link Instan, atau Link Gaib — pilih yang mana?",
    desc: "Depup memiliki empat cara menayangkan website. Ini cara memilih yang paling pas.",
    steps: [
      "Deploy: situs permanen dari repo GitHub ke Vercel, Cloudflare Pages, atau Railway. Pilih ini untuk situs final, portofolio, atau aplikasi yang perlu proses build.",
      "Upload: kirim zip atau folder dari komputermu ke repo GitHub baru, lalu (kalau mau) langsung deploy. Pilih ini kalau project-mu belum ada di GitHub.",
      "Link Instan: upload website statis yang sudah jadi (ada index.html) dan dapat link publik sementara, aktif 1 jam sampai 7 hari. Tanpa GitHub dan tanpa terminal. Cocok untuk demo tugas atau minta feedback cepat.",
      "Link Gaib: bagikan project yang sedang jalan di komputermu lewat satu perintah terminal. Cocok kalau project masih dikerjakan atau memiliki server lokal. Link hanya hidup selama komputermu menyala dan perintahnya masih jalan.",
      "Aturan singkat: butuh alamat yang tetap → Deploy. Hanya perlu menunjukkan hasil ke orang lain selama beberapa jam atau hari → Link Instan (kalau statis) atau Link Gaib (kalau ada server).",
      "Website memiliki backend (Express, Python, PHP, dst.) dan harus online terus? Deploy ke Railway. Link Instan hanya untuk situs statis.",
    ],
  },
  {
    icon: Github,
    category: "start",
    title: "Jenis repo apa yang bisa dideploy?",
    desc: "Depup memeriksa isi repo kamu dulu (HTML, TypeScript, Vue, Docker, dll) sebelum deploy — supaya tidak gagal di tengah jalan.",
    link: { label: "Buka Railway (untuk Docker/Python/Go/dll)", href: "https://railway.com/new" },
    steps: [
      "HTML / CSS / JS biasa (tanpa package.json): bisa ke Vercel, Cloudflare Pages, dan Railway. Pastikan ada file index.html di root repo (atau di folder public/ atau docs/).",
      "Node.js dengan package.json — termasuk TypeScript, React, Vue, Svelte, Angular, Astro, Next.js, dan lainnya: bisa ke ketiga platform. Pastikan ada script \"build\" di package.json.",
      "Server Node.js (Express, NestJS, Fastify): paling cocok ke Railway. Di Cloudflare Pages tidak bisa jalan; di Vercel butuh penyesuaian khusus.",
      "Docker, Python, Go, PHP, Ruby, Java, Rust, .NET: pilih Railway — platform lain hanya untuk situs web.",
      "Project ada di dalam subfolder (mis. frontend/)? Deploy otomatis hanya membaca root repo. Pindahkan ke root, atau deploy manual lalu isi \"Root Directory\" di dashboard platform.",
      "Repo private: isi GitHub Token (izin \"repo\") di form deploy.",
    ],
  },
  {
    icon: Globe,
    category: "start",
    title: "Vercel, Cloudflare Pages, atau Railway — pilih yang mana?",
    desc: "Ketiganya bisa dipakai lewat Depup, tetapi masing-masing paling cocok untuk jenis project yang berbeda.",
    steps: [
      "Vercel: paling mulus untuk Next.js dan situs frontend lain (React, Vue, Svelte, Astro). API routes dan SSR Next.js jalan otomatis. Paket gratisnya ditujukan untuk project pribadi; untuk pemakaian komersial periksa ketentuan terbaru di situs Vercel.",
      "Cloudflare Pages: unggul untuk situs statis dan hasil build seperti Vite, Astro, atau HTML biasa, dengan jaringan CDN yang cepat. Next.js dengan banyak API routes lebih rewel di sini (lihat panduan Next.js di Cloudflare).",
      "Railway: server yang jalan terus sebagai container. Pilih ini untuk backend (Express, NestJS, Fastify), Python, Go, PHP, Docker, worker, atau cron. Biayanya berdasarkan pemakaian, jadi pastikan akun Railway-mu memiliki kredit atau metode pembayaran aktif.",
      "Bingung? Situs statis atau frontend biasa → Vercel atau Cloudflare. Next.js lengkap dengan API → Vercel. Ada backend atau bukan JavaScript → Railway.",
      "Depup memeriksa repo-mu dulu dan memberi saran platform lain kalau pilihanmu tidak cocok, sebelum ada yang terbuang.",
    ],
  },
  {
    icon: RailwayIcon,
    category: "start",
    title: "Railway di Depup — buat apa & bedanya sama Vercel/Cloudflare?",
    desc: "Baca ini dulu sebelum deploy ke Railway, agar tahu kapan platform ini cocok dipakai lewat Depup.",
    link: { label: "Buka Railway Docs", href: "https://docs.railway.com/" },
    steps: [
      "Vercel & Cloudflare Pages didesain untuk frontend/edge — cocok buat Next.js, static site, dan API routes ringan. Railway sebaliknya: full backend platform, jalan sebagai container yang always-on, cocok buat aplikasi yang butuh proses jalan terus (server Express/Nest/Fastify, worker/queue, cron job, WebSocket, dsb).",
      "Railway tidak butuh package.json/Node.js seperti syarat deploy Vercel di Depup — repo apapun yang bisa dibangun Railway (lewat Railpack otomatis, atau Dockerfile kalau ada) bisa dipakai: Python, Go, Rust, PHP, Ruby, dan lainnya.",
      'Waktu deploy pertama kali, Depup otomatis: buat project baru di akun Railway kamu (kalau nama project belum ada), buat service yang terhubung ke repo GitHub tersebut, generate domain publik "*.up.railway.app", lalu trigger deployment. Deploy berikutnya dengan nama project yang sama otomatis dianggap redeploy ke service yang sama.',
      "Sebelum deploy, Depup mengecek repo-mu dan otomatis menambahkan file yang kurang lewat satu commit: Staticfile (HTML statis di folder docs/dist atau bentrok dengan folder public/), index.html (kalau tidak ada), script \"start\" di package.json (server Node tanpa start), Procfile (FastAPI/Flask/Streamlit dan sejenisnya), gunicorn (Django), dan .dockerignore (kalau ada Dockerfile). Kalau project-mu ada di subfolder (mis. frontend/ atau backend/), Depup mengatur Root Directory Railway ke folder itu. Daftar file yang akan ditambahkan sudah tampil di kartu cek repo sebelum kamu menekan Deploy. File buatanmu tidak pernah ditimpa. Butuh GitHub Token dengan izin menulis — kalau tidak ada, deploy tetap jalan dan kamu diberi tahu apa yang kurang.",
      'Field "Start Command" di form Deploy Railway itu opsional — kosongkan saja kalau mau Railway auto-detect (misalnya baca script "start" di package.json, atau ikuti CMD di Dockerfile). Isi manual hanya kalau auto-detect-nya salah.',
      'Field "Environment Variables" (format KEY=value per baris) dikirim ke service Railway sebelum deploy pertama jalan — praktis untuk isi credential database, API key, dsb dari awal.',
      "Railway itu platform berbayar berdasarkan pemakaian resource (CPU/RAM/network), beda dari Vercel/Cloudflare yang memiliki free tier lebih murah hati untuk project kecil — pastikan akun Railway kamu memiliki kredit/metode pembayaran aktif sebelum deploy dari Depup, atau deployment bisa gagal/di-pause oleh Railway.",
      "Custom domain (menu Domains, termasuk record TXT untuk verifikasi) dan environment variable (menu Environment) untuk project Railway bisa dikelola dari Depup. Yang tetap lebih lengkap di dashboard Railway: pengaturan jaringan lanjutan, scaling, dan volume.",
    ],
  },

  // ─────────────────────────── Fitur Depup ───────────────────────────
  {
    icon: Rocket,
    category: "features",
    title: "Dashboard dan Riwayat deploy — cara membacanya",
    desc: "Halaman pertama setelah login: ringkasan deploy dan daftar semua deploy terakhirmu.",
    steps: [
      'Tombol "Deploy baru" di kanan atas membuka form deploy. Kartu "Deploy terakhir", "Berhasil", dan "Gagal" meringkas riwayatmu.',
      "Angka merah di menu Dashboard (sidebar) menunjukkan jumlah deploy yang gagal, jadi kamu tahu ada yang perlu dicek tanpa membuka halamannya.",
      "Tabel Riwayat deploy menampilkan project, platform, domain, dan status (Berhasil, Gagal, atau Dihapus). Pakai tombol Semua, Berhasil, dan Gagal untuk menyaring.",
      "Redeploy menjalankan ulang deploy project itu. Untuk project berstatus Dihapus, tombolnya berubah menjadi Deploy ulang, untuk menayangkan project itu lagi.",
      "Depup menyimpan maksimal 10 riwayat terakhir. Yang paling lama otomatis tergeser, dan project yang sudah dihapus tetap tercatat sebagai Dihapus.",
      "Untuk mengelola project (Visit, Periksa Status, Hapus, Import), buka menu Projects.",
    ],
  },
  {
    icon: UploadCloud,
    category: "features",
    title: "Upload zip atau folder ke GitHub",
    desc: "Cara tercepat kalau project-mu masih ada di komputer dan belum memiliki repo.",
    steps: [
      'Buka menu Upload. Pastikan GitHub Token (izin "repo") sudah tersimpan di Settings.',
      'Tarik file .zip atau folder project ke kotak upload, atau klik "Pilih file ZIP" / "Pilih folder".',
      "Atur nama repo (huruf, angka, titik, strip, atau underscore) dan pilih Private atau Public.",
      'Pilih "Upload saja" untuk hanya mengirim ke GitHub, atau "Langsung deploy" lalu pilih platformnya.',
      "Selesai: repo baru muncul di akun GitHub-mu. Kalau memilih langsung deploy, proses deploy dimulai otomatis dan progresnya tampil di jendela yang muncul.",
      "Folder node_modules, .git, dan hasil build otomatis dilewati, jadi tidak perlu dibersihkan dulu.",
      "File .env tidak ikut ke GitHub. Isinya dibaca di komputermu dan otomatis diisikan ke kolom Environment variables, lalu dipasang ke platform saat deploy. Periksa isinya sebelum lanjut.",
      "Batas ukuran: sampai 3.000 file, total 150 MB, dan maksimal 50 MB per file. Kalau terlalu besar, biasanya penyebabnya node_modules atau folder hasil build yang ikut ter-zip.",
      'Nama repo yang sudah dipakai ditolak, kecuali kamu mencentang "Timpa repo yang sudah ada" (isi branch utama diganti lewat commit baru).',
    ],
  },
  {
    icon: Link2,
    category: "features",
    title: "Link Instan — website statis jadi link publik, tanpa GitHub",
    desc: "Upload zip atau folder website yang sudah jadi, langsung dapat link publik sementara. Tanpa terminal, tanpa repo.",
    steps: [
      "Siapkan website yang sudah jadi. Harus ada file index.html di root zip atau folder (Depup juga mencarinya di dist, build, atau out).",
      "Project React, Vue, atau Vite yang belum dibangun? Jalankan npm run build di komputermu, lalu upload folder hasilnya (dist, build, atau out), bukan folder source-nya.",
      "Buka menu Link Instan, lalu tarik zip atau folder ke kotak upload. Depup menampilkan kartu \"Terdeteksi\" yang memberi tahu kalau ada yang tidak akan jalan, sebelum kamu upload.",
      "Pilih masa aktif: 1 jam, 6 jam, 24 jam, 3 hari, atau 7 hari (bawaannya 24 jam). Setelah itu link dan filenya terhapus otomatis.",
      "Centang Mode SPA kalau situsmu memakai React Router atau Vue Router, supaya halaman selain beranda tidak menampilkan 404.",
      "Klik upload, lalu salin link yang muncul dan kirim ke siapa saja. Kamu bisa menghapus link kapan saja dari daftar link aktif.",
      "Batas upload ditampilkan di halaman Link Instan. Bawaannya sekitar 10 MB dan 500 file per situs, ada batas jumlah link aktif per akun, dan maksimal 20 upload per jam. Kalau penuh, hapus salah satu link dulu atau tunggu sampai kedaluwarsa.",
      "Yang tidak bisa jalan: backend (Express, Python, PHP), route /api, dan environment variable. Untuk itu pakai Deploy ke Railway atau Link Gaib.",
      "Siapa pun yang memiliki link bisa membuka situsmu, jadi jangan upload data rahasia. Setelah perubahan, cache bisa butuh sekitar semenit sebelum tampil.",
      "Link yang dipakai untuk phishing, penipuan, atau malware akan dimatikan, dan pemilik akunnya bisa dilarang membuat link.",
    ],
  },
  {
    icon: Link2,
    category: "features",
    title: "Link Gaib — bagikan localhost ke dosen/client tanpa deploy",
    desc: "Satu perintah di terminal, langsung dapat link HTTPS sementara untuk website yang masih jalan di komputermu.",
    link: { label: "Unduh Node.js (butuh versi 18+)", href: "https://nodejs.org/en/download" },
    steps: [
      "Jalankan project-mu seperti biasa, misalnya di localhost:8000 (npm run dev, php -S, python -m http.server, dst).",
      "Buka terminal baru, lalu ketik: npx depup-cli share — atau npx depup-cli share 8000 kalau mau menyebut port-nya.",
      "Tanpa menyebut port, Depup mencoba mencari server di port yang umum dipakai. Kalau gagal, ulangi dengan menyebut port-nya, misalnya npx depup-cli share 8000.",
      "Link HTTPS muncul di terminal (contoh: https://cantik-depup-x7k2m.domain-depup). Kirim ke dosen atau client.",
      "Selama perintah itu jalan, setiap kunjungan tampil di terminal. Tekan Ctrl+C untuk mematikan link seketika; kalau lupa, link mati sendiri setelah 2 jam.",
      "Opsi: --name skripsi (awalan nama link) dan --ttl 240 (masa aktif dalam menit, maksimal 480).",
      "Yang belum didukung: WebSocket (live reload, chat realtime) dan upload file lebih dari ±600 KB. Website tetap bisa dibuka dan dipakai seperti biasa.",
      "Muncul pesan tidak ada server di port itu? Pastikan project-mu sudah jalan dulu (npm run dev atau sejenisnya), lalu jalankan ulang perintah share.",
      "Orang yang membuka link melihat halaman peringatan sekali sebelum masuk. Siapa pun yang memiliki link bisa membuka websitemu, jadi jangan bagikan project yang berisi data rahasia.",
    ],
  },
  {
    icon: KeyRound,
    category: "features",
    title: "Environment variables — simpan rahasia project",
    desc: "Tempat menyimpan API key, URL database, dan variabel lain per project, lalu mengirimnya ke platform.",
    steps: [
      "Buka menu Environment, tambahkan variabel baru, lalu pilih Project, isi nama variabel dan nilainya, dan pilih Environment: Production (situs yang tayang) atau Preview.",
      "Pakai nama dengan huruf besar dan garis bawah, misalnya DATABASE_URL atau NEXT_PUBLIC_API_URL.",
      "Nyalakan opsi untuk mengirim ke platform supaya variabelnya langsung dipasang di Vercel, Cloudflare, atau Railway. Ini butuh token platform tersebut di Settings. Project otomatis dideploy ulang agar perubahan berlaku.",
      "Nilai variabel disembunyikan sampai kamu menekan ikon mata.",
      "Tombol Sinkronkan menyamakan daftar di Depup dengan yang ada di platform, untuk project yang sudah terhubung.",
      "Variabel dengan awalan NEXT_PUBLIC_, VITE_, atau REACT_APP_ ikut terkirim ke browser, jadi siapa pun bisa melihatnya. Jangan taruh secret key di sana.",
      "Mengubah variabel tidak berpengaruh ke build yang sudah jadi. Situs baru memakai nilai terbaru setelah deploy ulang.",
      "Mengupload project lewat menu Upload? File .env-mu otomatis terbaca ke kolom environment variables, dan variabel yang terpasang langsung muncul di menu ini. Jangan commit .env ke GitHub.",
    ],
  },
  {
    icon: Globe,
    category: "features",
    title: "Pasang domain sendiri (custom domain)",
    desc: "Ganti alamat bawaan seperti nama.vercel.app dengan domainmu sendiri.",
    steps: [
      "Siapkan domain dari penyedia domain (Niagahoster, Domainesia, Namecheap, Cloudflare, dll). Kamu harus bisa mengatur DNS-nya.",
      "Buka menu Domains, isi nama domain (mis. app.namadomain.com), pilih Project, lalu tambahkan.",
      "Depup menampilkan record DNS berisi Type, Name, dan Value. Salin persis ke pengaturan DNS di penyedia domainmu. Pakai tombol salin supaya tidak salah ketik.",
      "Project Railway juga butuh satu record TXT untuk membuktikan kepemilikan domain. Pasang keduanya.",
      'Klik "Periksa status". Propagasi DNS bisa memerlukan waktu beberapa menit sampai beberapa jam, jadi kalau belum aktif, tunggu dulu lalu periksa lagi.',
      "Subdomain (app.namadomain.com atau www.namadomain.com) biasanya paling mudah. Untuk domain utama tanpa subdomain, ikuti jenis record yang ditampilkan Depup; tidak semua penyedia mengizinkan semua jenis record di domain utama.",
      "DNS-mu di Cloudflare dan domain tidak kunjung aktif? Coba ubah record itu ke mode DNS only (awan abu-abu) dulu sampai statusnya aktif.",
      "Sertifikat HTTPS dibuat otomatis oleh platform setelah domain aktif. Alamat bawaan (*.vercel.app, *.pages.dev, *.up.railway.app) tetap bisa dipakai.",
      "Mau melepas domain? Klik ikon hapus di daftar domain, lalu hapus juga record DNS-nya di penyedia domain.",
    ],
  },
  {
    icon: FolderKanban,
    category: "features",
    title: "Kelola project — Redeploy, Import, Sinkronkan, Hapus",
    desc: "Semua project yang pernah kamu deploy ada di menu Projects. Ini arti tiap tombolnya.",
    steps: [
      "Projects menampilkan project unik dari riwayat deploy-mu. Pakai tab untuk menyaring per platform.",
      "Redeploy: menjalankan deploy ulang project di platform yang sama, tanpa mengisi form lagi.",
      "Import Project: membawa project yang sudah ada di akun Vercel, Cloudflare, atau Railway-mu ke Depup. Butuh token platform tersebut di Settings.",
      "Sinkronkan: menyamakan daftar dengan platform. Gunakan ini kalau kamu menghapus sesuatu langsung di dashboard platform. Project yang sudah tidak ada ditandai Dihapus di riwayat.",
      'Hapus Project memiliki tiga tingkat. "Hapus di Depup" hanya menghapus dari daftar Depup. "Hapus juga di platform" ikut menghapus project di Vercel, Cloudflare, atau Railway sehingga situsnya mati. "Hapus juga repo GitHub" menghapus repo secara permanen.',
      "Menghapus repo GitHub butuh token dengan izin khusus. Lihat panduan \"Hapus project beserta repo GitHub\" di grup Token dan keamanan.",
      "Dashboard menyimpan 10 riwayat deploy terakhir. Yang paling lama otomatis tergeser. Project yang sudah dihapus tetap tercatat di riwayat dengan label Dihapus.",
    ],
  },
  {
    icon: MessageCircle,
    category: "features",
    title: "Asisten Bantuan — cara pakai dan batasnya",
    desc: "Tanya apa saja soal deploy, token, domain, atau error lewat tombol Bantuan di pojok kanan bawah.",
    steps: [
      "Klik tombol Bantuan di pojok kanan bawah, lalu tulis masalahmu dalam bahasa Indonesia sehari-hari.",
      "Makin spesifik makin baik. Sebut platform yang dipakai, jenis project (React, PHP, dst.), dan salin pesan error-nya.",
      'Kalau kamu melaporkan masalah (misalnya "deploy saya gagal"), asisten memeriksa akunmu lebih dulu: apakah token masih valid, apakah platformnya sedang gangguan, dan apakah deploy terakhirmu gagal. Hasilnya tampil sebagai kartu "Hasil pemeriksaan akunmu".',
      "Pemeriksaan akun dibatasi beberapa kali dalam beberapa menit, dan jumlah pesan per hari juga dibatasi. Kalau kena batas, coba lagi nanti atau periksa panduan di halaman ini.",
      'Masalah belum selesai? Tekan "Laporkan ke developer". Percakapan dan hasil pemeriksaan dikirim ke developer. Tombol "Salin percakapan" berguna kalau kamu mau mengirimnya lewat jalur lain.',
      'Nyalakan "Tampilkan proses debug" di Settings kalau deploy bermasalah. Log langkah demi langkahnya membantu asisten dan developer menemukan penyebabnya.',
      "Jangan tempel token atau password di chat. Kalau sudah terlanjur, buat ulang token itu di platform terkait. Token tidak pernah dikirim ke AI oleh pemeriksaan otomatis, hanya hasil ringkasnya.",
      "Asisten adalah AI, jadi bisa keliru. Untuk hal penting, periksa ulang di panduan ini atau di dashboard platform.",
    ],
  },
  {
    icon: Settings2,
    category: "features",
    title: "Settings — token tersimpan, Test Koneksi, dan tampilan",
    desc: "Simpan token sekali supaya tidak perlu mengetik ulang di setiap deploy.",
    steps: [
      "Token yang disimpan di Settings dipakai sebagai default setiap kali kamu deploy project baru.",
      "Tekan Test Koneksi di samping tiap token untuk memastikan tokennya benar-benar valid. Untuk Cloudflare, di sini kamu juga memilih akun yang dipakai.",
      "Tombol Hapus di samping tiap token menghapusnya dari akunmu kapan saja (ada konfirmasi dulu).",
      'Mode terang mengganti tampilan dashboard antara terang dan gelap.',
      '"Tampilkan proses debug" memunculkan log tahap, status, dan pesan error di jendela deploy. Nyalakan kalau kamu perlu melaporkan masalah.',
      "Token kedaluwarsa atau dicabut di platform? Buat yang baru, tempel di Settings, lalu Test Koneksi lagi.",
    ],
  },

  // ─────────────────────────── Token dan keamanan ───────────────────────────
  {
    icon: VercelIcon,
    category: "tokens",
    title: "Cara mendapatkan Vercel Token",
    desc: "Token ini dipakai Depup untuk deploy langsung dari repo GitHub kamu ke Vercel.",
    link: { label: "Buka Vercel Tokens", href: "https://vercel.com/account/tokens" },
    steps: [
      "Login ke akun Vercel kamu di vercel.com.",
      'Buka menu Account Settings → tab "Tokens" (atau langsung ke vercel.com/account/tokens).',
      'Klik "Create Token", beri nama bebas (misalnya "depup"), pilih scope sesuai akun/tim yang mau dipakai.',
      "Atur masa berlaku (No Expiration lebih praktis untuk dipakai berulang, tetapi lebih aman kalau diberi masa berlaku).",
      'Klik "Create", lalu salin token yang muncul — token ini hanya ditampilkan sekali, jadi langsung simpan.',
      "Tempel token itu ke field Vercel Token di form Deploy atau di halaman Settings Depup.",
    ],
  },
  {
    icon: CloudflareIcon,
    category: "tokens",
    title: "Cara mendapatkan Cloudflare API Token",
    desc: "Token ini dipakai Depup untuk membuat & mengelola project Cloudflare Pages kamu — deploy, custom domain, dan environment variables.",
    link: { label: "Buka Cloudflare API Tokens", href: "https://dash.cloudflare.com/profile/api-tokens" },
    steps: [
      "Login ke dashboard Cloudflare kamu di dash.cloudflare.com.",
      'Buka foto profil (kanan atas) → "My Profile" → tab "API Tokens" (atau langsung ke dash.cloudflare.com/profile/api-tokens).',
      'Klik "Create Token" → pilih template "Edit Cloudflare Workers" atau membuat custom token dengan permission "Account" → "Cloudflare Pages" → "Edit".',
      "Pilih akun (Account Resources) yang mau dipakai deploy, lalu klik Continue to summary.",
      'Klik "Create Token", lalu salin token yang muncul — token ini hanya ditampilkan sekali, jadi langsung simpan.',
      'Tempel token itu ke field Cloudflare Token di halaman Settings Depup, lalu klik "Test Koneksi" untuk pilih akun aktifnya.',
    ],
  },
  {
    icon: Link2,
    category: "tokens",
    title: "Cara hubungkan GitHub ke Cloudflare Pages",
    desc: "Sekali di-connect, semua deploy Cloudflare berikutnya lewat Depup otomatis jalan tanpa perlu login ulang — sama seperti Vercel.",
    link: { label: "Buka Cloudflare Pages", href: "https://dash.cloudflare.com/?to=/:account/pages/new/provider/github" },
    steps: [
      "Pertama kali deploy ke Cloudflare di form Deploy, Depup otomatis periksa apakah GitHub sudah terhubung ke akun Cloudflare kamu.",
      'Kalau belum, akan muncul tombol "Hubungkan GitHub ke Cloudflare" — klik itu, nanti diarahkan ke halaman resmi Cloudflare untuk connect.',
      'Di halaman Cloudflare, klik "Connect GitHub" lalu login/authorize GitHub App Cloudflare Pages (pilih "All repositories" atau repo tertentu saja).',
      "Setelah authorize berhasil, kembali ke tab Depup dan klik \"Sudah connect, periksa lagi\".",
      "Begitu status berubah jadi terhubung, klik Deploy Project lagi — deploy langsung jalan otomatis tanpa langkah manual lagi untuk deploy-deploy berikutnya.",
    ],
  },
  {
    icon: RailwayIcon,
    category: "tokens",
    title: "Cara mendapatkan Railway Token",
    desc: "Token ini dipakai Depup untuk membuat project & service di akun Railway kamu, lalu deploy dari repo GitHub.",
    link: { label: "Buka Railway Tokens", href: "https://railway.com/account/tokens" },
    steps: [
      "Login ke akun Railway kamu di railway.com.",
      'Buka foto profil (kanan atas) → "Account Settings" → tab "Tokens" (atau langsung ke railway.com/account/tokens).',
      'Di bagian "Personal Tokens", klik "Create Token" — token jenis ini (bukan Project Token / Team Token) yang dipakai Depup karena butuh izin membuat project baru.',
      'Beri nama bebas (misalnya "depup"), lalu klik "Create".',
      "Salin token yang muncul — token ini hanya ditampilkan sekali, jadi langsung simpan di tempat aman.",
      'Tempel token itu ke field Railway Token di form Deploy atau di halaman Settings Depup, lalu klik "Test Koneksi" untuk memastikan token-nya valid.',
    ],
  },
  {
    icon: Github,
    category: "tokens",
    title: "Cara membuat GitHub Token (PAT)",
    desc: "Token ini opsional untuk repo public, tetapi wajib kalau repo yang mau dideploy itu private, atau kalau kamu memakai menu Upload.",
    link: { label: "Buka GitHub Tokens", href: "https://github.com/settings/tokens?type=beta" },
    steps: [
      "Login ke GitHub, buka Settings (klik foto profil kanan atas → Settings).",
      'Scroll ke bawah ke "Developer settings" (paling bawah sidebar kiri).',
      'Pilih "Personal access tokens" → "Fine-grained tokens" → "Generate new token".',
      "Kasih nama token, atur masa berlaku, dan pilih repository access — bisa semua repo atau pilih repo tertentu saja.",
      'Di bagian "Repository permissions", pastikan "Contents" diatur ke "Read-only" minimal (agar Depup bisa baca source code & package.json).',
      'Klik "Generate token", salin, lalu tempel ke field GitHub Token di form Deploy atau Settings.',
      'Untuk menu Upload (membuat repo baru dan menulis file), token perlu izin "repo". Paling mudah pakai token classic dengan scope "repo" (github.com/settings/tokens/new).',
      'Mau pakai fitur "Hapus juga repo GitHub"? Token deploy biasa tidak cukup — lihat panduan "Hapus project beserta repo GitHub" di bawah.',
    ],
  },
  {
    icon: AlertTriangle,
    category: "tokens",
    title: "Hapus project beserta repo GitHub — token harus memiliki izin delete",
    desc: "Saat menghapus project, kamu bisa ikut menghapus repo GitHub-nya. Penghapusan repo permanen dan hanya berhasil kalau GitHub Token memiliki izin khusus.",
    link: { label: "Buka GitHub Tokens (classic)", href: "https://github.com/settings/tokens/new" },
    steps: [
      'Di dialog "Hapus project", nyalakan saklar "Hapus juga repo GitHub". Nama repo terisi otomatis dari project; periksa lagi sebelum menghapus.',
      'Token classic: centang scope "repo" DAN "delete_repo". Scope "delete_repo" tidak aktif secara default, jadi harus dicentang sendiri.',
      'Token fine-grained: pilih repo yang akan dihapus di "Repository access", lalu set "Administration" ke "Read and write". Repo yang tidak masuk daftar akses token tidak bisa dihapus.',
      "Kamu harus pemilik repo (atau admin untuk repo organisasi). Repo milik orang lain atau organisasi tanpa hak admin akan ditolak GitHub.",
      "Tempel token ke field GitHub Token di Settings. Token yang hanya memiliki izin baca untuk deploy akan ditolak dengan pesan \"GitHub menolak penghapusan\".",
      "Urutan penghapusan: project di platform dihapus dulu, baru repo GitHub. Kalau repo gagal dihapus (izin token kurang), project di platform sudah terlanjur terhapus — hapus repo manual di GitHub → Settings → Danger Zone.",
      "Penghapusan repo tidak bisa dibatalkan. Kalau ragu, biarkan saklar GitHub mati dan hapus repo manual nanti.",
    ],
  },
  {
    icon: Lock,
    category: "tokens",
    title: "Keamanan — bagaimana token dan datamu diperlakukan",
    desc: "Apa yang disimpan Depup, apa yang tidak, dan apa yang perlu kamu lakukan sendiri.",
    steps: [
      "Kamu masuk lewat akun Google. Depup tidak menyimpan password-mu.",
      "Token platform dan nilai environment variable disimpan terenkripsi dan hanya bisa dipakai oleh akunmu.",
      "Token yang kamu ketik langsung di form deploy hanya dipakai untuk deploy itu dan tidak disimpan.",
      "Kamu bisa menghapus token kapan saja di Settings.",
      "Pemeriksaan akun oleh Asisten Bantuan berjalan di server. Token tidak pernah dikirim ke AI, hanya hasil ringkasnya (\"valid\", \"ditolak\", dan sebagainya).",
      "Riwayat chat bantuan hanya ada di halaman dan hilang saat dimuat ulang, kecuali kamu menekan \"Laporkan ke developer\".",
      "Token tertempel di chat, tersimpan di repo publik, atau terkirim ke orang lain? Cabut token itu di platform terkait, lalu buat yang baru.",
      "Biasakan memberi token izin seperlunya, masa berlaku yang wajar, dan nama yang jelas (mis. \"depup\") supaya mudah dicabut nanti.",
      "File Link Instan disimpan sementara sampai link kedaluwarsa, lalu terhapus otomatis. Siapa pun yang memiliki link Instan atau Gaib bisa membukanya.",
    ],
  },

  // ─────────────────────────── Masalah dan error ───────────────────────────
  {
    icon: AlertTriangle,
    category: "trouble",
    title: "Deploy gagal atau tidak bisa lanjut — harus bagaimana?",
    desc: "Setiap pesan error di Depup menyertakan langkah perbaikan. Kalau masih buntu, deploy manual lewat dashboard platform hanya butuh 2–3 menit.",
    link: { label: "Deploy manual di Vercel", href: "https://vercel.com/new" },
    steps: [
      "Baca kotak \"Yang bisa kamu lakukan\" di pesan error — isinya langkah spesifik untuk masalah kamu.",
      "Klik \"Coba lagi\" kalau masalahnya sementara (internet putus, server platform sedang sibuk, batas GitHub tanpa token).",
      "Repo tidak cocok dengan platform yang dipilih? Pakai tombol \"Pakai Railway\" (atau platform yang disarankan) di kartu hasil periksa repo.",
      "Deploy manual Vercel: vercel.com/new → pilih repo → Deploy. Untuk situs HTML, pilih Framework Preset \"Other\" dan kosongkan Build Command.",
      "Deploy manual Cloudflare: Workers & Pages → Create → Pages → Connect to Git → pilih repo. Untuk situs HTML, Framework preset \"None\" dan kosongkan Build command.",
      "Deploy manual Railway: railway.com/new → Deploy from GitHub repo → pilih repo, lalu Settings → Networking → Generate Domain.",
      "Mau melaporkan masalah? Buka \"Detail teknis\" di pesan error, klik \"Salin detail\", lalu kirim ke developer.",
      'Arti pesan error tertentu dan penyebab build yang gagal dibahas di dua panduan berikutnya.',
    ],
  },
  {
    icon: CircleAlert,
    category: "trouble",
    title: "Pesan error yang sering muncul dan artinya",
    desc: "Cari judul pesan error yang kamu lihat, lalu ikuti saran perbaikannya.",
    steps: [
      'Koneksi internet terputus: periksa koneksimu, lalu klik "Coba lagi".',
      "Link GitHub belum benar: pakai format https://github.com/username/repo, tanpa tambahan di belakangnya.",
      "Repo tidak ditemukan: periksa ejaan username dan nama repo. Kalau repo-nya private, isi GitHub Token (izin \"repo\") di form deploy atau Settings.",
      "GitHub menolak akses: token-mu kedaluwarsa, dicabut, atau izinnya kurang. Buat token baru dan perbarui di Settings.",
      "Terlalu banyak permintaan: batas GitHub untuk akses tanpa token sudah tercapai. Isi GitHub Token, atau tunggu beberapa menit lalu coba lagi.",
      "Token [platform] tidak diterima: token salah salin, kedaluwarsa, atau scope-nya kurang. Buat token baru di platform itu, tempel di Settings, lalu tekan Test Koneksi.",
      "Nama project sudah dipakai: nama itu sudah terpakai di platform. Ganti dengan nama yang lebih unik.",
      "GitHub belum dihubungkan ke Cloudflare: ikuti panduan \"Cara hubungkan GitHub ke Cloudflare Pages\", lalu klik \"Sudah connect, periksa lagi\".",
      "Account ID belum dipilih: buka Settings, tekan Test Koneksi di token Cloudflare, lalu pilih akun yang mau dipakai.",
      "Sesi login habis: masuk lagi dengan akun Google, lalu ulangi aksimu.",
      "[Platform] sedang bermasalah: gangguan ada di sisi platform, bukan di Depup. Periksa halaman status platform itu, lalu coba lagi nanti.",
      "Build gagal di server: project-mu gagal dibangun di platform. Lihat panduan \"Build gagal — penyebab umum\" dan baca log build di dashboard platform.",
      "Pesanmu tidak ada di daftar ini? Buka \"Detail teknis\" di pesan error, lalu tanya Asisten Bantuan atau tekan \"Laporkan ke developer\".",
    ],
  },
  {
    icon: AlertTriangle,
    category: "trouble",
    title: "Build gagal — penyebab umum dan cara mengeceknya",
    desc: "Hampir semua build yang gagal di platform bisa diperiksa dulu di komputermu sendiri.",
    steps: [
      "Jalankan npm install lalu npm run build di komputermu. Kalau gagal di sana, pasti gagal juga di platform. Perbaiki dulu, lalu push ke GitHub.",
      'Pastikan package.json memiliki script "build". Tanpa itu, Vercel dan Cloudflare tidak tahu cara membangun project-mu.',
      "Output Directory salah? Vite, Vue, dan Astro biasanya dist. Create React App biasanya build. Next.js dengan output export biasanya out. Angular ada di dalam dist/nama-project (periksa angular.json).",
      'Di form Deploy, kolom Build Cmd dan Output Dir bersifat opsional. Kosongkan untuk auto-detect framework, dan isi hanya kalau hasil auto-detect-nya salah.',
      "Nama file peka huruf besar-kecil di server (Linux). Logo.png dan logo.png dianggap file berbeda, padahal di Windows atau macOS keduanya sering dianggap sama. Samakan penulisannya di kode dan nama file.",
      "File lock (package-lock.json, yarn.lock, atau pnpm-lock.yaml) sebaiknya ikut di-commit, dan semua library yang dipakai harus tercatat di package.json, bukan hanya terpasang di komputermu.",
      "Butuh environment variable saat build (mis. NEXT_PUBLIC_API_URL atau DATABASE_URL)? Tambahkan di menu Environment atau di form Deploy, lalu deploy ulang.",
      "Railway menolak project yang memakai versi library dengan celah keamanan, misalnya Next.js 14 di bawah 14.2.35. Naikkan versinya di package.json, lalu deploy lagi.",
      "Baca log build di dashboard platform untuk baris error pertama. Nyalakan \"Tampilkan proses debug\" di Settings agar log langkah Depup juga tampil, lalu tanyakan ke Asisten Bantuan dengan menempelkan potongan error (bukan token).",
    ],
  },
  {
    icon: AlertTriangle,
    category: "trouble",
    title: "Situs sudah online tetapi kosong, 404, atau tampilannya rusak",
    desc: "Deploy-nya sukses, tetapi hasilnya tidak seperti di komputermu.",
    steps: [
      "Layar putih kosong: buka browser, tekan F12, lalu lihat tab Console. Biasanya ada error soal file yang tidak ditemukan atau variabel yang belum diisi.",
      "404 saat halaman dimuat ulang atau dibuka langsung (selain beranda), padahal situsmu memakai React Router atau Vue Router: server perlu mengarahkan semua alamat ke index.html.",
      "Di Link Instan, centang Mode SPA saat upload. Di Cloudflare Pages, SPA biasanya otomatis jalan selama tidak ada file 404.html di project.",
      'Di Vercel, tambahkan file vercel.json di root berisi: {"rewrites":[{"source":"/(.*)","destination":"/index.html"}]}, lalu push dan deploy ulang.',
      "Gambar, font, atau CSS tidak muncul: periksa huruf besar-kecil nama file, dan pastikan file itu benar-benar ikut ke GitHub (bukan masuk .gitignore).",
      "Tampilan tidak berubah setelah update: tekan Ctrl+Shift+R untuk menyegarkan tanpa cache. Pastikan juga deploy terbarunya sudah selesai. Link Instan bisa butuh sekitar semenit.",
      "Fitur yang butuh backend (login, database, route /api) tidak jalan di situs statis. Deploy backend-nya ke Railway, atau pakai Next.js di Vercel.",
      "Link Instan atau Link Gaib menampilkan halaman peringatan sebelum situsmu: itu normal, pengunjung tinggal melanjutkan.",
    ],
  },
  {
    icon: AlertTriangle,
    category: "trouble",
    title: "Next.js di Cloudflare Pages vs Vercel — apa bedanya?",
    desc: "Penting dibaca kalau repo yang dideploy ke Cloudflare pakai Next.js dengan API routes — perilakunya beda dari Vercel.",
    link: {
      label: "Baca dokumentasi next-on-pages",
      href: "https://github.com/cloudflare/next-on-pages",
    },
    steps: [
      "Vercel dibuat oleh tim yang sama dengan Next.js, jadi API routes & SSR jalan otomatis tanpa konfigurasi tambahan.",
      'Cloudflare Pages bukan didesain khusus untuk Next.js. Depup otomatis pakai adapter "@cloudflare/next-on-pages" untuk project Next.js supaya API routes tetap bisa jalan — tetapi adapter ini sudah deprecated dan sifatnya best-effort, jadi tidak semua fitur Next.js (terutama fitur SSR/API routes yang kompleks) dijamin jalan 100% sama seperti di Vercel.',
      "Kalau build gagal atau ada fitur yang error, itu keterbatasan platform Cloudflare Pages untuk Next.js — bukan bug di Depup. Periksa log build project tersebut di Cloudflare dashboard untuk detail errornya.",
      'Rekomendasi resmi Cloudflare sekarang untuk Next.js dengan banyak API routes adalah deploy sebagai Cloudflare Worker pakai adapter "@opennextjs/cloudflare" — tetapi setup Git-connected Worker ini masih harus manual lewat dashboard Cloudflare (belum ada API publik buat Depup otomasi ini).',
      "Kalau project kamu simple (tanpa API routes sama sekali, murni halaman statis), pertimbangkan set output: 'export' di next.config.js — hasilnya full static dan jauh lebih stabil di Cloudflare Pages.",
      "Untuk Next.js app yang butuh API routes solid & lengkap, Vercel tetap pilihan paling straightforward lewat Depup.",
    ],
  },

  // ─────────────────────────── Lainnya ───────────────────────────
  {
    icon: HelpCircle,
    category: "more",
    title: "Pertanyaan umum",
    desc: "Jawaban singkat untuk hal-hal yang sering ditanyakan.",
    steps: [
      "Apakah Depup gratis? Depup gratis dipakai. Donasi lewat menu Donasi (QRIS, via Saweria) sepenuhnya sukarela. Platform tujuan memiliki aturan biayanya sendiri; Railway misalnya berbayar berdasarkan pemakaian.",
      "Kenapa harus membuat token sendiri? Depup bekerja atas namamu di Vercel, Cloudflare, Railway, dan GitHub. Tanpa token darimu, Depup tidak memiliki akses ke akun-akun itu. Kamu bisa mencabut token kapan saja.",
      "Riwayat deploy-ku hilang sebagian? Dashboard menyimpan 10 deploy terakhir. Yang paling lama otomatis tergeser tanpa konfirmasi.",
      "Project yang sudah kuhapus di platform masih muncul? Tekan Sinkronkan di halaman Projects. Project yang sudah tidak ada ditandai Dihapus.",
      "Berapa lama Link Instan dan Link Gaib aktif? Link Instan 1 jam sampai 7 hari sesuai pilihanmu. Link Gaib mati saat kamu menekan Ctrl+C, atau otomatis setelah 2 jam (maksimal 8 jam dengan opsi --ttl).",
      "Link Instan cocok untuk situs yang tayang lama? Tidak. Link Instan khusus demo sementara. Untuk situs yang harus tayang terus, gunakan Deploy ke platform.",
      "Kenapa aku tidak bisa masuk? Pendaftaran bisa ditutup sementara oleh admin, dan akun yang melanggar aturan bisa diblokir. Kalau kamu merasa salah blokir, hubungi developer Depup.",
      "Bahasa apa saja yang bisa dideploy? Di Vercel dan Cloudflare Pages: situs web, yaitu HTML biasa dan project Node.js. Di Railway: hampir semua, termasuk Docker, Python, Go, dan PHP. Lihat \"Jenis repo apa yang bisa dideploy?\" untuk rinciannya.",
    ],
  },
  {
    icon: ShieldCheck,
    category: "more",
    title: "Laporkan link yang menyalahgunakan Depup",
    desc: "Menemukan link Depup berisi phishing, penipuan, atau malware? Laporkan supaya bisa ditindak.",
    steps: [
      "Buka halaman /laporkan di alamat Depup (atau klik link laporkan di halaman peringatan Link Instan atau Link Gaib).",
      "Isi alamat link yang bermasalah, alasan kamu melaporkannya, dan kontak kalau kamu ingin dihubungi balik.",
      "Jangan memasukkan password atau data pribadi di halaman yang kamu laporkan.",
      "Admin meninjau laporan. Link yang melanggar bisa dimatikan, dan pemiliknya bisa dilarang membuat link baru.",
      "Link-mu sendiri tiba-tiba mati? Pastikan isinya tidak menyerupai halaman login palsu, toko palsu, atau berisi file berbahaya. Kalau kamu yakin ada salah paham, hubungi developer lewat Asisten Bantuan.",
    ],
  },

  // ─────────────────────────── Untuk admin Depup ───────────────────────────
  {
    icon: ShieldCheck,
    category: "admin",
    title: "Setup Login Google (untuk admin/deployer Depup)",
    desc: "Depup pakai OAuth2 Google asli — bukan simulasi. Ini perlu disiapkan sekali di Google Cloud Console oleh yang deploy Depup.",
    link: { label: "Buka Google Cloud Console", href: "https://console.cloud.google.com/apis/credentials" },
    steps: [
      "Buka Google Cloud Console → pilih/buat sebuah project.",
      'Buka "APIs & Services" → "OAuth consent screen", isi info dasar aplikasi (nama, email support), publish ke "External" kalau untuk banyak user.',
      'Buka "Credentials" → "Create Credentials" → "OAuth client ID" → pilih tipe "Web application".',
      "Di bagian Authorized redirect URIs, tambahkan persis: https://<domain-vercel-kamu>/api/auth/google/callback",
      "Simpan, lalu salin Client ID dan Client Secret yang muncul.",
      'Di project Vercel Depup, buka Settings → Environment Variables, tambahkan GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, dan AUTH_SECRET (string acak bebas, minimal 16 karakter) — lalu redeploy.',
    ],
  },
  {
    icon: Link2,
    category: "admin",
    title: "Aktifkan Link Instan dan Link Gaib di server sendiri",
    desc: "Kedua fitur ini butuh domain wildcard. Tanpa itu, menu Link Instan tampil dengan pesan bahwa fitur belum aktif.",
    steps: [
      "Siapkan domain yang terpisah dari domain dashboard Depup (mis. depup.link). Alasannya: isi link adalah milik pengguna, dan kalau satu subdomain ditandai phishing, reputasi seluruh domain ikut turun.",
      "Di Vercel → project Depup → Settings → Domains, tambahkan domain itu dan juga wildcard-nya (*.depup.link).",
      "Wildcard butuh nameserver domain diarahkan ke Vercel (ns1.vercel-dns.com dan ns2.vercel-dns.com) supaya sertifikat wildcard bisa diterbitkan.",
      "Isi environment variable TUNNEL_BASE_DOMAIN dengan domain itu (mis. depup.link), lalu redeploy. Env ini juga dibaca saat build.",
      "Untuk CLI Link Gaib, set DEPUP_HOST ke alamat Depup-mu, atau ubah DEFAULT_HOST di cli/bin/depup.js.",
      "Fitur ini otomatis mati kalau TUNNEL_BASE_DOMAIN kosong. Itu disengaja, supaya kode milik pengguna tidak jalan di domain dashboard.",
      "Batas bawaan Link Instan bisa diubah lewat env SITES_MAX_MB dan SITES_MAX_PER_USER. Daftar lengkap variabelnya ada di file .env.example.",
    ],
  },
  {
    icon: Lock,
    category: "admin",
    title: "Siapkan database Depup (Redis KV dan Supabase)",
    desc: "Depup memakai dua database. Tanpa keduanya, login dan penyimpanan data dashboard tidak bisa berjalan normal di production.",
    steps: [
      "Redis (KV): di Vercel buka Storage → Create Database → KV, lalu Connect ke project Depup. Vercel otomatis mengisi KV_REST_API_URL dan KV_REST_API_TOKEN. Redis dipakai untuk rate limit, blokir sesi, Link Instan, dan Link Gaib.",
      "Supabase: buat project di supabase.com, buka SQL Editor, lalu jalankan isi file supabase/schema.sql (aman dijalankan ulang). Supabase menyimpan data dashboard pengguna, laporan abuse dan bantuan, kampanye email, log admin, dan pengaturan.",
      "Di Supabase buka Project Settings → API, lalu salin Project URL dan key service_role ke environment variable SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY di Vercel.",
      "Key service_role adalah kunci penuh. Simpan hanya di server dan jangan beri awalan NEXT_PUBLIC_.",
      "Token platform dan nilai environment variable pengguna disimpan terenkripsi (AES-256-GCM) di database.",
      "Opsional: SUPABASE_LIMIT_MB dan REDIS_LIMIT_MB mengatur batas paket untuk meter pemakaian di panel admin.",
      "Setelah mengisi variabel, redeploy lalu buka Panel Admin → Audit sistem untuk memastikan Redis dan Supabase terbaca.",
    ],
  },
  {
    icon: ShieldCheck,
    category: "admin",
    title: "Panel Admin (/admin) — isi menu dan siapa yang bisa masuk",
    desc: "Panel pengelolaan Depup. Pengguna biasa yang membukanya mendapat halaman 404.",
    steps: [
      "Hanya email admin yang bisa masuk: depupdev@gmail.com, ditambah email lain yang kamu isi di environment variable ADMIN_EMAILS (pisahkan dengan koma). Login-nya lewat Google seperti biasa.",
      "Ringkasan: angka dan grafik login, pendaftar, deploy, link, dan laporan abuse.",
      "Abuse dan Takedown: antrean laporan, takedown link manual, dan larangan untuk pemilik link.",
      "Link aktif: semua Link Instan dan Link Gaib yang sedang hidup. Pengguna: blokir akun atau larang membuat link.",
      "Bantuan: laporan dari chat Asisten Bantuan. Promosi: kirim kampanye email (butuh RESEND_API_KEY).",
      "Audit sistem: cek kesehatan Depup, dijelaskan di panduan berikutnya.",
      "Pengaturan: tutup pendaftaran, matikan Link Instan atau Link Gaib, banner pengumuman, dan tes notifikasi. Log admin mencatat semua tindakan admin.",
    ],
  },
  {
    icon: ShieldCheck,
    category: "admin",
    title: "Audit sistem — cek kesehatan Depup dari panel admin",
    desc: "Memeriksa database, konfigurasi, halaman, dan error server. Hanya berjalan saat tombolnya ditekan.",
    steps: [
      'Buka Panel Admin → Audit sistem, lalu tekan "Jalankan audit". Pemeriksaan ini tidak memakai AI dan tidak berjalan otomatis di latar belakang. Batasnya 6 kali per menit.',
      "Yang diperiksa: koneksi Redis dan Supabase (beserta kecepatannya), environment wajib dan opsional yang belum diisi (hanya nama variabel, tidak pernah nilainya), halaman utama dan API session, jumlah error server 24 jam terakhir, dan status Vercel, Cloudflare, serta GitHub.",
      'Tiap baris berstatus OK, Perhatian (perlu dilihat), Masalah (perlu diperbaiki), atau tanda tanya (tidak bisa diperiksa, misalnya karena Redis sendiri bermasalah).',
      "Error server yang tidak tertangani dicatat di Redis: 100 entri terakhir, disimpan 7 hari. Token di pesan error otomatis disamarkan. Daftar error terbaru tampil di bawah hasil pemeriksaan.",
      'Tombol "Analisis dengan AI" mengirim ringkasan temuan (bukan nilai env atau token) ke Groq, 1 panggilan per tekan, dan butuh GROQ_API_KEY. Batasnya 8 kali per jam. Kalau semua sehat, AI tidak dipanggil sama sekali.',
      'Analisis untuk hasil yang sama dipakai ulang. Tekan "Analisis ulang" kalau ingin jawaban baru.',
      'Status "Masalah" di Redis atau Supabase biasanya berarti variabel belum diisi, kunci salah, atau tabel belum dibuat. Ikuti panduan "Siapkan database Depup". Gangguan di status platform cukup ditunggu.',
    ],
  },
  {
    icon: Settings2,
    category: "admin",
    title: "Aktifkan menu Donasi (Saweria)",
    desc: "Menu Donasi tampil dengan pesan bahwa fitur belum diaktifkan sampai admin mengisi satu variabel.",
    steps: [
      "Buat atau siapkan akun Saweria untuk menerima donasi.",
      "Di project Vercel Depup, buka Settings → Environment Variables, lalu isi SAWERIA_USERNAME dengan username Saweria-mu.",
      "Redeploy, lalu buka menu Donasi untuk memastikan form QRIS muncul.",
      "Daftar lengkap environment variable ada di file .env.example.",
    ],
  },
];

function guideText(g: Guide): string {
  return [g.title, g.desc, ...g.steps.filter((s): s is string => typeof s === "string")].join(" ").toLowerCase();
}

function GuideCard({ guide }: { guide: Guide }) {
  const [open, setOpen] = React.useState(false);
  const Icon = guide.icon;

  return (
    <Surface className="overflow-hidden transition-shadow hover:shadow-md">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-start gap-4 p-5 text-left sm:p-6"
      >
        <span className={`bounce-t grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-tone-lilac text-lav-text ${open ? "scale-[1.07] -rotate-3" : ""}`}>
          <Icon size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[14.5px] font-semibold sm:text-[15px]">{guide.title}</h3>
          <p className="mt-1 text-[13px] leading-relaxed text-text-muted">{guide.desc}</p>
        </div>
        <ChevronDown
          size={18}
          className={`bounce-t mt-1 shrink-0 text-text-faint ${open ? "rotate-180" : ""}`}
        />
      </button>

      <div className="acc" data-open={open} aria-hidden={!open}>
       <div className="acc-inner">
        <div className="border-t px-5 pb-5 pt-4 sm:px-6 sm:pb-6" style={{ borderColor: "var(--surface-line)" }}>
          <ol className="space-y-4">
            {guide.steps.map((step, i) => (
              <li key={i} className="acc-step flex gap-3 text-[13px] leading-relaxed" style={{ "--i": i } as React.CSSProperties}>
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--pill-bg)] text-[12px] font-semibold text-text-muted">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1 text-text-muted">{step}</div>
              </li>
            ))}
          </ol>
          {guide.link && (
            <a
              href={guide.link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="acc-step pill mt-5 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[12px] font-medium hover:brightness-110"
              style={{ "--i": guide.steps.length } as React.CSSProperties}
            >
              {guide.link.label} <ExternalLink size={12} />
            </a>
          )}
        </div>
       </div>
      </div>
    </Surface>
  );
}

export function DocsView() {
  const [query, setQuery] = React.useState("");

  // Teks pencarian dihitung sekali; GUIDES tidak berubah selama aplikasi jalan.
  const searchable = React.useMemo(() => GUIDES.map((g) => ({ guide: g, text: guideText(g) })), []);

  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const visible = terms.length === 0
    ? GUIDES
    : searchable.filter(({ text }) => terms.every((t) => text.includes(t))).map(({ guide }) => guide);

  // Cek kategori mana saja yang punya item yang sedang terlihat
  const visibleCategories = CATEGORIES.filter(cat => visible.some(g => g.category === cat.id));

  return (
    <ViewFade>
      <div className="space-y-6 sm:space-y-8">
        <div>
          <PageTitle
            title="Docs"
            desc={<>{GUIDES.length} panduan: cara mulai, memakai fitur, setup token, dan mengatasi masalah yang sering muncul — semuanya real, tidak ada simulasi.</>}
          />
        </div>

        <div className="space-y-4">
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-faint" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari panduan, mis. domain, token, error"
              aria-label="Cari panduan"
              className="w-full h-12 rounded-full border border-[var(--line-strong)] bg-[var(--surface-solid)] pl-11 pr-11 text-[13.5px] sm:text-[14px] text-[var(--text)] shadow-[var(--surface-shadow)] placeholder:text-[var(--text-faint)] focus:border-[var(--ring)] focus:outline-none focus:ring-[3px] focus:ring-violet-200 dark:focus:ring-violet-800 transition-colors"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Hapus pencarian"
                className="absolute right-3 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-text-faint transition-colors hover:bg-[var(--pill-bg)] hover:text-[var(--text)]"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Navigasi Cepat per Kategori */}
          {visibleCategories.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1 pb-2">
              {visibleCategories.map((cat) => (
                <a
                  key={cat.id}
                  href={`#docs-${cat.id}`}
                  className="whitespace-nowrap rounded-full border border-[var(--line-strong)] bg-[var(--surface-solid)] px-3.5 py-1.5 text-[12px] font-medium text-text-muted transition-colors hover:border-[var(--ring)] hover:text-[var(--text)]"
                >
                  {cat.label}
                </a>
              ))}
            </div>
          )}
        </div>

        {visible.length === 0 ? (
          <Surface className="p-8 text-center sm:p-10">
            <p className="text-[15px] font-semibold">Tidak ada panduan yang cocok dengan &ldquo;{query.trim()}&rdquo;</p>
            <p className="mt-2 text-[13px] leading-relaxed text-text-muted">
              Coba kata kunci lain, atau tanyakan ke Asisten Bantuan lewat tombol Bantuan di pojok kanan bawah.
            </p>
          </Surface>
        ) : (
          CATEGORIES.map((cat) => {
            const items = visible.filter((g) => g.category === cat.id);
            if (items.length === 0) return null;
            return (
              <section key={cat.id} id={`docs-${cat.id}`} className="scroll-mt-24 space-y-4 pt-4">
                <div className="border-b border-[var(--line-strong)] pb-2">
                  <h2 id={`docs-${cat.id}-title`} className="text-[16px] font-semibold sm:text-[17px]">
                    {cat.label}
                  </h2>
                  <p className="mt-1 text-[13px] text-text-muted">{cat.desc}</p>
                </div>
                <div className="space-y-3">
                  {items.map((guide) => (
                    <GuideCard key={guide.title} guide={guide} />
                  ))}
                </div>
              </section>
            );
          })
        )}
      </div>
    </ViewFade>
  );
}