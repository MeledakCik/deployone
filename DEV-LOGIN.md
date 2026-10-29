# Auto-login lokal (tanpa Google)

1. Salin isi `.env.local.example` ke `.env.local` (tambahkan, jangan timpa), isi `AUTH_SECRET`.
2. **Restart** `npm run dev` (script dev sekarang `next dev -H 127.0.0.1`; perubahan .env.local tidak terbaca tanpa restart).
3. Buka `http://localhost:3000/dashboard` (atau `http://127.0.0.1:3000`) langsung di browser.

## Kalau masih diminta login
Lihat **terminal tempat `npm run dev` jalan**. Kalau ada baris `[dev-login] ditolak: ...`, itu alasannya:
- `Host bukan loopback` -> kamu buka lewat IP LAN / domain / tunnel. Pakai localhost atau 127.0.0.1.
- `terdeteksi header proxy/tunnel` / `x-forwarded-*` -> ada proxy/tunnel di depan server.
- `request lintas-situs` / `Origin bukan loopback` -> halamannya dibuka dari situs lain; ketik URL sendiri.
- `terdeteksi env platform hosting` -> ada env VERCEL/RAILWAY/dll di shell lokalmu.
- Tidak ada baris apa pun -> `DEV_AUTO_LOGIN` belum `true` di proses itu (belum restart / salah file env), atau kamu menjalankan `next start`/build (NODE_ENV=production).

## Tidak berlaku untuk
- App Android (Capacitor): memuat `https://depup.cloud/m` (produksi) dan memakai login `?app=1` yang sengaja dikecualikan.
- Akses lewat Link Gaib/tunnel.

Tes: `node --experimental-strip-types --no-warnings tests/dev-login.test.mjs`
