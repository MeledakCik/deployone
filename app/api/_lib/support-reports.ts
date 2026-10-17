/**
 * Penyimpanan laporan masalah dari chat bantuan.
 *
 * - Disimpan di Supabase (tabel `support_reports`). Dedupe laporan otomatis tetap di Redis (TTL 30 menit).
 * - Notifikasi ke developer: Telegram (env TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID) dan/atau webhook
 *   Discord/Slack (env SUPPORT_WEBHOOK_URL). Semuanya opsional.
 * - Developer membaca lewat GET /api/support/report (hanya email di env ADMIN_EMAILS).
 *
 * Semua operasi database/webhook bersifat best-effort: gagal → dicatat di log, tidak membuat chat error.
 */
import { kv } from "@vercel/kv";
import { db, must } from "@/app/api/_lib/supabase";
import type { DiagnosticsResult } from "@/app/api/_lib/support-diagnostics";
import { adminEmails } from "@/app/api/_lib/admin-config";
import { appUrl, buildTransactionalMail, emailConfigured, sendMail } from "@/app/api/_lib/email";

export interface SupportReport {
  id: string;
  email: string;
  createdAt: string;
  source: "auto" | "user";
  view: string | null;
  summary: string;
  transcript: { role: "user" | "assistant"; content: string }[];
  diagnostics: DiagnosticsResult | null;
  /** Kosong = dianggap "open" (laporan lama sebelum fitur status ada). */
  status?: "open" | "resolved";
  /** Balasan admin yang dikirim ke email user lewat Resend. */
  replies?: { at: number; by: string; text: string; emailed: boolean }[];
}

interface ReportRow {
  id: string; email: string; created_at: string; source: SupportReport["source"]; view: string | null;
  summary: string; transcript: SupportReport["transcript"]; diagnostics: DiagnosticsResult | null;
  status: "open" | "resolved"; replies: NonNullable<SupportReport["replies"]>;
}

const fromRow = (r: ReportRow): SupportReport => ({
  id: r.id, email: r.email, createdAt: r.created_at, source: r.source, view: r.view, summary: r.summary,
  transcript: r.transcript ?? [], diagnostics: r.diagnostics, status: r.status, replies: r.replies ?? [],
});

const toRow = (r: SupportReport): ReportRow => ({
  id: r.id, email: r.email, created_at: r.createdAt, source: r.source, view: r.view, summary: r.summary,
  transcript: r.transcript, diagnostics: r.diagnostics, status: r.status ?? "open", replies: r.replies ?? [],
});

function newId(): string {
  return `SR-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
}

/** Admin = depupdev@gmail.com + email di env ADMIN_EMAILS (lihat admin-config.ts). */
export { isAdminEmail } from "@/app/api/_lib/admin-config";

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
    if (status === 401 || status === 404) return { ok: false, note: "Token bot ditolak Telegram (periksa TELEGRAM_BOT_TOKEN)." };
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

/** Kirim teks bebas ke Telegram/webhook developer (best-effort, tidak pernah melempar error). */
export async function notifyText(text: string): Promise<void> {
  try {
    await Promise.all([sendTelegram(text.slice(0, 3800)), sendWebhook(text.slice(0, 3800))]);
  } catch (e) {
    console.error("[notify] gagal", (e as Error)?.name);
  }
}

/** Untuk tombol "Tes notifikasi" di panel admin: mengembalikan hasil per kanal. */
export async function testNotify(): Promise<{ telegram: { ok: boolean; note: string }; webhook: boolean }> {
  const text = "✅ Tes notifikasi dari panel admin Depup";
  const telegram = await sendTelegram(text);
  const url = process.env.SUPPORT_WEBHOOK_URL?.trim();
  const webhook = !!url && /^https:\/\//i.test(url);
  if (webhook) await sendWebhook(text);
  return { telegram, webhook };
}

/** Email pemberitahuan ke admin (transaksional). Best-effort, tidak pernah melempar error. */
async function sendAdminEmail(r: SupportReport): Promise<void> {
  if (!emailConfigured()) return;
  try {
    const problems = (r.diagnostics?.checks ?? []).filter((c) => c.status === "problem" || c.status === "warn");
    const body = [
      `Laporan bantuan baru ${r.id} (${r.source === "auto" ? "otomatis" : "dari pengguna"}).`,
      `Akun: ${r.email}\nHalaman: ${r.view ?? "-"}`,
      `Ringkasan:\n${r.summary}`,
      problems.length ? `Temuan:\n${problems.map((c) => `- ${c.label}: ${c.detail}`).join("\n")}` : "Tidak ada anomali terdeteksi.",
    ].join("\n\n");
    await Promise.all(
      adminEmails().map((to) =>
        sendMail(
          buildTransactionalMail(
            to,
            `Laporan bantuan baru ${r.id}`,
            { body, preheader: r.summary.slice(0, 120), cta: { label: "Buka panel admin", url: `${appUrl()}/admin#support` } },
            r.email // Reply di email ini langsung ke user yang melapor
          )
        )
      )
    );
  } catch (e) {
    console.error("[support-report] email admin gagal", (e as Error)?.name);
  }
}

