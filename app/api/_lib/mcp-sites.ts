import zlib from "node:zlib";
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
  invalidateSiteCache,
  expectedChunkCount,
  kSiteChunk,
  kSiteMeta,
  listUserSites,
  loadSite,
  loadSiteStats,
  readSiteFile,
  removeUserSite,
  reserveSlug,
  siteUrl,
  sitesEnabled,
  type SiteFile,
  type SiteMeta,
  type SiteStats,
} from "@/app/api/_lib/sites";

/**
 * Batas isi situs per sekali panggil `deploy_website` (3 MB), sedangkan total situs yang diupdate bertahap
 * lewat `update_website` boleh sampai batas penuh Link Instan (`MAX_SITE_BYTES`, default 10 MB).
 */
export const MCP_MAX_BYTES = Math.min(MAX_SITE_BYTES, 3 * 1024 * 1024);
export const MCP_STAGE_MAX_BYTES = MAX_SITE_BYTES;

export interface InlineFile {
  path?: unknown;
  content?: unknown;
  encoding?: unknown;
}

export interface FilePatch {
  path?: unknown;
  find?: unknown;
  replace?: unknown;
  all?: unknown;
}

export interface PublishInput {
  name?: unknown;
  files?: unknown;
  ttl_hours?: unknown;
  spa?: unknown;
  replace_site_id?: unknown;
  /** Jika true dan replace_site_id diisi, file lama yang tidak disebut di `files` tetap dipertahankan. */
  keep_existing_files?: unknown;
  /** Jika true, otomatis buang folder pembungkus (mis. `dist/index.html` -> `index.html`). */
  auto_strip_prefix?: unknown;
}

export interface UpdateSiteInput {
  site_id?: unknown;
  /** File baru atau file yang ingin ditimpa penuh. */
  files?: unknown;
  /** Potongan isi yang ingin disambung (append) ke akhir file — cocok untuk `index.html` besar yang dikirim bertahap. */
  append_files?: unknown;
  /** Edit cari-dan-ganti (search & replace) pada file teks tanpa harus mengirim ulang seluruh isi `index.html`. */
  patches?: unknown;
  /** Daftar path file yang ingin dihapus dari situs. */
  delete_paths?: unknown;
  /** Perpanjang/ubah masa aktif situs (opsional). */
  ttl_hours?: unknown;
  /** Ubah mode SPA (opsional). */
  spa?: unknown;
}

export interface InspectSiteInput {
  site_id?: unknown;
  /** Opsional: baca isi satu file tertentu dari situs (mis. `index.html`). */
  read_path?: unknown;
  /** Baris awal (1-indexed) saat membaca file besar. */
  start_line?: unknown;
  /** Baris akhir (1-indexed, inklusif) saat membaca file besar. */
  end_line?: unknown;
}

export type PublishResult =
  | {
      ok: true;
      id: string;
      url: string;
      expiresAt: number;
      fileCount: number;
      totalBytes: number;
      replaced: string | null;
      warnings: string[];
    }
  | { ok: false; error: string };

export type UpdateSiteResult =
  | {
      ok: true;
      id: string;
      url: string;
      expiresAt: number;
      fileCount: number;
      totalBytes: number;
      updatedPaths: string[];
      deletedPaths: string[];
      warnings: string[];
    }
  | { ok: false; error: string };

export type InspectSiteResult =
  | {
      ok: true;
      id: string;
      name: string;
      url: string;
      createdAt: number;
      expiresAt: number;
      spa: boolean;
      totalBytes: number;
      fileCount: number;
      files: { path: string; size: number; contentType: string }[];
      stats: SiteStats | null;
      warnings: string[];
      fileContent?: {
        path: string;
        totalBytes: number;
        totalLines: number;
        startLine: number;
        endLine: number;
        content: string;
        truncated: boolean;
      };
    }
  | { ok: false; error: string };

