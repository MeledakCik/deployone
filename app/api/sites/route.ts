import type { NextRequest } from "next/server";
import { kv } from "@vercel/kv";
import { fail, ok, withErrorHandling } from "@/app/api/_lib/response";
import { getSessionEmail } from "@/app/api/_lib/session";
import { rateLimit } from "@/app/api/_lib/rate-limit";
import { getSettings } from "@/app/api/_lib/admin";
import { tunnelBaseDomain } from "@/app/api/_lib/tunnel";
import {
  CHUNK_BYTES,
  DEFAULT_TTL_HOURS,
  MAX_ACTIVE_SITES_PER_USER,
  MAX_SITE_BYTES,
  MAX_SITE_FILES,
  TTL_OPTIONS_HOURS,
  addUserSite,
  cleanSitePath,
  contentTypeFor,
  expectedChunkCount,
  listUserSites,
  reserveSlug,
  siteUrl,
  sitesEnabled,
  type SiteFile,
  type SiteMeta,
} from "@/app/api/_lib/sites";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/** GET /api/sites — konfigurasi fitur + daftar situs aktif milik user. */
export const GET = withErrorHandling(async (req: NextRequest) => {
  const email = getSessionEmail(req);
  if (!email) return fail("Sesi login habis. Silakan login lagi.", 401, "unauthorized");

  const enabled = sitesEnabled() && (await getSettings()).sitesEnabled;
  const sites = enabled ? await listUserSites(email) : [];
  return ok({
    enabled,
    baseDomain: tunnelBaseDomain(),
    maxBytes: MAX_SITE_BYTES,
    maxFiles: MAX_SITE_FILES,
    maxSites: MAX_ACTIVE_SITES_PER_USER,
    chunkBytes: CHUNK_BYTES,
    ttlOptionsHours: TTL_OPTIONS_HOURS,
    defaultTtlHours: DEFAULT_TTL_HOURS,
    sites: sites.map((s) => ({
      id: s.id,
      name: s.name,
      url: siteUrl(s.id, req.headers.get("host")),
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
      totalBytes: s.totalBytes,
      fileCount: s.files.length,
      spa: s.spa,
    })),
  });
});

/**
 * POST /api/sites — langkah 1: daftarkan situs + daftar file (path & ukuran).
 * Isi file dikirim sesudahnya per potongan lewat PUT /api/sites/:id/chunk?i=N
 * (body Vercel dibatasi ±4,5 MB, jadi tidak bisa sekali kirim).
 * Body: { name?: string, ttlHours?: number, spa?: boolean, files: {path, size}[] }
 */
export const POST = withErrorHandling(async (req: NextRequest) => {
  const email = getSessionEmail(req);
  if (!email) return fail("Sesi login habis. Silakan login lagi.", 401, "unauthorized");
  if (!sitesEnabled()) {
    return fail(
      "Hosting Link Instan belum diaktifkan oleh admin (TUNNEL_BASE_DOMAIN belum diatur).",
      503
    );
  }

  if (!(await getSettings()).sitesEnabled) {
    return fail("Link Instan sedang dimatikan sementara oleh admin Depup.", 503);
  }

  const rl = await rateLimit("sites-create-hourly", `u:${email}`, 20, 3600);
  if (!rl.allowed) {
    return fail(`Terlalu banyak upload. Coba lagi ${Math.ceil(rl.retryAfterSeconds / 60)} menit lagi.`, 429, "rate_limited");
  }

  // Serialkan pembuatan situs per user: cek-kuota lalu reserve tidak atomik, jadi tanpa kunci ini
  // request paralel bisa melewati batas dan memenuhi memori Redis.
  const lockKey = `site:lock:${email}`;
  const gotLock = await kv.set(lockKey, 1, { nx: true, ex: 15 });
  if (!gotLock) {
    return fail("Upload sebelumnya masih diproses. Tunggu sebentar lalu coba lagi.", 429, "rate_limited");
  }
  try {
    return await createSite(req, email);
  } finally {
    await kv.del(lockKey).catch(() => undefined);
  }
});

async function createSite(req: NextRequest, email: string) {
  if (await kv.exists(`site:ban:${email}`)) {
    return fail("Akun ini dibatasi dari membuat Link Instan karena laporan penyalahgunaan.", 403, "unauthorized");
  }
  let body: { name?: unknown; ttlHours?: unknown; spa?: unknown; files?: unknown };
  try {
    body = await req.json();
  } catch {
    return fail("Body harus berupa JSON.", 400, "bad_request");
  }

  // includePending: upload yang belum di-finish SUDAH memakan memori Redis, jadi harus dihitung.
  const existing = await listUserSites(email, { includePending: true });
  if (existing.length >= MAX_ACTIVE_SITES_PER_USER) {
    return fail(
      `Maksimal ${MAX_ACTIVE_SITES_PER_USER} link per akun (termasuk upload yang belum selesai). Hapus salah satu dulu atau tunggu sampai kedaluwarsa.`,
      409,
      "bad_request"
    );
  }

  if (!Array.isArray(body.files) || body.files.length === 0) {
    return fail("Tidak ada file yang dikirim.", 400, "bad_request");
  }
  if (body.files.length > MAX_SITE_FILES) {
    return fail(`Terlalu banyak file (maksimal ${MAX_SITE_FILES}).`, 400, "bad_request");
  }

  const files: SiteFile[] = [];
  const seen = new Set<string>();
  let offset = 0;
  for (const raw of body.files as { path?: unknown; size?: unknown }[]) {
    const path = cleanSitePath(raw?.path);
    const size = typeof raw?.size === "number" ? raw.size : NaN;
    if (!path || !Number.isInteger(size) || size < 0) {
      return fail("Daftar file tidak valid.", 400, "bad_request");
    }
    if (seen.has(path)) return fail(`File ganda: ${path}`, 400, "bad_request");
    seen.add(path);
    files.push({ p: path, o: offset, s: size, t: contentTypeFor(path) });
    offset += size;
    if (offset > MAX_SITE_BYTES) {
      return fail(`Ukuran total melebihi ${MAX_SITE_BYTES / 1024 / 1024} MB.`, 413, "bad_request");
    }
  }
  if (!seen.has("index.html")) {
    return fail("Tidak ada index.html di root. Link Instan hanya untuk website statis (HTML/CSS/JS hasil build).", 400, "bad_request");
  }

  const ttlHours = (TTL_OPTIONS_HOURS as readonly number[]).includes(Number(body.ttlHours))
    ? Number(body.ttlHours)
    : DEFAULT_TTL_HOURS;
  const now = Date.now();
  const meta: Omit<SiteMeta, "id"> = {
    owner: email,
    name: typeof body.name === "string" ? body.name.slice(0, 40) : "",
    status: "pending",
    createdAt: now,
    expiresAt: now + ttlHours * 3600 * 1000,
    spa: body.spa === true,
    totalBytes: offset,
    chunkCount: expectedChunkCount(offset),
    files,
  };

  const id = await reserveSlug(meta, body.name);
  if (!id) return fail("Gagal membuat nama link unik. Coba lagi.", 500);
  // Catat langsung di daftar user (status pending) supaya terhitung di kuota.
  await addUserSite(email, id);

  return ok({ id, url: siteUrl(id, req.headers.get("host")), chunkBytes: CHUNK_BYTES, chunkCount: meta.chunkCount, expiresAt: meta.expiresAt });
}
