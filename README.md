# Depup

**Depup membantu kamu menayangkan website ke internet tanpa ribet.** Pilih project dari GitHub (atau upload langsung
dari komputermu), pilih tujuan, lalu klik deploy. Depup mengurus sisanya dan memberi tahu kamu kalau ada yang salah,
lengkap dengan cara memperbaikinya.

Cocok untuk pelajar, freelancer, dan siapa saja yang ingin websitenya online tanpa belajar tiga dashboard sekaligus.

---

## Apa yang bisa kamu lakukan di Depup

| | |
|---|---|
| 🚀 **Deploy sekali klik** | Tayangkan project dari GitHub ke **Vercel**, **Cloudflare Pages**, atau **Railway** dan pantau prosesnya sampai selesai. |
| 📦 **Upload zip atau folder** | Tarik file `.zip` atau folder project ke Depup. Isinya otomatis diekstrak dan dikirim ke repo GitHub baru, lalu pilih: upload saja, atau langsung deploy. |
| 🗂️ **Semua project di satu tempat** | Lihat semua project, buka situsnya, deploy ulang, dan lihat riwayat deploy. |
| 🌐 **Domain sendiri** | Pasang domain kustom dan ikuti petunjuk DNS yang jelas, langkah demi langkah. |
| 🔐 **Environment variable** | Simpan rahasia project (API key, URL database) dan kirim ke platform otomatis. Nilainya bisa disembunyikan. |
| 📈 **Statistik pengunjung** | Lihat traffic 7 hari terakhir untuk project di Vercel. |
| 💬 **Asisten bantuan** | Tanya apa saja soal deploy. Kalau kamu melapor masalah, asisten ikut memeriksa akunmu. |

---

## Mulai dalam 5 menit

1. **Masuk** dengan akun Google.
2. Buka **Settings** dan isi token platform yang ingin kamu pakai (Vercel, Cloudflare, atau Railway). Cara
   mendapatkannya ada di menu **Docs**. Tekan **Test Koneksi** untuk memastikan token benar.
3. Buka **Deploy**, tempel link repo GitHub-mu, pilih platform, lalu klik **Deploy**.
4. Tunggu progres selesai. Alamat situsmu muncul di layar, dan project-nya masuk ke daftar **Projects**.

Belum punya repo GitHub? Pakai menu **Upload**.

---

## Menu-menu di Depup

### Dashboard
Ringkasan akunmu: jumlah deploy, berapa yang berhasil dan gagal, serta **Riwayat Deploy** terbaru. Project yang sudah
kamu hapus tetap tercatat di riwayat dengan label *Deleted*, jadi kamu punya catatan lengkap.

### Deploy
Form deploy bertahap. Sebelum deploy dimulai, Depup mengecek isi repo-mu (HTML biasa, Node.js, Next.js, Docker,
Python, dan lainnya) dan memberi tahu apakah cocok dengan platform pilihanmu. Kalau tidak cocok, kamu langsung
diberi saran platform lain, sebelum ada yang terbuang.

### Upload
Cara tercepat kalau project-mu masih ada di komputer.

1. Tarik file **.zip** atau **folder** project ke kotak upload (atau klik *Pilih file ZIP* / *Pilih folder*).
2. Atur **nama repo** dan pilih **Private** atau **Public**.
3. Pilih **Upload saja** atau **Langsung deploy** (lalu pilih platformnya).
4. Selesai. Repo baru muncul di GitHub-mu.

Yang perlu kamu tahu:
- Butuh **GitHub Token** dengan izin `repo` di Settings.
- Folder seperti `node_modules`, `.git`, dan hasil build otomatis dilewati.
- File **`.env` tidak ikut ke GitHub**. Isinya dibaca di komputermu dan otomatis diisikan ke kolom Environment
  variables, lalu dipasang ke platform saat deploy. Env yang terpasang juga langsung muncul di menu Environment.
- Batas ukuran: sampai 3.000 file, total 150 MB, maksimal 50 MB per file.
- Nama repo yang sudah dipakai ditolak, kecuali kamu mencentang *Timpa repo yang sudah ada*.

### Projects
Semua project yang pernah kamu deploy. Dari sini kamu bisa membuka situsnya, deploy ulang, menghapus, atau
mengimpor project yang sudah ada di Vercel, Cloudflare, atau Railway. Gunakan tombol sinkron kalau kamu menghapus
sesuatu langsung di dashboard platform.

### Domains
Tambahkan domain sendiri ke sebuah project. Depup menampilkan record DNS yang harus kamu isi di tempat kamu membeli
domain dan membantu mengecek apakah domainnya sudah aktif.

### Environment
Tempat menyimpan variabel rahasia per project, misalnya `DATABASE_URL` atau `API_KEY`.
- Nama variabel memakai huruf besar dan garis bawah, misalnya `NEXT_PUBLIC_API_URL`.
- Bisa dikirim langsung ke Vercel, Cloudflare, atau Railway. Project akan otomatis dideploy ulang agar perubahan
  berlaku.
- Nilainya disembunyikan sampai kamu menekan ikon mata.

### Observability
Grafik pengunjung 7 hari terakhir untuk project di Vercel. Aktifkan **Web Analytics** di project Vercel-mu dulu
(petunjuknya ada di Docs).

