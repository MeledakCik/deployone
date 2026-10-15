import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { kv } from "@vercel/kv";

export { tunnelEnabled, tunnelBaseDomain, slugFromHost, SLUG_RE, TUNNEL_RESERVED } from "@/app/api/_lib/tunnel-host";

/* ---------- konfigurasi ---------- */

export const DEFAULT_TTL_MINUTES = 120;
export const MAX_TTL_MINUTES = 480;

/** Batas body request dari pengunjung -> localhost (disimpan inline di KV, limit 1 MB/perintah). */
export const MAX_REQ_BODY_BYTES = 600 * 1024;
/** Batas ukuran satu potongan response (raw) sebelum di-base64. */
export const MAX_CHUNK_BYTES = 384 * 1024;

/** Berapa lama pengunjung menunggu localhost mulai menjawab. */
export const HEAD_WAIT_MS = 30_000;
/** Jeda maksimum antar potongan response. */
export const CHUNK_WAIT_MS = 30_000;
/** Lama satu long-poll dari CLI (harus < maxDuration route). */
export const POLL_WINDOW_MS = 25_000;

export function clampTtl(minutes: unknown): number {
  const n = typeof minutes === "number" && Number.isFinite(minutes) ? Math.floor(minutes) : NaN;
  const envN = Number(process.env.TUNNEL_TTL_MINUTES);
  const fallback = Number.isFinite(envN) && envN > 0 ? envN : DEFAULT_TTL_MINUTES;
  const v = Number.isFinite(n) && n > 0 ? n : fallback;
  return Math.min(Math.max(v, 5), MAX_TTL_MINUTES);
}

/* ---------- key KV ---------- */

export const kMeta = (id: string) => `tunnel:meta:${id}`;
export const kLive = (id: string) => `tunnel:live:${id}`;
export const kQueue = (id: string) => `tunnel:q:${id}`;
export const kRes = (id: string, rid: string, seq: number) => `tunnel:res:${id}:${rid}:${seq}`;

export interface TunnelMeta {
  tokenHash: string;
  createdAt: number;
  expiresAt: number;
  port: number;
}

/** Envelope request yang diantre untuk CLI. */
export interface QueuedRequest {
  rid: string;
  method: string;
  /** Path + query asli dari pengunjung, selalu diawali "/". */
  path: string;
  headers: [string, string][];
  /** Body base64, null kalau tidak ada. */
  body: string | null;
  /** Epoch ms; CLI melewati request yang sudah lewat batas ini. */
  exp: number;
}

/** Potongan response dari CLI. seq 0 membawa status + headers. */
export interface ResponseChunk {
  seq: number;
  status?: number;
  headers?: [string, string][];
  /** Base64 (boleh kosong). */
  data: string;
  last: boolean;
}

/* ---------- util ---------- */

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export function newToken(): string {
  return randomBytes(24).toString("base64url");
}

export function newRid(): string {
  return randomBytes(9).toString("hex");
}

const ADJ = ["cantik", "ganteng", "santai", "kece", "gesit", "manis", "ceria", "tenang", "lincah", "jago", "mantap", "cerdas"];
const NOUN = ["depup", "kopi", "kucing", "bintang", "awan", "pelangi", "roket", "laut", "senja", "bulan", "angin", "gunung"];
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

function pick<T>(arr: T[]): T {
  return arr[randomBytes(1)[0] % arr.length];
}

export function randomSuffix(len = 5): string {
  const bytes = randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

/** "cantik-depup" style prefix; bagian acak selalu ditambahkan supaya link tidak bisa ditebak. */
export function randomPrefix(): string {
  return `${pick(ADJ)}-${pick(NOUN)}`;
}

export function sanitizePrefix(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const s = input.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "").slice(0, 20);
  return s.length >= 2 ? s : null;
}

/** JSON dari KV bisa sudah ter-parse (auto-deserialize) atau masih string. */
export function parseKv<T>(raw: unknown): T | null {
  if (raw == null) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }
  return raw as T;
}

export async function loadMeta(id: string): Promise<TunnelMeta | null> {
  if (!id) return null;
  const meta = parseKv<TunnelMeta>(await kv.get(kMeta(id)));
  if (!meta || typeof meta.expiresAt !== "number") return null;
  if (meta.expiresAt <= Date.now()) return null;
  return meta;
}

/** Verifikasi "Authorization: Bearer <token>" milik CLI terhadap tunnel `id`. */
export async function authTunnel(req: Request, id: string): Promise<TunnelMeta | null> {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token || !id) return null;
  const meta = await loadMeta(id);
  if (!meta) return null;
  const a = Buffer.from(sha256(token));
  const b = Buffer.from(meta.tokenHash);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return meta;
}

/** Header yang tidak boleh diteruskan antar hop. */
export const HOP_BY_HOP = new Set([
  "connection", "keep-alive", "proxy-authenticate", "proxy-authorization", "proxy-connection",
  "te", "trailer", "transfer-encoding", "upgrade",
]);
