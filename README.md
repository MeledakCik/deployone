# Depush

**Depush** adalah landing page + dashboard untuk mengelola deployment Vercel dan Cloudflare
Pages dari satu tempat — dibangun dengan Next.js 14 (App Router), TypeScript, dan Tailwind CSS.

## Halaman

- **`/` — Landing Page**
  Company profile bergaya Linear/Vercel dengan glassmorphism: hero section, social proof, grid
  fitur, alur "How it Works", dan CTA. Termasuk flow "Login with Google" (dummy) untuk masuk ke
  dashboard.

- **`/dashboard` — Deploy Dashboard**
  Aplikasi manajemen deployment dengan sidebar responsif (mobile: off-canvas drawer, desktop:
  sidebar statis) dan beberapa halaman:
  - **Dashboard** — ringkasan total deployment, status Ready/Failed, dan riwayat deploy terbaru.
  - **Projects** — daftar project unik yang dikelompokkan dari riwayat deploy, lengkap dengan
    tombol Visit & Redeploy.
  - **Deploy** — form untuk deploy project baru (nama, platform, domain custom, token, catatan).
    Untuk platform **Vercel**, ini memicu deployment sungguhan lewat backend di `app/api`
    (validasi repo GitHub → create deployment → polling status). Platform lain (Cloudflare,
    Railway, Render) masih simulasi 5 langkah sambil menunggu integrasi backend-nya menyusul.
  - **Domains** — kelola custom domain per project.
  - **Environment** — kelola environment variable/secret dengan value yang bisa disembunyikan.
  - **Docs** — panduan singkat (token Vercel, GitHub PAT, setup CNAME domain).
  - **Settings** — token platform global (Vercel, Cloudflare, GitHub PAT).

## Backend (`app/api`)

Semua logic backend disatukan di satu folder, sebagai Next.js Route Handlers — jadi otomatis
ikut ter-deploy sebagai serverless functions setiap kali project di-push ke Vercel, tanpa server
terpisah.

```
app/api/
├── _lib/                     # helper yang dipakai bersama semua route
│   ├── github.ts             # parse URL + validasi repo (public/private, struktur)
│   ├── vercel.ts             # client tipis untuk Vercel REST API
│   ├── validators.ts         # validasi input request (tanpa dependency tambahan)
│   └── response.ts           # helper response JSON seragam + error wrapper
├── github/validate/route.ts  # POST — cek repo sebelum deploy
├── deploy/route.ts           # POST — validasi ulang di server, lalu create deployment Vercel
└── deploy/[id]/route.ts      # GET  — polling status build (dipanggil tiap 2 detik dari client)
```

**Alur deploy (platform Vercel):**
1. Client kirim `githubUrl` + `githubPat` (opsional) ke `POST /api/github/validate`.
2. Server memanggil GitHub API: memastikan repo ada, mendeteksi **public/private**, cek apakah
   `package.json` ada di root, coba tebak framework-nya, dan kumpulkan warning (mis. tidak ada
   script `build`) — semua ini yang dimaksud "validasi fungsi & struktur".
3. Kalau lolos, client kirim `POST /api/deploy` (server **validasi ulang** repo, jangan percaya
   input client begitu saja). Sebelum create deployment, server juga cek `GET /v9/projects/{name}`
   ke Vercel — kalau nama project itu **sudah ada tapi ke-link ke repo GitHub yang beda**, request
   ditolak (409, `project_conflict`) supaya tidak ada project yang ke-relink diam-diam ke repo
   salah. Kalau project belum ada, atau sudah ada dan repo-nya sama (redeploy normal), lanjut ke
   `POST /v13/deployments` di Vercel API pakai token Vercel yang diisi user di form.
4. Client polling `GET /api/deploy/{id}` tiap 2 detik (token dikirim lewat header
   `x-vercel-token`, bukan query string) sampai `readyState` jadi `READY` (sukses, tampil domain +
   link inspector/build logs) atau `ERROR`/`CANCELED` (modal menampilkan pesan error asli dari
   Vercel).

