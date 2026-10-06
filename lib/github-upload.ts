/**
 * Upload project (zip / folder) → repo GitHub baru, semuanya dari browser.
 *
 * Kenapa dari browser, bukan lewat route /api? Fungsi serverless di Vercel
 * membatasi body request ±4,5MB, jadi zip/folder project biasa langsung
 * ditolak. GitHub REST API mengizinkan CORS, dan PAT user memang sudah
 * tersimpan di Settings, jadi file dikirim langsung ke api.github.com.
 *
 * Alur: baca file → filter → buat repo (auto_init) → buat blob per file →
 * buat tree → commit → geser ref branch ke commit itu.
 */
import JSZip from "jszip";

/* ------------------------------------------------------------------ */
/*  Tipe & batas                                                       */
/* ------------------------------------------------------------------ */

export interface UploadFile {
  /** Path relatif (pakai "/"), tanpa folder pembungkus. */
  path: string;
  data: Uint8Array;
  executable: boolean;
}

export interface CollectResult {
  files: UploadFile[];
  /** Jumlah file yang sengaja dilewati + alasannya, buat ditampilkan ke user. */
  skipped: { path: string; reason: string }[];
  /** Nama folder pembungkus yang dibuang (mis. "my-app"), kalau ada. */
  strippedRoot: string | null;
  totalBytes: number;
}

export const MAX_FILES = 3000;
export const MAX_TOTAL_BYTES = 150 * 1024 * 1024; // 150MB
export const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50MB

export class UploadError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "UploadError";
    this.status = status;
  }
}

/* ------------------------------------------------------------------ */
/*  Filter                                                             */
/* ------------------------------------------------------------------ */

/** Folder yang tidak pernah perlu masuk repo (hasil build / dependency / metadata OS). */
const IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  ".vercel",
  ".turbo",
  ".cache",
  ".parcel-cache",
  ".svelte-kit",
  ".nuxt",
  "__MACOSX",
  ".idea",
  "__pycache__",
  ".venv",
  "venv",
]);

const IGNORED_FILES = new Set([".DS_Store", "Thumbs.db", "desktop.ini", "tsconfig.tsbuildinfo"]);

/** `.env` berisi rahasia — jangan sampai ikut ke GitHub. Template contoh tetap boleh. */
function isSecretEnvFile(name: string): boolean {
  if (!/^\.env(\..+)?$/i.test(name)) return false;
  return !/\.(example|sample|template|dist)$/i.test(name);
}

function skipReason(path: string): string | null {
  const parts = path.split("/");
  const name = parts[parts.length - 1];
  for (const dir of parts.slice(0, -1)) {
    if (IGNORED_DIRS.has(dir)) return `folder ${dir}/ tidak perlu di-upload`;
  }
  if (IGNORED_FILES.has(name)) return "file sistem";
  if (isSecretEnvFile(name)) return "berisi rahasia (env) — isi lewat Environment Variables";
  return null;
}

/** Bersihkan path: backslash → slash, buang "./" dan "/" di depan, tolak ".." . */
function cleanPath(raw: string): string | null {
  const p = raw.replace(/\\/g, "/").replace(/^(\.\/)+/, "").replace(/^\/+/, "");
  if (!p || p.endsWith("/")) return null;
  const segs = p.split("/");
  if (segs.some((s) => s === ".." || s === "." || s === "")) return null;
  return segs.join("/");
}

/**
 * Kalau semua file ada di dalam SATU folder pembungkus (umum untuk zip hasil
 * "compress folder"), buang pembungkus itu supaya package.json ada di root repo.
 */
function stripCommonRoot<T extends { path: string }>(items: T[]): { items: T[]; root: string | null } {
  if (items.length === 0) return { items, root: null };
  const firstSeg = items[0].path.split("/")[0];
  const allShare = items.every((i) => i.path.includes("/") && i.path.split("/")[0] === firstSeg);
  if (!allShare) return { items, root: null };
  return {
    root: firstSeg,
    items: items.map((i) => ({ ...i, path: i.path.slice(firstSeg.length + 1) })),
  };
}

