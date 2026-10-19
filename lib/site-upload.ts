/**
 * Klien "Link Instan": siapkan file statis dari zip/folder lalu kirim ke /api/sites
 * (init → potongan 512 KB → finish). Pembacaan zip/folder memakai fungsi yang sama
 * dengan Upload GitHub (lib/github-upload.ts).
 */
import type { CollectResult, UploadFile } from "@/lib/github-upload";

export class SiteError extends Error {}

export interface SiteInfo {
  id: string;
  name: string;
  url: string;
  createdAt: number;
  expiresAt: number;
  totalBytes: number;
  fileCount: number;
  spa: boolean;
}

export interface SiteConfig {
  enabled: boolean;
  baseDomain: string | null;
  maxBytes: number;
  maxFiles: number;
  maxSites: number;
  chunkBytes: number;
  ttlOptionsHours: number[];
  defaultTtlHours: number;
  sites: SiteInfo[];
}

const OUTPUT_DIRS = ["dist", "build", "out", "public", "docs", "www", "site", "_site"];

export interface PreparedSite {
  files: UploadFile[];
  /** Folder yang dipakai sebagai root situs, mis. "dist". Kosong = root zip. */
  rootDir: string;
  totalBytes: number;
}

/** Cari folder yang berisi index.html (root, atau dist/build/out/…), lalu jadikan root situs. */
export function prepareSite(files: UploadFile[]): PreparedSite {
  const paths = new Set(files.map((f) => f.path));
  let root = "";
  if (!paths.has("index.html")) {
    const candidates = OUTPUT_DIRS.filter((d) => paths.has(`${d}/index.html`));
    if (candidates.length > 0) {
      root = candidates[0];
    } else {
      const dirs = files
        .filter((f) => f.path.endsWith("/index.html") || f.path === "index.html")
        .map((f) => f.path.slice(0, -"index.html".length - 1))
        .filter((d) => !d.split("/").some((s) => s === "node_modules"))
        .sort((a, b) => a.split("/").length - b.split("/").length);
      if (dirs.length > 0 && (dirs.length === 1 || dirs[0].split("/").length < dirs[1].split("/").length)) {
        root = dirs[0];
      }
    }
  }
  if (!root && !paths.has("index.html")) {
    const hasPkg = paths.has("package.json");
    throw new SiteError(
      hasPkg
        ? "Ini project Node/framework (ada package.json tetapi belum ada index.html). Jalankan `npm run build` dulu, lalu upload folder hasilnya (dist / build / out)."
        : "File index.html tidak ditemukan. Link Instan khusus website statis — pastikan index.html ada di root zip/folder."
    );
  }
  const prefix = root ? root + "/" : "";
  const out = files
    .filter((f) => f.path.startsWith(prefix) && f.data.byteLength >= 0)
    .map((f) => ({ ...f, path: f.path.slice(prefix.length) }));
  return { files: out, rootDir: root, totalBytes: out.reduce((n, f) => n + f.data.byteLength, 0) };
}

/* ------------------------------------------------------------------ */
/*  Deteksi framework + peringatan                                     */
/* ------------------------------------------------------------------ */

export interface ReportNote {
  level: "error" | "warn" | "info";
  text: string;
}

export interface ProjectReport {
  /** Nama framework/jenis project, mis. "Next.js", "Vite (React)", "HTML statis". */
  label: string;
  /** error = tidak bisa dipublikasikan di Link Instan; warn = bisa tapi ada yang tidak jalan. */
  status: "ok" | "warn" | "blocked";
  notes: ReportNote[];
  /** True kalau project butuh server sungguhan → tawarkan menu Upload (GitHub + deploy). */
  needsServer: boolean;
}

const dec = new TextDecoder();

function readText(files: UploadFile[], path: string): string | null {
  const f = files.find((x) => x.path === path);
  return f && f.data.byteLength > 0 ? dec.decode(f.data) : null;
}

/** [dependency yang dicari, label, bisa jadi statis setelah build?] — urutan = prioritas. */
const FRAMEWORKS: [string, string][] = [
  ["next", "Next.js"],
  ["nuxt", "Nuxt"],
  ["@sveltejs/kit", "SvelteKit"],
  ["@remix-run/react", "Remix"],
  ["astro", "Astro"],
  ["gatsby", "Gatsby"],
  ["@angular/core", "Angular"],
  ["react-scripts", "Create React App"],
  ["vite", "Vite"],
  ["vue", "Vue"],
  ["react", "React"],
  ["svelte", "Svelte"],
];
const BACKENDS: [string, string][] = [
  ["express", "Express"],
  ["fastify", "Fastify"],
  ["koa", "Koa"],
  ["@nestjs/core", "NestJS"],
  ["hapi", "Hapi"],
  ["@hapi/hapi", "Hapi"],
];

