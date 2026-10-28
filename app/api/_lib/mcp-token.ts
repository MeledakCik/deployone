import crypto from "crypto";

/**
 * Konektor MCP (Claude, OpenCode, Cursor, Codex, Gemini & Custom OAuth -> Depup):
 * token OAuth 2.1 tanpa-state + Custom OAuth Client + Long-Lived Bearer Token untuk konfigurasi CLI/IDE.
 *
 * Alur singkat:
 *  1. Klien AI (Claude, Cursor, OpenCode, Codex, Gemini) mendaftar sebagai client (POST /api/mcp/oauth/register)
 *     ATAU user membuat Custom OAuth Client / Bearer Token sendiri di Settings ("Buat OAuth Sendiri").
 *  2. User login Google di Depup lalu menekan "Izinkan" di /connect/authorize -> `code` sekali pakai (PKCE S256).
 *  3. Klien menukar code di /api/mcp/oauth/token -> access token + refresh token.
 *     Untuk Custom OAuth dengan client_secret, mendukung juga `client_secret_post`, `client_secret_basic`,
 *     dan `grant_type=client_credentials`.
 *  4. Klien memanggil /api/mcp dengan `Authorization: Bearer <access token>`.
 */

export type McpTokenType = "client" | "code" | "at" | "rt";

export const MCP_SCOPE = "sites";
export const ACCESS_TTL_SECONDS = 60 * 60; // 1 jam (default alur OAuth standar)
export const REFRESH_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 hari
export const CODE_TTL_SECONDS = 5 * 60; // 5 menit

/** Pilihan durasi token langsung untuk konfigurasi OpenCode / Cursor / Codex / Gemini / Claude Code di Settings. */
export const DIRECT_TOKEN_TTL_DAYS = [1, 7, 30, 90, 365] as const;

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) {
    throw new Error("AUTH_SECRET belum diatur di server (env var, minimal 16 karakter acak).");
  }
  return s;
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function mac(body: string): string {
  return crypto.createHmac("sha256", secret()).update(`depup-mcp:${body}`).digest("base64url");
}

/** Tanda tangani payload. `exp` (unix detik) opsional; kalau ada akan dicek saat verifikasi. */
export function signMcpToken<T extends object>(typ: McpTokenType, payload: T): string {
  const body = b64url(JSON.stringify({ ...payload, typ }));
  return `${body}.${mac(body)}`;
}

/** Verifikasi tanda tangan, jenis token, dan kedaluwarsa. null kalau salah satunya gagal. */
export function verifyMcpToken<T extends object>(typ: McpTokenType, token: unknown): (T & { typ: McpTokenType; exp?: number }) | null {
  if (typeof token !== "string" || token.length > 4096) return null;
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  try {
    const expected = Buffer.from(mac(parts[0]));
    const given = Buffer.from(parts[1]);
    if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;
    const payload = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf-8")) as T & { typ?: string; exp?: number };
    if (payload.typ !== typ) return null;
    if (payload.exp !== undefined) {
      if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) return null;
    }
    return payload as T & { typ: McpTokenType; exp?: number };
  } catch {
    return null;
  }
}

export const nowSec = () => Math.floor(Date.now() / 1000);

/* ---------------- client (dynamic client registration & custom OAuth client) ---------------- */

export interface ClientInfo {
  /** nama tampilan */
  n: string;
  /** redirect_uri yang didaftarkan */
  u: string[];
}

export interface CustomClientInfo extends ClientInfo {
  /** ID pendek untuk manajemen Custom OAuth di Settings */
  kid?: string;
  /** Email pemilik jika dibuat lewat Settings -> Buat OAuth Sendiri */
  owner?: string;
  /** HMAC hash dari client_secret (jika menggunakan client_secret) */
  sh?: string;
  /** Penanda bahwa client ini dibuat manual oleh user terautentikasi di Settings */
  custom?: boolean;
  iat?: number;
}

export function hashClientSecret(rawSecret: string): string {
  return crypto.createHmac("sha256", secret()).update(`depup-mcp-cs:${rawSecret}`).digest("base64url");
}

