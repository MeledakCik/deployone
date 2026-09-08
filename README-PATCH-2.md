# Patch 2: auto-redeploy, DNS record domain, & sinkron balik env

## Patch 2a — Auto-redeploy saat env var berubah
Sebelumnya, push secret ke Vercel (`upsertProjectEnv`) tidak pernah membuat
build baru — padahal Vercel cuma baca env var pada saat build/deploy
berjalan, bukan langsung inject ke deployment yang sudah live. Jadi user
harus manual redeploy dari Vercel dashboard supaya env baru kepakai.

**Fix:**
- `app/api/_lib/vercel.ts` — fungsi baru `redeployProject(projectName, vercelToken)`.
  Ambil `latestDeploymentId` dari project, lalu `POST /v13/deployments` dengan
  `{ name, deploymentId, target: "production" }` (redeploy dari deployment
  terakhir, tanpa perlu tahu ulang repo/branch).
- `ProjectStatus` sekarang juga punya field `latestDeploymentId`.
- Route baru: `app/api/vercel/redeploy/route.ts` (`POST { project, vercelToken }`).
- `lib/deploy-context.tsx` — `addEnvVar` dan `removeEnvVar` sekarang otomatis
  memanggil `/api/vercel/redeploy` setelah berhasil push/hapus secret di
  Vercel (hanya kalau project itu memang platform Vercel & sudah sinkron).
  Toast akan muncul: "Redeploy otomatis ... dimulai" lalu "... berhasil"
  atau pesan error kalau gagal.

## Patch 2b — Domain: tampilkan key-value DNS setelah ditambahkan
`addProjectDomain` sebelumnya sudah benar menambahkan domain langsung ke
production project di Vercel (`POST /v10/projects/{id}/domains`), tapi
response `verification` yang dibalikin Vercel tidak pernah ditampilkan ke
user — jadi user tidak tahu record apa yang harus dipasang di DNS provider
(Cloudflare, Niagahoster, dll).

**Fix:**
- `app/api/_lib/vercel.ts` — fungsi baru `resolveDnsInstruction()`. Menentukan
  apakah domain itu apex (`example.com`) atau subdomain (`app.example.com`)
  dari `apexName` yang dibalikin Vercel, lalu:
  - Coba ambil record asli dari `GET /v6/domains/{domain}/config`
    (`aValues`/`cnames`).
  - Fallback ke record standar Vercel (`A 76.76.21.21` untuk apex,
    `CNAME cname.vercel-dns.com` untuk subdomain) kalau lookup itu gagal.
  - Hasil digabung ke return value `addProjectDomain` sebagai field `dns:
    { type, name, value }`.
- `types/index.ts` — `DomainItem` & `VercelDomainResult` punya field baru
  `dns` / `apexName`.
- `lib/deploy-context.tsx` — `addDomain` menyimpan `result.dns` ke
  `DomainItem` yang disimpan di cloud storage. Fungsi baru
  `refreshDomainStatus(id)` — cek ulang status verifikasi domain (manual,
  karena Vercel tidak kasih webhook) lewat `GET /api/vercel/domains`.
- `components/dashboard/DomainsView.tsx` — setiap baris domain sekarang
  menampilkan card kecil berisi **Type / Name / Value** (dengan tombol
  copy) yang tinggal dipasang di DNS provider tempat beli domain, plus
  tombol "Cek Status" untuk verifikasi manual setelah DNS di-set.

## Patch 2c — Responsive fix: modal "Deploy Berhasil"
Modal hasil deploy (`components/dashboard/DeployModal.tsx`) sebelumnya
`fixed` height tanpa scroll — di layar pendek/mobile, konten (5 langkah +
result + kotak Web Analytics) bisa ke-cut atau kepenuhan.

**Fix:**
- Wrapper luar sekarang `overflow-y-auto` + `items-start` di mobile
  (`sm:items-center` di desktop) — modal bisa di-scroll kalau lebih tinggi
  dari layar.
- Padding & ukuran font diperkecil khusus mobile (`p-5 sm:p-6`, dst).
- Teks panjang (domain, nama project, warning) dikasih `break-words`/
  `break-all` biar nggak overflow horizontal.
- Tombol bawah full-width & `flex-col-reverse` di mobile, balik normal
  `flex-row` di desktop.

## Patch 2d — Sinkron balik: env dihapus di Vercel ikut kehapus di Depush
Sebelumnya Depush cuma push satu arah (Depush → Vercel). Kalau secret
dihapus langsung dari Vercel dashboard (bukan lewat Depush), baris-nya
tetap nongkrong di tabel Environment Variables Depush — nggak pernah tahu
kalau itu sudah nggak ada beneran.

**Fix (pola yang sama seperti sinkronisasi "Projects" yang sudah ada):**
- `app/api/_lib/vercel.ts` — fungsi baru `listProjectEnv(projectName,
  vercelToken)`, membaca daftar env asli di Vercel (`GET
  /v9/projects/{project}/env`) dan balikin `{ key, target }[]`.
- `app/api/vercel/env/route.ts` — tambah `GET` handler (sebelumnya cuma ada
  `POST`/`DELETE`) yang expose `listProjectEnv` di atas.
- `lib/deploy-context.tsx` — fungsi baru:
  - `syncEnvVarsForProject(project)` — fetch daftar env asli Vercel untuk 1
    project, lalu hapus dari local state (`envVars`) setiap secret yang
    `syncedToVercel: true` tapi key+target-nya sudah nggak ada di Vercel.
  - `syncAllEnvVars()` — jalanin `syncEnvVarsForProject` untuk semua
    project Vercel yang punya secret ter-sync, dipakai tombol "Sinkronkan
    dengan Vercel".
- `components/dashboard/EnvironmentView.tsx` — auto-sync sekali tiap buka
  halaman Environment Variables (mirip auto-sync di halaman Projects), plus
  tombol manual "Sinkronkan dengan Vercel" di pojok kanan atas tabel. Kalau
  ada yang kehapus, muncul toast: `"N secret untuk "project" sudah dihapus
  di Vercel — dihapus juga di sini."`

Catatan: hanya secret yang `syncedToVercel: true` yang dicek — secret lokal
murni (project bukan Vercel, atau belum pernah di-push) nggak disentuh oleh
sync ini, karena memang nggak ada rekan bandingnya di Vercel.

## Yang TIDAK diubah
- Alur "add domain ke production" itu sendiri sudah benar dari awal
  (domain langsung di-attach ke project, bukan ke deployment/preview
  tertentu) — cuma bagian "kasih tahu user record-nya" yang ditambahkan.
- Tidak ada polling otomatis status domain/env (Vercel tidak expose webhook
  publik untuk ini) — makanya sync-nya manual/on-visit, bukan real-time.

## Langkah setelah apply patch

```bash
npm install
npm run build
```

Sudah dicoba `npx tsc --noEmit` dan `npm run build` lokal — keduanya lolos.
