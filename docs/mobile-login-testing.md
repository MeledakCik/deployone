# Login Google di app mobile — cara pasang & tes

## Kenapa sebelumnya gagal
App Android memuat `https://depup.cloud/m` di **WebView**. Tombol "Masuk dengan Google" melakukan
`window.location.href = "/api/auth/google"` di dalam WebView itu, dan Google menolak OAuth di WebView
(`Error 403: disallowed_useragent`). Kalaupun lolos, cookie sesi dari browser tidak dibagi ke WebView.

## Alur baru
1. Tombol → WebView membuat PKCE (`verifier` disimpan lokal, `challenge` = SHA-256-nya) lalu membuka
   `/api/auth/google?app=1&challenge=…` di **Chrome Custom Tab** (`@capacitor/browser`).
2. Google login seperti biasa → callback web yang sama (redirect URI di Google Console **tidak perlu diubah**).
3. Callback melihat cookie `depup_oauth_app`, lalu menampilkan halaman perantara yang membuka
   `depup://auth?token=…` (token HMAC, berlaku 60 detik, terikat ke challenge).
4. Android membuka app lewat intent-filter → `appUrlOpen` → WebView `POST /api/auth/app-exchange`
   dengan `{token, verifier}` → server memasang cookie sesi di WebView → UI `/m` masuk.

## Pasang
```bash
npm install                 # menarik @capacitor/app & @capacitor/browser
npx cap sync android        # mendaftarkan plugin ke proyek native
```
1. **Deploy web dulu** ke produksi (app memuat UI dari `depup.cloud`, jadi kode web baru harus sudah live).
2. Build ulang APK (perubahan `AndroidManifest.xml` + plugin baru butuh APK baru): Android Studio → Run, atau
   `cd android && ./gradlew assembleDebug`.

## Tes otomatis (logika keamanan)
```bash
AUTH_SECRET=isi-acak-minimal-16-karakter node --experimental-strip-types --no-warnings --test tests/app-handoff.test.mjs
```

## Tes manual di HP / emulator
Pakai HP asli atau emulator **dengan Google Play** (butuh Chrome & akun Google).

| # | Skenario | Hasil yang diharapkan |
|---|----------|-----------------------|
| 1 | Buka app (belum login) → "Masuk dengan Google" | Custom Tab terbuka (bukan error 403), tombol berubah "Menunggu login Google…" |
| 2 | Pilih akun & setujui | Halaman "Login berhasil" sebentar → app terbuka otomatis → tab Projects tampil |
| 3 | Tutup app total, buka lagi | Masih login (cookie 30 hari tersimpan di WebView) |
| 4 | Logout → login lagi | Berhasil; tidak ada error "Sesi login tidak ditemukan" |
| 5 | Mulai login, lalu tekan Back/tutup Custom Tab | Kembali ke app, tombol aktif lagi (tidak macet "Menunggu…") |
| 6 | Mulai login, swipe-kill app saat di browser, selesaikan login | App terbuka dan langsung login (jalur `getLaunchUrl`) |
| 7 | Akun diblokir admin | Pesan "Akun ini dinonaktifkan…" muncul di layar login app |
| 8 | Mode pesawat saat tukar token | Pesan "Tidak bisa terhubung ke server…" |
| 9 | Login di web desktop | Tidak berubah (redirect ke `/dashboard`) |

### Perintah bantu
```bash
# Uji intent-filter deep link tanpa login sungguhan (harus membuka app & menampilkan pesan error di layar login):
adb shell am start -a android.intent.action.VIEW -d "depup://auth?error=tes%20deep%20link" id.depup.app

# Log native:
adb logcat | grep -i -E "capacitor|depup|chromium"

# Debug WebView (console/network/cookie): buka di Chrome desktop → chrome://inspect/#devices → Inspect
```
