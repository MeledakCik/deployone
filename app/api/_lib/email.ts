/**
 * Pengirim email lewat Resend (REST API, tanpa dependency tambahan).
 *
 * ENV:
 *   RESEND_API_KEY   wajib. Ambil di resend.com/api-keys — JANGAN ditaruh di kode / repo.
 *   EMAIL_FROM       opsional. Default: "Depup <info@depup.cloud>" (domain depup.cloud sudah verified di Resend).
 *   EMAIL_REPLY_TO   opsional. Alamat yang menerima balasan user. Default: depupdev@gmail.com.
 *
 * Supaya email lebih mungkin masuk Inbox / tab Promosi / Updates (bukan Spam):
 *  - dikirim dari domain yang sudah lolos SPF + DKIM + DMARC (sudah beres di Resend),
 *  - selalu ada versi teks polos + HTML sederhana (tanpa gambar besar, tanpa link pemendek URL),
 *  - email promosi membawa header List-Unsubscribe + List-Unsubscribe-Post (one-click),
 *    syarat Gmail/Yahoo untuk pengirim massal, dan link berhenti langganan di badan email,
 *  - email promosi hanya ke akun yang belum berhenti berlangganan,
 *  - email transaksional (balasan support) TIDAK memakai gaya promosi supaya jatuh ke Utama/Updates.
 * Tidak ada yang bisa MENJAMIN inbox — penempatan akhirnya ditentukan Gmail/Yahoo, tapi ini praktik terbaiknya.
 */
import crypto from "crypto";
import { db, must } from "@/app/api/_lib/supabase";
import { renderRich, renderSimple, type MailContent } from "@/lib/email-template";

const RESEND_URL = "https://api.resend.com";
const DEFAULT_FROM = "Depup <info@depup.cloud>";
const DEFAULT_REPLY_TO = "depupdev@gmail.com";

export function emailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY?.trim();
}

export function emailFrom(): string {
  return process.env.EMAIL_FROM?.trim() || DEFAULT_FROM;
}

function replyTo(): string {
  return process.env.EMAIL_REPLY_TO?.trim() || DEFAULT_REPLY_TO;
}

export function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "").trim().replace(/\/+$/, "") || "https://depup.cloud";
}

/* ---------- template (murni, dipakai juga untuk pratinjau di browser) ---------- */

export { escapeHtml, safeUrl } from "@/lib/email-template";
export type { MailContent, MailFeature } from "@/lib/email-template";

/* ---------- berhenti berlangganan (token bertanda tangan HMAC) ---------- */

function unsubSecret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) throw new Error("AUTH_SECRET belum di-set.");
  return `${s}:unsub-v1`;
}

export function unsubToken(email: string): string {
  return crypto.createHmac("sha256", unsubSecret()).update(email.trim().toLowerCase()).digest("base64url");
}

export function verifyUnsubToken(email: string, token: string): boolean {
  try {
    const a = Buffer.from(unsubToken(email));
    const b = Buffer.from(token);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function unsubUrl(email: string): string {
  return `${appUrl()}/api/unsubscribe?e=${encodeURIComponent(email.trim().toLowerCase())}&t=${unsubToken(email)}`;
}

export async function isUnsubscribed(email: string): Promise<boolean> {
  try {
    const res = await db()
      .from("email_unsubs")
      .select("email", { count: "exact", head: true })
      .eq("email", email.trim().toLowerCase());
    must(res as never, "cek unsubscribe");
    return (res.count ?? 0) > 0;
  } catch {
    return false;
  }
}

/** Sengaja TIDAK fail-open: kalau daftar unsubscribe gagal dibaca, kampanye harus berhenti (bukan mengirim ke yang sudah berhenti). */
export async function listUnsubscribed(): Promise<Set<string>> {
  const out = new Set<string>();
  for (let from = 0; ; from += 1000) {
    const res = await db().from("email_unsubs").select("email").order("email").range(from, from + 999);
    const rows = (must(res, "baca email_unsubs") ?? []) as { email: string }[];
    rows.forEach((r) => out.add(r.email));
    if (rows.length < 1000) break;
  }
  return out;
}

export async function setUnsubscribed(email: string, value: boolean): Promise<void> {
  const e = email.trim().toLowerCase();
  if (value) must(await db().from("email_unsubs").upsert({ email: e }, { onConflict: "email" }), "simpan unsubscribe");
  else must(await db().from("email_unsubs").delete().eq("email", e), "hapus unsubscribe");
}

/* ---------- pengiriman ---------- */

export interface OutgoingMail {
  to: string;
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
  replyTo?: string;
  /** Kunci idempotensi supaya retry tidak mengirim ganda. */
  idempotencyKey?: string;
}

export interface SendResult {
  ok: boolean;
  id?: string;
  error?: string;
}

function toPayload(m: OutgoingMail) {
  return {
    from: emailFrom(),
    to: [m.to],
    subject: m.subject,
    html: m.html,
    text: m.text,
    reply_to: m.replyTo ?? replyTo(),
    headers: m.headers,
  };
}

async function resendFetch(path: string, body: unknown, extraHeaders?: Record<string, string>): Promise<{ status: number; json: Record<string, unknown> | null }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15_000);
  try {
    const res = await fetch(`${RESEND_URL}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY!.trim()}`,
        "Content-Type": "application/json",
        ...extraHeaders,
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
      cache: "no-store",
    });
    const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    return { status: res.status, json };
  } finally {
    clearTimeout(timer);
  }
}

