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

**Klien AI lain:** konektor yang sama juga bisa dipakai Cursor, Codex, Gemini, OpenCode, dan **DeepSeek Harness (`dsh`)**.
Untuk DeepSeek Harness, buat token di *Settings → Konektor AI (MCP) → DeepSeek*, pasang paket resmi
`@deepseek-ai/dsh-mcp-client` ke profil dsh, isi token lewat variabel lingkungan `DEPUP_MCP_AUTH`, lalu tambahkan blok
`streamable-http` ke `cordis.patch.yml`. Langkah lengkap ada di `/docs/mcp`. DeepSeek Harness masih developer preview,
jadi format konfigurasinya bisa berubah.

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

### Bentuk alamat link (untuk admin server)

Seperti ngrok, link paling aman berada di domain yang terpisah dari dashboard. Depup memilih otomatis:

| Env yang diisi | Bentuk link | Kebutuhan DNS |
|---|---|---|
| `TUNNEL_BASE_DOMAIN=depup.web.id` | `https://cantik-x7k2m.depup.web.id/` | wildcard `*.depup.web.id` |
| `TUNNEL_PATH_HOST=t.depup.web.id` | `https://t.depup.web.id/cantik-x7k2m/` | satu record (CNAME) |
| (kosong) | `https://<domain-depup>/t/cantik-x7k2m/` | tidak ada (cadangan) |

Pada dua bentuk terakhir (mode path), request ber-URL absolut dari halaman yang dibagikan — `/style.css`,
`/_next/static/...`, `fetch("/api/...")`, `<a href="/about">`, redirect ke `/login` — dikenali dari header
Referer lalu diteruskan ke tunnel yang sama. Pengunjung tidak lagi dilempar ke halaman/login Depup.

### Mencoba Link Gaib di laptop (tanpa Upstash)

```bash
npm run kv:dev          # KV tiruan di memori, port 8079
# .env.local: KV_REST_API_URL=http://127.0.0.1:8079  KV_REST_API_TOKEN=dev-local
npm run dev
npx depup-cli share 5173 --host http://localhost:3000
```

---

## Mesin AI Depup (AI Web Builder & Konversi) — tanpa AI luar

AI Web Builder dan Konversi tidak lagi memanggil Groq atau layanan AI lain. Keduanya dikerjakan mesin milik Depup
yang berjalan di server Depup sendiri: tanpa token, tanpa kuota harian, dan kode/deskripsi pengguna tidak keluar dari server.

**AI Web Builder** (`lib/site-engine/`)

- Klasifikasi Naive Bayes (kata + pasangan kata) memilih jenis usaha dari deskripsi; ekstraksi aturan mengambil nama usaha,
  kota, produk + harga, WhatsApp, email, jam buka, dan alamat; isi disusun dari bank kalimat per jenis usaha.
- "Ubah dengan perintah" memahami perintah umum: ganti nama/judul/slogan/tombol/kontak, tambah/hapus produk, ubah harga,
  ganti warna/template/hero, hapus testimoni.
- **Melatih lewat Panel Admin (paling mudah)**: Panel Admin → **Mesin AI** → **Impor data latihan**. Unggah, seret, atau
  tempel paket domain (`.json`) atau contoh pengguna (`.jsonl`); tombol **Contoh paket** / **Contoh pengguna** mengunduh
  format yang benar. Isi diperiksa dengan aturan yang sama seperti `npm run engine:train`; kalau ada kesalahan tidak ada
  yang disimpan dan semua kesalahannya ditampilkan. Kalau lolos, mesin langsung dilatih ulang dan dipakai.
  - Kolom wajib paket: `id`, `kind`, `label`, `prompts` (≥ 5), `keywords`, `brandIcon`, `templates`, `heroes`, `feats`,
    `headlines`, `features`. Kolom lain yang kosong diisi dari paket umum sejenis.
  - `id` yang sama dengan paket bawaan = menggantikan paket bawaan itu.
  - Paket impor disimpan di KV (`engine:site:packs`, maks. 60 paket / 400 KB). **Ekspor (.json)** lalu taruh di
    `data/site-engine/packs/` untuk menjadikannya bawaan permanen.
- **Gaya visual (paket gaya)**: selain jenis usaha, mesin bisa dilatih gaya tampilan, mis. brutalism. Satu paket
  gaya (`"type": "style"`, lihat `lib/site-look.ts`) berisi palet (`bg`, `fg`, `ink`, `accent`), karakter huruf
  (`fonts` + `typeSets`: condensed/grotesk/mono/..., tebal, kapital, jarak huruf, skala), bentuk (`shape`: sudut,
  tebal garis, bayangan, jarak antar kartu; `gap: 0` = kartu saling menempel), tata letak (`hero`: mis. `poster`,
  `feat`: mis. `index`), elemen (`meta`, `bands`, `ticker`, `index`, `arrow`, `crosshair`, `barcode`, `sunburst`,
  `asterisk`, `halftone`, `plus-grid`), teks pendek (`copy.meta`/`kicker`/`ticker`), kata pemicu (`keywords`), dan
  kecocokan otomatis (`fit.domains`/`fit.kinds`/`fit.chance`). Impor lewat **Impor data latihan** seperti paket
  domain, atau taruh di `data/site-engine/styles/` lalu `npm run engine:train`. Website yang memakai gaya menyimpan
  `content.look`; pengguna melepasnya dengan "hapus gaya" atau memilih Template/warna sendiri.
