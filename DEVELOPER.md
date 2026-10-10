# Depup — Catatan untuk Developer

Dokumen ini untuk yang menjalankan atau mengembangkan Depup (setup, environment variable, arsitektur, keamanan).
Panduan pemakaian untuk pengguna ada di [README.md](README.md).

**Depup** adalah dashboard untuk men-deploy dan mengelola project dari repo GitHub ke **Vercel**,
**Cloudflare Pages**, dan **Railway** dari satu tempat. Dibangun dengan Next.js 14 (App Router),
TypeScript, dan Tailwind CSS. Semua integrasi memanggil API platform asli — tidak ada data
simulasi.

## Fitur

- **Login Google (OAuth2 asli)** — session berupa cookie `httpOnly` bertanda tangan HMAC.
- **Deploy** — wizard bertahap: validasi repo GitHub → buat deployment → pantau status build
  sampai selesai (atau tampilkan error asli dari platform).
- **Projects** — project unik dari riwayat deploy, dengan tombol Visit & Redeploy.
- **Domains** — tambah/cek/hapus custom domain per project, lengkap dengan instruksi DNS.
- **Environment** — kelola environment variable; nilai bisa disembunyikan.
- **Settings** — simpan token platform + tombol *Test Koneksi* yang benar-benar memanggil API.
- **Docs** — panduan singkat di dalam aplikasi (token, GitHub PAT, OAuth, CNAME).
- **Upload** — upload zip atau folder (drag & drop) → diekstrak di browser → repo GitHub baru lewat Git Data API
  (`lib/github-upload.ts`, langsung dari browser ke `api.github.com` sehingga tidak kena batas body serverless) →
  opsional langsung deploy. Env dari `.env` lokal diisi otomatis ke form (file `.env` tidak di-upload) dan dipasang ke
  platform sebelum build pertama (`app/api/_lib/env-text.ts`).

Navigasi dashboard tersimpan di URL (`/dashboard?view=deploy`), jadi refresh, tombol Back, dan
bookmark bekerja normal.

## Cek jenis repo sebelum deploy

Sebelum deploy dimulai, `POST /api/github/validate` membaca isi root repo lalu mengklasifikasikannya
(`app/api/_lib/project-detect.ts`): HTML statis, Node.js (+ framework & TypeScript), Docker, Python, Go,
PHP, Ruby, Java, Rust, .NET, repo kosong, atau tidak dikenali. Hasilnya dinilai per platform
(`lib/deploy-guides.ts` → `ok` / `warn` / `blocked`):

- Repo HTML statis **tidak** butuh `package.json` (Vercel, Cloudflare Pages, Railway semuanya didukung).
- Repo yang tidak cocok dengan platform tujuan dihentikan **sebelum** menyentuh API platform, lengkap dengan
  penjelasan, saran platform lain, dan panduan deploy manual. Pagar yang sama dipasang di sisi server
  (`app/api/_lib/compat-guard.ts`) sebagai pengaman terakhir.
- Error (token salah, jaringan putus, rate limit GitHub, build gagal, dll.) diterjemahkan menjadi pesan
  ramah + langkah perbaikan oleh `lib/friendly-error.ts`, ditampilkan di modal deploy dengan tombol
  "Coba lagi", link dashboard, dan "Salin detail".

## Chat CS (asisten AI)

Tombol **Bantuan** di pojok kanan bawah dashboard membuka chat dengan asisten AI (Groq Cloud) yang menjawab
soal deploy, token, domain, dan error, berdasarkan aturan produk di `app/api/_lib/support-prompt.ts`.

- Endpoint: `POST /api/support/chat` (wajib login, dibatasi 12 pesan/menit per akun di `middleware.ts`).
- Env: `GROQ_API_KEY` (wajib) dan `GROQ_MODEL` (opsional, default `openai/gpt-oss-120b`).
  `llama-3.3-70b-versatile` sudah dimatikan Groq pada 16 Agustus 2026, jadi jangan dipakai.
- Token/secret yang terlanjur diketik user disamarkan di server sebelum dikirim ke Groq (`app/api/_lib/redact.ts`).
- Riwayat chat hanya ada di memori halaman (hilang saat refresh) dan tidak disimpan di server.
- Tombol **Salin percakapan** memudahkan user meneruskan masalah ke developer.

### Pemeriksaan teknis & laporan ke developer

Kalau pesan user terdengar seperti laporan masalah (gagal, error, tidak bisa, dst.), server menjalankan
pemeriksaan otomatis **sebelum** AI menjawab (`app/api/_lib/support-diagnostics.ts`), memakai token yang
tersimpan di akun user (dibaca di server; token tidak pernah dikirim ke browser maupun ke AI):

