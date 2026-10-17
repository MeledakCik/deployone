#!/usr/bin/env node
/**
 * Salin data lama dari Redis (Vercel KV / Upstash) ke Supabase. AMAN dijalankan berulang:
 * baris yang sudah ada di Supabase tidak ditimpa.
 *
 *   node --env-file=.env scripts/migrate-redis-to-supabase.mjs            # salin saja
 *   node --env-file=.env scripts/migrate-redis-to-supabase.mjs --dry      # hitung saja, tidak menulis
 *   node --env-file=.env scripts/migrate-redis-to-supabase.mjs --delete-old   # salin, lalu hapus key Redis yang SUDAH tersalin
 *
 * Butuh: KV_REST_API_URL, KV_REST_API_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 * Jalankan supabase/schema.sql dulu. Perlu Node 20.6+ untuk --env-file.
 */
import { createClient as createKv } from "@vercel/kv";
import { createClient } from "@supabase/supabase-js";

const DRY = process.argv.includes("--dry");
const DELETE_OLD = process.argv.includes("--delete-old") && !DRY;

const need = ["KV_REST_API_URL", "KV_REST_API_TOKEN", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
const missing = need.filter((k) => !process.env[k]?.trim());
if (missing.length) {
  console.error("Env belum lengkap:", missing.join(", "));
  process.exit(1);
}

const kv = createKv({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN });
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const parse = (v) => {
  if (typeof v === "string") {
    try { return JSON.parse(v); } catch { return null; }
  }
  return v && typeof v === "object" ? v : null;
};

async function scan(match) {
  const out = new Set();
  let cursor = 0;
  do {
    const [next, keys] = await kv.scan(cursor, { match, count: 500 });
    keys.forEach((k) => out.add(k));
    cursor = Number(next);
  } while (cursor !== 0);
  return [...out];
}

async function mget(keys, size = 50) {
  const rows = [];
  for (let i = 0; i < keys.length; i += size) rows.push(...(await kv.mget(...keys.slice(i, i + size))));
  return rows;
}

async function upsert(table, rows, onConflict) {
  if (!rows.length || DRY) return;
  for (let i = 0; i < rows.length; i += 200) {
    // ignoreDuplicates: baris yang sudah ada di Supabase (mis. hasil migrasi malas / data lebih baru) TIDAK ditimpa.
    const { error } = await sb.from(table).upsert(rows.slice(i, i + 200), { onConflict, ignoreDuplicates: true });
    if (error) throw new Error(`${table}: ${error.message}`);
  }
}

const done = []; // key Redis yang sudah aman tersalin
const report = (name, n, extra = "") => console.log(`${DRY ? "[dry] " : ""}${name}: ${n}${extra ? ` (${extra})` : ""}`);

// 1. Data dashboard user
{
  const keys = await scan("user:*");
  const rows = await mget(keys);
  const out = [];
  let skipped = 0;
  keys.forEach((k, i) => {
    const d = parse(rows[i]);
    if (!d) return;
    // Hanya salin field terenkripsi apa adanya. Data lama yang masih plaintext TIDAK ditulis mentah ke Supabase —
    // biarkan ter-migrasi (dan dienkripsi) otomatis saat user itu membuka dashboard (lihat store.ts).
    if ((d.envVars && typeof d.envVars !== "string") || (d.settingsTokens && typeof d.settingsTokens !== "string")) {
      skipped++;
      return;
    }
    out.push({
      email: k.slice("user:".length),
      history: Array.isArray(d.history) ? d.history : [],
      domains: Array.isArray(d.domains) ? d.domains : [],
      env_vars: d.envVars ?? null,
      settings_tokens: d.settingsTokens ?? null,
    });
    done.push(k);
  });
  await upsert("user_data", out, "email");
  report("user_data", out.length, skipped ? `${skipped} akun plaintext lama dilewati → ter-migrasi saat login berikutnya` : "");
}

// 2. Direktori user
{
  const keys = await scan("admin:user:*");
  const rows = (await mget(keys)).map(parse);
  const out = [];
  rows.forEach((r, i) => {
    if (!r?.email) return;
    out.push({ email: r.email, name: r.name ?? "", picture: r.picture ?? null, first_seen: r.first ?? Date.now(), last_seen: r.last ?? Date.now(), logins: r.logins ?? 0 });
    done.push(keys[i]);
  });
  await upsert("app_users", out, "email");
  report("app_users", out.length);
  if (!DRY) done.push("admin:users");
}

// 3. Pengaturan admin
{
  const v = parse(await kv.get("admin:settings"));
  if (v) {
    await upsert("admin_settings", [{ key: "admin:settings", value: v }], "key");
    done.push("admin:settings");
  }
  report("admin_settings", v ? 1 : 0);
}

// 4. Audit (insert; dilewati kalau tabel sudah berisi supaya tidak dobel)
{
  const raw = (await kv.lrange("admin:audit", 0, 299)) ?? [];
  const entries = raw.map(parse).filter(Boolean).reverse();
  const { count } = await sb.from("audit_log").select("id", { count: "exact", head: true });
  if (!DRY && entries.length && !count) {
    const { error } = await sb.from("audit_log").insert(entries.map((e) => ({ at: e.at, by: e.by, action: e.action, detail: e.detail ?? "" })));
    if (error) throw new Error(`audit_log: ${error.message}`);
    done.push("admin:audit");
  }
  report("audit_log", entries.length, count ? "dilewati, tabel sudah berisi" : "");
}

// 5. Laporan abuse
{
  const ids = (await kv.lrange("abuse:reports", 0, 199)) ?? [];
  const rows = (await mget(ids.map((id) => `abuse:report:${id}`))).map(parse);
  const out = [];
  rows.forEach((r, i) => {
    if (!r?.id) return;
    out.push({
      id: r.id, slug: r.slug, kind: r.kind, owner: r.owner ?? null, reason: r.reason, contact: r.contact ?? null,
      created_at: r.createdAt, status: r.status ?? "open", resolved_at: r.resolvedAt ?? null, resolved_by: r.resolvedBy ?? null, note: r.note ?? null,
    });
    done.push(`abuse:report:${ids[i]}`);
  });
  await upsert("abuse_reports", out, "id");
  report("abuse_reports", out.length);
  if (!DRY) done.push("abuse:reports");
}

// 6. Laporan bantuan
{
  const ids = (await kv.lrange("support:reports", 0, 499)) ?? [];
  const rows = (await mget(ids.map((id) => `support:report:${id}`))).map(parse);
  const out = [];
  rows.forEach((r, i) => {
    if (!r?.id) return;
    out.push({
      id: r.id, email: r.email, created_at: r.createdAt, source: r.source, view: r.view ?? null, summary: r.summary,
      transcript: r.transcript ?? [], diagnostics: r.diagnostics ?? null, status: r.status ?? "open", replies: r.replies ?? [],
    });
    done.push(`support:report:${ids[i]}`);
  });
  await upsert("support_reports", out, "id");
  report("support_reports", out.length);
  if (!DRY) done.push("support:reports");
}

// 7. Kampanye email
{
  const ids = (await kv.lrange("promo:campaigns", 0, 99)) ?? [];
  const rows = (await mget(ids.map((id) => `promo:campaign:${id}`))).map(parse);
  const out = [];
  rows.forEach((c, i) => {
    if (!c?.id) return;
    out.push({
      id: c.id, created_at: c.createdAt, by: c.by, subject: c.subject, body: c.body, preheader: c.preheader ?? "",
      cta_label: c.ctaLabel ?? "", cta_url: c.ctaUrl ?? "", status: c.status, total: c.total ?? 0, sent: c.sent ?? 0,
      failed: c.failed ?? 0, last_error: c.lastError ?? null,
    });
    done.push(`promo:campaign:${ids[i]}`);
  });
  await upsert("campaigns", out, "id");
  report("campaigns", out.length);
  if (!DRY) done.push("promo:campaigns");
}

// 8. Unsubscribe
{
  const emails = (await kv.smembers("email:unsub")) ?? [];
  await upsert("email_unsubs", emails.map((email) => ({ email })), "email");
  report("email_unsubs", emails.length);
  if (!DRY && emails.length) done.push("email:unsub");
}

// 9. Statistik harian
{
  const keys = await scan("admin:daily:*");
  const out = [];
  for (const k of keys) {
    const h = (await kv.hgetall(k)) ?? {};
    for (const [field, count] of Object.entries(h)) out.push({ day: k.slice("admin:daily:".length), field, count: Number(count) || 0 });
    done.push(k);
  }
  await upsert("daily_stats", out, "day,field");
  report("daily_stats", out.length);
}

if (DELETE_OLD && done.length) {
  for (let i = 0; i < done.length; i += 100) await kv.del(...done.slice(i, i + 100));
  console.log(`Dihapus dari Redis: ${done.length} key.`);
} else if (!DRY) {
  console.log("Key Redis lama tidak dihapus. Setelah yakin semuanya beres, jalankan lagi dengan --delete-old untuk melepas memori Redis.");
}
