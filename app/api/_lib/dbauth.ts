/** dbauth.ts — hash password (scrypt), API key, cookie sesi per-database, dan otorisasi akses. */
import { createHash, createHmac, randomBytes, scrypt, timingSafeEqual } from "crypto";
import { DB_SESSION_TTL_SEC, HttpError, getSessionEmail, randomString } from "./db-adapter";
import { getDb, type ApiKeyRec, type DbRecord } from "./dbrepo";

// ───────────── Password (scrypt) ─────────────
const scryptAsync = (pw: string, salt: Buffer, len: number) =>
  new Promise<Buffer>((resolve, reject) => scrypt(pw, salt, len, (e, k) => (e ? reject(e) : resolve(k))));

export async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16);
  const h = await scryptAsync(pw, salt, 32);
  return `s1$${salt.toString("base64url")}$${h.toString("base64url")}`;
}

export async function verifyPassword(pw: string, stored: string): Promise<boolean> {
  const [v, s, h] = stored.split("$");
  if (v !== "s1" || !s || !h) return false;
  const expected = Buffer.from(h, "base64url");
  const got = await scryptAsync(pw, Buffer.from(s, "base64url"), expected.length);
  return got.length === expected.length && timingSafeEqual(got, expected);
}

let dummyHash: Promise<string> | null = null;
/** Hash palsu untuk menyamakan waktu respons saat database/username tidak ada. */
export const getDummyHash = () => (dummyHash ??= hashPassword("dummy-password-for-timing"));

export function safeEqualStr(a: string, b: string): boolean {
  const x = createHash("sha256").update(a).digest();
  const y = createHash("sha256").update(b).digest();
  return timingSafeEqual(x, y);
}

// ───────────── API key (disimpan sebagai hash) ─────────────
export const sha256hex = (s: string) => createHash("sha256").update(s).digest("hex");

export function newApiKey(mode: "ro" | "rw", label: string): { plain: string; rec: ApiKeyRec } {
  const secret = randomString(40);
  const plain = `dpk_${mode}_${secret}`;
  return {
    plain,
    rec: {
      id: randomString(10),
      label,
      mode,
      hash: sha256hex(plain),
      prefix: `dpk_${mode}_${secret.slice(0, 4)}`,
      createdAt: Date.now(),
    },
  };
}

export function findKey(db: DbRecord, presented: string): ApiKeyRec | null {
  const h = sha256hex(presented);
  let found: ApiKeyRec | null = null;
  for (const k of db.keys) {
    if (!k.revokedAt && safeEqualStr(k.hash, h)) found = k; // tidak break: waktu konstan
  }
  return found;
}

// ───────────── Cookie sesi per-database ─────────────
function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) throw new HttpError(500, "config", "AUTH_SECRET belum diatur di server.");
  return s;
}
const sign = (payload: string) => createHmac("sha256", `${secret()}:dbsess`).update(payload).digest("base64url");
export const cookieName = (id: string) => `depup_db_${id}`;

export function makeSessionCookie(db: DbRecord): string {
  const exp = Math.floor(Date.now() / 1000) + DB_SESSION_TTL_SEC;
  const payload = `${db.id}.${db.credVersion}.${exp}`;
  const value = `${payload}.${sign(payload)}`;
  return serializeCookie(cookieName(db.id), value, DB_SESSION_TTL_SEC);
}
export const clearSessionCookie = (id: string) => serializeCookie(cookieName(id), "", 0);

function serializeCookie(name: string, value: string, maxAge: number): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

function readCookie(req: Request, name: string): string | null {
  const header = req.headers.get("cookie") || "";
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return null;
}

function verifySessionCookie(value: string, db: DbRecord): boolean {
  const parts = value.split(".");
  if (parts.length !== 4) return false;
  const [id, ver, exp, sig] = parts;
  if (id !== db.id || Number(ver) !== db.credVersion) return false;
  if (!Number.isFinite(Number(exp)) || Number(exp) < Date.now() / 1000) return false;
  return safeEqualStr(sig, sign(`${id}.${ver}.${exp}`));
}

// ───────────── Otorisasi ─────────────
export type Access = { db: DbRecord; via: "owner" | "dbsession"; email: string | null };

function assertSameOrigin(req: Request) {
  const method = req.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return;
  const origin = req.headers.get("origin");
  if (!origin) return;
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  let oh = "";
  try {
    oh = new URL(origin).host;
  } catch {
    /* origin rusak */
  }
  if (oh !== host) throw new HttpError(403, "bad_origin", "Permintaan lintas-origin ditolak.");
}

/**
 * Cek akses ke database `id`:
 *  - pemilik (session Google Depup)  -> "owner"
 *  - sesi login database (cookie)    -> "dbsession" (kecuali ownerOnly)
 * Tidak ketemu / bukan hak akses -> 404 (tidak membedakan, anti-enumerasi / IDOR).
 */
export async function authorize(req: Request, id: string, opts: { ownerOnly?: boolean } = {}): Promise<Access> {
  assertSameOrigin(req);
  const db = await getDb(id);
  const email = await getSessionEmail(req);
  const cookie = readCookie(req, cookieName(id));
  if (db) {
    if (email && db.ownerEmail === email) return { db, via: "owner", email };
    if (!opts.ownerOnly && cookie && verifySessionCookie(cookie, db)) return { db, via: "dbsession", email };
  }
  if (!email && !cookie) throw new HttpError(401, "unauthorized", "Silakan login.");
  throw new HttpError(404, "not_found", "Database tidak ditemukan atau kamu tidak punya akses.");
}

export { assertSameOrigin };
