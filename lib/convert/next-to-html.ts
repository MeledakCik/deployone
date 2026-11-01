/**
 * Persiapan konversi proyek Next.js → situs HTML statis.
 *
 * Bagian ini menemukan halaman, rantai layout, komponen lokal yang di-import, CSS global, dan aset publik.
 * Penulisan HTML-nya (JSX → HTML, mengembangkan map(), dst.) dikerjakan renderer statis lokal
 * (lib/convert/local/jsx-render.ts) per halaman, tanpa AI. Aset dan CSS disalin apa adanya.
 *
 * Mandiri (tanpa import) supaya bisa dites dengan Node.
 */

export interface SrcFile {
  path: string;
  data: Uint8Array;
}

export interface CtxFile {
  path: string;
  code: string;
}

export interface PageJob {
  /** Sama dengan outPath; unik. */
  id: string;
  sourcePath: string;
  route: string;
  /** Lokasi file HTML hasil, mis. "about/index.html". */
  outPath: string;
  code: string;
  /** Layout (terluar dulu), lalu komponen/data yang di-import halaman. */
  context: CtxFile[];
  /** Path layout / _app (terluar dulu); kodenya ada di `context`. */
  layouts: string[];
  /** File → (spec import → path hasil resolve), untuk import lokal. */
  resolved: Record<string, Record<string, string>>;
  router: "app" | "pages";
  /** Rute internal → href relatif dari halaman ini. */
  routeMap: Record<string, string>;
  /** Awalan untuk mencapai root situs dari halaman ini: "", "../", "../../" ... */
  assetPrefix: string;
  /** <link rel=stylesheet> relatif yang harus dipasang di <head>. */
  cssLinks: string[];
  /** Gambar yang di-import dari kode: baris "spec (di file) → href". */
  imageImports: string[];
  tailwind: boolean;
  chars: number;
}

export interface StaticOut {
  path: string;
  data: Uint8Array | string;
}

export interface NextAnalysis {
  router: "app" | "pages";
  jobs: PageJob[];
  staticFiles: StaticOut[];
  skipped: { path: string; reason: string }[];
  warnings: string[];
  tailwind: boolean;
}

const dec = new TextDecoder();
const CODE_EXT = ["tsx", "ts", "jsx", "js", "mjs"];
const IMG_EXT = /\.(png|jpe?g|gif|webp|avif|svg|ico)$/i;

const MAX_CTX_FILE = 600_000;
const MAX_CTX_TOTAL = 6_000_000;
export const MAX_PAGE_SOURCE = 800_000;

/* ---------------- path ---------------- */

const dirname = (p: string): string => (p.includes("/") ? p.slice(0, p.lastIndexOf("/")) : "");
const basename = (p: string): string => p.slice(p.lastIndexOf("/") + 1);

function joinPath(dir: string, rel: string): string {
  const out: string[] = [];
  for (const part of (dir ? dir.split("/") : []).concat(rel.split("/"))) {
    if (!part || part === ".") continue;
    if (part === "..") out.pop();
    else out.push(part);
  }
  return out.join("/");
}

/** Path relatif dari file `from` ke file `to` (keduanya relatif root situs). */
export function relHref(from: string, to: string): string {
  const a = dirname(from) ? dirname(from).split("/") : [];
  const b = to.split("/");
  let i = 0;
  while (i < a.length && i < b.length - 1 && a[i] === b[i]) i++;
  return "../".repeat(a.length - i) + b.slice(i).join("/");
}

/* ---------------- deteksi ---------------- */

const APP_PAGE = /^(?:src\/)?app\/(?:.*\/)?page\.(?:tsx|ts|jsx|js)$/;
const PAGES_FILE = /^(?:src\/)?pages\/.*\.(?:tsx|ts|jsx|js)$/;

