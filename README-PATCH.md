# Patch: fix data hilang setelah logout -> login lagi (deployone)

## Isi zip

```
app/api/_lib/store.ts              -> pengganti file asli
app/api/_lib/session.example.ts    -> CONTOH helper, copy fungsi getSessionEmail
                                       ke session.ts asli kamu
app/api/user-data/route.ts         -> pengganti file asli
app/api/auth/logout/route.ts       -> pengganti file asli
lib/useCloudStorage.ts             -> pengganti file asli
lib/useSession.example.ts          -> CONTOH hook, sesuaikan dengan session
                                       context/hook yang sudah ada
```

File `*.example.ts` BUKAN untuk langsung timpa — itu referensi karena saya
tidak punya akses ke isi asli `session.ts` dan hook session client kamu.
4 file lain (`store.ts`, `user-data/route.ts`, `auth/logout/route.ts`,
`useCloudStorage.ts`) siap dipakai langsung, tinggal sesuaikan:

- import path `useSession` di `useCloudStorage.ts` kalau nama file/hook
  session kamu beda.
- fungsi `getSessionEmail` di `user-data/route.ts` kalau nama/lokasi
  fungsi verifikasi session kamu beda dari asumsi.

## Root cause

`useCloudStorage` sebelumnya melakukan `PUT /api/user-data` di setiap
perubahan `state`, termasuk saat komponen re-mount dengan state kosong
(`[]`) sesaat setelah logout — sebelum sempat fetch ulang. PUT ini
menimpa data valid di KV dengan array kosong.

## Fix inti

1. **store.ts** — key KV selalu `user:${email.trim().toLowerCase()}`,
   `getUserData`/`putUserData` tidak pernah return `null`.
2. **user-data/route.ts** — PUT melakukan merge terhadap data lama
   (bukan overwrite total), dan menolak payload kosong/tanpa field.
3. **useCloudStorage.ts** — effect sync PUT hanya jalan kalau: ada
   email login, sudah selesai load awal (`isInitialized`), dan
   perubahan berasal dari aksi eksplisit user (`skipSyncRef`).
4. **auth/logout/route.ts** — hanya menghapus cookie `depush_session`,
   tidak ada import dari `store.ts` sama sekali.

## Test flow

1. Login Google A -> deploy 1 project -> cek key `user:a@gmail.com` di
   Upstash console ada isinya.
2. Logout -> cek Network tab: TIDAK boleh ada `PUT /api/user-data`
   yang terkirim.
3. Login lagi Google A -> `GET /api/user-data` balikin history yang
   sama seperti sebelum logout.
4. Login Google B -> data kosong, key KV `user:b@gmail.com` terpisah
   dari akun A.