const BASE64_RE = /^[A-Za-z0-9+/\r\n]*={0,2}$/;

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/** Decode satu file inline (`utf8`, `base64`, atau `gzip+base64`). */
function decodeInlineContent(
  path: string,
  content: unknown,
  encodingRaw: unknown,
  maxBytes: number,
): { ok: true; buf: Buffer } | { ok: false; error: string } {
  if (typeof content !== "string") {
    return { ok: false, error: `File \`${path}\`: \`content\` harus berupa string.` };
  }
  const encoding = encodingRaw === undefined ? "utf8" : encodingRaw;
  if (encoding !== "utf8" && encoding !== "base64" && encoding !== "gzip+base64") {
    return { ok: false, error: `File \`${path}\`: \`encoding\` harus "utf8", "base64", atau "gzip+base64".` };
  }
  if (encoding === "base64" || encoding === "gzip+base64") {
    const cleaned = content.trim();
    if (!BASE64_RE.test(cleaned)) return { ok: false, error: `File \`${path}\`: isi base64 tidak valid.` };
    const rawBuf = Buffer.from(cleaned, "base64");
    if (encoding === "gzip+base64") {
      try {
        const unzipped = zlib.gunzipSync(rawBuf, { maxOutputLength: maxBytes + 1 });
        return { ok: true, buf: unzipped };
      } catch {
        return { ok: false, error: `File \`${path}\`: isi gzip+base64 tidak valid atau melebihi batas ukuran.` };
      }
    }
    return { ok: true, buf: rawBuf };
  }
  return { ok: true, buf: Buffer.from(content, "utf8") };
}

/**
 * Periksa kesehatan file HTML di dalam situs:
 * 1) Apakah ada `index.html` yang tampak terpotong (belum ada tag penutup `</html>` atau `</body>` pada file besar)?
 * 2) Apakah ada `href` / `src` lokal di `index.html` atau halaman lain yang mengarah ke file yang belum diupload / salah huruf besar-kecil?
 */
export function checkMcpSiteHealth(entries: { path: string; buf: Buffer }[]): string[] {
  const warnings: string[] = [];
  const exact = new Set(entries.map((e) => e.path));
  const lower = new Map<string, string>();
  for (const e of entries) lower.set(e.path.toLowerCase(), e.path);

  const exists = (targetPath: string, ci: boolean): string | null => {
    const forms =
      targetPath === ""
        ? ["index.html"]
        : targetPath.endsWith("/")
          ? [targetPath + "index.html"]
          : [targetPath, targetPath + ".html", targetPath + "/index.html"];
    for (const x of forms) {
      if (!ci && exact.has(x)) return x;
      if (ci) {
        const hit = lower.get(x.toLowerCase());
        if (hit) return hit;
      }
    }
    return null;
  };

  const missingRefs: string[] = [];
  const caseIssues: string[] = [];
  const seenRef = new Set<string>();

  for (const e of entries) {
    if (!/\.html?$/i.test(e.path) || e.buf.length > 2 * 1024 * 1024) continue;
    const rawHtml = e.buf.toString("utf8");

    // Deteksi file HTML besar yang terpotong di tengah jalan
    if (rawHtml.length > 2048 && /<html[\s>]/i.test(rawHtml) && !/<\/html\s*>/i.test(rawHtml)) {
      warnings.push(
        `File \`${e.path}\` terlihat belum memiliki penutup \`</html>\` (mungkin terpotong karena panjang). Gunakan tool \`update_website\` dengan \`append_files\` untuk menyambung sisanya.`,
      );
    }

    const html = rawHtml.replace(/<!--[\s\S]*?-->/g, "").replace(/<script[\s\S]*?<\/script>/gi, (m) => {
      // tetap pertahankan tag <script src="..."> tapi buang isi inline script supaya regex href/src tidak salah tangkap
      const open = /^<script[^>]*>/i.exec(m)?.[0] ?? "";
      return open + "</script>";
    });
    const dir = e.path.includes("/") ? e.path.slice(0, e.path.lastIndexOf("/") + 1) : "";
    const re = /\b(?:href|src)\s*=\s*["']([^"']+)["']/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html))) {
      const raw = m[1].trim();
      if (
        !raw ||
        raw.startsWith("#") ||
        raw.startsWith("//") ||
        /^[a-z][a-z0-9+.-]*:/i.test(raw) ||
        /[{}<>$]/.test(raw)
      ) {
        continue;
      }
      let ref = raw.split("#")[0].split("?")[0];
      if (!ref) continue;
      try {
        ref = decodeURI(ref);
      } catch {
        /* biarkan */
      }
      const segs = (ref.startsWith("/") ? ref.slice(1) : dir + ref).split("/");
      const out: string[] = [];
      let escaped = false;
      for (const sg of segs) {
        if (sg === "." || sg === "") continue;
        if (sg === "..") {
          if (out.length === 0) escaped = true;
          else out.pop();
          continue;
        }
        out.push(sg);
      }
      if (escaped) continue;
      const target = out.join("/") + (ref.endsWith("/") && out.length > 0 ? "/" : "");
      const key = `${e.path}->${target}`;
      if (seenRef.has(key)) continue;
      seenRef.add(key);
      if (exists(target, false)) continue;
      const ciHit = exists(target, true);
      if (ciHit) {
        caseIssues.push(`\`${e.path}\` memanggil "${raw}" (beda huruf besar/kecil dengan \`${ciHit}\`)`);
      } else {
        missingRefs.push(`\`${e.path}\` -> \`${raw}\``);
      }
    }
  }

  if (caseIssues.length > 0) {
    warnings.push(
      `Ditemukan ${caseIssues.length} referensi file yang beda huruf besar/kecil: ${caseIssues.slice(0, 3).join("; ")}. Perbaiki dengan \`update_website\`.`,
    );
  }
  if (missingRefs.length > 0) {
    warnings.push(
      `Ditemukan ${missingRefs.length} file/halaman lokal yang dipanggil di HTML tetapi belum diupload: ${missingRefs.slice(0, 4).join(", ")}. Kamu bisa menyusulkannya lewat \`update_website\` tanpa mengganti URL.`,
    );
  }
  return warnings;
}

