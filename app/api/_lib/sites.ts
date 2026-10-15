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

export const CHUNK_BYTES = 512 * 1024;
export const MAX_SITE_BYTES = 20 * 1024 * 1024;
export const MAX_SITE_FILES = 500;
export const MAX_ACTIVE_SITES_PER_USER = 5;
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

export function siteUrl(slug: string): string {
  return `https://${slug}.${tunnelBaseDomain()}/`;
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

export async function loadSite(id: string, opts?: { includePending?: boolean }): Promise<SiteMeta | null> {
  if (!id || !SLUG_RE.test(id)) return null;
  const meta = parseKv<SiteMeta>(await kv.get(kSiteMeta(id)));
  if (!meta || typeof meta.expiresAt !== "number" || !Array.isArray(meta.files)) return null;
  if (meta.expiresAt <= Date.now()) return null;
  if (meta.status !== "active" && !opts?.includePending) return null;
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

/** Situs aktif milik user (yang sudah kedaluwarsa dibersihkan dari daftar). */
export async function listUserSites(email: string): Promise<SiteMeta[]> {
  const ids = await readUserIds(email);
  if (ids.length === 0) return [];
  const metas = await Promise.all(ids.map((id) => loadSite(id)));
  const alive = metas.filter((m): m is SiteMeta => !!m && m.owner === email);
  if (alive.length !== ids.length) {
    await kv.set(kUserSites(email), JSON.stringify(alive.map((m) => m.id)));
  }
  return alive.sort((a, b) => b.createdAt - a.createdAt);
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

export async function readSiteFile(meta: SiteMeta, file: SiteFile): Promise<Buffer | null> {
  if (file.s === 0) return Buffer.alloc(0);
  const first = Math.floor(file.o / CHUNK_BYTES);
  const last = Math.floor((file.o + file.s - 1) / CHUNK_BYTES);
  const keys: string[] = [];
  for (let i = first; i <= last; i++) keys.push(kSiteChunk(meta.id, i));
  const parts = await kv.mget<unknown[]>(...keys);
  if (parts.some((p) => p == null)) return null;
  const joined = Buffer.concat(parts.map(decodeChunk));
  const start = file.o - first * CHUNK_BYTES;
  return joined.subarray(start, start + file.s);
}

export async function deleteSiteData(meta: SiteMeta): Promise<void> {
  const keys = [kSiteMeta(meta.id)];
  for (let i = 0; i < meta.chunkCount; i++) keys.push(kSiteChunk(meta.id, i));
  await kv.del(...keys);
}
