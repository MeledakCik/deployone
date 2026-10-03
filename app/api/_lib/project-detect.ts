/**
 * Mengenali TIPE project dari isi repo — sebelum deploy dimulai.
 *
 * Kenapa ada: dulu semua repo dianggap Node.js, jadi repo HTML murni
 * (tanpa package.json) ditolak dengan pesan "package.json tidak ditemukan".
 * Sekarang kita lihat dulu isinya: HTML statis, Node (TypeScript / Vue / dll),
 * Docker, Python, Go, dst. — baru diputuskan platform mana yang cocok.
 *
 * File ini murni (tidak melakukan fetch). Pengambilan data dari GitHub ada di
 * github.ts, yang lalu memanggil `classifyProject`.
 */
import type { ProjectProfile, ProjectType } from "@/types";

export interface RepoEntry {
  name: string;
  type: "file" | "dir";
}

export interface ClassifyInput {
  entries: RepoEntry[];
  /** Isi package.json di root (sudah di-parse), atau null kalau tidak ada / rusak. */
  pkg: Record<string, unknown> | null;
  /** Ada package.json di root tetapi gagal di-parse. */
  pkgBroken?: boolean;
  /** Folder (selain root) yang berisi index.html, mis. "public" / "docs" / "dist". */
  staticSubdir: string | null;
  /** Subfolder yang berisi package.json / index.html saat root-nya sendiri kosong dari project. */
  nestedProjectDir: string | null;
}

type Deps = Record<string, string>;

function depsOf(pkg: Record<string, unknown>): Deps {
  return {
    ...((pkg.dependencies as Deps) ?? {}),
    ...((pkg.devDependencies as Deps) ?? {}),
  };
}

/** Menebak framework dari dependency package.json (best-effort, urutan = prioritas). */
export function detectFramework(pkg: Record<string, unknown>): string | null {
  const d = depsOf(pkg);
  // Meta-framework (full-stack) dulu — mereka juga memakai React/Vue di dalamnya.
  if (d.next) return "Next.js";
  if (d["@remix-run/react"]) return "Remix";
  if (d.nuxt) return "Nuxt";
  if (d["@sveltejs/kit"]) return "SvelteKit";
  if (d.astro) return "Astro";
  if (d["@angular/core"]) return "Angular";
  if (d["@docusaurus/core"]) return "Docusaurus";
  if (d.vitepress) return "VitePress";
  if (d["@11ty/eleventy"]) return "Eleventy";
  if (d.gatsby) return "Gatsby";
  // Frontend (SPA)
  if (d["@vue/cli-service"]) return "Vue CLI";
  if (d.vue && (d.vite || d["@vitejs/plugin-vue"])) return "Vue + Vite";
  if (d.vue) return "Vue";
  if (d.svelte && d.vite) return "Svelte + Vite";
  if (d["solid-js"]) return "SolidJS";
  if (d["react-scripts"]) return "Create React App";
  if (d.vite && d.react) return "Vite + React";
  if (d.preact && d.vite) return "Vite + Preact";
  if (d.vite) return "Vite";
  if (d.parcel) return "Parcel";
  // Backend (server yang jalan terus)
  if (d["@nestjs/core"]) return "NestJS";
  if (d.express) return "Express";
  if (d.fastify) return "Fastify";
  if (d.hono) return "Hono";
  if (d.koa) return "Koa";
  return null;
}

const OTHER_LANGUAGES: {
  type: ProjectType;
  label: string;
  markers: (name: string) => boolean;
}[] = [
  {
    type: "python",
    label: "Python",
    markers: (n) =>
      ["requirements.txt", "pyproject.toml", "Pipfile", "setup.py", "manage.py"].includes(n),
  },
  { type: "go", label: "Go", markers: (n) => n === "go.mod" },
  {
    type: "php",
    label: "PHP",
    markers: (n) => n === "composer.json" || n === "index.php",
  },
  { type: "ruby", label: "Ruby", markers: (n) => n === "Gemfile" },
  {
    type: "java",
    label: "Java / Kotlin",
    markers: (n) => ["pom.xml", "build.gradle", "build.gradle.kts"].includes(n),
  },
  { type: "rust", label: "Rust", markers: (n) => n === "Cargo.toml" },
  {
    type: "dotnet",
    label: ".NET",
    markers: (n) => /\.(csproj|sln|fsproj)$/i.test(n),
  },
  { type: "elixir", label: "Elixir", markers: (n) => n === "mix.exs" },
];

