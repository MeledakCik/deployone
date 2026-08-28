# DeployOne

**DeployOne** adalah landing page + dashboard untuk mengelola deployment Vercel dan Cloudflare
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
  - **Deploy** — form untuk deploy project baru (nama, platform, domain custom, token, catatan)
    dengan validasi URL repo GitHub dan simulasi proses deploy 5 langkah.
  - **Domains** — kelola custom domain per project.
  - **Environment** — kelola environment variable/secret dengan value yang bisa disembunyikan.
  - **Docs** — panduan singkat (token Vercel, GitHub PAT, setup CNAME domain).
  - **Settings** — token platform global (Vercel, Cloudflare, GitHub PAT).

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