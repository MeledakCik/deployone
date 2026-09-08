# Patch 2: auto-redeploy on env change + tampilkan DNS record saat add domain

## Fitur baru

### 1. Auto-redeploy saat env var berubah
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

### 2. Domain: tampilkan key-value DNS setelah ditambahkan
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

## Yang TIDAK diubah
- Alur "add domain ke production" itu sendiri sudah benar dari awal
  (`target` produksi implicit karena domain langsung di-attach ke project,
  bukan ke deployment/preview tertentu) — cuma bagian "kasih tahu user
  record-nya" yang ditambahkan.
- Tidak ada polling otomatis status domain (Vercel tidak expose webhook
  publik untuk ini) — makanya ada tombol "Cek Status" manual, bukan klaim
  auto-update.

## Langkah setelah apply patch

```bash
npm install
npm run build
```

Sudah dicoba `npx tsc --noEmit` dan `npm run build` lokal — keduanya lolos.
