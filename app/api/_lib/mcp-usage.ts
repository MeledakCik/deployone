import { kv } from "@vercel/kv";

/**
 * Pencatatan pemakaian konektor MCP untuk panel admin: siapa yang memakai dan lewat aplikasi AI apa.
 *
 * Token MCP bersifat stateless (hanya bertanda tangan), jadi tanpa catatan ini admin tidak bisa tahu apa-apa.
 * Semua fungsi di sini best-effort: kegagalan Redis TIDAK boleh mengganggu request MCP.
 *
 * Struktur Redis:
 *  - mcp:usage:users        sorted set  member = email, score = waktu terakhir memakai (ms)
 *  - mcp:usage:u:<email>    hash        per aplikasi AI: `<key>:n` (jumlah request), `<key>:last`, `<key>:first`,
 *                                       `<key>:label`, `<key>:via`, `<key>:sw` (nama perangkat lunak), `<key>:t` (jumlah tool call)
 *  - mcp:usage:cid:<cid>    string JSON {name, via}  nama aplikasi yang didaftarkan saat token diterbitkan
 *  - mcp:usage:tools        hash        nama tool -> jumlah panggilan (semua pengguna)
 */

export const USAGE_RETENTION_DAYS = 90;
const TTL_SEC = USAGE_RETENTION_DAYS * 24 * 3600;
const CID_TTL_SEC = 400 * 24 * 3600; // token langsung maksimal 365 hari

const K_USERS = "mcp:usage:users";
const K_TOOLS = "mcp:usage:tools";
const kUser = (email: string) => `mcp:usage:u:${email.trim().toLowerCase()}`;
const kCid = (cid: string) => `mcp:usage:cid:${cid}`;

export type McpVia = "oauth" | "token";

export interface ClientFamily {
  key: string;
  label: string;
}

const FAMILIES: { key: string; label: string; re: RegExp }[] = [
  { key: "claude", label: "Claude", re: /claude|anthropic/i },
  { key: "gemini", label: "Gemini", re: /gemini|google|vertex|aistudio/i },
  { key: "cursor", label: "Cursor", re: /cursor/i },
  { key: "opencode", label: "OpenCode", re: /opencode/i },
  { key: "codex", label: "Codex", re: /codex|openai|chatgpt/i },
  { key: "deepseek", label: "DeepSeek", re: /deepseek|\bdsh\b|dsh-mcp/i },
];

/** Kelompokkan nama aplikasi (dari OAuth client, label token, atau clientInfo MCP) ke satu keluarga. */
export function detectClientFamily(...names: (string | null | undefined)[]): ClientFamily {
  for (const n of names) {
    if (!n) continue;
    const hit = FAMILIES.find((f) => f.re.test(n));
    if (hit) return { key: hit.key, label: hit.label };
  }
  const raw = names.find((n) => n && n.trim());
  if (raw) {
    const clean = raw.trim().slice(0, 40);
    const key = clean.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30) || "other";
    return { key: `x-${key}`, label: clean };
  }
  return { key: "unknown", label: "Tidak diketahui" };
}

/** Simpan nama aplikasi untuk sebuah client fingerprint saat token diterbitkan (OAuth atau token langsung). */
export async function registerMcpClient(cid: string, meta: { name: string; via: McpVia }): Promise<void> {
  try {
    await kv.set(kCid(cid), JSON.stringify({ name: meta.name.slice(0, 80), via: meta.via }), { ex: CID_TTL_SEC });
  } catch {
    /* best-effort */
  }
}

async function readCidMeta(cid: string): Promise<{ name?: string; via?: McpVia } | null> {
  try {
    const raw = await kv.get<unknown>(kCid(cid));
    if (!raw) return null;
    const obj = typeof raw === "string" ? (JSON.parse(raw) as unknown) : raw;
    return obj && typeof obj === "object" ? (obj as { name?: string; via?: McpVia }) : null;
  } catch {
    return null;
  }
}

export interface UsageRequestInfo {
  /** clientInfo dari pesan `initialize`, kalau ada di request ini. */
  clientInfo?: { name?: string; version?: string } | null;
  /** Nama tool dari pesan `tools/call` di request ini. */
  tools: string[];
}

/** Baca clientInfo dan nama tool dari body JSON-RPC (satu pesan atau batch). */
export function summarizeRpcBody(body: unknown): UsageRequestInfo {
  const list = Array.isArray(body) ? body : [body];
  const info: UsageRequestInfo = { clientInfo: null, tools: [] };
  for (const m of list) {
    if (!m || typeof m !== "object") continue;
    const msg = m as { method?: unknown; params?: unknown };
    const params = (msg.params && typeof msg.params === "object" ? msg.params : {}) as Record<string, unknown>;
    if (msg.method === "initialize" && params.clientInfo && typeof params.clientInfo === "object") {
      const ci = params.clientInfo as { name?: unknown; version?: unknown };
      info.clientInfo = {
        name: typeof ci.name === "string" ? ci.name.slice(0, 60) : undefined,
        version: typeof ci.version === "string" ? ci.version.slice(0, 20) : undefined,
      };
    } else if (msg.method === "tools/call" && typeof params.name === "string") {
      info.tools.push(params.name.slice(0, 40).replace(/[^A-Za-z0-9_\-.]/g, ""));
    }
  }
  return info;
}

