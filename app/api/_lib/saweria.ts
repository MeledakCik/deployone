/**
 * Integrasi donasi Saweria (QRIS).
 *
 * PENTING: Saweria TIDAK punya API publik resmi. Modul ini memakai endpoint
 * backend yang sama dengan halaman donasi publik saweria.co (cara yang dipakai
 * library komunitas seperti qris-saweria). Tidak butuh login/password akun
 * Saweria. Endpoint ini bisa berubah sewaktu-waktu tanpa pemberitahuan, jadi:
 *   - tiap langkah mencoba beberapa endpoint (baru -> lama) sebelum menyerah,
 *   - bentuk respons dibaca secara toleran,
 *   - UI selalu menyediakan tautan cadangan ke halaman Saweria resmi.
 *
 * Env:
 *   SAWERIA_USERNAME  username Saweria penerima (wajib untuk mengaktifkan fitur)
 *   SAWERIA_USER_ID   opsional; lewati pencarian ID otomatis (SANGAT disarankan,
 *                     karena halaman publik Saweria sering memblokir server)
 */

const BASE_URL = process.env.SAWERIA_BASE_URL?.trim() || "https://saweria.co";
const BACKEND_URL = process.env.SAWERIA_BACKEND_URL?.trim() || "https://backend.saweria.co";
const TIMEOUT_MS = 15_000;

// Saweria (di belakang Cloudflare) sering menolak User-Agent non-browser dari IP datacenter.
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export const MIN_AMOUNT = 1000;
export const MAX_AMOUNT = 5_000_000;
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UUID_IN_TEXT = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

export class SaweriaError extends Error {
  kind: "not_configured" | "bad_request" | "upstream" | "not_found";
  constructor(kind: SaweriaError["kind"], message: string) {
    super(message);
    this.name = "SaweriaError";
    this.kind = kind;
  }
}

export interface DonateConfig {
  configured: boolean;
  /** Halaman donasi Saweria resmi — dipakai sebagai cadangan di UI. */
  pageUrl: string | null;
}

function username(): string | null {
  const u = process.env.SAWERIA_USERNAME?.trim().replace(/^@/, "");
  // Tolak karakter aneh (mencegah path injection).
  return u && /^[A-Za-z0-9_.-]{2,40}$/.test(u) ? u : null;
}

export function getDonateConfig(): DonateConfig {
  const u = username();
  return { configured: !!u, pageUrl: u ? `${BASE_URL}/${u}` : null };
}

function jsonHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return {
    "User-Agent": BROWSER_UA,
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "id-ID,id;q=0.9,en;q=0.8",
    Origin: BASE_URL,
    Referer: `${BASE_URL}/`,
    ...extra,
  };
}

async function timedFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal, cache: "no-store" });
  } catch {
    throw new SaweriaError("upstream", "Tidak bisa terhubung ke Saweria.");
  } finally {
    clearTimeout(timer);
  }
}

/* ------------------------------------------------------------------ */
/* ID akun penerima                                                    */
/* ------------------------------------------------------------------ */

let cachedUserId: { username: string; id: string } | null = null;

/** Cari UUID akun dari berbagai bentuk JSON (data.id / id / data.user.id). */
function idFromJson(json: unknown): string | null {
  const j = json as { id?: unknown; data?: { id?: unknown; user?: { id?: unknown } } } | null;
  for (const c of [j?.data?.id, j?.data?.user?.id, j?.id]) {
    if (typeof c === "string" && UUID_RE.test(c)) return c;
  }
  return null;
}

/** ID internal akun Saweria penerima. Dari env, atau dibaca dari Saweria. */
async function resolveUserId(): Promise<string> {
  const u = username();
  if (!u) throw new SaweriaError("not_configured", "SAWERIA_USERNAME belum diatur.");

  const fromEnv = process.env.SAWERIA_USER_ID?.trim();
  if (fromEnv) {
    if (!UUID_RE.test(fromEnv)) throw new SaweriaError("not_configured", "SAWERIA_USER_ID bukan UUID yang valid.");
    return fromEnv;
  }
  if (cachedUserId?.username === u) return cachedUserId.id;

  let id: string | null = null;
  let notFound = false;

  // 1) Endpoint JSON backend (lebih ringan & stabil dibanding scraping HTML).
  try {
    const res = await timedFetch(`${BACKEND_URL}/users/${encodeURIComponent(u)}`, { headers: jsonHeaders() });
    if (res.ok) id = idFromJson(await res.json().catch(() => null));
    else if (res.status === 404) notFound = true;
  } catch {
    /* lanjut ke cara berikutnya */
  }

  // 2) Baca halaman publik: __NEXT_DATA__, lalu pola "id":"<uuid>" sebagai cadangan.
  if (!id) {
    const res = await timedFetch(`${BASE_URL}/${encodeURIComponent(u)}`, {
      headers: { "User-Agent": BROWSER_UA, Accept: "text/html,application/xhtml+xml", "Accept-Language": "id-ID,id;q=0.9" },
    });
    if (res.status === 404) throw new SaweriaError("not_found", `Username Saweria "${u}" tidak ditemukan.`);
    if (!res.ok) {
      if (notFound) throw new SaweriaError("not_found", `Username Saweria "${u}" tidak ditemukan.`);
      console.error(`[saweria] halaman publik membalas ${res.status}; isi SAWERIA_USER_ID secara manual.`);
      throw new SaweriaError("upstream", `Halaman Saweria membalas ${res.status}.`);
    }
    const html = await res.text();
    const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (m) {
      try {
        id = idFromJson(JSON.parse(m[1])?.props?.pageProps);
      } catch {
        id = null;
      }
    }
    if (!id) {
      const loose = html.match(new RegExp(`"(?:user_?id|id)"\\s*:\\s*"(${UUID_IN_TEXT.source})"`, "i"));
      if (loose) id = loose[1];
    }
  }

  if (!id) {
    console.error("[saweria] gagal membaca user id; isi SAWERIA_USER_ID secara manual.");
    throw new SaweriaError("upstream", "Tidak bisa membaca data akun Saweria.");
  }
  cachedUserId = { username: u, id };
  return id;
}

