import { kv } from "@vercel/kv";
import {
  SLUG_RE,
  TUNNEL_RESERVED,
  kMeta as kTunnelMeta,
  parseKv,
  randomPrefix,
  randomSuffix,
  sanitizePrefix,
  tunnelBaseDomain,
  tunnelEnabled,
} from "@/app/api/_lib/tunnel";

/**
 * Hosting statis "Link Instan": user upload zip/folder dari dashboard, file disimpan
 * di KV, lalu disajikan di https://<slug>.<TUNNEL_BASE_DOMAIN>/ (rewrite oleh middleware
 * ke app/t/[slug], yang mengecek situs statis lebih dulu sebelum tunnel).
 *
 * Penyimpanan: semua file digabung jadi satu blob lalu dipotong per CHUNK_BYTES.
 * Tiap potongan = satu key KV (base64, < 1 MB). Manifest (path → offset/size/type)
 * ada di meta. Dengan begitu file besar tidak terbentur limit 1 MB per value KV.
 */

function envInt(name: string, def: number, min: number, max: number): number {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n >= min ? Math.min(Math.floor(n), max) : def;
}

export const CHUNK_BYTES = 512 * 1024;
/**
 * Semua isi situs disimpan di Redis (base64, +33%). Batas per-user ini = batas memori Redis
 * kamu / jumlah user. Bisa diubah lewat env: SITES_MAX_MB (default 10), SITES_MAX_PER_USER (default 3).
 */
export const MAX_SITE_BYTES = envInt("SITES_MAX_MB", 10, 1, 50) * 1024 * 1024;
export const MAX_SITE_FILES = 500;
export const MAX_ACTIVE_SITES_PER_USER = envInt("SITES_MAX_PER_USER", 3, 1, 10);
export const TTL_OPTIONS_HOURS = [1, 6, 24, 72, 168] as const;
export const DEFAULT_TTL_HOURS = 24;
/** Upload yang tidak di-finish dibuang setelah ini. */
export const PENDING_TTL_SECONDS = 3600;

export const kSiteMeta = (id: string) => `site:meta:${id}`;
export const kSiteChunk = (id: string, i: number) => `site:c:${id}:${i}`;
export const kUserSites = (email: string) => `site:user:${email}`;

export interface SiteFile {
  /** Path relatif tanpa "/" di depan. */
  p: string;
  /** Offset di dalam blob gabungan. */
  o: number;
  /** Ukuran byte. */
  s: number;
  /** Content-Type final (ditentukan server dari ekstensi). */
  t: string;
}

export interface SiteMeta {
  id: string;
  owner: string;
  name: string;
  status: "pending" | "active";
  createdAt: number;
  expiresAt: number;
  spa: boolean;
  totalBytes: number;
  chunkCount: number;
  files: SiteFile[];
}

/** Hosting statis butuh subdomain terpisah: JS milik user TIDAK boleh jalan di origin dashboard. */
export function sitesEnabled(): boolean {
  return tunnelEnabled() && tunnelBaseDomain() !== null;
}

export function siteUrl(slug: string, hostHeader?: string | null): string {
  const base = tunnelBaseDomain();
  // Tes lokal: TUNNEL_BASE_DOMAIN=localhost -> http://<slug>.localhost:<port>/ (browser modern
  // me-resolve *.localhost ke 127.0.0.1). Port diambil dari alamat yang dipakai user saat ini.
  if (base === "localhost" || base?.endsWith(".localhost")) {
    const port = /:(\d+)$/.exec(hostHeader ?? "")?.[1] ?? process.env.PORT ?? "3000";
    return `http://${slug}.${base}:${port}/`;
  }
  return `https://${slug}.${base}/`;
}

/* ---------- content type ---------- */

const TYPES: Record<string, string> = {
  html: "text/html; charset=utf-8",
  htm: "text/html; charset=utf-8",
  css: "text/css; charset=utf-8",
  js: "text/javascript; charset=utf-8",
  mjs: "text/javascript; charset=utf-8",
  json: "application/json; charset=utf-8",
  map: "application/json; charset=utf-8",
  webmanifest: "application/manifest+json; charset=utf-8",
  txt: "text/plain; charset=utf-8",
  md: "text/plain; charset=utf-8",
  xml: "application/xml; charset=utf-8",
  csv: "text/csv; charset=utf-8",
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  ico: "image/x-icon",
  bmp: "image/bmp",
  woff: "font/woff",
  woff2: "font/woff2",
  ttf: "font/ttf",
  otf: "font/otf",
  mp4: "video/mp4",
  webm: "video/webm",
  mp3: "audio/mpeg",
  ogg: "audio/ogg",
  wav: "audio/wav",
  pdf: "application/pdf",
  wasm: "application/wasm",
  zip: "application/zip",
};

