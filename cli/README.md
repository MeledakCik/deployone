# depup-cli

Bagikan website yang jalan di `localhost` lewat link HTTPS sementara — tanpa deploy.
Seperti ngrok: **hanya pembuat link yang login** (sekali saja), orang yang membuka link **tidak perlu login**.

```bash
npx depup-cli@latest login   # sekali saja: browser terbuka, login Google, tekan "Izinkan"
npx depup-cli share          # deteksi otomatis port yang sedang jalan
npx depup-cli share 8000     # atau sebutkan port-nya
```

```
  ● Online   localhost:8000  →  https://cantik-depup-x7k2m.depup.link/
  Aktif ±120 menit · Ctrl+C untuk berhenti · milik kamu@gmail.com
  Siapa pun yang punya link bisa membukanya tanpa login.
```

Kalau belum login, `depup share` otomatis memulai login dulu lalu langsung membuat link.
Token disimpan di `~/.depup/config.json` (berlaku 90 hari).

| Perintah | Keterangan |
|---|---|
| `login` | hubungkan CLI ke akun Depup-mu lewat browser |
| `login --token <token>` | untuk server/CI tanpa browser; token dibuat di Pengaturan → Depup CLI · Share |
| `whoami` | tampilkan akun yang sedang dipakai |
| `logout` | hapus token dari komputer ini |

| Opsi | Keterangan |
|---|---|
| `--name <awalan>` | awalan nama link (bagian acak tetap ditambahkan supaya tidak bisa ditebak) |
| `--ttl <menit>` | masa aktif link, default 120, maksimal 480 |
| `--token <token>` | pakai token ini (atau env `DEPUP_TOKEN`) tanpa menyimpannya |
| `--host <url>` | server Depup; default `https://depup.cloud` atau env `DEPUP_HOST` |

Catatan: hanya `localhost` yang bisa dibagikan, tidak ada WebSocket, body upload maksimal ±600 KB.
Siapa pun yang punya link bisa membuka websitemu selama perintah ini jalan.
Cabut semua token CLI lewat Pengaturan → Konektor AI (MCP) → Cabut semua akses.

Butuh Node.js 18+. Tanpa dependensi.