function finalize(rawInput: UploadFile[]): CollectResult {
  // eslint-disable-next-line no-param-reassign
  const skipped: CollectResult["skipped"] = [];

  // 0) Sampah OS (mis. __MACOSX/) dibuang diam-diam — tidak perlu dilaporkan, dan
  //    kalau dibiarkan akan mengacaukan deteksi folder pembungkus.
  const raw = rawInput.filter((f) => f.path.split("/")[0] !== "__MACOSX" && !IGNORED_FILES.has(f.path.split("/").pop()!));

  // 1) Buang folder pembungkus lebih dulu (supaya filter bekerja di path final).
  //    Folder pembungkus bernama "node_modules"/".git" dsb. tetap terfilter di langkah 2.
  const { items, root } = stripCommonRoot(raw);

  // 2) Filter.
  const files: UploadFile[] = [];
  const seen = new Set<string>();
  for (const f of items) {
    const reason = skipReason(f.path);
    if (reason) {
      skipped.push({ path: f.path, reason });
      continue;
    }
    if (f.data.byteLength > MAX_FILE_BYTES) {
      skipped.push({
        path: f.path,
        reason: `lebih dari ${Math.round(MAX_FILE_BYTES / 1024 / 1024)}MB`,
      });
      continue;
    }
    if (seen.has(f.path)) continue;
    seen.add(f.path);
    files.push(f);
  }

  const totalBytes = files.reduce((n, f) => n + f.data.byteLength, 0);
  if (files.length === 0) {
    throw new UploadError("Tidak ada file yang bisa di-upload. Pastikan zip/folder-nya tidak kosong.");
  }
  if (files.length > MAX_FILES) {
    throw new UploadError(
      `Terlalu banyak file (${files.length}). Maksimal ${MAX_FILES} file — pastikan node_modules dan hasil build tidak ikut.`
    );
  }
  if (totalBytes > MAX_TOTAL_BYTES) {
    throw new UploadError(
      `Ukuran total ${(totalBytes / 1024 / 1024).toFixed(1)}MB melebihi batas ${MAX_TOTAL_BYTES / 1024 / 1024}MB.`
    );
  }
  files.sort((a, b) => a.path.localeCompare(b.path));
  return { files, skipped, strippedRoot: root, totalBytes };
}

/* ------------------------------------------------------------------ */
/*  Baca sumber: zip                                                   */
/* ------------------------------------------------------------------ */

export async function collectFromZip(file: File): Promise<CollectResult> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(file);
  } catch {
    throw new UploadError("File zip tidak bisa dibuka — mungkin rusak atau bukan file .zip.");
  }

  const raw: UploadFile[] = [];
  let extracted = 0;
  const entries = Object.values(zip.files).filter((e) => !e.dir);
  if (entries.length > MAX_FILES * 4) {
    throw new UploadError(`Isi zip terlalu banyak (${entries.length} file).`);
  }
  for (const entry of entries) {
    const path = cleanPath(entry.name);
    if (!path) continue;
    // Jangan ekstrak file yang pasti difilter (mis. node_modules di dalam zip) —
    // cukup catat path-nya supaya muncul di daftar "file dilewati".
    if (skipReason(stripFirstSeg(path))) {
      raw.push({ path, data: new Uint8Array(0), executable: false });
      continue;
    }
    const data = await entry.async("uint8array");
    const perm = (entry as unknown as { unixPermissions?: number | string | null }).unixPermissions;
    const mode = typeof perm === "number" ? perm : Number(perm ?? 0);
    raw.push({ path, data, executable: (mode & 0o111) !== 0 && (mode & 0o170000) === 0o100000 });
    extracted += data.byteLength;
    // Batas keras supaya zip-bomb tidak menghabiskan memori tab.
    if (extracted > MAX_TOTAL_BYTES * 2) {
      throw new UploadError("Isi zip setelah diekstrak terlalu besar.");
    }
  }
  return finalize(raw);
}

/* ------------------------------------------------------------------ */
/*  Baca sumber: folder (drag & drop atau <input webkitdirectory>)     */
/* ------------------------------------------------------------------ */

