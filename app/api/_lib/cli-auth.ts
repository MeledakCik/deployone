import { createHash, randomBytes } from "node:crypto";
import { kv } from "@vercel/kv";
import { getEpoch, isAccountBlocked } from "@/app/api/_lib/mcp-auth";
import { nowSec, signMcpToken, verifyMcpToken } from "@/app/api/_lib/mcp-token";

/**
 * Login Depup CLI (ala `ngrok authtoken`): yang MEMBUAT link (`depup share`) wajib login,
 * yang MEMBUKA link tidak perlu login apa pun.
 *
 * Alur `depup login` (device flow):
 *  1. CLI -> POST /api/cli/login/start          => { deviceCode (rahasia, hanya di CLI), userCode, verifyUrl }
 *  2. CLI membuka browser ke /cli/login?code=<userCode>; pemilik akun login Google lalu menekan "Izinkan".
 *  3. CLI -> POST /api/cli/login/poll {deviceCode} => { token, email } (sekali saja), disimpan di ~/.depup/config.json.
 *
 * Token ditandatangani AUTH_SECRET dan ikut "epoch" konektor: tombol "Cabut semua akses" di Pengaturan
 * juga mematikan semua token CLI.
 */

export const CLI_TOKEN_TTL_DAYS = 90;
export const LOGIN_TTL_SECONDS = 10 * 60;
export const LOGIN_POLL_INTERVAL_SECONDS = 2;

export interface CliGrant {
  email: string;
  ep: number;
  exp: number;
}

export function signCliToken(email: string, ep: number, ttlDays = CLI_TOKEN_TTL_DAYS): string {
  const days = Number.isFinite(ttlDays) && ttlDays > 0 ? Math.min(Math.floor(ttlDays), 365) : CLI_TOKEN_TTL_DAYS;
  return signMcpToken("cli", { email, ep, exp: nowSec() + days * 86400, jti: randomBytes(6).toString("hex") });
}

export type CliAuthResult = { ok: true; email: string } | { ok: false; status: number; error: string };

/** Verifikasi "Authorization: Bearer <token CLI>": tanda tangan, kedaluwarsa, epoch (pencabutan), dan blokir admin. */
export async function authenticateCli(req: Request): Promise<CliAuthResult> {
  const m = /^Bearer\s+(\S+)$/i.exec(req.headers.get("authorization") ?? "");
  const needLogin = "Perlu login dulu. Jalankan: npx depup-cli@latest login";
  if (!m) return { ok: false, status: 401, error: needLogin };

  const grant = verifyMcpToken<CliGrant>("cli", m[1]);
  if (!grant || typeof grant.email !== "string" || typeof grant.ep !== "number") {
    return { ok: false, status: 401, error: "Login CLI tidak valid atau sudah kedaluwarsa. Jalankan: npx depup-cli@latest login" };
  }
  const email = grant.email.trim().toLowerCase();
  if ((await getEpoch(email)) !== grant.ep) {
    return { ok: false, status: 401, error: "Akses CLI sudah dicabut. Jalankan: npx depup-cli@latest login" };
  }
  if (await isAccountBlocked(email)) {
    return { ok: false, status: 403, error: "Akun ini dinonaktifkan oleh admin Depup." };
  }
  return { ok: true, email };
}

/* ---------- sesi login (device flow) ---------- */

export interface LoginSession {
  /** sha256(deviceCode) — deviceCode sendiri hanya diketahui CLI. */
  dh: string;
  status: "pending" | "approved" | "denied";
  email?: string;
  createdAt: number;
}

export const kLogin = (userCode: string) => `cli:login:${userCode}`;
export const kLoginDevice = (deviceHash: string) => `cli:login-dev:${deviceHash}`;

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

/** Tanpa huruf/angka yang mirip (0/O, 1/I/L). */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const USER_CODE_RE = /^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/;

export function newUserCode(): string {
  const b = randomBytes(8);
  let s = "";
  for (let i = 0; i < 8; i++) s += CODE_ALPHABET[b[i] % CODE_ALPHABET.length];
  return `${s.slice(0, 4)}-${s.slice(4)}`;
}

export function newDeviceCode(): string {
  return randomBytes(32).toString("base64url");
}

export function normalizeUserCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const s = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (s.length !== 8) return null;
  const code = `${s.slice(0, 4)}-${s.slice(4)}`;
  return USER_CODE_RE.test(code) ? code : null;
}

export async function loadLogin(userCode: string): Promise<LoginSession | null> {
  const raw = await kv.get<LoginSession | string | null>(kLogin(userCode));
  if (!raw) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as LoginSession;
    } catch {
      return null;
    }
  }
  return raw;
}