export function contentTypeFor(path: string): string {
  const name = path.split("/").pop() ?? "";
  const dot = name.lastIndexOf(".");
  const ext = dot === -1 ? "" : name.slice(dot + 1).toLowerCase();
  return TYPES[ext] ?? "application/octet-stream";
}

/* ---------- validasi input ---------- */

export function cleanSitePath(raw: unknown): string | null {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 300) return null;
  const p = raw.replace(/\\/g, "/").replace(/^\/+/, "");
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(p)) return null;
  const segs = p.split("/");
  if (segs.some((s) => s === "" || s === "." || s === "..")) return null;
  return segs.join("/");
}

export function expectedChunkCount(totalBytes: number): number {
  return Math.max(1, Math.ceil(totalBytes / CHUNK_BYTES));
}

export function expectedChunkSize(totalBytes: number, index: number): number {
  const count = expectedChunkCount(totalBytes);
  if (index < 0 || index >= count) return -1;
  if (index < count - 1) return CHUNK_BYTES;
  return totalBytes - CHUNK_BYTES * (count - 1);
}

/* ---------- akses meta ---------- */

function validMeta(meta: SiteMeta | null, includePending?: boolean): SiteMeta | null {
  if (!meta || typeof meta.expiresAt !== "number" || !Array.isArray(meta.files)) return null;
  if (meta.expiresAt <= Date.now()) return null;
  if (meta.status !== "active" && !includePending) return null;
  return meta;
}

export async function loadSite(id: string, opts?: { includePending?: boolean }): Promise<SiteMeta | null> {
  if (!id || !SLUG_RE.test(id)) return null;
  return validMeta(parseKv<SiteMeta>(await kv.get(kSiteMeta(id))), opts?.includePending);
}

/**
 * Versi untuk jalur PUBLIK (pengunjung situs / tunnel). Manifest bisa berukuran puluhan KB dan
 * dibaca untuk SETIAP file yang diminta halaman; hasilnya (termasuk "tidak ada") di-cache
 * singkat di memori instance. Situs yang dihapus bisa masih tersaji ≤ SITE_CACHE_MS.
 * JANGAN dipakai untuk route dashboard (upload/finish/delete) — butuh data segar.
 */
const SITE_CACHE_MS = 30_000;
const SITE_CACHE_MAX = 200;
const siteCache = new Map<string, { meta: SiteMeta | null; until: number }>();

export async function loadSiteCached(id: string): Promise<SiteMeta | null> {
  if (!id || !SLUG_RE.test(id)) return null;
  const now = Date.now();
  const hit = siteCache.get(id);
  if (hit && hit.until > now) return validMeta(hit.meta);
  const meta = await loadSite(id);
  if (siteCache.size >= SITE_CACHE_MAX) siteCache.clear();
  siteCache.set(id, { meta, until: now + SITE_CACHE_MS });
  return meta;
}

/** Buat slug unik: <awalan>-<5 acak>. NX menjamin tidak menimpa situs/tunnel lain. */
export async function reserveSlug(meta: Omit<SiteMeta, "id">, name: unknown): Promise<string | null> {
  const prefix = sanitizePrefix(name) ?? randomPrefix();
  for (let i = 0; i < 6; i++) {
    const candidate = `${prefix}-${randomSuffix(5)}`;
    if (!SLUG_RE.test(candidate) || TUNNEL_RESERVED.has(candidate)) continue;
    if (await kv.exists(kTunnelMeta(candidate))) continue;
    const full: SiteMeta = { ...meta, id: candidate };
    const res = await kv.set(kSiteMeta(candidate), JSON.stringify(full), { nx: true, ex: PENDING_TTL_SECONDS });
    if (res) return candidate;
  }
  return null;
}

/* ---------- daftar situs per user ---------- */

async function readUserIds(email: string): Promise<string[]> {
  const raw = parseKv<string[]>(await kv.get(kUserSites(email)));
  return Array.isArray(raw) ? raw.filter((x) => typeof x === "string") : [];
}

/**
 * Situs milik user (yang sudah kedaluwarsa dibersihkan dari daftar). Default hanya yang aktif;
 * `includePending` ikut menghitung upload yang belum di-finish — WAJIB dipakai saat mengecek kuota,
 * kalau tidak, upload "pending" (yang sudah memakan memori Redis) tidak terhitung.
 * Semua manifest dibaca dengan SATU mget, bukan satu get per situs.
 */