- validitas token Vercel / Cloudflare / Railway / GitHub,
- halaman status resmi Vercel, Cloudflare, dan GitHub,
- riwayat deploy 24 jam terakhir (berapa yang gagal),
- keterjangkauan penyimpanan data akun.

Hasilnya (OK / perhatian / masalah + keterangan) diberikan ke AI sebagai fakta dan ditampilkan ke user sebagai
kartu "Hasil pemeriksaan akunmu". Dibatasi 3 pemeriksaan per 5 menit per akun.

Laporan ke developer (`app/api/_lib/support-reports.ts`, disimpan di KV selama 90 hari):

- **Otomatis**: dibuat hanya kalau masalahnya ada di sisi Depup (mis. database bermasalah, atau deploy berulang
  gagal padahal token sehat). Token user yang salah dan insiden platform tidak dilaporkan otomatis. Maksimal 1 per
  akun per 30 menit.
- **Manual**: tombol "Laporkan ke developer" di chat menyimpan percakapan (token disamarkan) + pemeriksaan terbaru.
- Setiap laporan baru dikirim ke **Telegram** developer (env `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID`) dan/atau webhook
  `SUPPORT_WEBHOOK_URL` (Discord/Slack). Daftar lengkap bisa dibaca lewat `GET /api/support/report`, tapi itu opsional dan
  hanya aktif kalau env `ADMIN_EMAILS` diisi; notifikasi Telegram tidak membutuhkannya.

#### Notifikasi Telegram: cara membuat bot

1. Buka Telegram, cari **@BotFather** (centang biru resmi), lalu kirim `/newbot`.
2. Ketik nama tampilan bot (bebas, mis. `Depup Support`), lalu username bot yang **berakhiran `bot`**
   (mis. `depup_support_bot`; harus unik).
3. BotFather membalas **token bot**, bentuknya `123456789:AAExampleExampleExampleExample`.
   Itu nilai `TELEGRAM_BOT_TOKEN`. Anggap seperti password: jangan di-commit atau dibagikan. Kalau bocor, kirim
   `/revoke` ke BotFather untuk membuat token baru.
4. **Wajib:** buka bot barumu (klik link `t.me/<username_bot>` dari BotFather), tekan **Start**, dan kirim satu pesan
   apa saja. Bot tidak bisa mengirim pesan duluan ke orang yang belum pernah memulai chat.
5. Cari **Chat ID**:
   - Chat pribadi: buka `https://api.telegram.org/bot<TOKEN>/getUpdates` di browser (ganti `<TOKEN>`),
     lalu cari `"chat":{"id":123456789,...}`. Angka itu `TELEGRAM_CHAT_ID`. Atau kirim pesan ke **@userinfobot**
     untuk melihat ID akunmu.
   - Grup: tambahkan bot ke grup, kirim satu pesan di grup, lalu buka `getUpdates` yang sama. ID grup berupa angka
     **negatif** (mis. `-1001234567890`). Kalau `result` kosong, kirim ulang pesan di grup lalu muat ulang halamannya.
6. Isi `TELEGRAM_BOT_TOKEN` dan `TELEGRAM_CHAT_ID` di Vercel (Project Settings, Environment Variables), lalu redeploy.
7. Tes: di dashboard buka chat **Bantuan**, kirim satu keluhan, tunggu jawaban, lalu klik **Laporkan ke developer**.
   Pesan "Laporan bantuan Depup SR-..." harus masuk ke Telegram dalam beberapa detik. Kalau tidak masuk, cek log
   fungsi `/api/support/report` di Vercel: tertulis `telegram membalas 401` (token salah), `400` (Chat ID salah atau
   belum menekan Start), atau `403` (bot diblokir).

## Donasi (Saweria)

Menu **Donasi** di dashboard membuat kode QRIS dan memantau pembayarannya.

- Env: `SAWERIA_USERNAME` (wajib untuk mengaktifkan) dan `SAWERIA_USER_ID` (opsional, lebih stabil).
- Endpoint: `GET /api/donate` (konfigurasi), `POST /api/donate/create`, `GET /api/donate/status?id=`.
  Semuanya wajib login, dengan rate limit di `middleware.ts`.
- **Saweria tidak punya API publik resmi.** `app/api/_lib/saweria.ts` memakai endpoint backend yang sama dengan
  halaman donasi publik saweria.co, tanpa login akun. Endpoint ini bisa berubah tanpa pemberitahuan. Kalau
  gagal, UI menampilkan tautan cadangan ke halaman Saweria resmi.
