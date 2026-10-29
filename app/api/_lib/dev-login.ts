import type { NextRequest } from "next/server";

/**
 * Auto-login untuk development lokal (tanpa Google).
 *
 * Aktif HANYA kalau SEMUA syarat ini terpenuhi:
 *  1. NODE_ENV === "development"  (`npm run dev`; build/produksi tidak pernah)
 *  2. DEV_AUTO_LOGIN=true di .env.local  (harus dinyalakan sengaja)
 *  3. Tidak ada penanda platform hosting (VERCEL, RAILWAY_*, CF_PAGES, dst.)
 *  4. Request GET langsung ke localhost / 127.0.0.1 / [::1]
 *  5. Request BUKAN dari Link Gaib (tunnel) atau proxy lain.
 *  6. Request bukan lintas-situs (anti login-CSRF dari website lain yang kamu buka).
 *
 * Soal no. 5: CLI `depup-share` selalu menulis ulang header Host jadi
 * "localhost:PORT", jadi Host saja TIDAK bisa membedakan tamu tunnel dari
 * kamu. Yang membedakan adalah header x-forwarded-* yang selalu ditambahkan
 * server tunnel (app/t/[slug]/.../route.ts) dengan host/IP/https milik tamu,
 * dan tidak bisa dipalsukan karena dibuang lalu ditulis ulang di sana.
 * Semua header itu harus kosong atau menunjuk ke loopback.
 *
 * PENTING: header bisa dipalsukan oleh siapa pun yang bisa menjangkau port
 * dev server (mis. perangkat lain di WiFi yang sama kalau server listen di
 * 0.0.0.0). Karena itu script `dev` WAJIB `next dev -H 127.0.0.1` supaya
 * server hanya menerima koneksi dari mesin ini. Ini lapisan utamanya;
 * pengecekan header di bawah adalah lapisan tambahan.
 *
 * Semua input dibatasi panjang & jumlahnya (anti kebesaran / out-of-bound),
 * tidak ada eval / child_process / pembentukan perintah shell di sini, dan
 * log hanya berisi alasan tetap (bukan isi header) supaya tidak bisa disusupi.
 */

/** host[:port] yang diizinkan. Port maksimal 5 digit (dicek ≤ 65535 di bawah). */
const LOOPBACK_HOST_RE = /^(?:localhost|127\.0\.0\.1|\[::1\])(?::(\d{1,5}))?$/;
const LOOPBACK_ORIGIN_RE = /^http:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d{1,5})?$/;
const LOOPBACK_IPS = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);

/** Batas keras supaya header raksasa / list ribuan item tidak diproses. */
const MAX_HEADER_LEN = 256;
const MAX_LIST_ITEMS = 8;

/** Header yang hanya muncul kalau ada proxy/CDN/tunnel di depan: kalau ada, tolak. */
const PROXY_HEADERS = [
  "forwarded",
  "via",
  "x-vercel-id",
  "x-vercel-forwarded-for",
  "cf-connecting-ip",
  "cf-ray",
  "true-client-ip",
  "x-client-ip",
  "x-forwarded-server",
  "x-original-forwarded-for",
  "x-depup-target",
] as const;

/** Env var yang diset otomatis oleh platform hosting. Kalau ada, ini bukan laptop kamu. */
const HOSTING_ENV_MARKERS = [
  "VERCEL",
  "VERCEL_ENV",
  "RAILWAY_ENVIRONMENT",
  "RAILWAY_PROJECT_ID",
  "CF_PAGES",
  "RENDER",
  "FLY_APP_NAME",
  "NETLIFY",
  "K_SERVICE",
  "KUBERNETES_SERVICE_HOST",
  "AWS_LAMBDA_FUNCTION_NAME",
  "DYNO",
] as const;

/** Sesi dev sengaja pendek (bukan 1 hari). */
export const DEV_SESSION_SECONDS = 60 * 60 * 8;

const DEFAULT_DEV_EMAIL = "dev@localhost";
const DEV_EMAIL_RE = /^[a-z0-9._+-]{1,64}@[a-z0-9.-]{1,120}$/;