/** Catat satu request MCP yang sudah lolos autentikasi. */
export async function recordMcpUse(email: string, cid: string | undefined, info: UsageRequestInfo): Promise<void> {
  try {
    const e = email.trim().toLowerCase();
    const meta = cid ? await readCidMeta(cid) : null;
    // Tombol "Test Konektor" di Settings memakai label "Test"; itu bukan pemakaian sungguhan.
    if (meta?.name === "Test") return;
    const fam = detectClientFamily(meta?.name, info.clientInfo?.name);
    const now = Date.now();
    const h = kUser(e);

    const p = kv.pipeline();
    p.zadd(K_USERS, { score: now, member: e });
    p.hincrby(h, `${fam.key}:n`, 1);
    if (info.tools.length) p.hincrby(h, `${fam.key}:t`, info.tools.length);
    p.hsetnx(h, `${fam.key}:first`, now);
    p.hset(h, {
      [`${fam.key}:last`]: now,
      [`${fam.key}:label`]: fam.label,
      ...(meta?.via ? { [`${fam.key}:via`]: meta.via } : {}),
      ...(info.clientInfo?.name
        ? { [`${fam.key}:sw`]: `${info.clientInfo.name}${info.clientInfo.version ? ` v${info.clientInfo.version}` : ""}` }
        : {}),
    });
    p.expire(h, TTL_SEC);
    for (const t of info.tools) p.hincrby(K_TOOLS, t, 1);
    await p.exec();

    // Sesekali buang pengguna yang sudah lewat masa simpan, supaya sorted set tidak membesar.
    if (Math.random() < 0.01) await kv.zremrangebyscore(K_USERS, 0, now - TTL_SEC * 1000);
  } catch (err) {
    console.error("[mcp-usage] gagal mencatat", (err as Error)?.message);
  }
}

/* ---------------- pembacaan untuk panel admin ---------------- */

export interface McpUserClient {
  key: string;
  label: string;
  via: McpVia | null;
  software: string | null;
  calls: number;
  toolCalls: number;
  firstAt: number;
  lastAt: number;
}

export interface McpUsageUser {
  email: string;
  lastAt: number;
  calls: number;
  clients: McpUserClient[];
}

export interface McpUsageSummary {
  generatedAt: number;
  retentionDays: number;
  totals: { users: number; active24h: number; active7d: number; active30d: number; calls: number; toolCalls: number };
  byClient: { key: string; label: string; users: number; calls: number; lastAt: number }[];
  topTools: { name: string; count: number }[];
  users: McpUsageUser[];
  truncated: boolean;
}

const MAX_USERS = 300;

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function parseUserHash(email: string, raw: Record<string, unknown> | null): McpUsageUser | null {
  if (!raw) return null;
  const keys = new Set<string>();
  for (const f of Object.keys(raw)) {
    const i = f.lastIndexOf(":");
    if (i > 0) keys.add(f.slice(0, i));
  }
  const clients: McpUserClient[] = [...keys].map((key) => ({
    key,
    label: String(raw[`${key}:label`] ?? key),
    via: raw[`${key}:via`] === "oauth" || raw[`${key}:via`] === "token" ? (raw[`${key}:via`] as McpVia) : null,
    software: raw[`${key}:sw`] ? String(raw[`${key}:sw`]) : null,
    calls: num(raw[`${key}:n`]),
    toolCalls: num(raw[`${key}:t`]),
    firstAt: num(raw[`${key}:first`]),
    lastAt: num(raw[`${key}:last`]),
  }));
  if (clients.length === 0) return null;
  clients.sort((a, b) => b.lastAt - a.lastAt);
  return { email, lastAt: Math.max(...clients.map((c) => c.lastAt)), calls: clients.reduce((s, c) => s + c.calls, 0), clients };
}

export async function getMcpUsage(): Promise<McpUsageSummary> {
  const now = Date.now();
  const DAY = 24 * 3600 * 1000;

  const [total, a24, a7, a30, rawMembers, rawTools] = await Promise.all([
    kv.zcard(K_USERS),
    kv.zcount(K_USERS, now - DAY, "+inf"),
    kv.zcount(K_USERS, now - 7 * DAY, "+inf"),
    kv.zcount(K_USERS, now - 30 * DAY, "+inf"),
    kv.zrange<(string | number)[]>(K_USERS, 0, MAX_USERS - 1, { rev: true, withScores: true }),
    kv.hgetall<Record<string, unknown>>(K_TOOLS),
  ]);

  const emails: string[] = [];
  for (let i = 0; i < rawMembers.length; i += 2) emails.push(String(rawMembers[i]));

  let users: McpUsageUser[] = [];
  if (emails.length) {
    const p = kv.pipeline();
    for (const e of emails) p.hgetall(kUser(e));
    const res = (await p.exec()) as (Record<string, unknown> | null)[];
    users = emails
      .map((e, i) => parseUserHash(e, res[i] && typeof res[i] === "object" ? res[i] : null))
      .filter((u): u is McpUsageUser => u !== null);
  }

  const clientMap = new Map<string, { key: string; label: string; users: number; calls: number; lastAt: number }>();
  let calls = 0;
  let toolCalls = 0;
  for (const u of users) {
    for (const c of u.clients) {
      const cur = clientMap.get(c.key) ?? { key: c.key, label: c.label, users: 0, calls: 0, lastAt: 0 };
      cur.users += 1;
      cur.calls += c.calls;
      cur.lastAt = Math.max(cur.lastAt, c.lastAt);
      clientMap.set(c.key, cur);
      calls += c.calls;
      toolCalls += c.toolCalls;
    }
  }

  const topTools = Object.entries(rawTools ?? {})
    .map(([name, count]) => ({ name, count: num(count) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return {
    generatedAt: now,
    retentionDays: USAGE_RETENTION_DAYS,
    totals: { users: num(total), active24h: num(a24), active7d: num(a7), active30d: num(a30), calls, toolCalls },
    byClient: [...clientMap.values()].sort((a, b) => b.users - a.users || b.calls - a.calls),
    topTools,
    users,
    truncated: num(total) > MAX_USERS,
  };
}