/* ------------------------------------------------------------------ */
/* Buat donasi (QRIS)                                                  */
/* ------------------------------------------------------------------ */

export interface CreatedDonation {
  id: string;
  qrString: string;
  amount: number;
  /** Total yang dibayar donatur (sudah termasuk biaya, bila Saweria menambahkannya). */
  totalPaid: number;
  invoiceUrl: string;
}

type RawDonation = Record<string, unknown> & { etc?: Record<string, unknown> };

function pickQr(d: RawDonation): string | null {
  for (const c of [d.qr_string, d.qrString, d.qr, d.etc?.qr_string]) {
    // Payload QRIS (EMV) selalu diawali "000201".
    if (typeof c === "string" && c.startsWith("000201")) return c;
  }
  return null;
}

export async function createDonation(input: {
  amount: number;
  name: string;
  email: string;
  message: string;
}): Promise<CreatedDonation> {
  const userId = await resolveUserId();
  const body = JSON.stringify({
    agree: true,
    amount: input.amount,
    currency: "IDR",
    customer_info: { first_name: input.name, email: input.email, phone: "" },
    message: input.message,
    notUnderage: true,
    payment_type: "qris",
    vote: "",
  });

  // Endpoint baru dulu, lalu yang lama.
  const endpoints = [`${BACKEND_URL}/donations/snap/${userId}`, `${BACKEND_URL}/donations/${userId}`];
  let lastStatus = 0;
  let raw: RawDonation | null = null;

  for (const url of endpoints) {
    const res = await timedFetch(url, {
      method: "POST",
      headers: jsonHeaders({ "Content-Type": "application/json" }),
      body,
    });
    lastStatus = res.status;

    if (res.ok) {
      const json = (await res.json().catch(() => null)) as { data?: RawDonation } | null;
      const d = json?.data;
      if (d && typeof d.id === "string" && UUID_RE.test(d.id) && pickQr(d)) {
        raw = d;
        break;
      }
      console.error("[saweria] respons create tidak sesuai harapan", JSON.stringify(json).slice(0, 300));
      continue;
    }

    const detail = await res.text().catch(() => "");
    console.error(`[saweria] create ${res.status} @ ${url.replace(userId, "<id>")}`, detail.slice(0, 300));
    if (res.status === 400 || res.status === 422) {
      throw new SaweriaError("bad_request", "Saweria menolak donasi ini. Periksa nominal dan data yang diisi.");
    }
    // 403/404/405/5xx: kemungkinan endpoint berubah atau diblokir -> coba endpoint berikutnya.
  }

  if (!raw) {
    throw new SaweriaError("upstream", `Saweria tidak mengembalikan QRIS yang valid (status ${lastStatus || "?"}).`);
  }

  const id = raw.id as string;
  return {
    id,
    qrString: pickQr(raw) as string,
    amount: input.amount,
    totalPaid: typeof raw.amount === "number" ? raw.amount : input.amount,
    invoiceUrl: `${BASE_URL}/qris/${id}`,
  };
}

/* ------------------------------------------------------------------ */
/* Status pembayaran                                                   */
/* ------------------------------------------------------------------ */

export type DonationState = "pending" | "paid" | "expired";

const PAID_WORDS = /^(success|settlement|settled|paid|capture|completed|complete|berhasil|sukses)$/i;
const DEAD_WORDS = /^(expire|expired|cancel|canceled|cancelled|deny|denied|failure|failed|gagal|kedaluwarsa)$/i;

/**
 * Saweria tidak punya status resmi. Urutan pembacaan:
 *   1. field status eksplisit (transaction_status / status / payment_status),
 *   2. qr_string kosong => transaksi selesai (perilaku lama endpoint ini),
 *   3. 404 di semua endpoint => transaksi sudah tidak ada (kedaluwarsa).
 * "paid" tetap hanya indikasi, bukan bukti akuntansi — untuk bukti pasti pakai
 * notifikasi/dashboard Saweria.
 */
export async function getDonationState(id: string): Promise<DonationState> {
  if (!UUID_RE.test(id)) throw new SaweriaError("bad_request", "ID transaksi tidak valid.");

  const endpoints = [`${BACKEND_URL}/donations/qris/snap/${id}`, `${BACKEND_URL}/donations/qris/${id}`];
  let allNotFound = true;
  let lastStatus = 0;

  for (const url of endpoints) {
    const res = await timedFetch(url, { headers: jsonHeaders() });
    lastStatus = res.status;
    if (res.status === 404) continue;
    allNotFound = false;
    if (!res.ok) continue;

    const json = (await res.json().catch(() => null)) as { data?: RawDonation } | null;
    const d = json?.data;
    if (!d) continue;

    for (const c of [d.transaction_status, d.status, d.payment_status]) {
      if (typeof c !== "string") continue;
      if (PAID_WORDS.test(c.trim())) return "paid";
      if (DEAD_WORDS.test(c.trim())) return "expired";
      if (/^pending$/i.test(c.trim())) return "pending";
    }
    const qr = d.qr_string ?? d.qrString;
    if (qr === "") return "paid";
    if (typeof qr === "string") return "pending";
  }

  if (allNotFound) return "expired";
  throw new SaweriaError("upstream", `Saweria membalas ${lastStatus || "?"}.`);
}