/** Simpan blob gabungan + manifest ke KV secara paralel lewat pipeline. */
async function writeSiteChunksAndMeta(id: string, active: SiteMeta, blob: Buffer, ttlSec: number): Promise<void> {
  const pipe = kv.pipeline();
  for (let i = 0; i < active.chunkCount; i++) {
    pipe.set(kSiteChunk(id, i), encodeChunk(blob.subarray(i * CHUNK_BYTES, (i + 1) * CHUNK_BYTES)), { ex: ttlSec });
  }
  pipe.set(kSiteMeta(id), JSON.stringify(active), { ex: ttlSec });
  await pipe.exec();
  invalidateSiteCache(id, active.chunkCount + 10);
}

/** Baca seluruh file dari situs yang sudah ada di KV menjadi Map<path, Buffer>. */
async function loadExistingFilesMap(meta: SiteMeta): Promise<Map<string, Buffer> | null> {
  const map = new Map<string, Buffer>();
  for (const f of meta.files) {
    const buf = await readSiteFile(meta, f);
    if (!buf) return null;
    map.set(f.p, buf);
  }
  return map;
}

/** Susun daftar file (Map<path, Buffer>) menjadi manifest SiteFile[] + blob gabungan. */
function packFilesMap(
  fileMap: Map<string, Buffer>,
  maxBytes: number,
): { ok: true; files: SiteFile[]; blob: Buffer; warnings: string[] } | { ok: false; error: string } {
  if (fileMap.size === 0) {
    return { ok: false, error: "Situs harus memiliki minimal satu file (`index.html`)." };
  }
  if (fileMap.size > MAX_SITE_FILES) {
    return { ok: false, error: `Terlalu banyak file (maksimal ${MAX_SITE_FILES}).` };
  }
  if (!fileMap.has("index.html")) {
    const nested = [...fileMap.keys()].find((p) => p.endsWith("/index.html"));
    return {
      ok: false,
      error: nested
        ? `Tidak ada \`index.html\` di root. Ada \`${nested}\` — hapus awalan foldernya supaya jadi \`index.html\`.`
        : "Tidak ada `index.html` di root. Link Instan hanya untuk website statis dan butuh `index.html` sebagai halaman utama.",
    };
  }

  const files: SiteFile[] = [];
  const parts: Buffer[] = [];
  const entriesForHealth: { path: string; buf: Buffer }[] = [];
  let offset = 0;

  for (const [path, buf] of fileMap.entries()) {
    files.push({ p: path, o: offset, s: buf.length, t: contentTypeFor(path) });
    parts.push(buf);
    entriesForHealth.push({ path, buf });
    offset += buf.length;
    if (offset > maxBytes) {
      return { ok: false, error: `Ukuran total melebihi ${fmtBytes(maxBytes)}. Kecilkan gambar atau pakai SVG/CSS inline.` };
    }
  }

  const warnings = checkMcpSiteHealth(entriesForHealth);
  return { ok: true, files, blob: Buffer.concat(parts), warnings };
}

