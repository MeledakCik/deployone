import { kv } from "@vercel/kv";
import { getSettings, recordStat } from "@/app/api/_lib/admin";
import { rateLimit } from "@/app/api/_lib/rate-limit";
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
  deleteSiteData,
  encodeChunk,
  expectedChunkCount,
  kSiteChunk,
  kSiteMeta,
  listUserSites,
  loadSite,
  removeUserSite,
  reserveSlug,
  siteUrl,
  sitesEnabled,
  type SiteFile,
  type SiteMeta,
} from "@/app/api/_lib/sites";

/**
 * Batas isi situs lewat MCP. Isi file lewat argumen tool (teks di dalam percakapan), jadi dibatasi lebih kecil
 * dari batas upload dashboard; body request Vercel juga maksimal ±4,5 MB.
 */
export const MCP_MAX_BYTES = Math.min(MAX_SITE_BYTES, 3 * 1024 * 1024);

export interface InlineFile {
  path?: unknown;
  content?: unknown;
  encoding?: unknown;
}

export interface PublishInput {
  name?: unknown;
  files?: unknown;
  ttl_hours?: unknown;
  spa?: unknown;
  replace_site_id?: unknown;
}

export type PublishResult =
  | { ok: true; id: string; url: string; expiresAt: number; fileCount: number; totalBytes: number; replaced: string | null }
  | { ok: false; error: string };

