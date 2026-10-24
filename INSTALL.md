# Depup — Patch fitur "Database" (Turso, ala phpMyAdmin)

Ini **patch** (file baru + sedikit file yang perlu kamu edit), bukan seluruh project. Repo-mu tidak bisa
saya baca file per file dan lingkungan saya tidak punya internet, jadi file lama (`session.ts`, `store.ts`,
`response.ts`, sidebar, `.env.example`) tidak saya ubah. Semua fitur baru menempel lewat **satu** file adapter.
Kode **belum saya jalankan terhadap Turso asli** — lihat bagian "Wajib diverifikasi".

## 1. Pasang
1. Ekstrak zip ini ke root project (folder `app/` dan `components/` akan menyatu dengan yang ada).
2. Tidak ada dependency baru (`package.json` tidak berubah).
3. Tambahkan isi `.env.example.add` ke `.env.example`, lalu isi di Vercel → Settings → Environment Variables:
   `TURSO_API_TOKEN`, `TURSO_ORG`, `TURSO_GROUP`. Redeploy.
4. Tambahkan menu di sidebar (sesuaikan dengan struktur item sidebar-mu):
   ```ts
   { label: "Database", href: "/dashboard/databases", icon: /* ikon silinder/database */ }
   ```
5. `app/api/_lib/db-adapter.ts` → fungsi `getSessionEmail()` mencoba nama export umum di `session.ts`
   (`getSession`, `getSessionFromRequest`, `readSession`, `verifySession`, `getCurrentUser`, `getUser`).
   **Jika semua route balas 401 padahal sudah login**, ganti isi fungsi itu dengan satu panggilan ke helper session-mu
   dan kembalikan `email` (lowercase). Ini satu-satunya titik sambungan ke auth.
6. Halaman `/dashboard/databases*` memakai layout `app/dashboard/layout.tsx` kalau ada. Kalau sidebar-mu dirender
   di dalam `app/dashboard/page.tsx` saja, bungkus isi `page.tsx` dua halaman itu dengan shell yang sama.

## 2. Setup Turso
```
turso auth api-tokens mint depup     # -> TURSO_API_TOKEN
turso org list                       # -> TURSO_ORG
turso group list                     # -> TURSO_GROUP (buat dulu: turso group create default)
```

## 3. Struktur
- `app/api/_lib/` : `db-adapter.ts` (KV, session, response, konstanta), `dbrepo.ts`, `dbauth.ts`, `turso.ts`, `dbio.ts`
- `app/api/databases/**` : create/list/rename/delete, credentials, keys, login, sql, schema, rows, export, import, send-env
- `app/api/v1/db/[id]/query` : REST API publik (Bearer API key)
- `app/dashboard/databases/**`, `app/db/[id]` : halaman; `components/db/*` : UI
- Konstanta mudah diubah (di `db-adapter.ts`): `MAX_DBS_PER_USER=3`, `QUOTA_BYTES`, rate limit, batas baris, timeout.

## 4. Skema KV (prefix `depup:`)
| Key | Isi |
|---|---|
| `user:{email}:dbs` | array id database milik user |
| `db:{id}` | pemilik, nama, nama+host Turso, `passwordHash` (scrypt), `credVersion`, `keys[]` (hash SHA-256) |
| `db:{id}:usage` | cache ukuran (45 dtk) |
| `dbname:{email}:{nama}` | kunci keunikan nama per user (SET NX) |
| `rl:*` | counter rate limit |

Tanpa KV di `next dev`, data jatuh ke memori proses (hilang saat restart). Di production tanpa KV semua route menolak dengan 503.

## 5. Strategi kuota 100MB
Ukuran tiap database dibaca dari usage API Turso (cache 45 dtk), dijumlah per user. Sebelum operasi yang **menambah** data
(INSERT/UPDATE/CREATE/ALTER ADD/import/pembuatan database) total dicek; ≥100MB → ditolak 413. **DELETE/DROP tetap
diizinkan** supaya user bisa mengosongkan ruang. Bila ukuran tak bisa dibaca → ditolak (fail-closed, 503).
Konsekuensi: ini kuota *lunak* — usage Turso tidak real-time, jadi satu operasi besar/paralel bisa melewati batas sedikit.

## 6. Wajib diverifikasi (tidak bisa saya cek dari sini)
Ditandai `[VERIFIKASI]` di `turso.ts`. Cocokkan dengan https://docs.turso.tech/api-reference dan spesifikasi Hrana HTTP:
1. Create database: body `{name, group}` dan field `database.Hostname` pada respons.
2. Create token: path `.../auth/tokens` dengan query `expiration` & `authorization` (`full-access`/`read-only`), respons `{jwt}`.
3. Usage: lokasi `storage_bytes` (`database.total` / `database.usage` / `instances[].usage`).
4. Hrana `/v2/pipeline` dengan request `batch` + `condition` (`ok`, `not`) dan `step_results`/`step_errors`.
5. `pragma_table_info()` dkk (table-valued function) diizinkan pada libSQL Turso.
6. `send-env` memanggil Vercel REST langsung (`/v10/projects/{p}/env?upsert=true`) karena route env lamamu tidak terlihat;
   ganti dengan helper `_lib/vercel.ts` bila mau. Token Vercel dikirim lewat header `x-vercel-token`.

## 7. Pemetaan aturan keamanan
1. `TURSO_API_TOKEN` hanya dibaca di `turso.ts` (server); tidak ada respons yang memuatnya. Token database tidak disimpan, dibuat on-demand (cache memori 45 mnt).
2. Semua route lewat `authorize()` (pemilik via session Google, atau cookie login database); selain itu 401/404 seragam. Route publik `/v1` memakai hash API key. Id database acak 16 karakter.
3. SQL dijalankan server dengan token database; timeout (20 dtk panel / 8 dtk API), batas baris (1000 / 500); `ATTACH`, `DETACH`, `VACUUM`, `load_extension`, dan PRAGMA di luar daftar baca-skema diblokir. Key read-only: hanya SELECT **dan** token Turso read-only. Parser SQL ini heuristik — jangan anggap sebagai sandbox sempurna. Timeout hanya memutus koneksi dari sisi Depup; query bisa tetap berjalan sebentar di Turso.
4. Lihat bagian 5.
5. Nama: `^[a-z0-9]+(-[a-z0-9]+)*$`, 3–32 karakter, unik per user (SET NX). Nama di Turso acak (`dp-…`).
6. Tidak ada localStorage; secret hanya tampil sekali di UI; log hanya mencatat nama error.

Tambahan: cookie sesi database `httpOnly`, `SameSite=Lax`, `Secure` di production, terikat id database + `credVersion` (reset password mencabut semua sesi), cek `Origin` untuk request mutasi, rate limit login (10/5 mnt), rate limit key (60/mnt).

## 8. Batasan yang diketahui
- Browse/edit memakai `rowid`: view dan tabel `WITHOUT ROWID` hanya baca. Kolom BLOB ditampilkan `[BLOB]` dan tidak bisa diedit.
- Import maks 2MB; CSV maks 5.000 baris, kolom jadi TEXT bila tabel dibuat otomatis. Export maks 50.000 baris.
- Daftar database user memakai read-modify-write di KV (tidak atomik); batas 3 database bisa terlewati jika dua create bersamaan.
- Error dari route `/v1` tidak membawa header CORS (hanya respons sukses/401).
- Token yang dikirim ke Environment berlaku "never"; cabut dengan merotasi token/grup di Turso bila bocor.
