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

#### Pelengkap file otomatis (khusus Railway)
Repo yang "hampir benar" sering gagal di Railway hanya karena ada file kecil yang kurang. Sebelum membuat service,
Depup mengecek repo-mu dan **menambahkan file yang kurang dalam satu commit**:

| Kondisi repo | Yang ditambahkan |
|---|---|
| HTML statis, `index.html` ada di folder `docs/` / `dist/` / dll | `Staticfile` yang mengarah ke folder itu |
| HTML statis, `index.html` di root **dan** ada folder `public/` | `Staticfile` (`root: .`) — tanpa ini Railway hanya menyajikan `public/` dan halaman utama 404 |
| Ada file `.html` tapi tidak ada `index.html` | `index.html` (pengalihan ke halaman utama, atau daftar semua halaman) |
| Node.js tanpa script `start` (Express/Fastify/Hono/Koa, Next.js, Nuxt 3, NestJS) | script `start` di `package.json` |
| FastAPI / Flask / Starlette / Litestar / Quart / Streamlit tanpa `Procfile` (atau app-nya bukan di `main.py`) | `Procfile` (port `$PORT`) + `uvicorn` / `gunicorn` di `requirements.txt` kalau belum ada. Project `pyproject.toml` saja hanya dibuatkan `Procfile` bila server-nya sudah terdaftar |
| Django tanpa `gunicorn` | `gunicorn` di `requirements.txt` (Depup juga mengingatkan soal `ALLOWED_HOSTS` / `CSRF_TRUSTED_ORIGINS`) |
| Ada `Dockerfile` tapi tidak ada `.dockerignore` | `.dockerignore` (mencegah `.env` & `.git` masuk image) |

**Project di subfolder** (mis. root repo hanya berisi `README.md`, project-nya di `frontend/` atau `backend/`): tidak
lagi diblokir di Railway. Depup mengenali isi folder itu, mengatur **Root Directory** service Railway ke folder tersebut,
dan melengkapi file yang kurang di dalam folder itu. (Vercel dan Cloudflare belum mendukung ini.)

**Pratinjau sebelum deploy:** di langkah GitHub URL, kartu hasil pengecekan repo menampilkan daftar file yang akan
ditambahkan beserta alasannya — jadi kamu tahu sebelum menekan Deploy, dan diberi tahu kalau token-mu belum bisa menulis.

Aturan mainnya: file buatanmu **tidak pernah ditimpa**. Kalau repo sudah punya `Dockerfile`, `Procfile`, `railway.json`,
dst., Depup tidak mengubah apa pun selain `.dockerignore`. Perlu **GitHub Token dengan izin menulis** (`repo`); kalau
tidak ada / tidak punya izin / branch dilindungi, deploy tetap jalan dan Depup memberi tahu file apa yang kurang.
Framework frontend (Vite, CRA, Vue, Angular, dst.) memang tidak disentuh karena Railway sudah menyajikannya sendiri.

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

## Hubungkan Claude — publish website dari chat ke Depup

Depup punya **konektor MCP** untuk Claude (web dan app HP). Setelah terhubung, kamu bisa membuat website di Claude lalu
bilang *"publish ke Depup"* — Claude langsung memberi **link publik** (Link Instan), tanpa download dan upload manual.

**Memasang (sekali saja)**
1. Buka **Dashboard → Link Instan → Hubungkan Claude** dan salin URL konektornya (`https://<domain-depup>/api/mcp`).
2. Di **claude.ai** (browser): **Settings → Connectors → Add custom connector**, isi nama `Depup`, tempel URL, lalu **Add** → **Connect**.
3. Masuk dengan Google di Depup dan tekan **Izinkan**.
4. Di chat, aktifkan konektor Depup, lalu: *"Buatkan landing page warung kopi, lalu publish ke Depup."*

Di **app Claude (HP)**, konektor yang kamu tambahkan di claude.ai ikut tersedia di akun yang sama — aktifkan dari menu konektor di chat.

**Yang bisa dilakukan Claude** (hanya itu; tidak bisa menyentuh token platform, env, atau database-mu):

| Tool | Fungsi |
|---|---|
| `deploy_website` | Menayangkan file statis (wajib ada `index.html`) jadi Link Instan. Bisa mengganti situs lama lewat `replace_site_id`. |
| `list_websites` | Melihat link aktif milikmu (ID, URL, kedaluwarsa). |
| `delete_website` | Menghapus satu link. |

