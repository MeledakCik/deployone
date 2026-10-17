import type { NextRequest } from "next/server";
import { kv } from "@vercel/kv";
import { fail, ok, withErrorHandling } from "@/app/api/_lib/response";
import { adminEmails, adminFromReq, audit, getSettings, saveSettings } from "@/app/api/_lib/admin";
import { testNotify } from "@/app/api/_lib/support-reports";
import { tunnelBaseDomain } from "@/app/api/_lib/tunnel";
import { MAX_ACTIVE_SITES_PER_USER, MAX_SITE_BYTES } from "@/app/api/_lib/sites";
import { db, supabaseConfigured } from "@/app/api/_lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 30;

const has = (name: string) => !!process.env[name]?.trim();

async function systemStatus() {
  let kvOk = false;
  let keys: number | null = null;
  try {
    keys = await kv.dbsize();
    kvOk = true;
  } catch {
    /* KV tidak terhubung */
  }
  let supabaseOk = false;
  if (supabaseConfigured()) {
    try {
      const { error } = await db().from("admin_settings").select("key", { head: true, count: "exact" });
      supabaseOk = !error;
    } catch {
      /* Supabase tidak terhubung */
    }
  }
  return {
    admins: adminEmails(),
    baseDomain: tunnelBaseDomain(),
    siteLimits: { maxMb: Math.round(MAX_SITE_BYTES / 1024 / 1024), perUser: MAX_ACTIVE_SITES_PER_USER },
    redis: { ok: kvOk, keys },
    supabase: { ok: supabaseOk },
    // Hanya true/false — nilai env TIDAK PERNAH dikirim ke browser.
    env: [
      { name: "GOOGLE_CLIENT_ID / SECRET", label: "Login Google", ok: has("GOOGLE_CLIENT_ID") && has("GOOGLE_CLIENT_SECRET") },
      { name: "AUTH_SECRET", label: "Kunci session & enkripsi", ok: (process.env.AUTH_SECRET?.length ?? 0) >= 16 },
      { name: "KV_REST_API_URL / TOKEN", label: "Database Redis (KV)", ok: has("KV_REST_API_URL") && has("KV_REST_API_TOKEN") },
      { name: "SUPABASE_URL / SERVICE_ROLE_KEY", label: "Database Supabase (data user & laporan)", ok: supabaseOk },
      { name: "TUNNEL_BASE_DOMAIN", label: "Subdomain Link Instan/Gaib", ok: has("TUNNEL_BASE_DOMAIN") },
      { name: "TELEGRAM_BOT_TOKEN / CHAT_ID", label: "Notifikasi Telegram", ok: has("TELEGRAM_BOT_TOKEN") && has("TELEGRAM_CHAT_ID") },
      { name: "RESEND_API_KEY", label: "Email (Resend)", ok: has("RESEND_API_KEY") },
      { name: "SUPPORT_WEBHOOK_URL", label: "Webhook Discord/Slack", ok: has("SUPPORT_WEBHOOK_URL") },
      { name: "GROQ_API_KEY", label: "Chat bantuan AI", ok: has("GROQ_API_KEY") },
      { name: "SAWERIA_USERNAME", label: "Donasi Saweria", ok: has("SAWERIA_USERNAME") },
      { name: "GITHUB_TOKEN", label: "Token GitHub (rate limit)", ok: has("GITHUB_TOKEN") },
    ],
  };
}

export const GET = withErrorHandling(async (req: NextRequest) => {
  if (!adminFromReq(req)) return fail("Tidak ditemukan.", 404, "not_found");
  const [settings, system] = await Promise.all([getSettings({ fresh: true }), systemStatus()]);
  return ok({ settings, system });
});

/** PUT — ubah pengaturan (sebagian boleh). */
export const PUT = withErrorHandling(async (req: NextRequest) => {
  const admin = adminFromReq(req);
  if (!admin) return fail("Tidak ditemukan.", 404, "not_found");
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Body harus berupa JSON.", 400, "bad_request");
  }
  const before = await getSettings({ fresh: true });
  const settings = await saveSettings(body);
  const changes: string[] = [];
  (["signupOpen", "sitesEnabled", "tunnelEnabled"] as const).forEach((k) => {
    if (before[k] !== settings[k]) changes.push(`${k}=${settings[k]}`);
  });
  if (JSON.stringify(before.announcement) !== JSON.stringify(settings.announcement)) {
    changes.push(`pengumuman ${settings.announcement.active ? "aktif" : "nonaktif"}`);
  }
  if (changes.length) await audit(admin, "settings.update", changes.join(", "));
  return ok({ settings });
});

/** POST { action: "test_notify" } — kirim pesan tes ke Telegram/webhook. */
export const POST = withErrorHandling(async (req: NextRequest) => {
  const admin = adminFromReq(req);
  if (!admin) return fail("Tidak ditemukan.", 404, "not_found");
  let body: { action?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    /* body kosong */
  }
  if (body.action !== "test_notify") return fail("Aksi tidak dikenal.", 400, "bad_request");
  const result = await testNotify();
  await audit(admin, "notify.test", `telegram=${result.telegram.ok}, webhook=${result.webhook}`);
  return ok(result);
});