/**
 * Baca isi project yang di-upload lalu kasih tahu user SEBELUM publish: framework apa,
 * apakah sudah di-build, dan fitur apa yang tidak akan jalan (API/server, env).
 */
export function analyzeProject(c: Pick<CollectResult, "files" | "skipped" | "envText">): ProjectReport {
  const { files } = c;
  const paths = files.map((f) => f.path);
  const has = (re: RegExp) => paths.some((p) => re.test(p));
  const notes: ReportNote[] = [];
  let needsServer = false;
  let blocked = false;

  let deps: Record<string, string> = {};
  let hasPkg = false;
  const pkgText = readText(files, "package.json");
  if (pkgText) {
    hasPkg = true;
    try {
      const pkg = JSON.parse(pkgText) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
      deps = { ...(pkg.devDependencies ?? {}), ...(pkg.dependencies ?? {}) };
    } catch {
      /* package.json rusak — abaikan */
    }
  }

  let label = FRAMEWORKS.find(([d]) => d in deps)?.[1] ?? null;
  const backend = BACKENDS.find(([d]) => d in deps)?.[1] ?? null;
  const other =
    has(/^(requirements\.txt|pyproject\.toml|manage\.py)$/) ? "Python" :
    has(/^composer\.json$|\.php$/) ? "PHP" :
    has(/^go\.mod$/) ? "Go" :
    has(/^Gemfile$/) ? "Ruby" :
    has(/^Dockerfile$/) ? "Docker" : null;

  const hasIndex = has(/^index\.html$/) || has(/(^|\/)(dist|build|out|public|docs|www|site|_site)\/index\.html$/);

  // --- Jenis project ---
  if (!hasPkg && other) {
    label = other;
    needsServer = true;
    blocked = true;
    notes.push({ level: "error", text: `Project ${other} butuh server — Link Instan hanya menyajikan file statis (HTML/CSS/JS).` });
  } else if (backend) {
    label = label ? `${label} + ${backend}` : backend;
    needsServer = true;
    blocked = true;
    notes.push({ level: "error", text: `Ada server ${backend} di project ini. Link Instan tidak menjalankan Node.js, jadi backend-nya tidak akan hidup.` });
  } else if (!label && !hasPkg) {
    label = "HTML statis";
  } else if (!label) {
    label = "Node.js";
  }

  // --- Route API / SSR yang tidak mungkin jalan ---
  const apiPaths = paths.filter((p) =>
    /(^|\/)(src\/)?app\/api\/.+\/route\.[jt]sx?$/.test(p) ||
    /(^|\/)(src\/)?pages\/api\//.test(p) ||
    /(^|\/)server\/(api|routes)\//.test(p) ||
    /\+server\.[jt]s$/.test(p) ||
    /^api\/.+\.[jt]s$/.test(p)
  );
  if (apiPaths.length > 0) {
    needsServer = true;
    notes.push({
      level: hasIndex ? "warn" : "error",
      text: `Ada ${apiPaths.length} route API (mis. ${apiPaths[0]}). Fungsi /api TIDAK akan jalan di Link Instan — halaman yang memanggilnya akan error 404.`,
    });
    if (!hasIndex) blocked = true;
  }

  // --- Next.js: static export? ---
  if (label?.startsWith("Next.js")) {
    const cfg = ["next.config.js", "next.config.mjs", "next.config.ts"].map((n) => readText(files, n)).find((t) => t !== null) ?? "";
    const exportMode = /output\s*:\s*['"`]export['"`]/.test(cfg);
    if (!hasIndex) {
      blocked = true;
      notes.push({
        level: "error",
        text: exportMode
          ? "Belum dibangun. Jalankan `npm run build`, lalu upload folder `out/` yang terbentuk."
          : "Next.js harus diekspor ke HTML statis dulu: tambahkan `output: 'export'` di next.config.js, jalankan `npm run build`, lalu upload folder `out/`. Kalau project-mu butuh API/SSR, pakai menu Upload (deploy ke Vercel/Railway).",
      });
    } else if (!exportMode && apiPaths.length === 0) {
      notes.push({ level: "info", text: "Ini terlihat seperti hasil ekspor Next.js — fitur server (SSR, Image Optimization, middleware) tidak aktif di sini." });
    }
  } else if (label && /^(Nuxt|SvelteKit|Remix|Astro|Gatsby|Angular|Create React App|Vite|Vue|React|Svelte)/.test(label) && !hasIndex) {
    blocked = true;
    const out = label.startsWith("Angular") ? "dist/<nama-project>/browser" : label.startsWith("Create React App") ? "build" : label.startsWith("Gatsby") ? "public" : label.startsWith("Nuxt") ? ".output/public (jalankan `npx nuxi generate`)" : "dist";
    notes.push({ level: "error", text: `Project ${label} belum dibangun. Jalankan \`npm run build\`, lalu upload folder hasilnya (${out}).` });
  }

  // --- Source Vite/CRA yang belum di-build (index.html ada, tapi mengacu ke /src/*.jsx) ---
  const rootIndex = readText(files, "index.html");
  if (rootIndex && /<script[^>]+src=["']\/?src\/[^"']+\.(jsx|tsx|ts)["']/i.test(rootIndex)) {
    blocked = true;
    notes.push({
      level: "error",
      text: "index.html ini masih source (memanggil /src/*.jsx|tsx) — browser tidak bisa menjalankannya. Jalankan `npm run build` dan upload folder `dist/`.",
    });
  }

  // --- Env ---
  const hadEnv = c.envText.trim().length > 0 || c.skipped.some((s) => /env/i.test(s.reason));
  if (hadEnv || has(/^\.env\.(example|sample|template)$/)) {
    notes.push({
      level: "warn",
      text: "Environment variable TIDAK bisa dipakai di Link Instan (tidak ada server). File .env tidak ikut diunggah. Variabel publik (NEXT_PUBLIC_*, VITE_*) harus sudah tertanam saat build di laptopmu; variabel rahasia/server tidak akan berfungsi.",
    });
  }

  if (!blocked && hasPkg && hasIndex && notes.length === 0) {
    notes.push({ level: "info", text: "Terlihat sudah berupa hasil build statis — siap dipublikasikan." });
  }

  return { label: label ?? "HTML statis", status: blocked ? "blocked" : notes.some((n) => n.level === "warn") ? "warn" : "ok", notes, needsServer };
}

/* ------------------------------------------------------------------ */
/*  Pemeriksaan link sebelum publish                                   */
/* ------------------------------------------------------------------ */

const SKIP_DROPPED = /^(package(-lock)?\.json|yarn\.lock|pnpm-lock\.yaml|readme(\.md)?|license(\.md)?|\.gitignore|tsconfig.*\.json|.*\.config\.[cm]?[jt]s|\.env.*)$/i;

/**
 * Cek yang murah dan jalan di browser: (1) folder/file di luar root situs yang akan terbuang,
 * (2) href/src di file HTML yang menunjuk file yang tidak ada — terutama kalau hanya beda huruf
 * besar/kecil (server membedakannya, Windows/macOS tidak).
 */
export function checkSiteLinks(all: UploadFile[], site: PreparedSite): ReportNote[] {
  const notes: ReportNote[] = [];

  // 1) Terbuang karena root dipindah ke dist/public/dll.
  if (site.rootDir) {
    const prefix = site.rootDir + "/";
    const dropped = new Map<string, number>();
    for (const f of all) {
      if (f.path.startsWith(prefix)) continue;
      const top = f.path.includes("/") ? f.path.split("/")[0] + "/" : f.path;
      if (SKIP_DROPPED.test(top.replace(/\/$/, ""))) continue;
      if (!/\.(html?|css|m?js|json|png|jpe?g|gif|svg|webp|ico|woff2?|ttf|mp4|webm|mp3|pdf)$/i.test(f.path)) continue;
      dropped.set(top, (dropped.get(top) ?? 0) + 1);
    }
    if (dropped.size > 0) {
      const list = Array.from(dropped, ([k, n]) => (k.endsWith("/") ? `${k} (${n} file)` : k)).slice(0, 6).join(", ");
      notes.push({
        level: "warn",
        text: `Hanya isi folder ${site.rootDir}/ yang dipublikasikan karena index.html tidak ada di root. Ini TIDAK ikut: ${list}${dropped.size > 6 ? ", …" : ""}. Kalau butuh semuanya, taruh index.html di root zip.`,
      });
    }
  }

  // 2) Link rusak / beda huruf.
  const exact = new Set(site.files.map((f) => f.path));
  const lower = new Map<string, string>();
  for (const f of site.files) lower.set(f.path.toLowerCase(), f.path);
  const exists = (path: string, ci: boolean): string | null => {
    const forms = path === "" ? ["index.html"] : path.endsWith("/") ? [path + "index.html"] : [path, path + ".html", path + "/index.html"];
    for (const x of forms) {
      if (!ci && exact.has(x)) return x;
      if (ci) {
        const hit = lower.get(x.toLowerCase());
        if (hit) return hit;
      }
    }
    return null;
  };

  const caseIssues: string[] = [];
  const missing: string[] = [];
  const seen = new Set<string>();
  for (const f of site.files) {
    if (!/\.html?$/i.test(f.path) || f.data.byteLength > 1_000_000) continue;
    const html = dec.decode(f.data).replace(/<!--[\s\S]*?-->/g, "");
    const dir = f.path.includes("/") ? f.path.slice(0, f.path.lastIndexOf("/") + 1) : "";
    const re = /\b(?:href|src|action|poster)\s*=\s*["']([^"']+)["']/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html))) {
      const raw = m[1].trim();
      if (!raw || raw.startsWith("#") || raw.startsWith("//") || /^[a-z][a-z0-9+.-]*:/i.test(raw) || /[{}<>$]/.test(raw)) continue;
      let ref = raw.split("#")[0].split("?")[0];
      try {
        ref = decodeURI(ref);
      } catch {
        /* biarkan apa adanya */
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
      const key = f.path + "→" + target;
      if (seen.has(key)) continue;
      seen.add(key);
      if (exists(target, false)) continue;
      const hit = exists(target, true);
      if (hit) caseIssues.push(`${f.path}: "${raw}" ≠ ${hit}`);
      else missing.push(`${f.path} → ${raw}`);
    }
  }
  if (caseIssues.length > 0) {
    notes.push({
      level: "warn",
      text: `${caseIssues.length} link beda huruf besar/kecil dengan nama filenya, jadi akan 404 di sini (di Windows/macOS terlihat normal). Contoh: ${caseIssues.slice(0, 3).join("; ")}.`,
    });
  }
  if (missing.length > 0) {
    notes.push({
      level: "warn",
      text: `${missing.length} link/gambar menunjuk file yang tidak ada di zip. Contoh: ${missing.slice(0, 3).join("; ")}.`,
    });
  }
  return notes;
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new SiteError("Koneksi ke server gagal. Periksa internet lalu coba lagi.");
  }
  let json: { ok?: boolean; data?: T; error?: string } | null = null;
  try {
    json = await res.json();
  } catch {
    /* body bukan JSON */
  }
  if (!res.ok || !json?.ok) {
    throw new SiteError(json?.error ?? `Server menjawab error (${res.status}).`);
  }
  return json.data as T;
}

