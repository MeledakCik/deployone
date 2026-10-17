import { kv } from "@vercel/kv";
import type { NextRequest } from "next/server";
import { getSessionEmail } from "@/app/api/_lib/session";
import { isAdminEmail } from "@/app/api/_lib/admin-config";
import { db, must } from "@/app/api/_lib/supabase";

export { isAdminEmail, adminEmails } from "@/app/api/_lib/admin-config";

/** Email admin dari session, atau null. Route admin menjawab 404 kalau null (tidak membocorkan keberadaannya). */
export function adminFromReq(req: NextRequest): string | null {
  const email = getSessionEmail(req);
  return email && isAdminEmail(email) ? email : null;
}

/* ---------- pengaturan runtime ---------- */

export interface Announcement {
  active: boolean;
  text: string;
  level: "info" | "warn" | "critical";
}

export interface AdminSettings {
  /** false = akun BARU tidak bisa mendaftar (yang sudah ada tetap bisa login). */
  signupOpen: boolean;
  /** false = Link Instan (upload situs statis) dimatikan. */
  sitesEnabled: boolean;
  /** false = Link Gaib (tunnel CLI) dimatikan. */
  tunnelEnabled: boolean;
  announcement: Announcement;
}

export const DEFAULT_SETTINGS: AdminSettings = {
  signupOpen: true,
  sitesEnabled: true,
  tunnelEnabled: true,
  announcement: { active: false, text: "", level: "info" },
};

const SETTINGS_KEY = "admin:settings";
const SETTINGS_CACHE_MS = 15_000;
let settingsCache: { value: AdminSettings; until: number } | null = null;

function normalizeSettings(raw: unknown): AdminSettings {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<AdminSettings>;
  const a = (r.announcement && typeof r.announcement === "object" ? r.announcement : {}) as Partial<Announcement>;
  return {
    signupOpen: r.signupOpen !== false,
    sitesEnabled: r.sitesEnabled !== false,
    tunnelEnabled: r.tunnelEnabled !== false,
    announcement: {
      active: a.active === true,
      text: typeof a.text === "string" ? a.text.slice(0, 300) : "",
      level: a.level === "warn" || a.level === "critical" ? a.level : "info",
    },
  };
}

/** FAIL-OPEN: kalau database bermasalah, pakai default (semua menyala) supaya situs tidak ikut mati. */
export async function getSettings(opts?: { fresh?: boolean }): Promise<AdminSettings> {
  const now = Date.now();
  if (!opts?.fresh && settingsCache && settingsCache.until > now) return settingsCache.value;
  try {
    const res = await db().from("admin_settings").select("value").eq("key", SETTINGS_KEY).maybeSingle<{ value: unknown }>();
    const value = normalizeSettings(must(res, "baca settings")?.value);
    settingsCache = { value, until: now + SETTINGS_CACHE_MS };
    return value;
  } catch (e) {
    console.error("[admin] gagal membaca settings", (e as Error)?.message);
    return settingsCache?.value ?? DEFAULT_SETTINGS;
  }
}

export async function saveSettings(patch: unknown): Promise<AdminSettings> {
  const current = await getSettings({ fresh: true });
  const p = (patch && typeof patch === "object" ? patch : {}) as Record<string, unknown>;
  const merged = normalizeSettings({
    ...current,
    ...(typeof p.signupOpen === "boolean" ? { signupOpen: p.signupOpen } : {}),
    ...(typeof p.sitesEnabled === "boolean" ? { sitesEnabled: p.sitesEnabled } : {}),
    ...(typeof p.tunnelEnabled === "boolean" ? { tunnelEnabled: p.tunnelEnabled } : {}),
    ...(p.announcement && typeof p.announcement === "object"
      ? { announcement: { ...current.announcement, ...(p.announcement as object) } }
      : {}),
  });
  must(await db().from("admin_settings").upsert({ key: SETTINGS_KEY, value: merged }, { onConflict: "key" }), "simpan settings");
  settingsCache = { value: merged, until: Date.now() + SETTINGS_CACHE_MS };
  return merged;
}

/* ---------- log aktivitas admin ---------- */

export interface AuditEntry {
  at: number;
  by: string;
  action: string;
  detail: string;
}

export async function audit(by: string, action: string, detail: string): Promise<void> {
  try {
    const entry: AuditEntry = { at: Date.now(), by, action, detail: detail.slice(0, 300) };
    must(await db().from("audit_log").insert(entry), "catat audit");
  } catch (e) {
    console.error("[admin] gagal mencatat audit", (e as Error)?.message);
  }
}

export async function listAudit(limit = 100): Promise<AuditEntry[]> {
  const res = await db()
    .from("audit_log")
    .select("at,by,action,detail")
    .order("at", { ascending: false })
    .limit(Math.min(limit, 300));
  return (must(res, "baca audit") ?? []) as AuditEntry[];
}

/* ---------- penghitung harian (untuk grafik) ---------- */

export type StatField = "signups" | "logins" | "abuse" | "sites" | "tunnels" | "takedowns";