Aturannya **sama dengan Link Instan**: hanya situs statis, link sementara (1 jam – 7 hari), kuota per akun mengikuti
`SITES_MAX_PER_USER`, ukuran lewat konektor maksimal 3 MB per situs (isi file dikirim sebagai teks dari chat).
**Cabut akses** kapan saja lewat tombol *Cabut semua akses Claude* di kartu yang sama.

**Untuk admin / developer**
- Tidak perlu env baru. Konektor memakai `AUTH_SECRET` (token ditandatangani terpisah dari cookie session) dan Redis yang sudah ada.
- Opsional: `NEXT_PUBLIC_SITE_URL` (origin publik, default `https://depup.cloud`) dipakai di metadata OAuth. `MCP_REDIRECT_HOSTS`
  (daftar host dipisah koma) menambah klien MCP lain selain `claude.ai` / `claude.com`.
- Endpoint: `POST /api/mcp` (MCP Streamable HTTP, JSON-RPC), `/.well-known/oauth-protected-resource`,
  `/.well-known/oauth-authorization-server`, `/api/mcp/oauth/register` (DCR), `/connect/authorize` (layar izin), `/api/mcp/oauth/token`.
- Keamanan: OAuth 2.1 + PKCE S256 wajib, kode otorisasi sekali pakai (5 menit), access token 1 jam, refresh token 30 hari,
  `redirect_uri` hanya ke host Claude (atau loopback untuk uji lokal), pencabutan lewat *epoch* per akun di Redis,
  akun yang diblokir admin ikut ditolak. Rate limit: 120 request/menit per akun, dan upload ikut batas 20/jam milik Link Instan.
- Uji: `AUTH_SECRET=... node --experimental-strip-types --test tests/mcp-token.test.mjs` dan
  `node --experimental-strip-types --import ./tests/mcp-e2e/register.mjs --test tests/mcp-e2e/mcp.e2e.test.mjs`
  (alur lengkap register → izin → token → deploy, dengan Redis tiruan di memori).

---

## Link Gaib — bagikan localhost tanpa deploy

Lagi ngoding di komputermu dan dosen atau client mau lihat hasilnya? Tidak perlu deploy dulu.

1. Jalankan project-mu seperti biasa (misalnya di `localhost:8000`).
2. Di terminal lain, ketik:

   ```bash
   npx depup-cli share
   ```

   (atau `npx depup-cli share 8000` kalau mau menyebut port-nya.)
3. Muncul link HTTPS seperti `https://cantik-depup-x7k2m.<domain-depup>`. Kirim ke siapa saja.
4. Tekan **Ctrl+C** kalau selesai — link langsung mati. Kalau lupa, link mati sendiri setelah 2 jam.

Yang perlu kamu tahu:

- Link hanya hidup selama komputermu menyala dan perintah `share` masih jalan.
- Orang yang membuka link melihat halaman peringatan sekali, lalu bisa lanjut ke websitemu.
- Belum mendukung WebSocket (mis. live reload / chat realtime), dan upload file dibatasi sekitar 600 KB.
- Siapa pun yang punya link bisa membuka websitemu. Jangan bagikan project yang berisi data rahasia.
- Opsi: `--name skripsi` (awalan nama link), `--ttl 240` (masa aktif dalam menit, maks 480).

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

*Kamu ingin menjalankan Depup sendiri? Lihat [.env.example](.env.example) untuk semua environment variable, dan grup "Untuk admin Depup" di menu Docs.*


## Panel Admin (`/admin`)

Hanya bisa dibuka oleh **depupdev@gmail.com** (login Google biasa; email tambahan lewat env `ADMIN_EMAILS`).
Pengguna lain mendapat 404, dan setiap API `/api/admin/*` memeriksa ulang di server.

Isi panel: **Ringkasan** (KPI + grafik login, pendaftar, deploy, link, abuse), **Abuse & Takedown** (antrean laporan,
takedown manual, larang pemilik), **Link aktif** (semua Link Instan/Gaib), **Pengguna** (blokir akun / larang link),
**Bantuan** (laporan chat bantuan), **Promosi** (kampanye email), **Audit sistem** (cek kesehatan database, konfigurasi, halaman, error server, dan status platform; AI hanya saat tombol ditekan), **Pengaturan** (tutup pendaftaran, matikan Link Instan/Gaib, banner pengumuman,
status sistem, tes notifikasi), **Log admin** (audit semua tindakan).

Catatan: grafik login/pendaftar/link/abuse mulai terisi sejak panel ini aktif. Pemblokiran akun berlaku ≤ 15 detik.
