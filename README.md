# Depup

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
- **Observability** — traffic 7 hari terakhir dari Vercel Web Analytics.
- **Settings** — simpan token platform + tombol *Test Koneksi* yang benar-benar memanggil API.
- **Docs** — panduan singkat di dalam aplikasi (token, GitHub PAT, OAuth, CNAME).

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