export function dayKey(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10); // UTC
}

/** Best-effort: gagal tidak boleh mengganggu aksi utama. Atomic lewat fungsi SQL bump_stat. */
export async function recordStat(field: StatField): Promise<void> {
  try {
    must(await db().rpc("bump_stat", { p_day: dayKey(), p_field: field }), "recordStat");
  } catch (e) {
    console.error("[admin] recordStat gagal", (e as Error)?.message);
  }
}

export async function readDaily(days: number): Promise<{ day: string; values: Record<StatField, number> }[]> {
  const list: string[] = [];
  for (let i = days - 1; i >= 0; i--) list.push(dayKey(new Date(Date.now() - i * 86_400_000)));
  const res = await db().from("daily_stats").select("day,field,count").gte("day", list[0]);
  const rows = (must(res, "baca daily_stats") ?? []) as { day: string; field: string; count: number }[];
  const byDay = new Map<string, Record<string, number>>();
  for (const r of rows) {
    const m = byDay.get(r.day) ?? {};
    m[r.field] = Number(r.count) || 0;
    byDay.set(r.day, m);
  }
  return list.map((day) => {
    const r = byDay.get(day) ?? {};
    const n = (k: string) => r[k] || 0;
    return {
      day,
      values: {
        signups: n("signups"),
        logins: n("logins"),
        abuse: n("abuse"),
        sites: n("sites"),
        tunnels: n("tunnels"),
        takedowns: n("takedowns"),
      },
    };
  });
}

/* ---------- direktori pengguna & blokir ---------- */

export interface UserRecord {
  email: string;
  name: string;
  picture: string | null;
  first: number;
  last: number;
  logins: number;
}

const BLOCKED_SET = "admin:blocked";

/** Dipanggil saat login berhasil. Mengembalikan true kalau ini kali pertama kami melihat akun ini. */
export async function recordLogin(profile: { email: string; name: string; picture: string | null }): Promise<boolean> {
  const email = profile.email.trim().toLowerCase();
  const now = Date.now();
  const prevRes = await db()
    .from("app_users")
    .select("first_seen,logins")
    .eq("email", email)
    .maybeSingle<{ first_seen: number; logins: number }>();
  const prevRow = must(prevRes, "baca app_users");
  const prev = prevRow ? { first: Number(prevRow.first_seen), logins: prevRow.logins } : null;
  const rec: UserRecord = {
    email,
    name: profile.name,
    picture: profile.picture,
    first: prev?.first ?? now,
    last: now,
    logins: (prev?.logins ?? 0) + 1,
  };
  must(
    await db().from("app_users").upsert(
      { email, name: rec.name, picture: rec.picture, first_seen: rec.first, last_seen: rec.last, logins: rec.logins },
      { onConflict: "email" }
    ),
    "catat login"
  );
  await recordStat("logins");
  if (!prev) await recordStat("signups");
  return !prev;
}

/** Sudah punya data dashboard (akun lama sebelum panel admin ada)? */
export async function isKnownUser(email: string): Promise<boolean> {
  const e = email.trim().toLowerCase();
  const [a, b] = await Promise.all([
    db().from("app_users").select("email", { count: "exact", head: true }).eq("email", e),
    db().from("user_data").select("email", { count: "exact", head: true }).eq("email", e),
  ]);
  must(a as never, "cek app_users");
  must(b as never, "cek user_data");
  if ((a.count ?? 0) + (b.count ?? 0) > 0) return true;
  return (await kv.exists(`user:${e}`)) > 0; // akun lama yang belum dimigrasi dari Redis
}

export async function isBlocked(email: string): Promise<boolean> {
  try {
    return (await kv.sismember(BLOCKED_SET, email.trim().toLowerCase())) === 1;
  } catch {
    return false; // fail-open
  }
}

export async function listBlocked(): Promise<string[]> {
  return ((await kv.smembers(BLOCKED_SET)) as string[]) ?? [];
}

export async function setBlocked(email: string, blocked: boolean): Promise<void> {
  const e = email.trim().toLowerCase();
  if (blocked) await kv.sadd(BLOCKED_SET, e);
  else await kv.srem(BLOCKED_SET, e);
}

export const kLinkBan = (email: string) => `site:ban:${email}`;
export const LINK_BAN_SECONDS = 60 * 60 * 24 * 30;

/* ---------- util ---------- */

/** SCAN semua key yang cocok (dengan batas, supaya tidak berputar selamanya). */
export async function scanKeys(match: string, cap = 3000): Promise<string[]> {
  const out: string[] = [];
  let cursor: string | number = 0;
  let guard = 0;
  do {
    const res: [string | number, string[]] = (await kv.scan(cursor, { match, count: 300 })) as [string | number, string[]];
    cursor = res[0];
    out.push(...res[1]);
    guard++;
  } while (String(cursor) !== "0" && out.length < cap && guard < 200);
  return Array.from(new Set(out)).slice(0, cap);
}

export function validEmail(s: unknown): s is string {
  return typeof s === "string" && s.length <= 200 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}