### Docs
Panduan di dalam aplikasi: cara mendapatkan token tiap platform, menghubungkan GitHub ke Cloudflare, jenis repo yang
didukung, dan apa yang dilakukan kalau deploy gagal.

### Settings
Simpan token platform-mu di sini supaya tidak perlu mengetik ulang setiap deploy.
- **Test Koneksi** memastikan token benar-benar valid.
- Tombol **Hapus** di samping tiap token menghapusnya dari akunmu kapan saja (ada konfirmasi dulu).

### Donasi
Suka dengan Depup? Kamu bisa mendukung lewat QRIS. Sepenuhnya sukarela.

---

## Asisten Bantuan 💬

Klik tombol **Bantuan** di pojok kanan bawah.

- Tanya soal deploy, token, domain, atau error, dan dapatkan jawaban singkat dalam bahasa Indonesia.
- **Kalau kamu melaporkan masalah** (misalnya "deploy saya gagal"), asisten memeriksa akunmu lebih dulu: apakah
  token masih valid, apakah platformnya sedang ada gangguan, dan apakah deploy terakhirmu gagal. Hasilnya tampil
  sebagai kartu **Hasil pemeriksaan akunmu**, dan jawaban asisten didasarkan pada hasil itu.
- Masalah belum selesai? Tekan **Laporkan ke developer**. Percakapan dan hasil pemeriksaan dikirim ke developer.
- Tombol **Salin percakapan** berguna kalau kamu ingin mengirimnya lewat jalur lain.
- ⚠️ **Jangan tempel token atau password di chat.** Kalau sudah terlanjur, buat ulang token itu di platform terkait.

Asisten adalah AI, jadi bisa saja keliru. Untuk hal penting, cek ulang di Docs atau dashboard platformnya.

---

## Pertanyaan yang sering muncul

**Project saya jenisnya apa saja yang bisa dideploy?**
- Website HTML/CSS/JS biasa: bisa ke ketiga platform (cukup ada `index.html`).
- Aplikasi Node.js dengan `package.json` (React, Vue, Next.js, dan sejenisnya): bisa, pastikan ada script `build`.
- Server (Express, NestJS) serta Docker, Python, Go, PHP, dan lainnya: pilih **Railway**.

**Repo saya private. Bisa?**
Bisa. Isi **GitHub Token** dengan izin `repo` di Settings.

**Deploy ke Cloudflare gagal, padahal di Vercel bisa?**
Cloudflare Pages menjalankan Next.js lewat adaptor tambahan, sehingga fitur server yang kompleks tidak selalu
jalan. Untuk Next.js dengan banyak API route, **Vercel paling mudah**. Cloudflare Pages unggul untuk situs statis,
Vite, Astro, dan sejenisnya.

**Deploy ke Railway diblokir karena "security vulnerabilities".**
Railway menolak project yang memakai versi dependency yang punya celah keamanan, misalnya Next.js 14 di bawah
14.2.35. Perbarui versinya di `package.json`, lalu deploy lagi.

**Kenapa Cloudflare Pages meminta GitHub dihubungkan dulu?**
Hanya sekali di awal. Ikuti tombol *Hubungkan GitHub ke Cloudflare* di Depup, lalu klik *Sudah connect, cek lagi*.

**Projectku sudah kuhapus di Vercel, tapi masih muncul?**
Tekan tombol **Sinkronkan** di halaman Projects. Project yang sudah tidak ada ditandai *Deleted* di riwayat.

**Riwayat deploy-ku hilang sebagian?**
Dashboard menyimpan 10 deploy terakhir. Yang paling lama otomatis tergeser.

**Deploy saya gagal. Apa yang harus dilakukan?**
1. Baca kotak **Yang bisa kamu lakukan** di pesan error, karena langkah perbaikannya spesifik.
2. Klik **Coba lagi** kalau masalahnya sementara (internet, server sibuk).
3. Tanya **Asisten Bantuan** dan ceritakan error-nya.
4. Masih buntu? Tekan **Laporkan ke developer**.

---

## Keamanan dan privasi

- Kamu masuk lewat akun Google. Depup tidak menyimpan password-mu.
- Token platform dan nilai environment variable disimpan **terenkripsi**, dan hanya bisa dipakai oleh akunmu.
- Token yang kamu ketik langsung di form deploy hanya dipakai untuk deploy itu dan tidak disimpan.
- Kamu bisa menghapus token kapan saja di **Settings**.
- Pemeriksaan akun oleh asisten berjalan di server. **Token tidak pernah dikirim ke AI**, hanya hasil ringkasnya
  ("valid", "ditolak", dan sebagainya).
- Riwayat chat bantuan hanya ada di halaman dan hilang saat di-refresh, kecuali kamu menekan *Laporkan ke developer*.

---

## Butuh bantuan?

- Klik **Bantuan** di dalam aplikasi, atau buka menu **Docs**.
- Ada ide atau menemukan bug? Laporkan lewat chat Bantuan.

---

*Kamu developer yang ingin menjalankan Depup sendiri? Lihat [DEVELOPER.md](DEVELOPER.md).*