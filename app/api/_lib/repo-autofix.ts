/**
 * Auto-lengkapi file yang kurang supaya repo bisa dibangun Railway.
 *
 * Kenapa ada: Railway membangun repo lewat Railpack, yang mengenali project dari
 * file tertentu (index.html, Staticfile, script "start", Procfile, ...). Repo yang
 * "hampir benar" — mis. HTML statis di folder docs/, server Express tanpa script
 * "start", FastAPI tanpa Procfile — sering gagal build/boot padahal kodenya sendiri
 * benar. Modul ini mendeteksi kekurangan itu dan menambahkan file-nya otomatis,
 * dalam SATU commit, sebelum service Railway dibuat.
 *
 * Prinsip:
 *  - Konservatif: hanya menambah/ubah kalau yakin, dan tidak pernah menimpa file
 *    konfigurasi buatan user (Dockerfile, Procfile, Staticfile, railway.json, ...).
 *  - Idempotent: deploy kedua kali tidak menghasilkan perubahan lagi.
 *  - Tidak fatal: kalau tidak bisa menulis ke repo (tanpa token / tanpa izin /
 *    branch terproteksi), deploy tetap lanjut dan user diberi tahu apa yang kurang.
 *  - Menulis HANYA dengan GitHub token milik user — token server (GITHUB_TOKEN)
 *    sengaja tidak pernah dipakai untuk menulis ke repo orang lain.
 */
import type {
  GithubValidation,
  ProjectProfile,
  RailwayAutofix,
  RailwayAutofixFile,
  RailwayAutofixPreview,
} from "@/types";
import { railwayEffectiveProfile, railwayRootDirectory } from "@/lib/deploy-guides";
import {
  fetchRepoFileText,
  invalidateValidationCache,
  listRepoDir,
} from "@/app/api/_lib/github";
import type { RepoEntry } from "@/app/api/_lib/project-detect";

/* ------------------------------------------------------------------ */
/*  Tipe                                                               */
/* ------------------------------------------------------------------ */

interface PlannedFile extends RailwayAutofixFile {
  content: string;
}

interface PlanContext {
  project: ProjectProfile;
  /** Nama file (bukan folder) di root repo. */
  rootFiles: string[];
  /** Nama folder di root repo. */
  rootDirs: string[];
  readText: (path: string) => Promise<string | null>;
  listDir: (path: string) => Promise<RepoEntry[] | null>;
}

/* ------------------------------------------------------------------ */
/*  Utilitas kecil                                                     */
/* ------------------------------------------------------------------ */

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Path folder yang aman ditulis ke Staticfile (tanpa karakter YAML aneh). */
const SAFE_DIR_RE = /^[A-Za-z0-9._\-/]+$/;

/** Framework yang hasil build-nya statis — Railpack menyajikannya sendiri lewat Caddy. */
const STATIC_BUILD_FRAMEWORK_RE =
  /^(Vite|Vue|Create React App|Svelte|SolidJS|Parcel|Angular|Docusaurus|VitePress|Eleventy|Gatsby|Astro|Preact)/i;

/** Hapus komentar/sampah agar baris `name==1.0` & `name>=1` cocok dengan nama paket. */
function requirementsHas(text: string, name: string): boolean {
  const re = new RegExp(`^\\s*${name}(\\[[^\\]]*\\])?\\s*([<>=!~;#@]|$)`, "im");
  return re.test(text);
}

function appendLine(text: string, line: string): string {
  const base = text.endsWith("\n") || text.length === 0 ? text : `${text}\n`;
  return `${base}${line}\n`;
}

/* ------------------------------------------------------------------ */
/*  Aturan 1 — HTML statis                                             */
/* ------------------------------------------------------------------ */