export function detectNext(files: SrcFile[]): "app" | "pages" | null {
  if (files.some((f) => APP_PAGE.test(f.path))) return "app";
  const hasNext = files.some((f) => /^next\.config\.(js|mjs|ts|cjs)$/.test(f.path)) || files.some((f) => f.path === "package.json" && /"next"\s*:/.test(dec.decode(f.data)));
  if (hasNext && files.some((f) => PAGES_FILE.test(f.path) && !/\/(_app|_document|_error)\.|\/api\//.test(f.path))) return "pages";
  return null;
}

/* ---------------- import ---------------- */

const IMPORT_RE = /(?:^|[\s;])(?:import|export)\s+(?:type\s+)?(?:[^'";]*?\s+from\s+)?["']([^"']+)["']|require\(\s*["']([^"']+)["']\s*\)|import\(\s*["']([^"']+)["']\s*\)/g;

export function importSpecs(code: string): string[] {
  const out: string[] = [];
  for (const m of code.matchAll(IMPORT_RE)) {
    const s = m[1] ?? m[2] ?? m[3];
    if (s && !out.includes(s)) out.push(s);
  }
  return out;
}

function aliasRoots(files: Map<string, string>): { prefix: string; roots: string[] }[] {
  const aliases: { prefix: string; roots: string[] }[] = [];
  const raw = files.get("tsconfig.json") ?? files.get("jsconfig.json");
  if (raw) {
    try {
      const cleaned = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
      const cfg = JSON.parse(cleaned) as { compilerOptions?: { baseUrl?: string; paths?: Record<string, string[]> } };
      const base = (cfg.compilerOptions?.baseUrl ?? ".").replace(/^\.\/?/, "");
      for (const [k, v] of Object.entries(cfg.compilerOptions?.paths ?? {})) {
        if (!k.endsWith("/*")) continue;
        aliases.push({
          prefix: k.slice(0, -1),
          roots: v.filter((x) => x.endsWith("/*")).map((x) => joinPath(base, x.slice(0, -1))),
        });
      }
    } catch {
      /* tsconfig tidak valid JSON — pakai tebakan standar */
    }
  }
  if (!aliases.some((a) => a.prefix === "@/")) aliases.push({ prefix: "@/", roots: ["", "src"] });
  if (!aliases.some((a) => a.prefix === "~/")) aliases.push({ prefix: "~/", roots: ["", "src"] });
  return aliases;
}

const RESOLVE_EXT = ["", ".tsx", ".ts", ".jsx", ".js", ".mjs", ".css", ".scss", ".json", "/index.tsx", "/index.ts", "/index.jsx", "/index.js"];

function resolveImport(spec: string, from: string, files: Map<string, string>, all: Set<string>, aliases: { prefix: string; roots: string[] }[]): string | null {
  const bases: string[] = [];
  if (spec.startsWith(".")) bases.push(joinPath(dirname(from), spec));
  else {
    const a = aliases.find((x) => spec.startsWith(x.prefix));
    if (!a) return null; // paket npm
    for (const r of a.roots) bases.push(joinPath(r, spec.slice(a.prefix.length)));
  }
  for (const b of bases) for (const e of RESOLVE_EXT) if (all.has(b + e) && (e !== "" || /\.[A-Za-z0-9]+$/.test(b))) return b + e;
  void files;
  return null;
}

/* ---------------- analisis ---------------- */

function routeAndOut(file: string, router: "app" | "pages"): { route: string; out: string } | { skip: string } {
  const rel = file.replace(/^src\//, "");
  if (router === "app") {
    const segs = dirname(rel.replace(/^app\/?/, "")).split("/").filter(Boolean);
    const keep: string[] = [];
    for (const s of segs) {
      if (/^\(.*\)$/.test(s) && !/^\(\.+\)/.test(s)) continue; // route group
      if (s.startsWith("@")) return { skip: "parallel route (@slot) tidak punya halaman sendiri" };
      if (/^\(\.+\)/.test(s)) return { skip: "intercepting route tidak didukung" };
      if (s.startsWith("_")) return { skip: "folder privat (_nama) tidak jadi rute" };
      if (/\[.+\]/.test(s)) return { skip: "rute dinamis ([param]) butuh data & parameter — tidak bisa dijadikan satu file HTML" };
      keep.push(s);
    }
    return { route: "/" + keep.join("/"), out: keep.length ? `${keep.join("/")}/index.html` : "index.html" };
  }
  // pages router
  const p = rel.replace(/^pages\//, "").replace(/\.(tsx|ts|jsx|js)$/, "");
  const segs = p.split("/");
  if (segs[0] === "api") return { skip: "API route bukan halaman" };
  if (/^_(app|document|error)$/.test(segs[segs.length - 1])) return { skip: "file khusus Next.js (bukan halaman)" };
  if (segs.some((s) => /\[.+\]/.test(s))) return { skip: "rute dinamis ([param]) butuh data & parameter — tidak bisa dijadikan satu file HTML" };
  if (segs[segs.length - 1] === "404" && segs.length === 1) return { route: "/404", out: "404.html" };
  if (segs[segs.length - 1] === "index") segs.pop();
  return { route: "/" + segs.join("/"), out: segs.length ? `${segs.join("/")}/index.html` : "index.html" };
}

function stripTailwindDirectives(css: string): { css: string; hadApply: boolean; hadThemeBlock: boolean } {
  const hadApply = /@apply\b/.test(css);
  const hadThemeBlock = /@theme\b/.test(css);
  const out = css
    .replace(/^\s*@tailwind\s+[a-z]+\s*;?\s*$/gim, "")
    .replace(/^\s*@import\s+["']tailwindcss[^"']*["']\s*(?:layer\([^)]*\))?\s*;?\s*$/gim, "")
    .replace(/^\s*@(?:plugin|source|config)\s+[^;]*;\s*$/gim, "");
  return { css: out, hadApply, hadThemeBlock };
}

export function analyzeNextProject(input: SrcFile[]): NextAnalysis {
  const router = detectNext(input) ?? "app";
  const warnings: string[] = [];
  const skipped: { path: string; reason: string }[] = [];
  const text = new Map<string, string>();
  const all = new Set(input.map((f) => f.path));
  const bin = new Map<string, Uint8Array>();
  for (const f of input) {
    bin.set(f.path, f.data);
    if (/\.(tsx?|jsx?|mjs|cjs|css|scss|json|md)$/i.test(f.path)) text.set(f.path, dec.decode(f.data));
  }
  const aliases = aliasRoots(text);

  // Tailwind?
  const twConfig = [...all].find((p) => /^tailwind\.config\.(js|ts|mjs|cjs)$/.test(p));
  const pkg = text.get("package.json") ?? "";
  const tailwind =
    !!twConfig || /"tailwindcss"\s*:/.test(pkg) || [...text.entries()].some(([p, c]) => /\.css$/.test(p) && /@tailwind\b|@import\s+["']tailwindcss/.test(c));

  // Halaman
  const pageFiles = input
    .map((f) => f.path)
    .filter((p) => (router === "app" ? APP_PAGE.test(p) : PAGES_FILE.test(p)))
    .sort();
  type Planned = { file: string; route: string; out: string };
  const planned: Planned[] = [];
  const usedOut = new Set<string>();
  for (const file of pageFiles) {
    const r = routeAndOut(file, router);
    if ("skip" in r) {
      skipped.push({ path: file, reason: r.skip });
      continue;
    }
    if (usedOut.has(r.out)) {
      skipped.push({ path: file, reason: `bentrok dengan halaman lain di ${r.out}` });
      continue;
    }
    usedOut.add(r.out);
    planned.push({ file, route: r.route, out: r.out });
  }
  if (planned.length === 0) warnings.push("Tidak ada halaman statis yang bisa dikonversi (semua rute dinamis atau bukan halaman).");

  const routeToOut = new Map(planned.map((p) => [p.route, p.out]));

  // CSS global yang akan disalin & gambar yang di-import
  const cssOut = new Map<string, string>(); // path sumber → nama file hasil
  const imgOut = new Map<string, string>();
  const staticFiles: StaticOut[] = [];
  const addCss = (p: string): string => {
    const have = cssOut.get(p);
    if (have) return have;
    let name = basename(p).replace(/\.scss$/i, ".css");
    if ([...cssOut.values()].includes(`assets/css/${name}`)) name = `${cssOut.size}-${name}`;
    const target = name.startsWith("assets/") ? name : `assets/css/${name}`;
    cssOut.set(p, target);
    let css = text.get(p) ?? "";
    if (/\.scss$/i.test(p)) warnings.push(`"${p}" adalah SCSS — disalin apa adanya; kompilasi dulu (sass) agar terbaca browser.`);
    const t = stripTailwindDirectives(css);
    css = t.css;
    if (t.hadApply) warnings.push(`"${p}" memakai @apply (Tailwind). Di HTML statis, pindahkan ke <style type="text/tailwindcss"> atau tulis CSS biasa.`);
    if (t.hadThemeBlock) warnings.push(`"${p}" memakai @theme (Tailwind v4) — tidak berlaku di CDN v3; sesuaikan tema di tailwind.config pada <script>.`);
    staticFiles.push({ path: target, data: css });
    return target;
  };
  const addImg = (p: string): string => {
    const have = imgOut.get(p);
    if (have) return have;
    let name = basename(p);
    if ([...imgOut.values()].some((v) => v.endsWith("/" + name))) name = `${imgOut.size}-${name}`;
    const target = `assets/img/${name}`;
    imgOut.set(p, target);
    staticFiles.push({ path: target, data: bin.get(p)! });
    return target;
  };

  const jobs: PageJob[] = [];
  for (const pl of planned) {
    const code = text.get(pl.file) ?? "";
    if (code.length > MAX_PAGE_SOURCE) {
      skipped.push({ path: pl.file, reason: `terlalu besar (${Math.round(code.length / 1000)} KB; batas ${MAX_PAGE_SOURCE / 1000} KB) — pecah jadi komponen lebih kecil` });
      continue;
    }

    // Rantai layout (terluar dulu)
    const layouts: string[] = [];
    if (router === "app") {
      const parts = dirname(pl.file).split("/");
      for (let i = 1; i <= parts.length; i++) {
        const d = parts.slice(0, i).join("/");
        const hit = CODE_EXT.map((e) => `${d}/layout.${e}`).find((p) => all.has(p));
        if (hit && /(^|\/)app(\/|$)/.test(d + "/")) layouts.push(hit);
      }
    } else {
      const app = [...all].find((p) => /^(?:src\/)?pages\/_app\.(tsx|ts|jsx|js)$/.test(p));
      if (app) layouts.push(app);
    }

    // Telusuri import lokal (BFS, kedalaman ≤ 3)
    const ctx: CtxFile[] = [];
    const seen = new Set<string>([pl.file]);
    const cssLinks: string[] = [];
    const imageImports: string[] = [];
    const resolvedMap: Record<string, Record<string, string>> = {};
    let budget = MAX_CTX_TOTAL;
    let truncated = false;
    const queue: { path: string; depth: number }[] = [];
    for (const l of layouts) {
      seen.add(l);
      const c = text.get(l) ?? "";
      ctx.push({ path: l, code: c.slice(0, MAX_CTX_FILE) });
      budget -= Math.min(c.length, MAX_CTX_FILE);
      queue.push({ path: l, depth: 0 });
    }
    queue.push({ path: pl.file, depth: 0 });
    for (let qi = 0; qi < queue.length; qi++) {
      const cur = queue[qi];
      const src = text.get(cur.path) ?? "";
      for (const spec of importSpecs(src)) {
        const res = resolveImport(spec, cur.path, text, all, aliases);
        if (res) (resolvedMap[cur.path] ??= {})[spec] = res;
        if (!res || seen.has(res)) {
          if (res && IMG_EXT.test(res)) imageImports.push(`"${spec}" (di ${cur.path}) → ${relHref(pl.out, addImg(res))}`);
          continue;
        }
        if (IMG_EXT.test(res)) {
          seen.add(res);
          imageImports.push(`"${spec}" (di ${cur.path}) → ${relHref(pl.out, addImg(res))}`);
          continue;
        }
        if (/\.(css|scss)$/i.test(res)) {
          seen.add(res);
          if (/\.module\.(css|scss)$/i.test(res)) {
            const c = (text.get(res) ?? "").slice(0, MAX_CTX_FILE);
            if (budget - c.length >= 0) {
              ctx.push({ path: res, code: c });
              budget -= c.length;
            }
          } else {
            const href = relHref(pl.out, addCss(res));
            if (!cssLinks.includes(href)) cssLinks.push(href);
          }
          continue;
        }
        if (!text.has(res) || !/\.(tsx?|jsx?|mjs|json)$/i.test(res)) continue;
        seen.add(res);
        const full = text.get(res) ?? "";
        const c = full.slice(0, res.endsWith(".json") ? 8_000 : MAX_CTX_FILE);
        if (budget - c.length < 0) {
          truncated = true;
          continue;
        }
        ctx.push({ path: res, code: c });
        budget -= c.length;
        if (cur.depth + 1 < 8 && !res.endsWith(".json")) queue.push({ path: res, depth: cur.depth + 1 });
      }
    }
    if (truncated) warnings.push(`Konteks halaman "${pl.file}" dipotong (komponen terlalu banyak) — periksa hasilnya.`);
    if (tailwind && twConfig && text.has(twConfig)) ctx.push({ path: twConfig, code: (text.get(twConfig) ?? "").slice(0, 6_000) });

    // Peta rute
    const text2 = code + ctx.map((c) => c.code).join("\n");
    const routeMap: Record<string, string> = {};
    for (const [route, out] of routeToOut) {
      if (planned.length <= 40 || route === "/" || text2.includes(`"${route}`) || text2.includes(`'${route}`) || text2.includes("`" + route)) {
        routeMap[route] = relHref(pl.out, out);
      }
    }

    jobs.push({
      id: pl.out,
      sourcePath: pl.file,
      route: pl.route,
      outPath: pl.out,
      code,
      context: ctx,
      layouts,
      resolved: resolvedMap,
      router,
      routeMap,
      assetPrefix: "../".repeat(dirname(pl.out) ? dirname(pl.out).split("/").length : 0),
      cssLinks,
      imageImports: [...new Set(imageImports)],
      tailwind,
      chars: code.length + ctx.reduce((n, c) => n + c.code.length, 0),
    });
  }

  // public/ → root situs
  for (const f of input) {
    const m = /^(?:src\/)?public\/(.+)$/.exec(f.path) ?? /^public\/(.+)$/.exec(f.path);
    if (m && !/(^|\/)\.DS_Store$/.test(f.path)) staticFiles.push({ path: m[1], data: f.data });
  }

  if (jobs.some((j) => /\bfetch\(|await\s+\w+\(|useSWR|getServerSideProps|getStaticProps/.test(j.code))) {
    warnings.push("Ada halaman yang mengambil data (fetch/getServerSideProps/...). Data itu tidak dijalankan, jadi bagian yang bergantung padanya kosong di HTML statis — isi manual bila perlu.");
  }
  if (jobs.some((j) => /["']use client["']/.test(j.code) || j.context.some((c) => /["']use client["']/.test(c.code)))) {
    warnings.push("Komponen interaktif (use client) hanya dirender dengan nilai awal state; klik, form, dan efek tidak ikut. Tambahkan JavaScript biasa bila perlu.");
  }

  return { router, jobs, staticFiles, skipped, warnings, tailwind };
}