/** Dari <input type="file" webkitdirectory>: path ada di webkitRelativePath. */
export async function collectFromFileList(list: FileList | File[]): Promise<CollectResult> {
  const raw: UploadFile[] = [];
  for (const f of Array.from(list)) {
    const rel = (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name;
    const path = cleanPath(rel);
    if (!path) continue;
    // Jangan baca isi file yang akan difilter (mis. node_modules) — hemat waktu & memori.
    if (skipReason(stripFirstSeg(path))) {
      raw.push({ path, data: new Uint8Array(0), executable: false });
      continue;
    }
    raw.push({ path, data: new Uint8Array(await f.arrayBuffer()), executable: false });
  }
  return finalize(raw);
}

function stripFirstSeg(p: string): string {
  const i = p.indexOf("/");
  return i === -1 ? p : p.slice(i + 1);
}

/* --- drag & drop: telusuri FileSystemEntry secara rekursif --- */

interface FsEntry {
  isFile: boolean;
  isDirectory: boolean;
  name: string;
  fullPath: string;
  file?: (ok: (f: File) => void, err: (e: unknown) => void) => void;
  createReader?: () => {
    readEntries: (ok: (e: FsEntry[]) => void, err: (e: unknown) => void) => void;
  };
}

async function readAllEntries(dir: FsEntry): Promise<FsEntry[]> {
  const reader = dir.createReader!();
  const out: FsEntry[] = [];
  // readEntries mengembalikan maksimal ±100 item per panggilan — ulangi sampai kosong.
  for (;;) {
    const batch = await new Promise<FsEntry[]>((ok, err) => reader.readEntries(ok, err));
    if (batch.length === 0) break;
    out.push(...batch);
  }
  return out;
}

async function walkEntry(entry: FsEntry, out: UploadFile[], counter: { n: number }): Promise<void> {
  if (counter.n > MAX_FILES * 4) throw new UploadError("Folder terlalu besar — apakah node_modules ikut ter-drop?");
  const path = cleanPath(entry.fullPath);
  if (entry.isFile) {
    if (!path) return;
    counter.n++;
    // Lewati baca isi untuk file yang pasti difilter.
    if (skipReason(stripFirstSeg(path))) {
      out.push({ path, data: new Uint8Array(0), executable: false });
      return;
    }
    const file = await new Promise<File>((ok, err) => entry.file!(ok, err));
    out.push({ path, data: new Uint8Array(await file.arrayBuffer()), executable: false });
    return;
  }
  if (entry.isDirectory) {
    // Jangan masuk folder yang pasti diabaikan (node_modules bisa puluhan ribu file).
    if (IGNORED_DIRS.has(entry.name) && path && path.includes("/")) return;
    for (const child of await readAllEntries(entry)) await walkEntry(child, out, counter);
  }
}

export async function collectFromDataTransfer(dt: DataTransfer): Promise<CollectResult> {
  const items = Array.from(dt.items ?? []);
  const entries: FsEntry[] = [];
  for (const item of items) {
    const entry = item.webkitGetAsEntry?.() as unknown as FsEntry | null | undefined;
    if (entry) entries.push(entry);
  }

  // Browser tanpa dukungan entry API → jatuh ke daftar file biasa.
  if (entries.length === 0) {
    if (dt.files && dt.files.length > 0) return collectFromFileList(dt.files);
    throw new UploadError("Tidak ada file yang terbaca dari drag & drop.");
  }

  // Satu .zip yang di-drop → perlakukan sebagai zip.
  if (entries.length === 1 && entries[0].isFile && /\.zip$/i.test(entries[0].name)) {
    const file = await new Promise<File>((ok, err) => entries[0].file!(ok, err));
    return collectFromZip(file);
  }

  const raw: UploadFile[] = [];
  const counter = { n: 0 };
  for (const e of entries) await walkEntry(e, raw, counter);
  // finalize() membuang folder pembungkus tunggal dan menyaring file yang tidak perlu.
  return finalize(raw);
}

/* ------------------------------------------------------------------ */
/*  Upload ke GitHub                                                   */
/* ------------------------------------------------------------------ */

const GH = "https://api.github.com";

export type UploadPhase = "repo" | "files" | "commit" | "done";

export interface UploadProgress {
  phase: UploadPhase;
  done: number;
  total: number;
  message: string;
}

export interface UploadOptions {
  pat: string;
  repoName: string;
  isPrivate: boolean;
  description?: string;
  /** true = boleh menimpa isi repo yang sudah ada (commit baru di atas branch default). */
  allowExisting: boolean;
  commitMessage?: string;
  onProgress?: (p: UploadProgress) => void;
  signal?: AbortSignal;
}

export interface UploadResult {
  owner: string;
  repo: string;
  url: string;
  branch: string;
  commitSha: string;
  fileCount: number;
  createdNew: boolean;
  isPrivate: boolean;
}

export function sanitizeRepoName(input: string): string {
  return input
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^A-Za-z0-9._-]/g, "")
    .replace(/^[.-]+/, "")
    .slice(0, 100);
}

