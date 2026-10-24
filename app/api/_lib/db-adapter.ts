/**
 * db-adapter.ts — satu-satunya tempat fitur Database "menempel" ke kode Depup yang sudah ada.
 *
 *  1. getSessionEmail()  -> membaca session Google dari `_lib/session.ts`
 *                           (SATU-SATUNYA bagian yang mungkin perlu kamu sesuaikan, lihat INSTALL.md)
 *  2. kv                 -> klien Vercel KV (REST, kompatibel Upstash), tanpa dependency
 *  3. ok()/fail()        -> helper response JSON seragam { ok, data } / { ok:false, error }
 *                           (kalau mau, ganti isinya agar memanggil helper di `response.ts`)
 */
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { SESSION_COOKIE, verifySession } from "./session";

// ───────────── Konstanta yang mudah diubah ─────────────
export const MAX_DBS_PER_USER = 3;
export const QUOTA_BYTES = 100 * 1024 * 1024; // 100MB total per user
export const QUOTA_WARN_RATIO = 0.8;
export const MAX_ACTIVE_KEYS = 5;
export const API_RATE_LIMIT_PER_MIN = 60; // per API key
export const API_MAX_ROWS = 500;
export const API_TIMEOUT_MS = 8_000;
export const PANEL_MAX_ROWS = 1_000;
export const PANEL_TIMEOUT_MS = 20_000;
export const DB_SESSION_TTL_SEC = 8 * 60 * 60;

