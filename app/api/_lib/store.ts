import fs from "fs";
import path from "path";
import type { NextRequest } from "next/server";
import { verifySession, SESSION_COOKIE } from "@/app/api/_lib/session";

/**
 * Data that used to live in the browser's localStorage (deploy history,
 * domains, env vars, settings tokens) is instead saved here, keyed by the
 * logged-in Google account's email — so it follows the user to any device
 * they log into, instead of being stuck on whichever browser they used
 * last.
 */
const SLICES = ["history", "domains", "envVars", "settingsTokens"] as const;
export type StoreSlice = (typeof SLICES)[number];

export function isStoreSlice(value: unknown): value is StoreSlice {
  return typeof value === "string" && (SLICES as readonly string[]).includes(value);
}

/** Reads + verifies the session cookie straight from the request; null if not logged in. */
export function getSessionEmail(req: NextRequest): string | null {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const payload = verifySession(token);
  return payload?.email ?? null;
}

function kvKey(email: string, slice: StoreSlice): string {
  // Namespaced + lowercased so "User@Gmail.com" and "user@gmail.com" share data.
  return `depush:user:${email.toLowerCase()}:${slice}`;
}

const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;
export const hasKv = Boolean(KV_URL && KV_TOKEN);

/** Talks directly to the Upstash-compatible REST API that Vercel KV exposes — no extra SDK dependency. */
async function kvGet(key: string): Promise<unknown> {
  const res = await fetch(`${KV_URL}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Gagal membaca dari KV (${res.status})`);
  const body = (await res.json()) as { result: string | null };
  if (body.result == null) return null;
  try {
    return JSON.parse(body.result);
  } catch {
    return null;
  }
}

async function kvSet(key: string, value: unknown): Promise<void> {
  const res = await fetch(`${KV_URL}/set/${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${KV_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(JSON.stringify(value)),
  });
  if (!res.ok) throw new Error(`Gagal menulis ke KV (${res.status})`);
}

/**
 * Dev-only fallback so `next dev` works without any KV configured. This
 * writes to a local JSON file and is NOT safe in production: Vercel's
 * serverless filesystem is read-only (besides /tmp, which doesn't persist
 * between invocations), so this path is skipped entirely outside dev.
 */
const DEV_STORE_DIR = path.join(process.cwd(), ".data");
const isDev = process.env.NODE_ENV !== "production";

function devFilePath(key: string): string {
  const safe = key.replace(/[^a-zA-Z0-9_.@-]/g, "_");
  return path.join(DEV_STORE_DIR, `${safe}.json`);
}

function devFileGet(key: string): unknown {
  try {
    return JSON.parse(fs.readFileSync(devFilePath(key), "utf-8"));
  } catch {
    return null;
  }
}

function devFileSet(key: string, value: unknown): void {
  fs.mkdirSync(DEV_STORE_DIR, { recursive: true });
  fs.writeFileSync(devFilePath(key), JSON.stringify(value), "utf-8");
}

function assertBackendAvailable(): void {
  if (hasKv || isDev) return;
  throw new Error(
    "Storage belum dikonfigurasi di server: tambahkan KV database (Vercel dashboard -> Storage -> " +
      "Create Database -> KV) ke project ini, lalu redeploy. Tanpa itu, data dashboard tidak bisa " +
      "disimpan per-akun di production."
  );
}

export async function storeGet(email: string, slice: StoreSlice): Promise<unknown> {
  assertBackendAvailable();
  const key = kvKey(email, slice);
  return hasKv ? kvGet(key) : devFileGet(key);
}

export async function storeSet(email: string, slice: StoreSlice, value: unknown): Promise<void> {
  assertBackendAvailable();
  const key = kvKey(email, slice);
  if (hasKv) {
    await kvSet(key, value);
  } else {
    devFileSet(key, value);
  }
}