export const fetchSites = () => api<SiteConfig>("/api/sites");

export const deleteSite = (id: string) => api<{ id: string }>(`/api/sites/${encodeURIComponent(id)}`, { method: "DELETE" });

export interface PublishOptions {
  name: string;
  ttlHours: number;
  spa: boolean;
  onProgress?: (done: number, total: number, label: string) => void;
}

export async function publishSite(files: UploadFile[], opts: PublishOptions): Promise<{ id: string; url: string; expiresAt: number }> {
  const total = files.reduce((n, f) => n + f.data.byteLength, 0);
  const blob = new Uint8Array(total);
  let off = 0;
  for (const f of files) {
    blob.set(f.data, off);
    off += f.data.byteLength;
  }

  opts.onProgress?.(0, 1, "Menyiapkan link…");
  const init = await api<{ id: string; url: string; chunkBytes: number; chunkCount: number }>("/api/sites", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: opts.name,
      ttlHours: opts.ttlHours,
      spa: opts.spa,
      files: files.map((f) => ({ path: f.path, size: f.data.byteLength })),
    }),
  });

  const { chunkBytes, chunkCount } = init;
  let done = 0;
  let next = 0;
  const worker = async () => {
    for (;;) {
      const i = next++;
      if (i >= chunkCount) return;
      const slice = blob.subarray(i * chunkBytes, Math.min(total, (i + 1) * chunkBytes));
      await api(`/api/sites/${encodeURIComponent(init.id)}/chunk?i=${i}`, {
        method: "PUT",
        headers: { "content-type": "application/octet-stream" },
        body: slice,
      });
      done++;
      opts.onProgress?.(done, chunkCount, "Mengirim file…");
    }
  };
  await Promise.all([worker(), worker(), worker()]);

  opts.onProgress?.(chunkCount, chunkCount, "Mengaktifkan link…");
  return api(`/api/sites/${encodeURIComponent(init.id)}/finish`, { method: "POST" });
}