/** Ubah daftar file inline jadi buffer + manifest. Mengembalikan pesan error yang bisa dipahami Claude. */
export function prepareInlineFiles(
  raw: unknown,
  opts?: { autoStripPrefix?: boolean; baseFiles?: Map<string, Buffer>; maxBytes?: number },
): { ok: true; files: SiteFile[]; blob: Buffer; warnings: string[] } | { ok: false; error: string } {
  const maxBytes = opts?.maxBytes ?? MCP_MAX_BYTES;
  if (!Array.isArray(raw) || raw.length === 0) {
    return { ok: false, error: "Parameter `files` kosong. Kirim minimal satu file, termasuk `index.html`." };
  }
  if (raw.length > MAX_SITE_FILES) {
    return { ok: false, error: `Terlalu banyak file (maksimal ${MAX_SITE_FILES}).` };
  }

  const parsedEntries: { path: string; buf: Buffer }[] = [];
  const seen = new Set<string>();
  let incomingBytes = 0;

  for (const [i, f] of (raw as InlineFile[]).entries()) {
    const rawPath = typeof f?.path === "string" ? f.path.replace(/^\.\//, "") : f?.path;
    const path = cleanSitePath(rawPath);
    if (!path) {
      return {
        ok: false,
        error: `File #${i + 1}: \`path\` tidak valid. Pakai path relatif seperti \`index.html\` atau \`css/style.css\` (tanpa \`..\`).`,
      };
    }
    const decoded = decodeInlineContent(path, f?.content, f?.encoding, maxBytes);
    if (!decoded.ok) return decoded;

    if (seen.has(path)) return { ok: false, error: `File ganda: \`${path}\`.` };
    seen.add(path);

    incomingBytes += decoded.buf.length;
    if (incomingBytes > maxBytes) {
      return { ok: false, error: `Ukuran total melebihi ${fmtBytes(maxBytes)}. Kecilkan gambar atau pakai SVG/CSS inline.` };
    }
    parsedEntries.push({ path, buf: decoded.buf });
  }

  // Jika autoStripPrefix aktif dan tidak ada index.html di root tetapi semua file punya prefix folder yang sama:
  if (opts?.autoStripPrefix && !seen.has("index.html")) {
    const indexCandidate = parsedEntries.find((e) => e.path.endsWith("/index.html"));
    if (indexCandidate) {
      const prefix = indexCandidate.path.slice(0, -"index.html".length);
      if (prefix && parsedEntries.every((e) => e.path.startsWith(prefix))) {
        for (const e of parsedEntries) {
          e.path = e.path.slice(prefix.length);
        }
      }
    }
  }

  const merged = new Map<string, Buffer>(opts?.baseFiles ? opts.baseFiles.entries() : []);
  for (const e of parsedEntries) {
    merged.set(e.path, e.buf);
  }

  return packFilesMap(merged, maxBytes);
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

  const autoStripPrefix = input.auto_strip_prefix === true;
  const keepExisting = input.keep_existing_files === true;

  // Validasi awal untuk argumen files sebelum menyentuh kuota/rate limit (jika tidak me-merge dari situs lama).
  if (!keepExisting) {
    const precheck = prepareInlineFiles(input.files, { autoStripPrefix });
    if (!precheck.ok) return precheck;
  } else if (!Array.isArray(input.files) || input.files.length === 0) {
    return { ok: false, error: "Parameter `files` kosong. Kirim minimal satu file." };
  }

  const ttlHours = (TTL_OPTIONS_HOURS as readonly number[]).includes(Number(input.ttl_hours)) ? Number(input.ttl_hours) : DEFAULT_TTL_HOURS;
  const replaceId = typeof input.replace_site_id === "string" && input.replace_site_id.trim() ? input.replace_site_id.trim() : null;

  const rl = await rateLimit("sites-create-hourly", `u:${email}`, 20, 3600);
  if (!rl.allowed) {
    return { ok: false, error: `Terlalu banyak upload. Coba lagi ${Math.ceil(rl.retryAfterSeconds / 60)} menit lagi.` };
  }

  const lockKey = `site:lock:${email}`;
  const gotLock = await kv.set(lockKey, 1, { nx: true, ex: 15 });
  if (!gotLock) return { ok: false, error: "Upload sebelumnya masih diproses. Tunggu sebentar lalu coba lagi." };

  let createdId: string | null = null;
  try {
    const existing = await listUserSites(email, { includePending: true });

    let toReplace: SiteMeta | null = null;
    let baseFiles: Map<string, Buffer> | undefined;
    if (replaceId) {
      toReplace = existing.find((s) => s.id === replaceId) ?? null;
      if (!toReplace) {
        return {
          ok: false,
          error: `Situs \`${replaceId}\` tidak ditemukan di akunmu (mungkin sudah kedaluwarsa). Kosongkan \`replace_site_id\` untuk membuat link baru.`,
        };
      }
      if (keepExisting) {
        const loaded = await loadExistingFilesMap(toReplace);
        if (loaded) baseFiles = loaded;
      }
    }
    const others = existing.filter((s) => s.id !== replaceId).length;
    if (others >= MAX_ACTIVE_SITES_PER_USER) {
      return {
        ok: false,
        error: `Sudah ada ${others} link aktif (maksimal ${MAX_ACTIVE_SITES_PER_USER} per akun). Hapus salah satu dengan \`delete_website\`, gunakan \`update_website\` untuk memperbarui situs yang ada, atau isi \`replace_site_id\` untuk menggantinya.`,
      };
    }

    const prepared = prepareInlineFiles(input.files, { autoStripPrefix, baseFiles });
    if (!prepared.ok) return prepared;

    const { files, blob, warnings } = prepared;
    const now = Date.now();
    const ttlMs = ttlHours * 3600 * 1000;
    const meta: Omit<SiteMeta, "id"> = {
      owner: email,
      name: typeof input.name === "string" ? input.name.slice(0, 40) : toReplace?.name ?? "",
      status: "pending",
      createdAt: now,
      expiresAt: now + ttlMs,
      spa: typeof input.spa === "boolean" ? input.spa : toReplace?.spa ?? false,
      totalBytes: blob.length,
      chunkCount: expectedChunkCount(blob.length),
      files,
    };

    const id = await reserveSlug(meta, input.name || toReplace?.name);
    if (!id) return { ok: false, error: "Gagal membuat nama link unik. Coba lagi." };
    createdId = id;
    await addUserSite(email, id);

    // Simpan semua potongan + meta aktif sekaligus lewat pipeline supaya cepat untuk file besar.
    const ttlSec = Math.ceil(ttlMs / 1000) + 60;
    const activatedAt = Date.now();
    const active: SiteMeta = { ...meta, id, status: "active", createdAt: activatedAt, expiresAt: activatedAt + ttlMs };
    await writeSiteChunksAndMeta(id, active, blob, ttlSec);
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
      warnings,
    };
  } catch (e) {
    console.error("[mcp] publish gagal", (e as Error)?.message);
    return { ok: false, error: "Gagal menyimpan situs di server. Coba lagi sebentar lagi." };
  } finally {
    if (createdId) {
      const stale = await loadSite(createdId, { includePending: true }).catch(() => null);
      if (stale) await deleteSiteData(stale).catch(() => undefined);
      await removeUserSite(email, createdId).catch(() => undefined);
    }
    await kv.del(lockKey).catch(() => undefined);
  }
}