function explain(status: number, json: Record<string, unknown> | null): string {
  const msg = typeof json?.message === "string" ? json.message : "";
  if (status === 401 || status === 403) return "API key Resend ditolak (cek RESEND_API_KEY / izin 'Sending access').";
  if (status === 422) return msg || "Data email ditolak Resend (cek alamat From / penerima).";
  if (status === 429) return "Kena batas kecepatan/kuota Resend. Coba lagi nanti atau cek plan Resend.";
  return msg || `Resend membalas kode ${status}.`;
}

export async function sendMail(m: OutgoingMail): Promise<SendResult> {
  if (!emailConfigured()) return { ok: false, error: "RESEND_API_KEY belum diisi." };
  try {
    const { status, json } = await resendFetch("/emails", toPayload(m), m.idempotencyKey ? { "Idempotency-Key": m.idempotencyKey } : undefined);
    if (status >= 200 && status < 300 && typeof json?.id === "string") return { ok: true, id: json.id };
    console.error(`[email] resend membalas ${status}`);
    return { ok: false, error: explain(status, json) };
  } catch (e) {
    console.error("[email] gagal kirim", (e as Error)?.name);
    return { ok: false, error: "Tidak bisa menghubungi Resend." };
  }
}

/** Kirim sampai 100 email per panggilan (endpoint batch Resend). Hasil berurutan sama dengan input. */
export async function sendBatch(list: OutgoingMail[], idempotencyKey?: string): Promise<SendResult[]> {
  if (!emailConfigured()) return list.map(() => ({ ok: false, error: "RESEND_API_KEY belum diisi." }));
  if (list.length === 0) return [];
  try {
    const { status, json } = await resendFetch("/emails/batch", list.slice(0, 100).map(toPayload), idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined);
    if (status >= 200 && status < 300 && Array.isArray(json?.data)) {
      return list.map((_, i) => {
        const id = (json!.data as { id?: string }[])[i]?.id;
        return id ? { ok: true, id } : { ok: false, error: "Tidak ada ID dari Resend." };
      });
    }
    console.error(`[email] batch resend membalas ${status}`);
    const error = explain(status, json);
    return list.map(() => ({ ok: false, error }));
  } catch (e) {
    console.error("[email] batch gagal", (e as Error)?.name);
    return list.map(() => ({ ok: false, error: "Tidak bisa menghubungi Resend." }));
  }
}

/* ---------- helper tingkat tinggi ---------- */

/** Email promosi: header unsubscribe one-click + footer berhenti langganan. */
export function buildPromoMail(to: string, subject: string, content: MailContent): OutgoingMail {
  const link = unsubUrl(to);
  const { html, text } = renderRich(content, {
    footerNote: "Kamu menerima email ini karena punya akun di Depup.",
    unsubUrl: link,
    siteUrl: appUrl(),
  });
  return {
    to,
    subject,
    html,
    text,
    headers: {
      "List-Unsubscribe": `<${link}>, <mailto:${replyTo()}?subject=unsubscribe>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  };
}

/** Email transaksional (balasan support, notifikasi admin): tanpa gaya promosi, tidak bisa di-unsubscribe. */
export function buildTransactionalMail(to: string, subject: string, content: MailContent, replyToAddr?: string): OutgoingMail {
  const { html, text } = renderSimple(content, { footerNote: "Email ini dikirim otomatis oleh Depup (depup.cloud) terkait akun/laporanmu." });
  return { to, subject, html, text, replyTo: replyToAddr };
}
