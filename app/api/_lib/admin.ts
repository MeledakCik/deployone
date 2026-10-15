import { kv } from "@vercel/kv";
import type { NextRequest } from "next/server";
import { getSessionEmail } from "@/app/api/_lib/session";
import { isAdminEmail } from "@/app/api/_lib/admin-config";
import { parseKv } from "@/app/api/_lib/tunnel";

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

/** FAIL-OPEN: kalau KV bermasalah, pakai default (semua menyala) supaya situs tidak ikut mati. */
export async function getSettings(opts?: { fresh?: boolean }): Promise<AdminSettings> {
  const now = Date.now();
  if (!opts?.fresh && settingsCache && settingsCache.until > now) return settingsCache.value;
  try {
    const value = normalizeSettings(parseKv(await kv.get(SETTINGS_KEY)));
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
  await kv.set(SETTINGS_KEY, JSON.stringify(merged));
  settingsCache = { value: merged, until: Date.now() + SETTINGS_CACHE_MS };
  return merged;
}

/* ---------- log aktivitas admin ---------- */

const AUDIT_KEY = "admin:audit";

export interface AuditEntry {
  at: number;
  by: string;
  action: string;
  detail: string;
}

export async function audit(by: string, action: string, detail: string): Promise<void> {
  try {
    const entry: AuditEntry = { at: Date.now(), by, action, detail: detail.slice(0, 300) };
    await kv.lpush(AUDIT_KEY, JSON.stringify(entry));
    await kv.ltrim(AUDIT_KEY, 0, 299);
  } catch (e) {
    console.error("[admin] gagal mencatat audit", (e as Error)?.message);
  }
}

export async function listAudit(limit = 100): Promise<AuditEntry[]> {
  const raw = (await kv.lrange<unknown>(AUDIT_KEY, 0, Math.min(limit, 300) - 1)) ?? [];
  return raw.map((r) => parseKv<AuditEntry>(r)).filter((x): x is AuditEntry => !!x);
}

/* ---------- penghitung harian (untuk grafik) ---------- */

export type StatField = "signups" | "logins" | "abuse" | "sites" | "tunnels" | "takedowns";

export function dayKey(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10); // UTC
}

const kDaily = (day: string) => `admin:daily:${day}`;

/** Best-effort: gagal tidak boleh mengganggu aksi utama. */
export async function recordStat(field: StatField): Promise<void> {
  try {
    const key = kDaily(dayKey());
    const n = await kv.hincrby(key, field, 1);
    if (n === 1) await kv.expire(key, 60 * 60 * 24 * 100);
  } catch (e) {
    console.error("[admin] recordStat gagal", (e as Error)?.message);
  }
}

export async function readDaily(days: number): Promise<{ day: string; values: Record<StatField, number> }[]> {
  const list: string[] = [];
  for (let i = days - 1; i >= 0; i--) list.push(dayKey(new Date(Date.now() - i * 86_400_000)));
  const pipe = kv.pipeline();
  for (const d of list) pipe.hgetall(kDaily(d));
  const rows = (await pipe.exec()) as (Record<string, unknown> | null)[];
  return list.map((day, i) => {
    const r = rows[i] ?? {};
    const n = (k: string) => Number((r as Record<string, unknown>)[k]) || 0;
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

export const kUserRec = (email: string) => `admin:user:${email}`;
const USERS_ZSET = "admin:users";
const BLOCKED_SET = "admin:blocked";

/** Dipanggil saat login berhasil. Mengembalikan true kalau ini kali pertama kami melihat akun ini. */
export async function recordLogin(profile: { email: string; name: string; picture: string | null }): Promise<boolean> {
  const email = profile.email.trim().toLowerCase();
  const now = Date.now();
  const prev = parseKv<UserRecord>(await kv.get(kUserRec(email)));
  const rec: UserRecord = {
    email,
    name: profile.name,
    picture: profile.picture,
    first: prev?.first ?? now,
    last: now,
    logins: (prev?.logins ?? 0) + 1,
  };
  await kv.set(kUserRec(email), JSON.stringify(rec));
  await kv.zadd(USERS_ZSET, { score: now, member: email });
  await recordStat("logins");
  if (!prev) await recordStat("signups");
  return !prev;
}

/** Sudah punya data dashboard (akun lama sebelum panel admin ada)? */
export async function isKnownUser(email: string): Promise<boolean> {
  const e = email.trim().toLowerCase();
  const [a, b] = await Promise.all([kv.exists(kUserRec(e)), kv.exists(`user:${e}`)]);
  return a + b > 0;
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