const warned = new Set<string>();
/** Selalu return false. `reason` HARUS string literal (bukan data dari request). */
function deny(reason: string): false {
  if (!warned.has(reason)) {
    warned.add(reason);
    console.warn(`[dev-login] ditolak: ${reason}`);
  }
  return false;
}

function isLoopbackHostPort(value: string): boolean {
  if (value.length === 0 || value.length > MAX_HEADER_LEN) return false;
  const m = LOOPBACK_HOST_RE.exec(value);
  if (!m) return false;
  return m[1] === undefined || Number(m[1]) <= 65535;
}

/** Pecah header berisi daftar (dipisah koma) dengan batas ketat. null = melanggar batas. */
function listOf(value: string | null): string[] | null {
  if (value === null || value === "") return [];
  if (value.length > MAX_HEADER_LEN) return null;
  const parts = value.split(",");
  if (parts.length > MAX_LIST_ITEMS) return null;
  return parts.map((p) => p.trim().toLowerCase());
}

export function isDevAutoLogin(req: NextRequest): boolean {
  if (process.env.DEV_AUTO_LOGIN === "true" && process.env.NODE_ENV !== "development") {
    // Salah konfigurasi yang berbahaya kalau sampai ke produksi: ribut di log, tapi tetap tolak.
    return deny("DEV_AUTO_LOGIN=true tapi NODE_ENV bukan development (hapus env ini dari server!)");
  }
  if (process.env.NODE_ENV !== "development") return false;
  if (process.env.DEV_AUTO_LOGIN !== "true") return false;

  for (const name of HOSTING_ENV_MARKERS) {
    if (process.env[name]) return deny("terdeteksi env platform hosting");
  }

  if (req.method !== "GET") return deny("method bukan GET");

  const h = req.headers;

  if (!isLoopbackHostPort(h.get("host") ?? "")) return deny("Host bukan loopback / format tidak valid");

  // Header proxy: kalau ada, wajib menunjuk ke loopback (Next dev boleh mengisinya sendiri).
  const fwdHost = listOf(h.get("x-forwarded-host"));
  if (fwdHost === null || !fwdHost.every(isLoopbackHostPort)) return deny("x-forwarded-host bukan loopback");

  const fwdProto = listOf(h.get("x-forwarded-proto"));
  if (fwdProto === null || !fwdProto.every((v) => v === "http")) return deny("x-forwarded-proto bukan http");

  for (const name of ["x-forwarded-for", "x-real-ip"] as const) {
    const ips = listOf(h.get(name));
    if (ips === null || !ips.every((ip) => LOOPBACK_IPS.has(ip))) return deny("IP asal bukan loopback");
  }

  // Header lain yang menandakan ada proxy/CDN/tunnel di depan.
  for (const name of PROXY_HEADERS) {
    if (h.get(name) !== null) return deny("terdeteksi header proxy/tunnel");
  }

  // Anti login-CSRF / DNS-rebinding: halaman website lain tidak boleh memicu login otomatis.
  const origin = h.get("origin");
  if (origin !== null && (origin.length > MAX_HEADER_LEN || !LOOPBACK_ORIGIN_RE.test(origin))) {
    return deny("Origin bukan loopback");
  }
  const fetchSite = h.get("sec-fetch-site");
  if (fetchSite !== null && fetchSite !== "none" && fetchSite !== "same-origin") {
    return deny("request lintas-situs (sec-fetch-site)");
  }

  return true;
}

export function devUser() {
  const raw = (process.env.DEV_AUTO_LOGIN_EMAIL ?? "").trim().toLowerCase();
  let email = DEFAULT_DEV_EMAIL;
  if (raw) {
    if (raw.length <= 190 && DEV_EMAIL_RE.test(raw)) email = raw;
    else deny("DEV_AUTO_LOGIN_EMAIL tidak valid, pakai dev@localhost");
  }
  // dev:true = penanda. verifySession menolak sesi bertanda ini di luar NODE_ENV=development,
  // jadi cookie dev yang bocor tidak bisa dipakai di produksi walau AUTH_SECRET-nya sama.
  return { email, name: "Dev Lokal", picture: null as string | null, dev: true as const };
}