function buildIndexPage(htmlFiles: string[]): { content: string; reason: string } {
  const sorted = [...htmlFiles].sort((a, b) => a.localeCompare(b));
  const preferred =
    sorted.find((f) => /^index\.html?$/i.test(f)) ??
    sorted.find((f) => /^(home|beranda|main|default)\.html?$/i.test(f)) ??
    (sorted.length === 1 ? sorted[0] : null);

  const head =
    '<!doctype html>\n<html lang="id">\n<head>\n<meta charset="utf-8">\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">\n';

  if (preferred) {
    const href = encodeURIComponent(preferred);
    return {
      reason: `Tidak ada index.html di root, jadi halaman utama tidak akan muncul. Dibuat index.html yang membuka ${preferred}.`,
      content:
        `${head}<title>${escapeHtml(preferred)}</title>\n` +
        `<meta http-equiv="refresh" content="0; url=${href}">\n</head>\n<body>\n` +
        `<p>Mengalihkan ke <a href="${href}">${escapeHtml(preferred)}</a>…</p>\n</body>\n</html>\n`,
    };
  }

  const items = sorted
    .map((f) => `<li><a href="${encodeURIComponent(f)}">${escapeHtml(f)}</a></li>`)
    .join("\n");
  return {
    reason: `Tidak ada index.html di root, jadi halaman utama tidak akan muncul. Dibuat index.html berisi daftar ${sorted.length} halaman.`,
    content:
      `${head}<title>Daftar halaman</title>\n` +
      "<style>body{font-family:system-ui,sans-serif;max-width:40rem;margin:3rem auto;padding:0 1rem;line-height:1.7}</style>\n" +
      `</head>\n<body>\n<h1>Daftar halaman</h1>\n<ul>\n${items}\n</ul>\n</body>\n</html>\n`,
  };
}