// ───────────── Error + response ─────────────
export class HttpError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function ok(data: unknown, status = 200, headers?: Record<string, string>) {
  return NextResponse.json({ ok: true, data }, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

export function fail(status: number, code: string, message: string, headers?: Record<string, string>) {
  return NextResponse.json(
    { ok: false, error: { code, message } },
    { status, headers: { "Cache-Control": "no-store", ...headers } }
  );
}

/** Pembungkus route: HttpError -> JSON error rapi; error lain -> 500 tanpa membocorkan detail/secret. */
export function route<A extends unknown[]>(fn: (...a: A) => Promise<Response>): (...a: A) => Promise<Response> {
  return async (...a: A) => {
    try {
      return await fn(...a);
    } catch (e) {
      if (e instanceof HttpError) return fail(e.status, e.code, e.message);
      console.error("[database] error:", (e as Error)?.name); // sengaja tanpa message/stack (anti-bocor secret)
      return fail(500, "internal", "Terjadi kesalahan di server.");
    }
  };
}

export async function readJson<T = Record<string, any>>(req: Request, maxChars = 100_000): Promise<T> {
  const ct = req.headers.get("content-type") || "";
  if (!ct.includes("application/json")) throw new HttpError(415, "bad_content_type", "Content-Type harus application/json.");
  const text = await req.text();
  if (text.length > maxChars) throw new HttpError(413, "too_large", "Payload terlalu besar.");
  try {
    const v = JSON.parse(text || "{}");
    if (v === null || typeof v !== "object" || Array.isArray(v)) throw new Error("x");
    return v as T;
  } catch {
    throw new HttpError(400, "bad_json", "Body JSON tidak valid.");
  }
}

export function clientIp(req: Request): string {
  return (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
}

// ───────────── Session Google (memakai cookie session Depup yang sudah ada) ─────────────
/** Email user yang login (lowercase) atau null. Membaca cookie `depup_session` lewat verifySession() di session.ts. */
export async function getSessionEmail(req: Request): Promise<string | null> {
  const header = req.headers.get("cookie") || "";
  let token: string | undefined;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i === -1) continue;
    if (part.slice(0, i).trim() === SESSION_COOKIE) {
      try {
        token = decodeURIComponent(part.slice(i + 1).trim());
      } catch {
        token = part.slice(i + 1).trim();
      }
      break;
    }
  }
  const payload = verifySession(token);
  const email = payload?.email;
  return typeof email === "string" && email.includes("@") ? email.trim().toLowerCase() : null;
}

export async function requireEmail(req: Request): Promise<string> {
  const e = await getSessionEmail(req);
  if (!e) throw new HttpError(401, "unauthorized", "Silakan login terlebih dahulu.");
  return e;
}

// ───────────── Vercel KV (REST) ─────────────
const PREFIX = "depup:";
type MemMap = Map<string, { v: string; exp?: number }>;
const g = globalThis as unknown as { __depupKv?: MemMap };
const mem: MemMap = g.__depupKv ?? (g.__depupKv = new Map());

const hasKv = () => !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

function needKv() {
  if (!hasKv() && process.env.NODE_ENV === "production") {
    throw new HttpError(503, "kv_missing", "Vercel KV belum terhubung ke project ini.");
  }
}

async function kvCmd(args: (string | number)[]): Promise<any> {
  const res = await fetch(process.env.KV_REST_API_URL as string, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
    cache: "no-store",
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || j.error) throw new HttpError(502, "kv_error", "Penyimpanan (KV) bermasalah.");
  return j.result;
}

function memGet(k: string): string | null {
  const e = mem.get(k);
  if (!e) return null;
  if (e.exp && e.exp < Date.now()) {
    mem.delete(k);
    return null;
  }
  return e.v;
}

export const kv = {
  async get<T = unknown>(key: string): Promise<T | null> {
    needKv();
    const k = PREFIX + key;
    const raw: string | null = hasKv() ? await kvCmd(["GET", k]) : memGet(k);
    if (raw == null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },
  async set(key: string, value: unknown, exSeconds?: number): Promise<void> {
    needKv();
    const k = PREFIX + key;
    const raw = JSON.stringify(value);
    if (hasKv()) await kvCmd(exSeconds ? ["SET", k, raw, "EX", exSeconds] : ["SET", k, raw]);
    else mem.set(k, { v: raw, exp: exSeconds ? Date.now() + exSeconds * 1000 : undefined });
  },
  /** SET NX: true kalau key berhasil dibuat (belum ada sebelumnya). */
  async setnx(key: string, value: unknown): Promise<boolean> {
    needKv();
    const k = PREFIX + key;
    const raw = JSON.stringify(value);
    if (hasKv()) return (await kvCmd(["SET", k, raw, "NX"])) === "OK";
    if (memGet(k) !== null) return false;
    mem.set(k, { v: raw });
    return true;
  },
  async del(key: string): Promise<void> {
    needKv();
    const k = PREFIX + key;
    if (hasKv()) await kvCmd(["DEL", k]);
    else mem.delete(k);
  },
  async incr(key: string, ttlSeconds: number): Promise<number> {
    needKv();
    const k = PREFIX + key;
    if (hasKv()) {
      const n = Number(await kvCmd(["INCR", k]));
      if (n === 1) await kvCmd(["EXPIRE", k, ttlSeconds]);
      return n;
    }
    const n = Number(memGet(k) ?? 0) + 1;
    mem.set(k, { v: String(n), exp: Date.now() + ttlSeconds * 1000 });
    return n;
  },
};

export async function rateLimit(key: string, limit: number, windowSec: number, message?: string) {
  const bucket = Math.floor(Date.now() / (windowSec * 1000));
  const n = await kv.incr(`rl:${key}:${bucket}`, windowSec + 5);
  if (n > limit) throw new HttpError(429, "rate_limited", message || "Terlalu banyak permintaan. Coba lagi sebentar lagi.");
}

// ───────────── Random ─────────────
const ALNUM = "abcdefghijklmnopqrstuvwxyz0123456789";
const PW_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

/** String acak tanpa modulo bias (rejection sampling). */
export function randomString(len: number, alphabet: string = ALNUM): string {
  const limit = 256 - (256 % alphabet.length);
  let out = "";
  while (out.length < len) {
    for (const b of randomBytes(len * 2)) {
      if (b < limit) {
        out += alphabet[b % alphabet.length];
        if (out.length === len) break;
      }
    }
  }
  return out;
}
export const randomPassword = (len = 20) => randomString(len, PW_ALPHABET);
