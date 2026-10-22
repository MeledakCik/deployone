# depup-cli

Bagikan website yang jalan di `localhost` lewat link HTTPS sementara — tanpa deploy.

```bash
npx depup-cli share          # deteksi otomatis port yang sedang jalan
npx depup-cli share 8000     # atau sebutkan port-nya
```

```
  ● Online   localhost:8000  →  https://cantik-depup-x7k2m.depup.link/
  Aktif ±120 menit · Ctrl+C untuk berhenti
```

| Opsi | Keterangan |
|---|---|
| `--name <awalan>` | awalan nama link (bagian acak tetap ditambahkan supaya tidak bisa ditebak) |
| `--ttl <menit>` | masa aktif link, default 120, maksimal 480 |
| `--host <url>` | server Depup; default `https://depup.cloud` atau env `DEPUP_HOST` |

Catatan: hanya `localhost` yang bisa dibagikan, tidak ada WebSocket, body upload maksimal ±600 KB.
Siapa pun yang punya link bisa membuka websitemu selama perintah ini jalan.

Butuh Node.js 18+. Tanpa dependensi.
