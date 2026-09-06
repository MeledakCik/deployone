# Patch notes — fix data hilang setelah logout -> login lagi

Ini audit terhadap source code asli kamu (bukan tebakan struktur lagi).
Ternyata ada **beberapa bug build-breaking** selain bug utama yang kamu
laporkan — proyek ini kemungkinan besar belum pernah berhasil `next build`
dalam kondisi sebelumnya. Semua sudah diperbaiki di zip ini.

## Bug yang ditemukan & diperbaiki

### 1. `package.json` — dependency `@vercel/kv` tidak pernah ditambahkan
`app/api/_lib/store.ts` melakukan `import { kv } from "@vercel/kv"`, tapi
package itu **tidak ada** di `dependencies`. Build akan gagal total dengan
`Module not found: Can't resolve '@vercel/kv'`.

**Fix:** ditambahkan `"@vercel/kv": "^3.0.0"` ke `dependencies`.
**Kamu wajib jalankan `npm install` setelah menerapkan patch ini**
supaya `package-lock.json` ikut ter-update — itu tidak saya sentuh manual
karena environment saya tidak punya akses registry npm.

### 2. `app/api/_lib/session.ts` — `getSessionEmail` belum ada
`app/api/user-data/route.ts` meng-import `getSessionEmail` dari
`session.ts`, tapi fungsi itu tidak pernah didefinisikan di file asli
kamu (cuma ada `signSession` & `verifySession`). Build gagal:
`Module '"@/app/api/_lib/session"' has no exported member 'getSessionEmail'`.

**Fix:** ditambahkan fungsi `getSessionEmail(req)` yang membaca cookie
`depush_session`, verify HMAC-nya lewat `verifySession` yang sudah ada,
lalu balikin email ter-normalisasi (trim + lowercase) atau `null`.

### 3. `lib/useCloudStorage.ts` — ini akar masalah utamanya
Ada **tiga** masalah terpisah di file ini:

a. **Bug logout/login (laporan awal kamu):** hook nge-PUT `state` ke
   server di setiap render, termasuk saat baru mount dengan state kosong
   sebelum sempat fetch dari server. Setelah logout lalu login lagi,
   race ini menimpa data valid di KV dengan `[]`.

b. **Import ke hook yang tidak ada:** versi sebelumnya (patch pertama
   saya, sebelum lihat source asli) meng-import `useSession` dari
   `./useSession` — file itu **tidak ada** di project kamu, yang ada
   cuma `useAuth()` dari `lib/auth-context.tsx`. Build gagal:
   `Module not found: Can't resolve './useSession'`.

c. **Signature tidak cocok dengan pemanggilnya:**
   - `lib/deploy-context.tsx` memanggil `useCloudStorage(key, initial, legacyKey)`
     — **3 argumen** — tapi hook lama cuma menerima 2. Ini type error di
     `strict: true`.
   - `components/dashboard/SettingsView.tsx` melakukan
     `const [tokens, setTokens, ready] = useCloudStorage(...)` —
     **destructuring 3 elemen**, tapi hook lama cuma
     `return [state, setState] as const` (2 elemen). `ready` akan selalu
     `undefined` dan TypeScript akan error karena tuple length tidak cocok.

**Fix:** `useCloudStorage.ts` ditulis ulang total:
- Signature: `useCloudStorage<T>(key, initial, legacyLocalStorageKey?)`.
- Return: `[state, setStateAndSync, isInitialized] as const` (3-tuple).
- Pakai `useAuth()` yang asli (`user?.email`, `ready`) — bukan hook
  session terpisah yang bisa telat update saat logout.
- Effect PUT (sync ke server) HANYA jalan kalau: ada email (login),
  `isInitialized` true (load awal selesai), dan perubahan berasal dari
  aksi eksplisit user (`skipSyncRef`) — bukan dari reset/load internal.
- Saat logout (`email` jadi `null`), state di-reset ke `initial` secara
  lokal **tanpa** memicu PUT sama sekali.