**Keamanan token:** token Vercel/GitHub yang diisi di form **tidak pernah disimpan** di server —
hanya diteruskan langsung ke GitHub/Vercel API untuk request itu saja, lalu hilang begitu request
selesai. Untuk menaikkan rate limit GitHub API saat validasi repo publik tanpa PAT, bisa set env
var `GITHUB_TOKEN` (opsional, server-side only, tidak wajib).

**Roadmap:** Cloudflare Pages, Railway, dan Render masih pakai simulasi di client. Saat mau
dikerjakan, tambahkan helper baru di `app/api/_lib/` (mis. `cloudflare.ts`) dan route baru di
`app/api/deploy/` mengikuti pola yang sama seperti Vercel — supaya backend tetap satu folder.

Domains (`app/api/vercel/domains/*`) dan Environment Variables (`app/api/vercel/env/*`) pakai
pola yang sama persis: validasi input → panggil Vercel REST API asli → tidak ada data statis.
Settings punya tombol **Test Koneksi** yang benar-benar memanggil `GET /v2/user` (Vercel) dan
`GET /user` (GitHub) untuk membuktikan token valid, bukan sekadar cek format.

## Login Google (OAuth2 asli)

Depush pakai OAuth2 Google beneran — bukan simulasi/akun dummy. Alurnya standar Authorization
Code flow, session disimpan sebagai cookie `httpOnly` yang ditandatangani HMAC (lihat
`app/api/_lib/session.ts`), tanpa dependency tambahan (`next-auth`, dll).

**Environment variable yang wajib di-set** (di Vercel Project Settings → Environment Variables,
lalu redeploy):

| Env var | Keterangan |
|---|---|
| `GOOGLE_CLIENT_ID` | Dari Google Cloud Console → Credentials → OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Pasangan secret dari client ID di atas — **jangan pernah** ditaruh di kode atau dikirim ke chat manapun |
| `AUTH_SECRET` | String acak bebas (minimal 16 karakter) untuk menandatangani session cookie |

Redirect URI yang harus didaftarkan di Google Cloud Console (Authorized redirect URIs):
`https://<domain-vercel-kamu>/api/auth/google/callback`. Panduan lengkap langkah-demi-langkah ada
di halaman **Docs** dalam aplikasi (juga mencakup cara bikin Vercel Token & GitHub PAT).

Alur teknis: `GET /api/auth/google` redirect ke consent screen Google asli →
`GET /api/auth/google/callback` menukar `code` jadi access token, ambil profil asli
(`name`, `email`, `picture`) dari Google, lalu set cookie session → `GET /api/auth/session`
dipakai `auth-context.tsx` untuk hydrate status login di client → `/dashboard` dikunci lewat
`AuthGuard` yang redirect ke `/` kalau belum ada session valid.

## Desain

Dual theme (dark/light) dengan token warna dan glassmorphism yang konsisten — blur dipakai secara
selektif (hanya sidebar & stat card) supaya UI tetap ringan di perangkat mobile, sementara elemen
lain (tabel, form, modal) memakai permukaan solid untuk performa.

## Catatan

- **Auth adalah dummy flow.** Tidak memakai NextAuth/OAuth asli — "Login with Google" membuka
  pemilih akun dengan dua akun contoh, mensimulasikan proses login, lalu menyimpan sesi di
  `localStorage`. Logout akan menghapus sesi tersebut dan kembali ke halaman utama.
- **Riwayat deploy** dibatasi maksimal 10 entri — entri terlama otomatis terhapus saat penuh, dan
  akan muncul konfirmasi sebelum itu terjadi.
- **Domain deployment** di-generate otomatis dari nama project: `*.pages.dev` untuk Cloudflare,
  `*.vercel.app` untuk platform lainnya.