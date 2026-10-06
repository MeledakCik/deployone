/**
 * Integrasi donasi Saweria.
 *
 * PENTING: Saweria TIDAK punya API publik resmi. Modul ini memakai endpoint
 * backend yang sama dengan halaman donasi publik saweria.co (cara yang dipakai
 * library komunitas seperti qris-saweria). Tidak butuh login/password akun
 * Saweria. Endpoint ini bisa berubah sewaktu-waktu tanpa pemberitahuan, jadi UI
 * selalu menyediakan tautan cadangan ke halaman Saweria resmi.
 *
 * Env:
 *   SAWERIA_USERNAME  username Saweria penerima (wajib untuk mengaktifkan fitur)
 *   SAWERIA_USER_ID   opsional; lewati pencarian ID otomatis (lebih stabil)
 */

const BASE_URL = process.env.SAWERIA_BASE_URL?.trim() || "https://saweria.co";
const BACKEND_URL = process.env.SAWERIA_BACKEND_URL?.trim() || "https://backend.saweria.co";
const TIMEOUT_MS = 15_000;

export const MIN_AMOUNT = 1000;
export const MAX_AMOUNT = 5_000_000;
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  // Username Saweria hanya huruf/angka/underscore; tolak yang aneh (mencegah path injection).
  return u && /^[A-Za-z0-9_.-]{2,40}$/.test(u) ? u : null;
}

export function getDonateConfig(): DonateConfig {
  const u = username();
  return { configured: !!u, pageUrl: u ? `${BASE_URL}/${u}` : null };
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

let cachedUserId: { username: string; id: string } | null = null;

/** ID internal akun Saweria penerima. Dari env, atau dibaca dari halaman publiknya. */
async function resolveUserId(): Promise<string> {
  const u = username();
  if (!u) throw new SaweriaError("not_configured", "SAWERIA_USERNAME belum di-set.");

  const fromEnv = process.env.SAWERIA_USER_ID?.trim();
  if (fromEnv) {
    if (!UUID_RE.test(fromEnv)) throw new SaweriaError("not_configured", "SAWERIA_USER_ID bukan UUID yang valid.");
    return fromEnv;
  }
  if (cachedUserId?.username === u) return cachedUserId.id;

  const res = await timedFetch(`${BASE_URL}/${u}`, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; Depup/1.0)", Accept: "text/html" },
  });
  if (res.status === 404) throw new SaweriaError("not_found", `Username Saweria "${u}" tidak ditemukan.`);
  if (!res.ok) throw new SaweriaError("upstream", `Halaman Saweria membalas ${res.status}.`);

  const html = await res.text();
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  let id: unknown;
  try {
    id = m ? JSON.parse(m[1])?.props?.pageProps?.data?.id : undefined;
  } catch {
    id = undefined;
  }
  if (typeof id !== "string" || !UUID_RE.test(id)) {
    console.error("[saweria] gagal membaca user id dari halaman publik; isi SAWERIA_USER_ID secara manual.");
    throw new SaweriaError("upstream", "Tidak bisa membaca data akun Saweria.");
  }
  cachedUserId = { username: u, id };
  return id;
}

export interface CreatedDonation {
  id: string;
  qrString: string;
  amount: number;
  /** Total yang dibayar donatur (sudah termasuk biaya, bila Saweria menambahkannya). */
  totalPaid: number;
  invoiceUrl: string;
}

export async function createDonation(input: {
  amount: number;
  name: string;
  email: string;
  message: string;
}): Promise<CreatedDonation> {
  const userId = await resolveUserId();
  const res = await timedFetch(`${BACKEND_URL}/donations/${userId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE_URL, "User-Agent": "Mozilla/5.0 (compatible; Depup/1.0)" },
    body: JSON.stringify({
      agree: true,
      amount: input.amount,
      currency: "IDR",
      customer_info: { first_name: input.name, email: input.email, phone: "" },
      message: input.message,
      notUnderage: true,
      payment_type: "qris",
      vote: "",
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error(`[saweria] create ${res.status}`, detail.slice(0, 300));
    if (res.status === 400 || res.status === 422) {
      throw new SaweriaError("bad_request", "Saweria menolak donasi ini. Periksa nominal dan data yang diisi.");
    }
    throw new SaweriaError("upstream", `Saweria membalas ${res.status}.`);
  }

  const json = (await res.json().catch(() => null)) as {
    data?: { id?: string; qr_string?: string; amount?: number; amount_raw?: number; etc?: { amount_to_display?: number } };
  } | null;
  const d = json?.data;
  if (!d?.id || !UUID_RE.test(d.id) || !d.qr_string) {
    console.error("[saweria] respons create tidak sesuai harapan", JSON.stringify(json).slice(0, 300));
    throw new SaweriaError("upstream", "Respons Saweria tidak dikenali.");
  }
  return {
    id: d.id,
    qrString: d.qr_string,
    amount: input.amount,
    totalPaid: typeof d.amount === "number" ? d.amount : input.amount,
    invoiceUrl: `${BASE_URL}/qris/${d.id}`,
  };
}

export type DonationState = "pending" | "paid" | "expired";

/**
 * Saweria mengosongkan qr_string setelah transaksi selesai; 404 berarti
 * transaksi sudah tidak ada (kedaluwarsa). Ini perilaku endpoint tidak resmi,
 * jadi "paid" sebaiknya dianggap sebagai indikasi, bukan bukti akuntansi.
 * Untuk bukti pasti, pakai notifikasi webhook/dashboard Saweria.
 */
export async function getDonationState(id: string): Promise<DonationState> {
  if (!UUID_RE.test(id)) throw new SaweriaError("bad_request", "ID transaksi tidak valid.");
  const res = await timedFetch(`${BACKEND_URL}/donations/qris/${id}`, {
    headers: { Origin: BASE_URL, "User-Agent": "Mozilla/5.0 (compatible; Depup/1.0)" },
  });
  if (res.status === 404) return "expired";
  if (!res.ok) throw new SaweriaError("upstream", `Saweria membalas ${res.status}.`);
  const json = (await res.json().catch(() => null)) as { data?: { qr_string?: string } } | null;
  if (!json?.data) throw new SaweriaError("upstream", "Respons status tidak dikenali.");
  return json.data.qr_string === "" ? "paid" : "pending";
}