async function notifyDeveloper(r: SupportReport): Promise<void> {
  const text = reportText(r);
  await Promise.all([sendTelegram(text), sendWebhook(text), sendAdminEmail(r)]);
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
    const report: SupportReport = { ...input, id: newId(), createdAt: new Date().toISOString(), status: "open", replies: [] };
    must(await db().from("support_reports").insert(toRow(report)), "simpan laporan bantuan");
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
  const res = await db()
    .from("support_reports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(Math.max(1, Math.min(limit, 100)));
  return ((must(res, "daftar laporan bantuan") ?? []) as ReportRow[]).map(fromRow);
}

export async function getSupportReport(id: string): Promise<SupportReport | null> {
  if (!/^SR-[A-Z0-9]{4,20}$/.test(id)) return null;
  const res = await db().from("support_reports").select("*").eq("id", id).maybeSingle<ReportRow>();
  const row = must(res, "baca laporan bantuan");
  return row ? fromRow(row) : null;
}

async function saveSupportReport(r: SupportReport): Promise<void> {
  const { status, replies } = toRow(r);
  must(await db().from("support_reports").update({ status, replies }).eq("id", r.id), "update laporan bantuan");
}

export async function setSupportStatus(id: string, status: "open" | "resolved"): Promise<SupportReport | null> {
  const r = await getSupportReport(id);
  if (!r) return null;
  r.status = status;
  await saveSupportReport(r);
  return r;
}

/** Balas user lewat email. Balasan disimpan di laporan; `emailed=false` kalau pengiriman gagal. */
export async function replyToSupportReport(
  id: string,
  admin: string,
  text: string,
  markResolved: boolean
): Promise<{ report: SupportReport; emailed: boolean; error?: string } | null> {
  const r = await getSupportReport(id);
  if (!r) return null;
  const quoted = r.summary.length > 160 ? `${r.summary.slice(0, 160)}…` : r.summary;
  const mail = buildTransactionalMail(
    r.email,
    `Balasan untuk laporanmu di Depup (${r.id})`,
    {
      body: `Halo,\n\n${text}\n\nTentang laporanmu: "${quoted}"\n\nKamu bisa membalas email ini kalau masih ada kendala.`,
      preheader: text.slice(0, 120),
      cta: { label: "Buka dashboard Depup", url: `${appUrl()}/dashboard` },
    },
    admin
  );
  const res = await sendMail(mail);
  r.replies = [...(r.replies ?? []), { at: Date.now(), by: admin, text, emailed: res.ok }].slice(-20);
  if (markResolved && res.ok) r.status = "resolved";
  await saveSupportReport(r);
  return { report: r, emailed: res.ok, error: res.ok ? undefined : res.error };
}
