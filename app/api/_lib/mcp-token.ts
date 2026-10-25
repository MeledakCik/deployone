import crypto from "crypto";

/**
 * Konektor MCP (Claude web & app HP -> Depup): token OAuth 2.1 tanpa-state.
 *
 * Alur singkat:
 *  1. Claude mendaftar sebagai client (POST /api/mcp/oauth/register) -> `client_id` = token bertanda tangan
 *     yang membawa nama + redirect_uri (tidak ada yang disimpan di database).
 *  2. User login Google di Depup lalu menekan "Izinkan" di /connect/authorize -> `code` sekali pakai (PKCE S256).
 *  3. Claude menukar code di /api/mcp/oauth/token -> access token (1 jam) + refresh token (30 hari).
 *  4. Claude memanggil /api/mcp dengan `Authorization: Bearer <access token>`.
 *
 * Pengamanan:
 *  - Kunci tanda tangan dipisah (domain separation, awalan "depup-mcp:") dari cookie session: token MCP TIDAK
 *    akan lolos verifySession(), dan cookie session TIDAK akan lolos verifyMcpToken().
 *  - Setiap token membawa `typ` (client/code/at/rt) sehingga tidak bisa ditukar peran.
 *  - Pencabutan akses = menaikkan "epoch" per-user di KV (lihat mcp-auth.ts); token dengan epoch lama mati.
 *
 * File ini sengaja hanya bergantung pada `crypto` supaya bisa dites langsung dengan node.
 */

export type McpTokenType = "client" | "code" | "at" | "rt";

export const MCP_SCOPE = "sites";
export const ACCESS_TTL_SECONDS = 60 * 60; // 1 jam
export const REFRESH_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 hari
export const CODE_TTL_SECONDS = 5 * 60; // 5 menit

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

/* ---------------- client (dynamic client registration tanpa-state) ---------------- */

export interface ClientInfo {
  /** nama tampilan */
  n: string;
  /** redirect_uri yang didaftarkan */
  u: string[];
}

export function signClient(name: string, redirectUris: string[]): string {
  return signMcpToken<ClientInfo & { iat: number }>("client", { n: name, u: redirectUris, iat: nowSec() });
}

export function verifyClient(clientId: unknown): ClientInfo | null {
  const c = verifyMcpToken<ClientInfo>("client", clientId);
  if (!c || typeof c.n !== "string" || !Array.isArray(c.u) || c.u.some((x) => typeof x !== "string")) return null;
  return { n: c.n, u: c.u };
}

/** Ringkasan pendek client_id untuk disematkan di code/token (client_id utuh bisa panjang). */
export function clientFingerprint(clientId: string): string {
  return crypto.createHash("sha256").update(clientId).digest("base64url").slice(0, 22);
}

/* ---------------- redirect_uri ---------------- */

/** Host Claude yang dipercaya. Tambahan lewat env MCP_REDIRECT_HOSTS="host1,host2" (mis. klien MCP lain). */
const DEFAULT_REDIRECT_HOSTS = ["claude.ai", "claude.com", "www.claude.ai", "www.claude.com"];

function extraHosts(): string[] {
  return (process.env.MCP_REDIRECT_HOSTS ?? "")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * https hanya ke host yang diizinkan; http hanya ke loopback (untuk MCP Inspector / uji lokal).
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

export function signAccessToken(email: string, cid: string, ep: number): string {
  return signMcpToken("at", { email, cid, ep, exp: nowSec() + ACCESS_TTL_SECONDS });
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