export function verifyClientSecret(rawSecret: unknown, expectedHash: string | undefined): boolean {
  if (!expectedHash) return true;
  if (typeof rawSecret !== "string" || rawSecret.length < 8 || rawSecret.length > 512) return false;
  const a = Buffer.from(hashClientSecret(rawSecret));
  const b = Buffer.from(expectedHash);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function generateClientSecret(): string {
  return `depup_cs_${crypto.randomBytes(24).toString("base64url")}`;
}

export function signClient(name: string, redirectUris: string[]): string {
  return signMcpToken<ClientInfo & { iat: number }>("client", { n: name, u: redirectUris, iat: nowSec() });
}

export function signCustomClient(opts: {
  kid: string;
  name: string;
  redirectUris: string[];
  owner: string;
  clientSecret?: string;
}): string {
  const payload: CustomClientInfo = {
    n: opts.name,
    u: opts.redirectUris,
    kid: opts.kid,
    owner: opts.owner.trim().toLowerCase(),
    custom: true,
    iat: nowSec(),
    ...(opts.clientSecret ? { sh: hashClientSecret(opts.clientSecret) } : {}),
  };
  return signMcpToken("client", payload);
}

export function verifyClient(clientId: unknown): ClientInfo | null {
  const c = verifyMcpToken<ClientInfo>("client", clientId);
  if (!c || typeof c.n !== "string" || !Array.isArray(c.u) || c.u.some((x) => typeof x !== "string")) return null;
  return { n: c.n, u: c.u };
}

export function verifyCustomClient(clientId: unknown): CustomClientInfo | null {
  const c = verifyMcpToken<CustomClientInfo>("client", clientId);
  if (!c || typeof c.n !== "string" || !Array.isArray(c.u) || c.u.some((x) => typeof x !== "string")) return null;
  return {
    n: c.n,
    u: c.u,
    ...(typeof c.kid === "string" ? { kid: c.kid } : {}),
    ...(typeof c.owner === "string" ? { owner: c.owner } : {}),
    ...(typeof c.sh === "string" ? { sh: c.sh } : {}),
    ...(c.custom === true ? { custom: true } : {}),
    ...(typeof c.iat === "number" ? { iat: c.iat } : {}),
  };
}

/** Ringkasan pendek client_id untuk disematkan di code/token (client_id utuh bisa panjang). */
export function clientFingerprint(clientId: string): string {
  return crypto.createHash("sha256").update(clientId).digest("base64url").slice(0, 22);
}

/* ---------------- redirect_uri ---------------- */

/**
 * Host resmi yang dipercaya untuk alur OAuth MCP:
 * - Claude (claude.ai, claude.com)
 * - Cursor (cursor.com, cursor.sh)
 * - OpenCode (opencode.ai)
 * - Codex / OpenAI (chatgpt.com, platform.openai.com)
 * - Gemini / Google (gemini.google.com, aistudio.google.com)
 * Tambahan bisa diatur lewat env MCP_REDIRECT_HOSTS="host1,host2".
 */
const DEFAULT_REDIRECT_HOSTS = [
  "claude.ai",
  "claude.com",
  "www.claude.ai",
  "www.claude.com",
  "cursor.com",
  "www.cursor.com",
  "cursor.sh",
  "opencode.ai",
  "www.opencode.ai",
  "chatgpt.com",
  "www.chatgpt.com",
  "platform.openai.com",
  "gemini.google.com",
  "aistudio.google.com",
];

/** Deep-link URI scheme aplikasi AI desktop/IDE resmi (Cursor, OpenCode, Codex, Gemini, Claude, VS Code). */
const ALLOWED_APP_SCHEMES = new Set([
  "cursor:",
  "opencode:",
  "codex:",
  "gemini:",
  "claude:",
  "vscode:",
  "vscode-insiders:",
  "windsurf:",
]);

function extraHosts(): string[] {
  return (process.env.MCP_REDIRECT_HOSTS ?? "")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * https hanya ke host AI resmi yang diizinkan; http hanya ke loopback (untuk OpenCode / Codex / Gemini / Cursor / MCP Inspector lokal);
 * atau skema deep-link aplikasi resmi (mis. cursor://anysphere.cursor-retrieval/oauth/callback).
 * Tanpa fragment, tanpa kredensial di URL.
 */
export function isAllowedRedirectUri(raw: unknown): boolean {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 500) return false;
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  if (u.hash || u.username || u.password) return false;
  const host = u.hostname.toLowerCase();
  if (u.protocol === "https:") {
    return [...DEFAULT_REDIRECT_HOSTS, ...extraHosts()].includes(host);
  }
  if (u.protocol === "http:") {
    return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
  }
  if (ALLOWED_APP_SCHEMES.has(u.protocol)) {
    return (host.length > 0 || u.pathname.length > 1) && !raw.includes(" ");
  }
  return false;
}

/**
 * Validasi redirect_uri untuk Custom OAuth yang dibuat langsung oleh user di Settings.
 * Mengizinkan semua domain https:// yang valid (tanpa hash/kredensial), http:// loopback,
 * atau custom URI scheme aplikasi desktop (cursor://, opencode://, codex://, gemini://, claude://, vscode://).
 */
export function isValidCustomRedirectUri(raw: unknown): boolean {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 500) return false;
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  if (u.hash || u.username || u.password) return false;
  const host = u.hostname.toLowerCase();
  if (u.protocol === "https:") {
    return host.length > 0 && host.includes(".");
  }
  if (u.protocol === "http:") {
    return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
  }
  if (ALLOWED_APP_SCHEMES.has(u.protocol) || u.protocol === "depup:") {
    return (host.length > 0 || u.pathname.length > 1) && !raw.includes(" ");
  }
  return false;
}

/* ---------------- PKCE (S256) ---------------- */

export const CHALLENGE_RE = /^[A-Za-z0-9\-_]{43}$/;
export const VERIFIER_RE = /^[A-Za-z0-9\-._~]{43,128}$/;

export function challengeFromVerifier(verifier: string): string {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

export function verifyPkce(verifier: unknown, challenge: string): boolean {
  if (typeof verifier !== "string" || !VERIFIER_RE.test(verifier)) return false;
  const a = Buffer.from(challengeFromVerifier(verifier));
  const b = Buffer.from(challenge);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/* ---------------- authorization code / access / refresh ---------------- */

export interface CodePayload {
  jti: string;
  email: string;
  cid: string;
  ruri: string;
  cc: string;
  ep: number;
  exp: number;
}

export function signCode(p: Omit<CodePayload, "exp" | "jti">): { token: string; jti: string } {
  const jti = crypto.randomBytes(16).toString("hex");
  return { jti, token: signMcpToken("code", { ...p, jti, exp: nowSec() + CODE_TTL_SECONDS }) };
}

export function verifyCode(token: unknown): CodePayload | null {
  const c = verifyMcpToken<CodePayload>("code", token);
  if (!c || typeof c.email !== "string" || typeof c.jti !== "string" || typeof c.cc !== "string") return null;
  return c;
}

export interface GrantPayload {
  email: string;
  cid: string;
  ep: number;
  exp: number;
}

export function signAccessToken(email: string, cid: string, ep: number, ttlSeconds = ACCESS_TTL_SECONDS): string {
  const ttl = Number.isFinite(ttlSeconds) && ttlSeconds > 0 ? Math.min(Math.floor(ttlSeconds), 365 * 24 * 3600) : ACCESS_TTL_SECONDS;
  return signMcpToken("at", { email, cid, ep, exp: nowSec() + ttl });
}

export function signRefreshToken(email: string, cid: string, ep: number): string {
  return signMcpToken("rt", { email, cid, ep, exp: nowSec() + REFRESH_TTL_SECONDS, jti: crypto.randomBytes(8).toString("hex") });
}

export function verifyAccessToken(token: unknown): GrantPayload | null {
  const t = verifyMcpToken<GrantPayload>("at", token);
  return t && typeof t.email === "string" && typeof t.ep === "number" ? t : null;
}

export function verifyRefreshToken(token: unknown): GrantPayload | null {
  const t = verifyMcpToken<GrantPayload>("rt", token);
  return t && typeof t.email === "string" && typeof t.ep === "number" ? t : null;
}

/* ---------------- login lalu kembali ke halaman izin ---------------- */

/**
 * Tujuan login yang boleh diingat: HANYA halaman izin konektor. Awalan literal "/connect/authorize?" memastikan
 * hasilnya selalu satu origin dengan Depup (tidak bisa jadi open redirect lewat "//host" atau "https://...").
 */
const NEXT_AUTHORIZE_RE = /^\/connect\/authorize\?[A-Za-z0-9\-._~%=&+:/]{1,1800}$/;

export function isMcpAuthorizeNext(value: unknown): value is string {
  return typeof value === "string" && NEXT_AUTHORIZE_RE.test(value);
}

/* ---------------- origin kanonik ---------------- */

/**
 * Origin publik Depup (tanpa slash akhir). Urutan: env -> localhost (dari host request, untuk dev) -> depup.cloud.
 * Dipakai di metadata OAuth, jadi HARUS stabil: jangan percaya header Host untuk domain produksi.
 */
export function appOrigin(hostHeader?: string | null): string {
  const env = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "").trim().replace(/\/+$/, "");
  if (env) return env;
  const host = (hostHeader ?? "").toLowerCase();
  if (/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)) return `http://${host}`;
  return "https://depup.cloud";
}

export const mcpResourceUrl = (origin: string) => `${origin}/api/mcp`;