/** Pilih index.html dari daftar file root, kalau ada (case-insensitive). */
function hasIndexHtml(entries: RepoEntry[]): boolean {
  return entries.some((e) => e.type === "file" && e.name.toLowerCase() === "index.html");
}

export function classifyProject(input: ClassifyInput): ProjectProfile {
  const { entries, pkg, pkgBroken, staticSubdir, nestedProjectDir } = input;
  const names = new Set(entries.map((e) => e.name));
  const files = entries.filter((e) => e.type === "file").map((e) => e.name);
  const rootEntries = entries.map((e) => (e.type === "dir" ? `${e.name}/` : e.name)).slice(0, 40);

  const base = {
    framework: null as string | null,
    usesTypeScript: false,
    staticDir: null as string | null,
    nestedProjectDir,
    rootEntries,
  };
  const make = (type: ProjectType, label: string, extra: Partial<ProjectProfile> = {}): ProjectProfile => ({
    ...base,
    type,
    label,
    ...extra,
  });

  if (entries.length === 0) return make("empty", "Repo kosong", { nestedProjectDir: null });

  /* 1. Node.js — ada package.json di root */
  if (names.has("package.json") && pkgBroken) {
    return make("node", "Node.js (package.json rusak)", { invalidPackageJson: true, nestedProjectDir: null });
  }
  if (names.has("package.json")) {
    const framework = pkg ? detectFramework(pkg) : null;
    const d = pkg ? depsOf(pkg) : {};
    const usesTypeScript = !!d.typescript || names.has("tsconfig.json");
    const baseLabel = framework ?? "Node.js";
    return make("node", usesTypeScript ? `${baseLabel} (TypeScript)` : baseLabel, {
      framework,
      usesTypeScript,
      nestedProjectDir: null,
    });
  }

  /* 2. Bahasa lain (Python, Go, PHP, ...) */
  for (const lang of OTHER_LANGUAGES) {
    if ([...names].some((n) => lang.markers(n))) {
      const hasDocker = names.has("Dockerfile");
      return make(lang.type, hasDocker ? `${lang.label} (Docker)` : lang.label, {
        nestedProjectDir: null,
      });
    }
  }

  /* 3. HTML statis di root */
  if (hasIndexHtml(entries)) {
    return make("static", "HTML statis", { staticDir: "", nestedProjectDir: null });
  }

  /* 4. Dockerfile saja */
  if (names.has("Dockerfile") || names.has("dockerfile")) {
    return make("docker", "Docker (Dockerfile)", { nestedProjectDir: null });
  }

  /* 5. HTML statis di subfolder (public/, docs/, dist/, ...) */
  if (staticSubdir) {
    return make("static", "HTML statis", { staticDir: staticSubdir, nestedProjectDir: null });
  }

  /* 6. Ada file .html tapi tanpa index.html */
  if (files.some((f) => /\.html?$/i.test(f))) {
    return make("static", "HTML statis (tanpa index.html)", { staticDir: null, nestedProjectDir: null });
  }

  /* 7. Tidak dikenali */
  return make("unknown", "Tidak dikenali");
}

/** Subfolder yang umum dipakai untuk menyimpan project di repo bertingkat / monorepo. */
export const NESTED_CANDIDATES = ["frontend", "client", "web", "app", "site", "website", "www", "ui"];

/** Folder yang umum berisi hasil statis. */
export const STATIC_SUBDIR_CANDIDATES = ["public", "docs", "dist", "build", "www", "site", "static"];