export async function listUserSites(email: string, opts?: { includePending?: boolean }): Promise<SiteMeta[]> {
  const ids = await readUserIds(email);
  if (ids.length === 0) return [];
  const raws = await kv.mget<unknown[]>(...ids.map(kSiteMeta));
  const metas = raws.map((r) => validMeta(parseKv<SiteMeta>(r), true));
  const alive = metas.filter((m): m is SiteMeta => !!m && m.owner === email);
  if (alive.length !== ids.length) {
    await kv.set(kUserSites(email), JSON.stringify(alive.map((m) => m.id)));
  }
  const out = opts?.includePending ? alive : alive.filter((m) => m.status === "active");
  return out.sort((a, b) => b.createdAt - a.createdAt);
}

export async function addUserSite(email: string, id: string): Promise<void> {
  const ids = await readUserIds(email);
  if (!ids.includes(id)) ids.push(id);
  await kv.set(kUserSites(email), JSON.stringify(ids));
}

export async function removeUserSite(email: string, id: string): Promise<void> {
  const ids = (await readUserIds(email)).filter((x) => x !== id);
  await kv.set(kUserSites(email), JSON.stringify(ids));
}

/* ---------- baca isi file ---------- */

/** Chunk disimpan dengan awalan "x" supaya KV tidak pernah menganggapnya JSON/angka. */
export const encodeChunk = (buf: Buffer) => "x" + buf.toString("base64");
export const decodeChunk = (v: unknown) => Buffer.from(String(v).slice(1), "base64");

/**
 * LRU kecil untuk potongan yang sudah di-decode. File kecil berbagi potongan 512 KB (~700 KB base64)
 * dengan file lain, jadi tanpa cache, tiap CSS/JS/gambar kecil menarik ulang ratusan KB dari Redis.
 * Dibatasi ukuran total supaya tidak menghabiskan memori function.
 */
const CHUNK_CACHE_MAX_BYTES = 24 * 1024 * 1024;
const CHUNK_CACHE_TTL_MS = 60_000;
const chunkCache = new Map<string, { buf: Buffer; until: number }>();
let chunkCacheBytes = 0;

function chunkCacheGet(key: string): Buffer | null {
  const hit = chunkCache.get(key);
  if (!hit) return null;
  if (hit.until <= Date.now()) {
    chunkCache.delete(key);
    chunkCacheBytes -= hit.buf.length;
    return null;
  }
  // segarkan urutan LRU (Map menjaga urutan sisip)
  chunkCache.delete(key);
  chunkCache.set(key, hit);
  return hit.buf;
}

function chunkCachePut(key: string, buf: Buffer): void {
  if (buf.length > CHUNK_CACHE_MAX_BYTES / 2) return;
  const old = chunkCache.get(key);
  if (old) chunkCacheBytes -= old.buf.length;
  chunkCache.set(key, { buf, until: Date.now() + CHUNK_CACHE_TTL_MS });
  chunkCacheBytes += buf.length;
  for (const k of chunkCache.keys()) {
    if (chunkCacheBytes <= CHUNK_CACHE_MAX_BYTES) break;
    const ev = chunkCache.get(k);
    chunkCache.delete(k);
    if (ev) chunkCacheBytes -= ev.buf.length;
  }
}

export async function readSiteFile(meta: SiteMeta, file: SiteFile): Promise<Buffer | null> {
  if (file.s === 0) return Buffer.alloc(0);
  const first = Math.floor(file.o / CHUNK_BYTES);
  const last = Math.floor((file.o + file.s - 1) / CHUNK_BYTES);

  const bufs: (Buffer | null)[] = [];
  const missing: number[] = [];
  for (let i = first; i <= last; i++) {
    const cached = chunkCacheGet(kSiteChunk(meta.id, i));
    bufs.push(cached);
    if (!cached) missing.push(i);
  }
  if (missing.length > 0) {
    const parts = await kv.mget<unknown[]>(...missing.map((i) => kSiteChunk(meta.id, i)));
    if (parts.some((p) => p == null)) return null;
    missing.forEach((chunkIndex, n) => {
      const buf = decodeChunk(parts[n]);
      chunkCachePut(kSiteChunk(meta.id, chunkIndex), buf);
      bufs[chunkIndex - first] = buf;
    });
  }
  const joined = Buffer.concat(bufs as Buffer[]);
  const start = file.o - first * CHUNK_BYTES;
  return joined.subarray(start, start + file.s);
}

export async function deleteSiteData(meta: SiteMeta): Promise<void> {
  const keys = [kSiteMeta(meta.id)];
  for (let i = 0; i < meta.chunkCount; i++) keys.push(kSiteChunk(meta.id, i));
  await kv.del(...keys);
}
