/**
 * Penyimpanan laporan masalah dari chat bantuan.
 *
 * - Disimpan di Vercel KV: `support:report:<id>` (90 hari) + daftar id terbaru di `support:reports`.
 * - Notifikasi ke developer: Telegram (env TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID) dan/atau webhook
 *   Discord/Slack (env SUPPORT_WEBHOOK_URL). Semuanya opsional.
 * - Developer membaca lewat GET /api/support/report (hanya email di env ADMIN_EMAILS).
 *
 * Semua operasi KV/webhook bersifat best-effort: gagal → dicatat di log, tidak membuat chat error.
 */
import { kv } from "@vercel/kv";
import type { DiagnosticsResult } from "@/app/api/_lib/support-diagnostics";

export interface SupportReport {
  id: string;
  email: string;
  createdAt: string;
  source: "auto" | "user";
  view: string | null;
  summary: string;
  transcript: { role: "user" | "assistant"; content: string }[];
  diagnostics: DiagnosticsResult | null;
}

const REPORT_TTL_SECONDS = 60 * 60 * 24 * 90;
const LIST_KEY = "support:reports";
const LIST_MAX = 500;

function newId(): string {
  return `SR-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.trim().toLowerCase());
}

function reportText(r: SupportReport): string {
  const problems = (r.diagnostics?.checks ?? []).filter((c) => c.status === "problem" || c.status === "warn");
  return [
    `🆘 Laporan bantuan Depup ${r.id} (${r.source === "auto" ? "otomatis" : "dari user"})`,
    `Akun: ${r.email}`,
    `Halaman: ${r.view ?? "-"}`,
    `Ringkasan: ${r.summary}`,
    problems.length
      ? `Temuan:\n${problems.map((c) => `• ${c.label} — ${c.detail}`).join("\n")}`
      : "Temuan: tidak ada anomali terdeteksi",
  ]
    .join("\n")
    .slice(0, 3800); // batas pesan Telegram 4096
}

async function postJson(url: string, body: unknown, ms = 5000): Promise<number> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
      cache: "no-store",
    });
    return res.status;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Kirim teks ke Telegram. URL memuat token bot, jadi URL/error mentah TIDAK PERNAH dicatat di log —
 * hanya kode status. Mengembalikan keterangan singkat penyebab kegagalan (untuk log).
 */
async function sendTelegram(text: string): Promise<{ ok: boolean; note: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  if (!token || !chatId) return { ok: false, note: "TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID belum diisi." };
  try {
    const status = await postJson(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    });
    if (status === 200) return { ok: true, note: "Terkirim ke Telegram." };
    console.error(`[support-report] telegram membalas ${status}`);
    if (status === 401 || status === 404) return { ok: false, note: "Token bot ditolak Telegram (cek TELEGRAM_BOT_TOKEN)." };
    if (status === 400) return { ok: false, note: "Chat ID salah, atau kamu belum menekan Start / mengirim pesan ke bot." };
    if (status === 403) return { ok: false, note: "Bot diblokir atau dikeluarkan dari chat tujuan." };
    return { ok: false, note: `Telegram membalas kode ${status}.` };
  } catch (e) {
    console.error("[support-report] telegram gagal", (e as Error)?.name);
    return { ok: false, note: "Tidak bisa menghubungi Telegram." };
  }
}

async function sendWebhook(text: string): Promise<void> {
  const url = process.env.SUPPORT_WEBHOOK_URL?.trim();
  if (!url || !/^https:\/\//i.test(url)) return;
  try {
    // `content` dibaca Discord, `text` dibaca Slack — kirim keduanya supaya satu env cukup untuk keduanya.
    const status = await postJson(url, { content: text, text });
    if (status >= 400) console.error(`[support-report] webhook membalas ${status}`);
  } catch (e) {
    console.error("[support-report] webhook gagal", (e as Error)?.name);
  }
}

async function notifyDeveloper(r: SupportReport): Promise<void> {
  const text = reportText(r);
  await Promise.all([sendTelegram(text), sendWebhook(text)]);
}

/**
 * Simpan laporan. Untuk source "auto", dibatasi 1 laporan per akun per 30 menit supaya
 * satu masalah yang sama tidak membanjiri developer — mengembalikan null kalau ditahan.
 */
export async function fileSupportReport(
  input: Omit<SupportReport, "id" | "createdAt">
): Promise<string | null> {
  try {
    if (input.source === "auto") {
      const fresh = await kv.set(`support:autodedupe:${input.email}`, 1, { nx: true, ex: 1800 });
      if (!fresh) return null;
    }
    const report: SupportReport = { ...input, id: newId(), createdAt: new Date().toISOString() };
    await kv.set(`support:report:${report.id}`, report, { ex: REPORT_TTL_SECONDS });
    await kv.lpush(LIST_KEY, report.id);
    await kv.ltrim(LIST_KEY, 0, LIST_MAX - 1);
    // Ditunggu (maks. ±5 detik) — fungsi serverless bisa dihentikan begitu respons dikirim,
    // sehingga notifikasi yang tidak ditunggu berisiko tidak pernah terkirim.
    await notifyDeveloper(report);
    return report.id;
  } catch (e) {
    console.error("[support-report] gagal menyimpan", (e as Error)?.message);
    return null;
  }
}

export async function listSupportReports(limit: number): Promise<SupportReport[]> {
  const ids = (await kv.lrange<string>(LIST_KEY, 0, Math.max(0, Math.min(limit, 100) - 1))) ?? [];
  const items = await Promise.all(ids.map((id) => kv.get<SupportReport>(`support:report:${id}`)));
  return items.filter((x): x is SupportReport => !!x);
}
