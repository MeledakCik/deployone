import { kv } from "@vercel/kv";
import { parseKv, tunnelBaseDomain, kBytes, type TunnelMeta } from "@/app/api/_lib/tunnel";
import { siteUrl, type SiteMeta } from "@/app/api/_lib/sites";
import { readDaily, scanKeys, type StatField } from "@/app/api/_lib/admin";
import { db, must } from "@/app/api/_lib/supabase";

/* ---------- link aktif (situs statis + tunnel) ---------- */

export interface LiveLink {
  slug: string;
  kind: "site" | "tunnel";
  owner: string | null;
  name: string;
  status: "active" | "pending";
  createdAt: number;
  expiresAt: number;
  bytes: number;
  files: number;
  url: string;
}

export function linkUrl(slug: string, kind: "site" | "tunnel", host?: string | null): string {
  if (kind === "site") return siteUrl(slug, host);
  const base = tunnelBaseDomain();
  if (base) return base === "localhost" ? `http://${slug}.${base}/` : `https://${slug}.${base}/`;
  return host ? `https://${host}/t/${slug}/` : `/t/${slug}/`;
}

async function mgetChunked<T>(keys: string[], size = 100): Promise<(T | null)[]> {
  const out: (T | null)[] = [];
  for (let i = 0; i < keys.length; i += size) {
    const part = keys.slice(i, i + size);
    const rows = await kv.mget<unknown[]>(...part);
    out.push(...rows.map((r) => parseKv<T>(r)));
  }
  return out;
}

export async function listLiveLinks(host?: string | null): Promise<LiveLink[]> {
  const now = Date.now();
  const [siteKeys, tunnelKeys] = await Promise.all([scanKeys("site:meta:*"), scanKeys("tunnel:meta:*")]);
  const [sites, tunnels] = await Promise.all([
    mgetChunked<SiteMeta>(siteKeys),
    mgetChunked<TunnelMeta>(tunnelKeys),
  ]);
  const tunnelSlugs = tunnelKeys.map((k) => k.slice("tunnel:meta:".length));
  const tunnelBytes = tunnelSlugs.length
    ? await mgetChunked<number>(tunnelSlugs.map((s) => kBytes(s)))
    : [];

  const out: LiveLink[] = [];
  for (const s of sites) {
    if (!s || typeof s.expiresAt !== "number" || s.expiresAt <= now || !s.id) continue;
    out.push({
      slug: s.id,
      kind: "site",
      owner: s.owner,
      name: s.name || "",
      status: s.status === "active" ? "active" : "pending",
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
      bytes: s.totalBytes ?? 0,
      files: Array.isArray(s.files) ? s.files.length : 0,
      url: linkUrl(s.id, "site", host),
    });
  }
  tunnels.forEach((t, i) => {
    if (!t || typeof t.expiresAt !== "number" || t.expiresAt <= now) return;
    const slug = tunnelSlugs[i];
    out.push({
      slug,
      kind: "tunnel",
      owner: null,
      name: `localhost:${t.port}`,
      status: "active",
      createdAt: t.createdAt,
      expiresAt: t.expiresAt,
      bytes: Number(tunnelBytes[i]) || 0,
      files: 0,
      url: linkUrl(slug, "tunnel", host),
    });
  });
  return out.sort((a, b) => b.createdAt - a.createdAt);
}

/* ---------- statistik (di-cache 5 menit) ---------- */

export interface UserSummary {
  email: string;
  deploys: number;
  lastDeploy: number;
  sites: number;
}

export interface AdminStats {
  generatedAt: number;
  totals: {
    users: number;
    deploys: number;
    activeSites: number;
    activeTunnels: number;
    linkBytes: number;
    blocked: number;
    abuseOpen: number;
    abuseTotal: number;
    redisKeys: number | null;
    /** Pemakaian memori Redis (byte) — null kalau penyedia tidak mengizinkan INFO. */
    redisBytes: number | null;
    /** Ukuran database Supabase (byte) — null kalau fungsi db_size_bytes belum dibuat (jalankan ulang schema.sql). */
    supabaseBytes: number | null;
    /** Batas paket (MB), bisa diubah lewat env REDIS_LIMIT_MB / SUPABASE_LIMIT_MB. */
    limits: { redisMb: number; supabaseMb: number };
  };
  days: string[];
  daily: Record<StatField, number[]>;
  deploysPerDay: Record<string, number[]>;
  deployPlatforms: Record<string, number>;
  deployStatuses: Record<string, number>;
  usersTruncated: boolean;
  users: UserSummary[];
}

const CACHE_KEY = "admin:stats:cache";
const CACHE_TTL = 300;
const MAX_USERS = 1500;
const DAYS = 30;

interface HistoryLike {
  id?: unknown;
  date?: unknown;
  platform?: unknown;
  status?: unknown;
}

function historyTime(h: HistoryLike): number {
  const n = Number(h.id);
  if (Number.isFinite(n) && n > 1e12 && n < 4e12) return n;
  const d = typeof h.date === "string" ? Date.parse(h.date) : NaN;
  return Number.isFinite(d) ? d : 0;
}

function limitMb(name: string, fallback: number): number {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** used_memory dari perintah INFO lewat REST (Upstash). Best-effort: gagal → null. */
async function redisUsedBytes(): Promise<number | null> {
  const url = process.env.KV_REST_API_URL?.trim();
  const token = process.env.KV_REST_API_TOKEN?.trim();
  if (!url || !token) return null;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(["INFO", "memory"]),
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { result?: unknown };
    const m = typeof body.result === "string" ? body.result.match(/used_memory:(\d+)/) : null;
    return m ? Number(m[1]) : null;
  } catch {
    return null;
  }
}