function toBase64(bytes: Uint8Array): string {
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + CHUNK)));
  }
  return btoa(bin);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function gh<T>(
  pat: string,
  path: string,
  init: { method?: string; body?: unknown; signal?: AbortSignal } = {},
  retries = 3
): Promise<{ status: number; data: T }> {
  for (let attempt = 0; ; attempt++) {
    let res: Response;
    try {
      res = await fetch(`${GH}${path}`, {
        method: init.method ?? "GET",
        signal: init.signal,
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${pat}`,
          "X-GitHub-Api-Version": "2022-11-28",
          ...(init.body ? { "Content-Type": "application/json" } : {}),
        },
        body: init.body ? JSON.stringify(init.body) : undefined,
      });
    } catch (e) {
      if ((e as Error)?.name === "AbortError") throw new UploadError("Upload dibatalkan.");
      if (attempt < retries) {
        await sleep(800 * (attempt + 1));
        continue;
      }
      throw new UploadError("Tidak bisa menghubungi GitHub. Cek koneksi internet lalu coba lagi.");
    }

    const retryable =
      res.status >= 500 ||
      res.status === 429 ||
      (res.status === 403 && (res.headers.get("retry-after") || res.headers.get("x-ratelimit-remaining") === "0"));
    if (retryable && attempt < retries) {
      const ra = Number(res.headers.get("retry-after"));
      await sleep(Number.isFinite(ra) && ra > 0 ? Math.min(ra, 30) * 1000 : 1000 * (attempt + 1) ** 2);
      continue;
    }

    const data = (await res.json().catch(() => ({}))) as T;
    return { status: res.status, data };
  }
}

function ghMessage(data: unknown): string {
  const d = data as { message?: string; errors?: { message?: string }[] };
  const extra = d?.errors?.map((e) => e.message).filter(Boolean).join("; ");
  return [d?.message, extra].filter(Boolean).join(" — ");
}

function failFor(status: number, data: unknown, fallback: string): UploadError {
  if (status === 401) {
    return new UploadError("GitHub Token tidak valid atau sudah kedaluwarsa. Perbarui di Settings.", 401);
  }
  if (status === 403) {
    return new UploadError(
      `GitHub menolak akses${ghMessage(data) ? ` (${ghMessage(data)})` : ""}. Pastikan token punya izin "repo" (classic) atau "Contents: read & write" + "Administration: write" (fine-grained).`,
      403
    );
  }
  return new UploadError(`${fallback}${ghMessage(data) ? `: ${ghMessage(data)}` : ` (kode ${status})`}`, status);
}

/** Jalankan `worker` untuk semua item dengan maksimal `limit` yang berjalan bersamaan. */
async function pool<T>(items: T[], limit: number, worker: (item: T, index: number) => Promise<void>) {
  let next = 0;
  let failure: unknown = null;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (failure === null) {
      const i = next++;
      if (i >= items.length) return;
      try {
        await worker(items[i], i);
      } catch (e) {
        failure = e;
        return;
      }
    }
  });
  await Promise.all(runners);
  if (failure !== null) throw failure;
}

export async function uploadToGithub(files: UploadFile[], opts: UploadOptions): Promise<UploadResult> {
  const { pat, isPrivate, signal, onProgress } = opts;
  const report = (p: UploadProgress) => onProgress?.(p);
  const repoName = sanitizeRepoName(opts.repoName);
  if (!repoName) throw new UploadError("Nama repo belum valid. Pakai huruf, angka, titik, strip, atau underscore.");
  if (!pat.trim()) throw new UploadError("GitHub Token belum diisi. Isi di Settings dulu.");

  /* ---- 1. Akun & repo ---- */
  report({ phase: "repo", done: 0, total: 1, message: "Menghubungkan ke GitHub…" });
  const me = await gh<{ login?: string }>(pat, "/user", { signal });
  if (me.status !== 200 || !me.data.login) throw failFor(me.status, me.data, "Gagal membaca akun GitHub");
  const owner = me.data.login;

  let createdNew = false;
  let branch = "main";
  let parentSha: string | null = null;
  let repoPrivate = isPrivate;

  const existing = await gh<{ default_branch?: string; private?: boolean; permissions?: { push?: boolean } }>(
    pat,
    `/repos/${owner}/${repoName}`,
    { signal }
  );

  if (existing.status === 200) {
    if (!opts.allowExisting) {
      throw new UploadError(
        `Repo "${owner}/${repoName}" sudah ada. Pakai nama lain, atau centang "Timpa repo yang sudah ada".`,
        409
      );
    }
    if (existing.data.permissions && existing.data.permissions.push === false) {
      throw new UploadError(`Token tidak punya izin menulis ke ${owner}/${repoName}.`, 403);
    }
    branch = existing.data.default_branch ?? "main";
    repoPrivate = !!existing.data.private;
    const ref = await gh<{ object?: { sha?: string } }>(pat, `/repos/${owner}/${repoName}/git/ref/heads/${branch}`, {
      signal,
    });
    if (ref.status === 200 && ref.data.object?.sha) parentSha = ref.data.object.sha;
    else if (ref.status === 409 || ref.status === 404) {
      throw new UploadError(
        `Repo ${owner}/${repoName} masih kosong sama sekali (belum ada commit). Tambahkan satu file lewat GitHub dulu, atau pakai nama repo baru.`
      );
    } else throw failFor(ref.status, ref.data, "Gagal membaca branch");
  } else if (existing.status === 404) {
    report({ phase: "repo", done: 0, total: 1, message: `Membuat repo ${repoName}…` });
    const created = await gh<{ default_branch?: string; private?: boolean }>(pat, "/user/repos", {
      method: "POST",
      signal,
      body: {
        name: repoName,
        private: isPrivate,
        description: opts.description?.slice(0, 340) || "Di-upload lewat Depup",
        // auto_init membuat commit pertama — Git Data API menolak repo yang benar-benar kosong.
        auto_init: true,
      },
    });
    if (created.status === 422) {
      throw new UploadError(`Nama repo "${repoName}" tidak bisa dipakai: ${ghMessage(created.data) || "sudah dipakai / tidak valid"}.`, 422);
    }
    if (created.status !== 201) throw failFor(created.status, created.data, "Gagal membuat repo");
    createdNew = true;
    branch = created.data.default_branch ?? "main";
    repoPrivate = !!created.data.private;

    // Ref branch baru kadang belum langsung terbaca — tunggu sebentar.
    for (let i = 0; i < 8 && !parentSha; i++) {
      const ref = await gh<{ object?: { sha?: string } }>(
        pat,
        `/repos/${owner}/${repoName}/git/ref/heads/${branch}`,
        { signal },
        0
      );
      if (ref.status === 200 && ref.data.object?.sha) parentSha = ref.data.object.sha;
      else await sleep(600 * (i + 1));
    }
    if (!parentSha) throw new UploadError("Repo sudah dibuat, tapi branch awalnya belum siap. Coba lagi beberapa detik lagi (pilih 'Timpa repo yang sudah ada').");
  } else {
    throw failFor(existing.status, existing.data, "Gagal mengecek repo");
  }

  /* ---- 2. Blob per file ---- */
  const total = files.length;
  let done = 0;
  report({ phase: "files", done, total, message: `Meng-upload file (0/${total})…` });
  const tree: { path: string; mode: string; type: "blob"; sha: string }[] = new Array(total);

  await pool(files, 5, async (f, i) => {
    const blob = await gh<{ sha?: string }>(pat, `/repos/${owner}/${repoName}/git/blobs`, {
      method: "POST",
      signal,
      body: { content: toBase64(f.data), encoding: "base64" },
    });
    if (blob.status !== 201 || !blob.data.sha) throw failFor(blob.status, blob.data, `Gagal meng-upload ${f.path}`);
    tree[i] = { path: f.path, mode: f.executable ? "100755" : "100644", type: "blob", sha: blob.data.sha };
    done++;
    report({ phase: "files", done, total, message: `Meng-upload file (${done}/${total})…` });
  });

  /* ---- 3. Tree → commit → ref ---- */
  report({ phase: "commit", done: 0, total: 1, message: "Membuat commit…" });
  // Tanpa base_tree: isi repo = persis isi upload ini (README bawaan auto_init ikut terganti).
  const treeRes = await gh<{ sha?: string }>(pat, `/repos/${owner}/${repoName}/git/trees`, {
    method: "POST",
    signal,
    body: { tree },
  });
  if (treeRes.status !== 201 || !treeRes.data.sha) throw failFor(treeRes.status, treeRes.data, "Gagal membuat tree");

  const commit = await gh<{ sha?: string }>(pat, `/repos/${owner}/${repoName}/git/commits`, {
    method: "POST",
    signal,
    body: {
      message: opts.commitMessage || "Upload via Depup",
      tree: treeRes.data.sha,
      parents: parentSha ? [parentSha] : [],
    },
  });
  if (commit.status !== 201 || !commit.data.sha) throw failFor(commit.status, commit.data, "Gagal membuat commit");

  const upd = await gh<unknown>(pat, `/repos/${owner}/${repoName}/git/refs/heads/${branch}`, {
    method: "PATCH",
    signal,
    body: { sha: commit.data.sha, force: false },
  });
  if (upd.status !== 200) throw failFor(upd.status, upd.data, "Gagal memperbarui branch");

  report({ phase: "done", done: total, total, message: "Selesai" });
  return {
    owner,
    repo: repoName,
    url: `https://github.com/${owner}/${repoName}`,
    branch,
    commitSha: commit.data.sha,
    fileCount: total,
    createdNew,
    isPrivate: repoPrivate,
  };
}