/**
 * Perbarui situs yang sudah aktif secara in-place (URL dan `site_id` TETAP SAMA).
 * Dirancang khusus untuk mengatasi masalah file `index.html` yang besar atau banyak:
 * - Bisa menambah/menimpa sebagian file saja (`files`) tanpa kirim ulang file lain.
 * - Bisa menyambung potongan file besar (`append_files`), mis. kirim `index.html` besar dalam 2-4 bagian.
 * - Bisa melakukan edit cepat cari-dan-ganti (`patches`) pada `index.html` atau CSS/JS dalam hitungan milidetik.
 * - Bisa menghapus file tertentu (`delete_paths`).
 */
export async function updateSiteForUser(
  email: string,
  input: UpdateSiteInput,
  hostHeader: string | null,
): Promise<UpdateSiteResult> {
  if (!sitesEnabled()) {
    return { ok: false, error: "Hosting Link Instan belum diaktifkan oleh admin Depup." };
  }
  if (!(await getSettings()).sitesEnabled) {
    return { ok: false, error: "Link Instan sedang dimatikan sementara oleh admin Depup." };
  }
  if (await kv.exists(`site:ban:${email}`)) {
    return { ok: false, error: "Akun ini dibatasi dari membuat/mengubah Link Instan karena laporan penyalahgunaan." };
  }

  const siteId = typeof input.site_id === "string" ? input.site_id.trim() : "";
  if (!siteId) return { ok: false, error: "Parameter `site_id` wajib diisi (ambil dari `deploy_website` atau `list_websites`)." };

  const rl = await rateLimit("sites-update-hourly", `u:${email}`, 120, 3600);
  if (!rl.allowed) {
    return { ok: false, error: `Terlalu banyak permintaan update. Coba lagi ${Math.ceil(rl.retryAfterSeconds / 60)} menit lagi.` };
  }

  const lockKey = `site:lock:${email}`;
  const gotLock = await kv.set(lockKey, 1, { nx: true, ex: 15 });
  if (!gotLock) return { ok: false, error: "Proses upload/update sebelumnya masih berjalan. Tunggu sebentar lalu coba lagi." };

  try {
    const meta = await loadSite(siteId, { includePending: true });
    if (!meta || meta.owner !== email) {
      return { ok: false, error: `Situs \`${siteId}\` tidak ditemukan di akunmu atau sudah kedaluwarsa.` };
    }

    const fileMap = await loadExistingFilesMap(meta);
    if (!fileMap) {
      return { ok: false, error: "Gagal membaca data situs lama dari penyimpanan. Coba publikasikan ulang dengan `deploy_website`." };
    }

    const updatedSet = new Set<string>();
    const deletedSet = new Set<string>();

    // 1. Hapus file yang diminta di delete_paths
    if (input.delete_paths !== undefined) {
      if (!Array.isArray(input.delete_paths)) {
        return { ok: false, error: "`delete_paths` harus berupa array path string." };
      }
      for (const rawP of input.delete_paths) {
        const p = cleanSitePath(typeof rawP === "string" ? rawP.replace(/^\.\//, "") : rawP);
        if (!p) return { ok: false, error: `Path di \`delete_paths\` tidak valid: ${String(rawP)}` };
        if (fileMap.delete(p)) deletedSet.add(p);
      }
    }

    // 2. Tambah atau timpa file di `files`
    if (input.files !== undefined) {
      if (!Array.isArray(input.files)) {
        return { ok: false, error: "`files` harus berupa array objek `{ path, content, encoding? }`." };
      }
      for (const [i, f] of (input.files as InlineFile[]).entries()) {
        const rawPath = typeof f?.path === "string" ? f.path.replace(/^\.\//, "") : f?.path;
        const path = cleanSitePath(rawPath);
        if (!path) return { ok: false, error: `files[${i}]: \`path\` tidak valid.` };
        const decoded = decodeInlineContent(path, f?.content, f?.encoding, MCP_STAGE_MAX_BYTES);
        if (!decoded.ok) return decoded;
        fileMap.set(path, decoded.buf);
        updatedSet.add(path);
        deletedSet.delete(path);
      }
    }

    // 3. Sambung (append) isi file di `append_files` (solusi utama untuk index.html ukuran besar yang dikirim bertahap)
    if (input.append_files !== undefined) {
      if (!Array.isArray(input.append_files)) {
        return { ok: false, error: "`append_files` harus berupa array objek `{ path, content, encoding? }`." };
      }
      for (const [i, f] of (input.append_files as InlineFile[]).entries()) {
        const rawPath = typeof f?.path === "string" ? f.path.replace(/^\.\//, "") : f?.path;
        const path = cleanSitePath(rawPath);
        if (!path) return { ok: false, error: `append_files[${i}]: \`path\` tidak valid.` };
        const decoded = decodeInlineContent(path, f?.content, f?.encoding, MCP_STAGE_MAX_BYTES);
        if (!decoded.ok) return decoded;
        const prev = fileMap.get(path);
        const combined = prev ? Buffer.concat([prev, decoded.buf]) : decoded.buf;
        if (combined.length > MCP_STAGE_MAX_BYTES) {
          return { ok: false, error: `File \`${path}\` melebihi batas ukuran ${fmtBytes(MCP_STAGE_MAX_BYTES)}.` };
        }
        fileMap.set(path, combined);
        updatedSet.add(path);
        deletedSet.delete(path);
      }
    }

    // 4. Terapkan search & replace di `patches` (solusi super cepat untuk revisi sebagian index.html tanpa upload ulang)
    if (input.patches !== undefined) {
      if (!Array.isArray(input.patches)) {
        return { ok: false, error: "`patches` harus berupa array objek `{ path, find, replace, all? }`." };
      }
      for (const [i, pItem] of (input.patches as FilePatch[]).entries()) {
        const rawPath = typeof pItem?.path === "string" ? pItem.path.replace(/^\.\//, "") : pItem?.path;
        const path = cleanSitePath(rawPath);
        if (!path) return { ok: false, error: `patches[${i}]: \`path\` tidak valid.` };
        const existingBuf = fileMap.get(path);
        if (!existingBuf) {
          return { ok: false, error: `patches[${i}]: File \`${path}\` tidak ditemukan di situs \`${siteId}\`.` };
        }
        if (typeof pItem.find !== "string" || pItem.find.length === 0) {
          return { ok: false, error: `patches[${i}]: \`find\` harus berupa string yang tidak kosong.` };
        }
        if (typeof pItem.replace !== "string") {
          return { ok: false, error: `patches[${i}]: \`replace\` harus berupa string.` };
        }
        const sourceText = existingBuf.toString("utf8");
        if (!sourceText.includes(pItem.find)) {
          return {
            ok: false,
            error: `patches[${i}]: Teks \`find\` tidak ditemukan di dalam \`${path}\`. Gunakan \`inspect_website\` dengan \`read_path: "${path}"\` untuk melihat isi terkini.`,
          };
        }
        const nextText =
          pItem.all === true
            ? sourceText.split(pItem.find).join(pItem.replace)
            : sourceText.replace(pItem.find, () => pItem.replace as string);
        fileMap.set(path, Buffer.from(nextText, "utf8"));
        updatedSet.add(path);
      }
    }

    if (
      updatedSet.size === 0 &&
      deletedSet.size === 0 &&
      input.ttl_hours === undefined &&
      input.spa === undefined
    ) {
      return {
        ok: false,
        error: "Tidak ada perubahan yang dikirim. Isi minimal salah satu dari `files`, `append_files`, `patches`, `delete_paths`, `ttl_hours`, atau `spa`.",
      };
    }

    const packed = packFilesMap(fileMap, MCP_STAGE_MAX_BYTES);
    if (!packed.ok) return packed;

    const now = Date.now();
    const newTtlHours =
      input.ttl_hours !== undefined && (TTL_OPTIONS_HOURS as readonly number[]).includes(Number(input.ttl_hours))
        ? Number(input.ttl_hours)
        : null;
    const expiresAt = newTtlHours ? now + newTtlHours * 3600 * 1000 : Math.max(meta.expiresAt, now + 60_000);
    const ttlSec = Math.max(120, Math.ceil((expiresAt - now) / 1000) + 60);
    const newChunkCount = expectedChunkCount(packed.blob.length);

    const updatedMeta: SiteMeta = {
      ...meta,
      status: "active",
      spa: typeof input.spa === "boolean" ? input.spa : meta.spa,
      expiresAt,
      totalBytes: packed.blob.length,
      chunkCount: newChunkCount,
      files: packed.files,
    };

    await writeSiteChunksAndMeta(meta.id, updatedMeta, packed.blob, ttlSec);

    // Jika jumlah chunk berkurang dibanding sebelumnya, bersihkan chunk ekor lama
    if (newChunkCount < meta.chunkCount) {
      const extraKeys: string[] = [];
      for (let i = newChunkCount; i < meta.chunkCount; i++) extraKeys.push(kSiteChunk(meta.id, i));
      if (extraKeys.length > 0) await kv.del(...extraKeys).catch(() => undefined);
    }

    return {
      ok: true,
      id: meta.id,
      url: siteUrl(meta.id, hostHeader),
      expiresAt: updatedMeta.expiresAt,
      fileCount: packed.files.length,
      totalBytes: packed.blob.length,
      updatedPaths: [...updatedSet],
      deletedPaths: [...deletedSet],
      warnings: packed.warnings,
    };
  } catch (e) {
    console.error("[mcp] update site gagal", (e as Error)?.message);
    return { ok: false, error: "Gagal memperbarui situs di server. Coba lagi sebentar lagi." };
  } finally {
    await kv.del(lockKey).catch(() => undefined);
  }
}

/**
 * Inspeksi detail situs aktif: daftar semua file beserta ukurannya, statistik pengunjung real-time,
 * diagnostik link HTML, dan (opsional) membaca isi file tertentu dengan dukungan rentang baris.
 */
export async function inspectSiteForUser(
  email: string,
  input: InspectSiteInput,
  hostHeader: string | null,
): Promise<InspectSiteResult> {
  const siteId = typeof input.site_id === "string" ? input.site_id.trim() : "";
  if (!siteId) return { ok: false, error: "Parameter `site_id` wajib diisi." };

  const meta = await loadSite(siteId, { includePending: true });
  if (!meta || meta.owner !== email) {
    return { ok: false, error: `Situs \`${siteId}\` tidak ditemukan di akunmu.` };
  }

  const [statsMap, fileMap] = await Promise.all([
    loadSiteStats([meta]).catch(() => new Map<string, SiteStats>()),
    loadExistingFilesMap(meta),
  ]);

  const warnings = fileMap
    ? checkMcpSiteHealth([...fileMap.entries()].map(([path, buf]) => ({ path, buf })))
    : [];

  let fileContent: InspectSiteResult extends { ok: true; fileContent?: infer F } ? F : never;

  if (typeof input.read_path === "string" && input.read_path.trim()) {
    const cleanP = cleanSitePath(input.read_path.trim().replace(/^\.\//, ""));
    if (!cleanP) return { ok: false, error: "Parameter `read_path` tidak valid." };
    const targetFile = meta.files.find((f) => f.p === cleanP);
    if (!targetFile) {
      return {
        ok: false,
        error: `File \`${cleanP}\` tidak ditemukan di situs \`${meta.id}\`. File yang tersedia: ${meta.files.map((f) => f.p).join(", ")}`,
      };
    }
    const buf = fileMap?.get(cleanP) ?? (await readSiteFile(meta, targetFile));
    if (!buf) return { ok: false, error: `Gagal membaca isi file \`${cleanP}\`.` };

    const isBinary = /^(image|video|audio|font|application\/(octet-stream|pdf|zip|wasm))\b/i.test(targetFile.t) && !/svg|json|xml|javascript|text/i.test(targetFile.t);
    if (isBinary) {
      fileContent = {
        path: cleanP,
        totalBytes: buf.length,
        totalLines: 1,
        startLine: 1,
        endLine: 1,
        content: `[File biner ${targetFile.t}, ${fmtBytes(buf.length)} — base64 preview: ${buf.subarray(0, 96).toString("base64")}...]`,
        truncated: buf.length > 96,
      };
    } else {
      const fullText = buf.toString("utf8");
      const allLines = fullText.split(/\r?\n/);
      const totalLines = allLines.length;
      const reqStart = Number.isInteger(Number(input.start_line)) && Number(input.start_line) >= 1 ? Number(input.start_line) : 1;
      const reqEnd =
        Number.isInteger(Number(input.end_line)) && Number(input.end_line) >= reqStart
          ? Math.min(totalLines, Number(input.end_line))
          : Math.min(totalLines, reqStart + 299);
      const sliced = allLines.slice(reqStart - 1, reqEnd).join("\n");
      const maxChars = 60_000;
      const truncated = sliced.length > maxChars || reqEnd < totalLines || reqStart > 1;
      fileContent = {
        path: cleanP,
        totalBytes: buf.length,
        totalLines,
        startLine: reqStart,
        endLine: reqEnd,
        content: sliced.length > maxChars ? sliced.slice(0, maxChars) + "\n... [dipotong, gunakan start_line & end_line]" : sliced,
        truncated,
      };
    }
  }

  return {
    ok: true,
    id: meta.id,
    name: meta.name,
    url: siteUrl(meta.id, hostHeader),
    createdAt: meta.createdAt,
    expiresAt: meta.expiresAt,
    spa: meta.spa,
    totalBytes: meta.totalBytes,
    fileCount: meta.files.length,
    files: meta.files.map((f) => ({ path: f.p, size: f.s, contentType: f.t })),
    stats: statsMap.get(meta.id) ?? null,
    warnings,
    ...(fileContent ? { fileContent } : {}),
  };
}

export async function listSitesForUser(email: string, hostHeader: string | null) {
  const sites = await listUserSites(email);
  const stats = await loadSiteStats(sites).catch(() => new Map<string, SiteStats>());
  return sites.map((s) => {
    const st = stats.get(s.id);
    return {
      id: s.id,
      name: s.name,
      url: siteUrl(s.id, hostHeader),
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
      spa: s.spa,
      fileCount: s.files.length,
      totalBytes: s.totalBytes,
      files: s.files.map((f) => f.p),
      views: st?.views ?? 0,
      visitors: st?.visitors ?? 0,
    };
  });
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
  maxStagedBytes: MCP_STAGE_MAX_BYTES,
  maxFiles: MAX_SITE_FILES,
  maxSites: MAX_ACTIVE_SITES_PER_USER,
  ttlOptionsHours: TTL_OPTIONS_HOURS,
  defaultTtlHours: DEFAULT_TTL_HOURS,
};