async function supabaseBytes(): Promise<number | null> {
  try {
    const res = await db().rpc("db_size_bytes");
    if (res.error) return null;
    const n = Number(res.data);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export async function getStats(opts: { refresh?: boolean; host?: string | null } = {}): Promise<AdminStats> {
  if (!opts.refresh) {
    const cached = parseKv<AdminStats>(await kv.get(CACHE_KEY));
    if (cached && Date.now() - cached.generatedAt < CACHE_TTL * 1000) return cached;
  }

  // Riwayat deploy semua user dibaca dari Supabase (dulu: SCAN + MGET seluruh blob user di Redis).
  const countRes = await db().from("user_data").select("email", { count: "exact", head: true });
  must(countRes as never, "hitung user_data");
  const totalUsers = countRes.count ?? 0;
  const usersTruncated = totalUsers > MAX_USERS;

  const daily = await readDaily(DAYS);
  const days = daily.map((d) => d.day);
  const dayIndex = new Map(days.map((d, i) => [d, i]));
  const dailySeries = {} as Record<StatField, number[]>;
  (["signups", "logins", "abuse", "sites", "tunnels", "takedowns"] as StatField[]).forEach((f) => {
    dailySeries[f] = daily.map((d) => d.values[f]);
  });

  // Riwayat deploy per user (hanya field history yang dipakai).
  const deploysPerDay: Record<string, number[]> = {};
  const deployPlatforms: Record<string, number> = {};
  const deployStatuses: Record<string, number> = {};
  const users: UserSummary[] = [];
  let totalDeploys = 0;
  for (let from = 0; from < Math.min(totalUsers, MAX_USERS); from += 200) {
    const to = Math.min(from + 199, MAX_USERS - 1);
    const pageRes = await db().from("user_data").select("email,history").order("email").range(from, to);
    const rows = (must(pageRes, "baca user_data") ?? []) as { email: string; history: unknown }[];
    rows.forEach((row) => {
      const email = row.email;
      const hist = Array.isArray(row.history) ? (row.history as HistoryLike[]) : [];
      let last = 0;
      for (const h of hist) {
        totalDeploys++;
        const platform = typeof h.platform === "string" ? h.platform : "lainnya";
        const status = typeof h.status === "string" ? h.status : "lainnya";
        deployPlatforms[platform] = (deployPlatforms[platform] ?? 0) + 1;
        deployStatuses[status] = (deployStatuses[status] ?? 0) + 1;
        const t = historyTime(h);
        if (t > last) last = t;
        const idx = t ? dayIndex.get(new Date(t).toISOString().slice(0, 10)) : undefined;
        if (idx !== undefined) {
          (deploysPerDay[platform] ??= new Array(DAYS).fill(0))[idx]++;
        }
      }
      users.push({ email, deploys: hist.length, lastDeploy: last, sites: 0 });
    });
  }

  const links = await listLiveLinks(opts.host);
  const ownerCount = new Map<string, number>();
  for (const l of links) if (l.owner) ownerCount.set(l.owner, (ownerCount.get(l.owner) ?? 0) + 1);
  for (const u of users) u.sites = ownerCount.get(u.email) ?? 0;

  const [redisBytes, supaBytes] = await Promise.all([redisUsedBytes(), supabaseBytes()]);
  const [blockedCount, abuseTotalRes, abuseOpenRes, redisKeys] = await Promise.all([
    kv.scard("admin:blocked"),
    db().from("abuse_reports").select("id", { count: "exact", head: true }),
    db().from("abuse_reports").select("id", { count: "exact", head: true }).eq("status", "open"),
    kv.dbsize().catch(() => null),
  ]);
  must(abuseTotalRes as never, "hitung abuse_reports");
  must(abuseOpenRes as never, "hitung abuse open");
  const abuseOpen = abuseOpenRes.count ?? 0;
  const abuseTotal = abuseTotalRes.count ?? 0;

  const stats: AdminStats = {
    generatedAt: Date.now(),
    totals: {
      users: totalUsers,
      deploys: totalDeploys,
      activeSites: links.filter((l) => l.kind === "site" && l.status === "active").length,
      activeTunnels: links.filter((l) => l.kind === "tunnel").length,
      linkBytes: links.reduce((n, l) => n + l.bytes, 0),
      blocked: Number(blockedCount) || 0,
      abuseOpen,
      abuseTotal,
      redisKeys: typeof redisKeys === "number" ? redisKeys : null,
      redisBytes,
      supabaseBytes: supaBytes,
      limits: { redisMb: limitMb("REDIS_LIMIT_MB", 256), supabaseMb: limitMb("SUPABASE_LIMIT_MB", 500) },
    },
    days,
    daily: dailySeries,
    deploysPerDay,
    deployPlatforms,
    deployStatuses,
    usersTruncated,
    users,
  };
  try {
    await kv.set(CACHE_KEY, JSON.stringify(stats), { ex: CACHE_TTL + 60 });
  } catch (e) {
    console.error("[admin] gagal menyimpan cache statistik", (e as Error)?.message);
  }
  return stats;
}

export async function dropStatsCache(): Promise<void> {
  await kv.del(CACHE_KEY).catch(() => undefined);
}