- Response `/api/user-data` sekarang di-unwrap sesuai konvensi
  `{ ok, data }` / `{ ok: false, error }` yang dipakai route lain di
  project ini (lihat poin 4).
- Cek "data kosong atau tidak" generik untuk array (history/domains/envVars)
  **maupun** objek (settingsTokens) — versi lama cuma cek `Array.isArray`,
  yang selalu `false` untuk `settingsTokens` sehingga migrasi
  localStorage-nya tidak akan pernah jalan dengan benar.

### 4. `app/api/user-data/route.ts` — ditulis ulang, konsisten dgn konvensi API di project ini
Route lain di project ini (`app/api/deploy/route.ts`, dst) semua pakai
helper `ok()` / `fail()` / `withErrorHandling()` dari
`app/api/_lib/response.ts`, dan client (`callApi` di `deploy-context.tsx`
& `SettingsView.tsx`) meng-unwrap `{ ok, data }`. `user-data/route.ts`
sekarang ikut pola yang sama:
- **GET**: balikin `ok({ history, domains, envVars, settingsTokens })`,
  atau `fail("Belum login.", 401, "unauthorized")` kalau tidak ada session.
- **PUT**: **merge** terhadap data lama (bukan overwrite), menolak
  (`fail(..., 400, "bad_request")`) kalau body kosong/tanpa field —
  ini lapisan pertahanan kedua di server selain fix di `useCloudStorage.ts`.

### 5. `app/api/auth/logout/route.ts`
Sudah benar secara logika sebelumnya (tidak menyentuh KV), tapi
hardcode string `"depush_session"` diganti pakai konstanta
`SESSION_COOKIE` dari `session.ts` supaya tidak bisa "kelewat" typo
kalau nama cookie berubah di masa depan. Response juga disamakan pakai
`ok({ loggedOut: true })`.

### 6. File yang dihapus
`lib/useSession.example.ts` dan `app/api/_lib/session.example.ts` —
sisa dari iterasi patch sebelumnya sebelum saya lihat source asli kamu,
sudah tidak relevan karena `useCloudStorage.ts` sekarang langsung pakai
`useAuth()` yang sungguhan.

## Yang TIDAK diubah (sudah benar)

- `app/api/_lib/store.ts` — key `user:${email.trim().toLowerCase()}`,
  tidak pernah return `null`, tidak ada fungsi delete. Ini sudah persis
  seperti yang dibutuhkan, tidak disentuh.
- `components/dashboard/AuthGuard.tsx` — sudah meng-unmount seluruh
  `<DeployProvider>` (dan karenanya semua `useCloudStorage` di
  dalamnya) begitu `user` jadi `null`, jadi tidak ada render dengan
  state kosong yang "nyasar" ke server. Ini justru desain yang bagus
  dan jadi lapis pertahanan tambahan di atas fix `useCloudStorage.ts`.
- `lib/deploy-context.tsx` — guard `Array.isArray(...)` di semua
  pemakaian `history`/`domains`/`envVars` sudah lengkap dan benar.

## Langkah setelah apply patch

```bash
npm install        # WAJIB — supaya @vercel/kv & lockfile ter-update
npm run build       # pastikan build lolos di lokal sebelum push
```

Lalu di Vercel Project Settings -> Environment Variables, pastikan ada:
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `AUTH_SECRET`
- `KV_REST_API_URL`, `KV_REST_API_TOKEN` (otomatis terisi setelah
  connect Vercel KV database ke project)

## Test flow

1. Login Google A -> deploy 1 project -> cek key `user:a@gmail.com` di
   Upstash/Vercel KV console ada isinya.
2. Logout -> di Network tab, pastikan **tidak ada** `PUT /api/user-data`
   yang terkirim saat/segera setelah logout.
3. Login lagi Google A -> dashboard menampilkan history yang sama
   seperti sebelum logout.
4. Login Google B -> data kosong (key KV terpisah, `user:b@gmail.com`).