function planStatic(ctx: PlanContext): PlannedFile[] {
  const { project, rootFiles, rootDirs } = ctx;
  if (rootFiles.includes("Staticfile")) return []; // user sudah mengatur sendiri
  const out: PlannedFile[] = [];

  // index.html ada di subfolder (docs/, dist/, ...) → arahkan Railpack ke sana.
  if (project.staticDir) {
    if (SAFE_DIR_RE.test(project.staticDir)) {
      out.push({
        path: "Staticfile",
        action: "create",
        reason: `index.html ada di folder "${project.staticDir}/", bukan di root. Staticfile mengarahkan Railway menyajikan folder itu.`,
        content: `root: ${project.staticDir}\n`,
      });
    }
    return out;
  }

  // index.html di root, TAPI ada folder public/ → Railpack akan menyajikan public/
  // (prioritasnya lebih tinggi dari root) dan halaman utama jadi 404.
  if (project.staticDir === "" && rootDirs.includes("public")) {
    out.push({
      path: "Staticfile",
      action: "create",
      reason:
        'Repo punya index.html di root sekaligus folder "public/". Tanpa Staticfile, Railway hanya menyajikan isi public/ dan halaman utamamu 404.',
      content: "root: .\n",
    });
    return out;
  }

  // Ada file .html tapi tidak ada index.html.
  if (project.staticDir === null) {
    const htmlFiles = rootFiles.filter((f) => /\.html?$/i.test(f));
    if (htmlFiles.length > 0) {
      const page = buildIndexPage(htmlFiles);
      out.push({ path: "index.html", action: "create", reason: page.reason, content: page.content });
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/*  Aturan 2 — Node.js tanpa script "start"                            */
/* ------------------------------------------------------------------ */

const ENTRY_CANDIDATES = [
  "index.js",
  "server.js",
  "app.js",
  "main.js",
  "index.mjs",
  "server.mjs",
  "app.mjs",
  "src/index.js",
  "src/server.js",
  "src/app.js",
  "src/main.js",
];

async function fileExists(ctx: PlanContext, path: string): Promise<boolean> {
  const slash = path.lastIndexOf("/");
  if (slash === -1) return ctx.rootFiles.includes(path);
  const dir = path.slice(0, slash);
  const name = path.slice(slash + 1);
  if (!ctx.rootDirs.includes(dir.split("/")[0])) return false;
  const list = await ctx.listDir(dir);
  return !!list?.some((e) => e.type === "file" && e.name === name);
}

async function pickStartCommand(
  ctx: PlanContext,
  pkg: Record<string, unknown>
): Promise<string | null> {
  const scripts = (pkg.scripts as Record<string, string> | undefined) ?? {};
  const deps = {
    ...((pkg.dependencies as Record<string, string>) ?? {}),
    ...((pkg.devDependencies as Record<string, string>) ?? {}),
  };
  const framework = ctx.project.framework;

  if (framework && STATIC_BUILD_FRAMEWORK_RE.test(framework)) return null;

  if (framework === "Next.js") return "next start";

  if (framework === "Nuxt") {
    const major = Number(/(\d+)/.exec(deps.nuxt ?? "")?.[1] ?? 0);
    return major >= 3 ? "node .output/server/index.mjs" : "nuxt start";
  }

  if (framework === "NestJS") {
    // Nest selalu di-build dulu; Railpack menjalankan script "build" sebelum start.
    return scripts.build ? "node dist/main" : null;
  }

  // Server Node biasa (Express / Fastify / Hono / Koa / tanpa framework).
  if (framework && !/^(Express|Fastify|Hono|Koa)$/i.test(framework)) return null;

  const main = typeof pkg.main === "string" ? pkg.main.replace(/^\.\//, "") : null;
  // `main` yang menunjuk ke hasil build (dist/, build/, out/) tidak ada di repo —
  // aman dipakai kalau memang ada script build yang membuatnya.
  if (main && /^(dist|build|out)\//.test(main) && /\.(c|m)?js$/.test(main) && scripts.build) {
    return `node ${main}`;
  }
  const candidates = [...(main && /\.(c|m)?js$/.test(main) ? [main] : []), ...ENTRY_CANDIDATES];
  for (const c of [...new Set(candidates)]) {
    if (await fileExists(ctx, c)) return `node ${c}`;
  }
  return null;
}

async function planNode(ctx: PlanContext): Promise<PlannedFile[]> {
  if (ctx.project.invalidPackageJson) return [];
  const raw = await ctx.readText("package.json");
  if (raw === null) return [];
  let pkg: Record<string, unknown>;
  try {
    pkg = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return [];
  }
  const scripts = (pkg.scripts as Record<string, string> | undefined) ?? {};
  if (scripts.start) return [];

  const command = await pickStartCommand(ctx, pkg);
  if (!command) return [];

  const indent = /^([ \t]+)"/m.exec(raw)?.[1] ?? "  ";
  const next = { ...pkg, scripts: { ...scripts, start: command } };
  const content = JSON.stringify(next, null, indent) + (raw.endsWith("\n") ? "\n" : "");
  return [
    {
      path: "package.json",
      action: "update",
      reason: `Tidak ada script "start" di package.json, jadi Railway tidak tahu cara menjalankan aplikasimu. Ditambahkan "start": "${command}".`,
      content,
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  Aturan 3 — Python tanpa cara start yang dikenali Railway           */
/* ------------------------------------------------------------------ */
/*
 * Railpack sudah menangani Django, FastAPI (main:app + uvicorn), Flask (+ gunicorn),
 * dan main.py/app.py. Celahnya: app di file/folder lain (app/main.py, src/...),
 * framework yang tidak dikenalinya (Streamlit, Starlette, Litestar, Quart), server
 * (uvicorn/gunicorn) yang belum ada di dependency, dan project berbasis pyproject.toml.
 */

const PY_CANDIDATES = [
  "main.py",
  "app.py",
  "streamlit_app.py",
  "server.py",
  "api.py",
  "application.py",
  "wsgi.py",
  "Home.py",
  "dashboard.py",
  "app/main.py",
  "app/app.py",
  "src/main.py",
  "src/app.py",
];

interface PyFramework {
  name: string;
  re: RegExp;
  server: "uvicorn" | "gunicorn";
  command: (moduleName: string, variable: string) => string;
}

const asgi = (moduleName: string, variable: string) =>
  `uvicorn ${moduleName}:${variable} --host 0.0.0.0 --port $PORT`;

const PY_FRAMEWORKS: PyFramework[] = [
  {
    name: "FastAPI",
    re: /^\s*(\w+)\s*(?::\s*[\w.[\]]+\s*)?=\s*(?:fastapi\.)?FastAPI\s*\(/m,
    server: "uvicorn",
    command: asgi,
  },
  {
    name: "Flask",
    re: /^\s*(\w+)\s*=\s*(?:flask\.)?Flask\s*\(/m,
    server: "gunicorn",
    command: (m, v) => `gunicorn ${m}:${v} --bind 0.0.0.0:$PORT`,
  },
  { name: "Starlette", re: /^\s*(\w+)\s*=\s*(?:starlette\.applications\.)?Starlette\s*\(/m, server: "uvicorn", command: asgi },
  { name: "Litestar", re: /^\s*(\w+)\s*=\s*(?:litestar\.)?Litestar\s*\(/m, server: "uvicorn", command: asgi },
  { name: "Quart", re: /^\s*(\w+)\s*=\s*(?:quart\.)?Quart\s*\(/m, server: "uvicorn", command: asgi },
];

const STREAMLIT_RE = /^\s*(?:import|from)\s+streamlit\b/m;

async function planPython(ctx: PlanContext): Promise<PlannedFile[]> {
  const [requirements, pyproject, pipfile] = await Promise.all([
    ctx.readText("requirements.txt"),
    ctx.readText("pyproject.toml"),
    ctx.readText("Pipfile"),
  ]);
  if (requirements === null && pyproject === null && pipfile === null) return [];

  /** Paket sudah dideklarasikan di salah satu file dependency? */
  const declared = (pkg: string): boolean =>
    (requirements !== null && requirementsHas(requirements, pkg)) ||
    [pyproject, pipfile].some((x) => x !== null && new RegExp(`\\b${pkg}\\b`, "i").test(x));

  /** Tambah paket ke requirements.txt — satu-satunya file dependency yang aman diubah otomatis. */
  const addToRequirements = (pkg: string, why: string): PlannedFile[] =>
    requirements !== null && !declared(pkg)
      ? [{ path: "requirements.txt", action: "update", reason: why, content: appendLine(requirements, pkg) }]
      : [];

  // Django: Railpack sudah punya start command-nya (gunicorn), tapi tidak selalu memasang gunicorn.
  if (ctx.rootFiles.includes("manage.py") && declared("django")) {
    return addToRequirements(
      "gunicorn",
      "Django dijalankan Railway dengan gunicorn, tetapi gunicorn belum ada di requirements.txt."
    );
  }

  for (const file of PY_CANDIDATES) {
    if (!(await fileExists(ctx, file))) continue;
    const source = await ctx.readText(file);
    if (!source) continue;
    const moduleName = file.replace(/\.py$/, "").replace(/\//g, ".");

    let label: string | null = null;
    let command: string | null = null;
    let server: string | null = null;

    for (const fw of PY_FRAMEWORKS) {
      const m = fw.re.exec(source);
      if (m) {
        label = fw.name;
        command = fw.command(moduleName, m[1]);
        server = fw.server;
        break;
      }
    }
    if (!command && STREAMLIT_RE.test(source)) {
      label = "Streamlit";
      command = `streamlit run ${file} --server.port $PORT --server.address 0.0.0.0 --server.headless true`;
      server = "streamlit";
    }
    if (!command || !label || !server) continue;

    // Kalau server belum terdeklarasi dan kita tidak bisa menambahkannya (mis. hanya pyproject.toml),
    // Procfile saja akan membuat boot gagal — lebih baik tidak menyentuh apa pun.
    if (!declared(server) && requirements === null) return [];

    return [
      {
        path: "Procfile",
        action: "create",
        reason: `Terdeteksi ${label} di ${file}. Procfile memberi tahu Railway cara menjalankannya di port yang benar (0.0.0.0:$PORT).`,
        content: `web: ${command}\n`,
      },
      ...addToRequirements(
        server,
        `${server} belum ada di requirements.txt padahal dibutuhkan untuk menjalankan aplikasi di Railway.`
      ),
    ];
  }
  return [];
}

/* ------------------------------------------------------------------ */
/*  Aturan 4 — Dockerfile tanpa .dockerignore                          */
/* ------------------------------------------------------------------ */

const DOCKERIGNORE = `# Dibuat otomatis oleh Depup — mencegah rahasia & file sampah ikut ke image Docker.
.git
.gitignore
node_modules
npm-debug.log
.DS_Store
.env
.env.*
!.env.example
__pycache__
*.pyc
.venv
venv
`;

function planDockerignore(ctx: PlanContext): PlannedFile[] {
  if (!ctx.rootFiles.includes("Dockerfile") || ctx.rootFiles.includes(".dockerignore")) return [];
  return [
    {
      path: ".dockerignore",
      action: "create",
      reason: "Ada Dockerfile tapi belum ada .dockerignore, jadi file .env, .git, dan node_modules bisa ikut masuk ke image.",
      content: DOCKERIGNORE,
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  Perencana utama                                                    */
/* ------------------------------------------------------------------ */

/**
 * Kalau user sudah menentukan sendiri cara build/start (Dockerfile, Procfile,
 * railway.json, ...), Railway mengikuti itu — jadi aturan per-tipe di bawah tidak
 * boleh ikut campur.
 */
const USER_BUILD_CONFIG = [
  "Dockerfile",
  "Procfile",
  "railway.json",
  "railway.toml",
  "railpack.json",
  "nixpacks.toml",
];

export async function planRailwayFixes(ctx: PlanContext): Promise<PlannedFile[]> {
  const planned: PlannedFile[] = [];
  const userControlsBuild = USER_BUILD_CONFIG.some((f) => ctx.rootFiles.includes(f));
  switch (userControlsBuild ? "skip" : ctx.project.type) {
    case "static":
      planned.push(...planStatic(ctx));
      break;
    case "node":
      planned.push(...(await planNode(ctx)));
      break;
    case "python":
      planned.push(...(await planPython(ctx)));
      break;
    default:
      break;
  }
  planned.push(...planDockerignore(ctx));
  return planned;
}

/* ------------------------------------------------------------------ */
/*  Menulis ke GitHub (satu commit lewat Git Data API)                 */
/* ------------------------------------------------------------------ */

const GH = "https://api.github.com";

async function ghCall<T>(
  pat: string,
  method: string,
  path: string,
  body?: unknown
): Promise<{ status: number; data: T | null }> {
  const res = await fetch(`${GH}${path}`, {
    method,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${pat}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const data = (await res.json().catch(() => null)) as T | null;
  return { status: res.status, data };
}

class CommitError extends Error {
  kind: "no_permission" | "failed";
  constructor(message: string, kind: CommitError["kind"]) {
    super(message);
    this.kind = kind;
  }
}

function explain(status: number, step: string): CommitError {
  if (status === 401) {
    return new CommitError("GitHub Token tidak valid atau sudah kedaluwarsa, jadi file tidak bisa ditambahkan ke repo.", "no_permission");
  }
  if (status === 403 || status === 404) {
    return new CommitError(
      "GitHub Token tidak punya izin menulis ke repo ini. Pastikan izin “repo” (classic) atau “Contents: Read and write” (fine-grained) dan kamu pemilik/kolaborator repo.",
      "no_permission"
    );
  }
  if (status === 409 || status === 422) {
    return new CommitError(
      "GitHub menolak commit otomatis (branch utama mungkin dilindungi / butuh pull request).",
      "no_permission"
    );
  }
  return new CommitError(`Gagal menambahkan file ke repo (langkah ${step}, kode ${status}).`, "failed");
}

async function commitFiles(
  owner: string,
  repo: string,
  branch: string,
  pat: string,
  files: PlannedFile[]
): Promise<string> {
  const base = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  const branchPath = branch.split("/").map(encodeURIComponent).join("/");

  const ref = await ghCall<{ object: { sha: string } }>(pat, "GET", `${base}/git/ref/heads/${branchPath}`);
  if (ref.status !== 200 || !ref.data) throw explain(ref.status, "baca branch");
  const headSha = ref.data.object.sha;

  const head = await ghCall<{ tree: { sha: string } }>(pat, "GET", `${base}/git/commits/${headSha}`);
  if (head.status !== 200 || !head.data) throw explain(head.status, "baca commit");

  const tree = await ghCall<{ sha: string }>(pat, "POST", `${base}/git/trees`, {
    base_tree: head.data.tree.sha,
    tree: files.map((f) => ({ path: f.path, mode: "100644", type: "blob", content: f.content })),
  });
  if (tree.status !== 201 || !tree.data) throw explain(tree.status, "buat tree");

  const message =
    "chore: lengkapi file untuk deploy Railway (Depup)\n\n" +
    files.map((f) => `- ${f.action === "create" ? "tambah" : "ubah"} ${f.path}`).join("\n");
  const commit = await ghCall<{ sha: string }>(pat, "POST", `${base}/git/commits`, {
    message,
    tree: tree.data.sha,
    parents: [headSha],
  });
  if (commit.status !== 201 || !commit.data) throw explain(commit.status, "buat commit");

  const update = await ghCall(pat, "PATCH", `${base}/git/refs/heads/${branchPath}`, {
    sha: commit.data.sha,
    force: false,
  });
  if (update.status !== 200) throw explain(update.status, "update branch");

  return commit.data.sha;
}

/* ------------------------------------------------------------------ */
/*  Entry point                                                        */
/* ------------------------------------------------------------------ */

const summarize = (files: PlannedFile[]): RailwayAutofixFile[] =>
  files.map(({ path, action, reason }) => ({ path, action, reason }));

/**
 * Baca repo lalu susun rencana file yang kurang. Kalau project ada di subfolder
 * (Root Directory), semua path dibaca & ditulis relatif ke folder itu.
 * `null` = isi repo tidak bisa dibaca.
 */
async function buildPlan(
  validation: GithubValidation,
  pat: string | undefined
): Promise<{ planned: PlannedFile[]; rootDirectory: string | null } | null> {
  const { owner, repo, defaultBranch, project } = validation;
  const rootDirectory = railwayRootDirectory(project);
  const base = rootDirectory ?? "";
  const at = (path: string) => (base ? `${base}/${path}` : path);

  // Hanya membaca; token server boleh dipakai untuk membaca repo publik.
  const entries = await listRepoDir(owner, repo, base, defaultBranch, pat);
  if (!entries) return null;

  const ctx: PlanContext = {
    project: railwayEffectiveProfile(project),
    rootFiles: entries.filter((e) => e.type === "file").map((e) => e.name),
    rootDirs: entries.filter((e) => e.type === "dir").map((e) => e.name),
    readText: (path) => fetchRepoFileText(owner, repo, at(path), defaultBranch, pat),
    listDir: (path) => listRepoDir(owner, repo, at(path), defaultBranch, pat),
  };
  const planned = (await planRailwayFixes(ctx)).map((f) => ({ ...f, path: at(f.path) }));
  return { planned, rootDirectory };
}

/** Apakah token ini bisa menulis ke repo? (Satu panggilan ke GitHub.) */
async function tokenCanWrite(owner: string, repo: string, pat: string): Promise<boolean> {
  const meta = await ghCall<{ permissions?: { push?: boolean } }>(
    pat,
    "GET",
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`
  );
  return meta.status === 200 && meta.data?.permissions?.push !== false;
}

/**
 * Pratinjau: file apa yang AKAN ditambahkan saat deploy ke Railway. Tidak mengubah apa pun.
 * Dipakai kartu cek repo di layar Deploy supaya user tahu sebelum menekan tombol.
 */
export async function previewRailwayAutofix(
  validation: GithubValidation,
  githubPat?: string
): Promise<RailwayAutofixPreview> {
  const pat = githubPat?.trim();
  const rootDirectory = railwayRootDirectory(validation.project);
  try {
    const plan = await buildPlan(validation, pat);
    if (!plan || plan.planned.length === 0) return { files: [], rootDirectory, canWrite: true };
    const canWrite = pat ? await tokenCanWrite(validation.owner, validation.repo, pat) : false;
    return { files: summarize(plan.planned), rootDirectory, canWrite };
  } catch (e) {
    console.error("[autofix] preview error", e);
    return { files: [], rootDirectory, canWrite: true };
  }
}

/**
 * Cek repo, tambahkan file yang kurang agar bisa dibangun Railway, lalu commit.
 * Tidak pernah melempar error: kegagalan dilaporkan lewat `status` supaya deploy
 * tetap bisa lanjut.
 */
export async function autofixRepoForRailway(
  validation: GithubValidation,
  githubPat?: string
): Promise<RailwayAutofix> {
  const { owner, repo, defaultBranch } = validation;
  const pat = githubPat?.trim();
  let files: RailwayAutofixFile[] = [];

  try {
    const plan = await buildPlan(validation, pat);
    if (!plan || plan.planned.length === 0) return { status: "none", files: [] };
    const { planned } = plan;
    files = summarize(planned);

    if (!pat) {
      return {
        status: "needs_token",
        files,
        message:
          "Repo ini kekurangan file agar bisa jalan di Railway, tapi GitHub Token belum diisi sehingga Depup tidak bisa menambahkannya. Isi GitHub Token (izin “repo”) lalu deploy ulang, atau tambahkan file-nya sendiri.",
      };
    }

    const meta = await ghCall<{ permissions?: { push?: boolean } }>(
      pat,
      "GET",
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`
    );
    if (meta.status === 200 && meta.data?.permissions?.push === false) {
      return {
        status: "no_permission",
        files,
        message:
          "Repo ini kekurangan file agar bisa jalan di Railway, tapi token GitHub-mu hanya bisa membaca repo ini (bukan menulis), jadi Depup tidak bisa menambahkannya.",
      };
    }

    const commitSha = await commitFiles(owner, repo, defaultBranch, pat, planned);
    invalidateValidationCache(owner, repo);
    return { status: "committed", files, commitSha };
  } catch (e) {
    // Gagal menulis ≠ gagal deploy. Laporkan, lalu biarkan deploy lanjut.
    if (e instanceof CommitError) {
      return { status: e.kind, files, message: e.message };
    }
    console.error("[autofix] unexpected error", e);
    return { status: "failed", files, message: "Pengecekan file otomatis gagal. Deploy tetap dilanjutkan." };
  }
}