const BASE64_RE = /^[A-Za-z0-9+/\r\n]*={0,2}$/;

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/** Ubah daftar file inline jadi buffer + manifest. Mengembalikan pesan error yang bisa dipahami Claude. */
export function prepareInlineFiles(raw: unknown): { ok: true; files: SiteFile[]; blob: Buffer } | { ok: false; error: string } {
  if (!Array.isArray(raw) || raw.length === 0) {
    return { ok: false, error: "Parameter `files` kosong. Kirim minimal satu file, termasuk `index.html`." };
  }
  if (raw.length > MAX_SITE_FILES) {
    return { ok: false, error: `Terlalu banyak file (maksimal ${MAX_SITE_FILES}).` };
  }

  const files: SiteFile[] = [];
  const parts: Buffer[] = [];
  const seen = new Set<string>();
  let offset = 0;

  for (const [i, f] of (raw as InlineFile[]).entries()) {
    const rawPath = typeof f?.path === "string" ? f.path.replace(/^\.\//, "") : f?.path;
    const path = cleanSitePath(rawPath);
    if (!path) {
      return { ok: false, error: `File #${i + 1}: \`path\` tidak valid. Pakai path relatif seperti \`index.html\` atau \`css/style.css\` (tanpa \`..\`).` };
    }
    if (typeof f.content !== "string") {
      return { ok: false, error: `File \`${path}\`: \`content\` harus berupa string.` };
    }
    const encoding = f.encoding === undefined ? "utf8" : f.encoding;
    if (encoding !== "utf8" && encoding !== "base64") {
      return { ok: false, error: `File \`${path}\`: \`encoding\` harus "utf8" atau "base64".` };
    }
    let buf: Buffer;
    if (encoding === "base64") {
      if (!BASE64_RE.test(f.content)) return { ok: false, error: `File \`${path}\`: isi base64 tidak valid.` };
      buf = Buffer.from(f.content, "base64");
    } else {
      buf = Buffer.from(f.content, "utf8");
    }

    if (seen.has(path)) return { ok: false, error: `File ganda: \`${path}\`.` };
    seen.add(path);

    files.push({ p: path, o: offset, s: buf.length, t: contentTypeFor(path) });
    parts.push(buf);
    offset += buf.length;
    if (offset > MCP_MAX_BYTES) {
      return { ok: false, error: `Ukuran total melebihi ${fmtBytes(MCP_MAX_BYTES)}. Kecilkan gambar atau pakai SVG/CSS inline.` };
    }
  }

  if (!seen.has("index.html")) {
    const nested = [...seen].find((p) => p.endsWith("/index.html"));
    return {
      ok: false,
      error: nested
        ? `Tidak ada \`index.html\` di root. Ada \`${nested}\` — hapus awalan foldernya supaya jadi \`index.html\`.`
        : "Tidak ada `index.html` di root. Link Instan hanya untuk website statis dan butuh `index.html` sebagai halaman utama.",
    };
  }
  return { ok: true, files, blob: Buffer.concat(parts) };
}

/**
 * Publikasikan situs statis dari file inline sebagai Link Instan. Jalurnya setara POST /api/sites + chunk + finish,
 * lengkap dengan pembatasan yang sama (kuota per akun, rate limit, banned, saklar admin).
 */
export async function publishInlineSite(email: string, input: PublishInput, hostHeader: string | null): Promise<PublishResult> {
  if (!sitesEnabled()) {
    return { ok: false, error: "Hosting Link Instan belum diaktifkan oleh admin Depup (TUNNEL_BASE_DOMAIN belum diatur)." };
  }
  if (!(await getSettings()).sitesEnabled) {
    return { ok: false, error: "Link Instan sedang dimatikan sementara oleh admin Depup." };
  }
  if (await kv.exists(`site:ban:${email}`)) {
    return { ok: false, error: "Akun ini dibatasi dari membuat Link Instan karena laporan penyalahgunaan." };
  }

  // Validasi dulu sebelum menyentuh kuota/rate limit: kesalahan format dari Claude tidak boleh memakan jatah.
  const prepared = prepareInlineFiles(input.files);
  if (!prepared.ok) return prepared;

  const ttlHours = (TTL_OPTIONS_HOURS as readonly number[]).includes(Number(input.ttl_hours)) ? Number(input.ttl_hours) : DEFAULT_TTL_HOURS;
  const replaceId = typeof input.replace_site_id === "string" && input.replace_site_id.trim() ? input.replace_site_id.trim() : null;

  const rl = await rateLimit("sites-create-hourly", `u:${email}`, 20, 3600);
  if (!rl.allowed) {
    return { ok: false, error: `Terlalu banyak upload. Coba lagi ${Math.ceil(rl.retryAfterSeconds / 60)} menit lagi.` };
  }

  // Kunci yang sama dengan POST /api/sites: cek-kuota lalu reserve tidak atomik.
  const lockKey = `site:lock:${email}`;
  const gotLock = await kv.set(lockKey, 1, { nx: true, ex: 15 });
  if (!gotLock) return { ok: false, error: "Upload sebelumnya masih diproses. Tunggu sebentar lalu coba lagi." };

  let createdId: string | null = null;
  try {
    const existing = await listUserSites(email, { includePending: true });

    let toReplace: SiteMeta | null = null;
    if (replaceId) {
      toReplace = existing.find((s) => s.id === replaceId) ?? null;
      if (!toReplace) return { ok: false, error: `Situs \`${replaceId}\` tidak ditemukan di akunmu (mungkin sudah kedaluwarsa). Kosongkan \`replace_site_id\` untuk membuat link baru.` };
    }
    const others = existing.filter((s) => s.id !== replaceId).length;
    if (others >= MAX_ACTIVE_SITES_PER_USER) {
      return {
        ok: false,
        error: `Sudah ada ${others} link aktif (maksimal ${MAX_ACTIVE_SITES_PER_USER} per akun). Hapus salah satu dengan \`delete_website\` atau isi \`replace_site_id\` untuk menggantinya.`,
      };
    }

    const { files, blob } = prepared;
    const now = Date.now();
    const ttlMs = ttlHours * 3600 * 1000;
    const meta: Omit<SiteMeta, "id"> = {
      owner: email,
      name: typeof input.name === "string" ? input.name.slice(0, 40) : "",
      status: "pending",
      createdAt: now,
      expiresAt: now + ttlMs,
      spa: input.spa === true,
      totalBytes: blob.length,
      chunkCount: expectedChunkCount(blob.length),
      files,
    };

    const id = await reserveSlug(meta, input.name);
    if (!id) return { ok: false, error: "Gagal membuat nama link unik. Coba lagi." };
    createdId = id;
    await addUserSite(email, id);

    // Simpan potongan satu per satu (sama seperti jalur dashboard) lalu aktifkan. TTL dihitung dari sekarang.
    const ttlSec = Math.ceil(ttlMs / 1000) + 60;
    for (let i = 0; i < meta.chunkCount; i++) {
      await kv.set(kSiteChunk(id, i), encodeChunk(blob.subarray(i * CHUNK_BYTES, (i + 1) * CHUNK_BYTES)), { ex: ttlSec });
    }
    const activatedAt = Date.now();
    const active: SiteMeta = { ...meta, id, status: "active", createdAt: activatedAt, expiresAt: activatedAt + ttlMs };
    await kv.set(kSiteMeta(id), JSON.stringify(active), { ex: ttlSec });
    createdId = null; // sukses: jangan dibersihkan

    if (toReplace) {
      await deleteSiteData(toReplace).catch(() => undefined);
      await removeUserSite(email, toReplace.id).catch(() => undefined);
    }
    await recordStat("sites");

    return {
      ok: true,
      id,
      url: siteUrl(id, hostHeader),
      expiresAt: active.expiresAt,
      fileCount: files.length,
      totalBytes: blob.length,
      replaced: toReplace?.id ?? null,
    };
  } catch (e) {
    console.error("[mcp] publish gagal", (e as Error)?.message);
    return { ok: false, error: "Gagal menyimpan situs di server. Coba lagi sebentar lagi." };
  } finally {
    if (createdId) {
      // Gagal di tengah jalan: buang sisa upload supaya tidak memakan kuota/memori.
      const stale = await loadSite(createdId, { includePending: true }).catch(() => null);
      if (stale) await deleteSiteData(stale).catch(() => undefined);
      await removeUserSite(email, createdId).catch(() => undefined);
    }
    await kv.del(lockKey).catch(() => undefined);
  }
}

export async function listSitesForUser(email: string, hostHeader: string | null) {
  const sites = await listUserSites(email);
  return sites.map((s) => ({
    id: s.id,
    name: s.name,
    url: siteUrl(s.id, hostHeader),
    createdAt: s.createdAt,
    expiresAt: s.expiresAt,
    fileCount: s.files.length,
    totalBytes: s.totalBytes,
  }));
}

export async function deleteSiteForUser(email: string, id: unknown): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  if (typeof id !== "string" || !id.trim()) return { ok: false, error: "Parameter `site_id` wajib diisi." };
  const meta = await loadSite(id.trim(), { includePending: true });
  if (!meta || meta.owner !== email) return { ok: false, error: "Situs tidak ditemukan di akunmu." };
  await deleteSiteData(meta);
  await removeUserSite(email, meta.id);
  return { ok: true, id: meta.id };
}

export const SITE_LIMITS = {
  maxBytes: MCP_MAX_BYTES,
  maxFiles: MAX_SITE_FILES,
  maxSites: MAX_ACTIVE_SITES_PER_USER,
  ttlOptionsHours: TTL_OPTIONS_HOURS,
  defaultTtlHours: DEFAULT_TTL_HOURS,
};