- **Paket ikon** (`"type": "icons"`, lihat `lib/site-assets.ts`): ikon SVG gaya Lucide (24×24, garis) dengan
  `keywords` bahasa Indonesia. Mesin mempelajari frasa → ikon (frasa utuh, terpanjang menang), jadi produk seperti
  "Galon Air Mineral" otomatis memakai ikon `galon`. Entri tanpa `svg` dengan nama ikon bawaan = hanya menambah kata
  kunci. Nama bawaan tidak bisa ditimpa.
- **Paket elemen** (`"type": "elements"`): elemen dekoratif SVG dengan `slot` (`art` gambar utama, `badge` stiker,
  `divider` pita di bawah hero, `pattern` motif latar blok ajakan) dan `fit` (`styles`, `families`, `domains`,
  `kinds`, `chance`). Warna memakai `currentColor`/`var(--a)`/`var(--a2)`/`var(--ink)`/`var(--bg)`/`var(--on)` supaya
  ikut palet website.
- **Keamanan SVG**: semua SVG impor melewati `sanitizeSvg()` (allow-list: path, circle, rect, ellipse, line, polyline,
  polygon, g + atribut geometri/warna). Script, link, gambar luar, teks, style, dan event handler ditolak; SVG disaring
  ulang setiap isi website dinormalisasi.
- **Melatih dari repo**
  1. Tambah atau ubah pengetahuan di `data/site-engine/packs/*.json` (satu paket = satu jenis usaha: contoh deskripsi,
     kata kunci, kalimat, produk, fitur, langkah, artikel).
  2. Contoh dari pengguna (website yang mereka terbitkan dan *izinkan* dipakai) masuk ke Panel Admin → **Mesin AI**.
     Tekan **Latih ulang sekarang** untuk langsung memakai model baru, atau **Ekspor** lalu simpan ke
     `data/site-engine/feedback/*.jsonl`.
  3. `npm run engine:train` — memeriksa paket (ikon, ungkapan generik terlarang, kolom wajib), melatih, menulis
     `lib/site-engine/model.json`, dan menampilkan akurasi klasifikasi (leave-one-out).
- Tes: `node --experimental-strip-types --test tests/site-engine.test.mjs`

**Konversi** (`lib/convert/engine/`)

| Dari | Ke |
|---|---|
| Project Next.js (App/Pages Router) | HTML statis per halaman (layout + komponen digabung) |
| HTML | Next.js 16 (project), JSX/TSX, Markdown |
| JSON / YAML / TOML / XML | satu sama lain |
| TS, TSX | JS, JSX (tipe dihapus) |
| JS, JSX | TS, TSX (parameter diberi tipe `any`) |
| SCSS | CSS (dikompilasi) · CSS → SCSS |
| Markdown | HTML |
| JSX/TSX (satu komponen) | HTML |

Next.js/JSX → HTML memakai interpreter JSX statis: kode dibaca sebagai AST, tidak dijalankan. Data dari server, `fetch`,
state hasil klik, dan komponen dari paket pihak ketiga tidak bisa dihitung; bagian itu dilewati dan dicatat sebagai catatan
di hasil. Pasangan lain (mis. Python → Rust) sengaja tidak ditawarkan karena tidak bisa dibuat pasti tanpa AI.
Tes: `node --experimental-strip-types --test tests/convert-engine.test.mjs`

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

## SEO dan ringkasan AI

Semua konten publik tentang fitur ada di satu file: **`lib/site-content.ts`**. Dari file itu otomatis dibuat:

| Keluaran | Sumber |
|---|---|
| Halaman `/fitur` dan `/fitur/<slug>` (satu halaman per fitur, lengkap dengan JSON-LD) | `app/fitur/` |
| `/llms.txt` (ringkas) dan `/llms-full.txt` (lengkap) untuk asisten AI dan mesin jawaban | `app/llms.txt/`, `app/llms-full.txt/` |
| FAQ beranda dan `FAQPage` JSON-LD | `components/landing/FAQ.tsx` |
| `featureList` di JSON-LD `SoftwareApplication` | `app/layout.tsx` |
| Blok "Depup sekilas" di beranda | `components/landing/AtAGlance.tsx` |
| Entri `/fitur/*` di `sitemap.xml` | `app/sitemap.ts` |

**Menambah atau mengubah fitur:** edit `FEATURES` di `lib/site-content.ts`, lalu jalankan
`node --experimental-strip-types --test tests/site-content.test.mjs` (memeriksa slug unik, panjang judul dan deskripsi,
serta tautan fitur terkait). Tulis hanya hal yang benar-benar ada di kode, termasuk angka batasnya.

**Halaman publik baru:** pakai `pageMeta()` dari `lib/seo.ts` untuk `metadata`. Jangan menulis `openGraph` sendiri di halaman,
karena di Next.js objek itu *menggantikan* `openGraph` dari layout (og:image dan og:title ikut hilang).
Tambahkan URL-nya di `app/sitemap.ts` dan perbarui tanggal `UPDATED` hanya bila isinya benar-benar berubah.

**Area privat** (`/dashboard`, `/m`, `/db`, `/connect`, `/demo`, `/admin`, `/api`) diberi `X-Robots-Tag: noindex` di `next.config.js`
dan juga diblokir di `app/robots.ts`.

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