- Status "terbayar" berasal dari perilaku endpoint tidak resmi (qr_string dikosongkan setelah bayar). Untuk
  pencatatan yang pasti, pakai dashboard atau webhook Saweria.

## Menjalankan

```bash
npm ci
npm run dev        # http://localhost:3000
npm run build && npm start
npm run lint
```

## Environment variable

Set di Vercel → Project Settings → Environment Variables (jangan commit file `.env`).
Lihat `.env.example`.

| Env var | Wajib | Keterangan |
|---|---|---|
| `GOOGLE_CLIENT_ID` | ya | Google Cloud Console → Credentials → OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | ya | Secret dari client ID di atas |
| `AUTH_SECRET` | ya | String acak ≥ 16 karakter. Dipakai menandatangani session **dan** menurunkan kunci enkripsi token tersimpan — mengganti nilainya membuat session lama tidak valid dan token tersimpan tidak bisa didekripsi |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | ya (production) | Terisi otomatis saat database KV di-connect ke project |
| `GITHUB_TOKEN` | tidak | Menaikkan rate limit GitHub untuk validasi repo publik |
| `GROQ_API_KEY`, `GROQ_MODEL` | tidak | Chat bantuan AI (tanpa key, widget tampil tapi menyatakan belum aktif) |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | tidak | Notifikasi laporan bantuan ke Telegram developer (cara membuat bot ada di bagian Chat CS) |
| `SUPPORT_WEBHOOK_URL` | tidak | Webhook https (Discord/Slack) untuk notifikasi laporan |
| `ADMIN_EMAILS` | tidak | Email yang boleh membaca daftar laporan lewat `GET /api/support/report` |
| `SAWERIA_USERNAME`, `SAWERIA_USER_ID` | tidak | Menu Donasi |

Redirect URI yang didaftarkan di Google Cloud Console:
`https://<domain-kamu>/api/auth/google/callback`.

> **Tanpa KV, data dashboard tidak bisa disimpan** (`/api/user-data` mengembalikan error),
> termasuk saat `next dev`. Rate limiting juga nonaktif tanpa KV (fail-open); gerbang session
> tetap aktif.

## Arsitektur singkat

Backend adalah Route Handlers di `app/api/`, ikut ter-deploy sebagai serverless function:

```
app/api/
├── _lib/          # client tipis per platform (vercel, cloudflare, railway, github),
│                  # session, crypto, store (KV), rate-limit, validators, response
├── auth/          # login Google, callback, logout, session
├── deploy/        # create + polling status deployment (Vercel)
├── vercel|cloudflare|railway/   # whoami, project, status, redeploy, domains, env, dst.
├── github/        # validate repo, whoami
└── user-data/     # baca/simpan data dashboard per akun
```

State client ada di `lib/deploy-context.tsx`; data dashboard (riwayat, domain, env var, token)
disinkronkan ke server lewat `lib/useCloudStorage.ts`.

## Keamanan

- **Semua `/api/*` selain `/api/auth/*` wajib session valid.** Gerbangnya ada di `middleware.ts`
  (tanda tangan HMAC diverifikasi di edge). Request tanpa session mendapat `401`, sehingga server
  ini tidak bisa dipakai orang luar sebagai proxy ke API platform.
- **Rate limit** per user (email dari session yang sudah terverifikasi) atau per IP untuk request
  anonim, memakai KV. Batas lebih ketat untuk endpoint auth dan GitHub.
- **Token platform** (Vercel/Cloudflare/Railway/GitHub PAT) dan nilai env var yang disimpan
  dienkripsi AES-256-GCM sebelum masuk KV. Token yang diketik di form deploy hanya diteruskan ke
  platform untuk request itu dan tidak disimpan oleh server.
- Header keamanan (HSTS, CSP, X-Frame-Options, dll.) diatur di `next.config.js`. CSP masih
  mengizinkan `'unsafe-inline'`/`'unsafe-eval'` untuk script karena kebutuhan Next.js 14 tanpa nonce.
- Logout menghapus cache lokal (`depup-fallback:*`) dari browser.

## Catatan perilaku

- **Riwayat deploy dibatasi 10 entri.** Saat penuh, entri terlama dihapus otomatis tanpa konfirmasi.
- **Domain deployment** dibentuk dari nama project: `*.vercel.app`, `*.pages.dev`, atau
  `*.up.railway.app` sesuai platform.
- Project yang sudah dihapus langsung di dashboard platform ditandai `deleted` di riwayat dan
  tidak muncul lagi di halaman Projects.
