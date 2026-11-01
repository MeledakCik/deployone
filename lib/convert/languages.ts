/**
 * Daftar bahasa/format untuk fitur Konversi: deteksi dari ekstensi atau isi kode, daftar tujuan,
 * dan pemetaan nama file hasil. Mandiri (tanpa import) supaya mudah dites dengan Node.
 */

export type LangGroup = "web" | "bahasa" | "data";

export interface Lang {
  id: string;
  /** Nama yang ditampilkan ke pengguna. */
  label: string;
  /** Ekstensi file hasil, tanpa titik di depan (boleh "blade.php"). */
  ext: string;
  group: LangGroup;
  /** Nama lengkap untuk prompt AI (lebih spesifik dari label). */
  prompt: string;
  /** Ekstensi lain yang dikenali sebagai bahasa ini saat membaca file. */
  also?: string[];
}

export const LANGS: Lang[] = [
  { id: "html", label: "HTML", ext: "html", group: "web", prompt: "HTML5", also: ["htm"] },
  { id: "css", label: "CSS", ext: "css", group: "web", prompt: "CSS" },
  { id: "scss", label: "SCSS / Sass", ext: "scss", group: "web", prompt: "SCSS", also: ["sass"] },
  { id: "js", label: "JavaScript", ext: "js", group: "web", prompt: "modern JavaScript (ES modules)", also: ["mjs", "cjs"] },
  { id: "ts", label: "TypeScript", ext: "ts", group: "web", prompt: "TypeScript (strict)", also: ["mts", "cts"] },
  { id: "jsx", label: "React (JSX)", ext: "jsx", group: "web", prompt: "a React function component in JSX" },
  { id: "tsx", label: "React (TSX)", ext: "tsx", group: "web", prompt: "a React function component in TypeScript (TSX)" },
  { id: "vue", label: "Vue 3", ext: "vue", group: "web", prompt: "a Vue 3 single-file component using <script setup lang=\"ts\">" },
  { id: "svelte", label: "Svelte", ext: "svelte", group: "web", prompt: "a Svelte 5 component" },
  { id: "astro", label: "Astro", ext: "astro", group: "web", prompt: "an Astro component" },
  { id: "blade", label: "Laravel Blade", ext: "blade.php", group: "web", prompt: "a Laravel Blade template" },
  { id: "php", label: "PHP", ext: "php", group: "bahasa", prompt: "PHP 8" },
  { id: "py", label: "Python", ext: "py", group: "bahasa", prompt: "Python 3" },
  { id: "java", label: "Java", ext: "java", group: "bahasa", prompt: "Java 21" },
  { id: "kt", label: "Kotlin", ext: "kt", group: "bahasa", prompt: "Kotlin", also: ["kts"] },
  { id: "swift", label: "Swift", ext: "swift", group: "bahasa", prompt: "Swift" },
  { id: "go", label: "Go", ext: "go", group: "bahasa", prompt: "Go" },
  { id: "rs", label: "Rust", ext: "rs", group: "bahasa", prompt: "Rust" },
  { id: "cs", label: "C#", ext: "cs", group: "bahasa", prompt: "C# (.NET 8)" },
  { id: "c", label: "C", ext: "c", group: "bahasa", prompt: "C", also: ["h"] },
  { id: "cpp", label: "C++", ext: "cpp", group: "bahasa", prompt: "C++17", also: ["cc", "cxx", "hpp"] },
  { id: "rb", label: "Ruby", ext: "rb", group: "bahasa", prompt: "Ruby" },
  { id: "dart", label: "Dart", ext: "dart", group: "bahasa", prompt: "Dart" },
  { id: "lua", label: "Lua", ext: "lua", group: "bahasa", prompt: "Lua" },
  { id: "sh", label: "Bash", ext: "sh", group: "bahasa", prompt: "Bash", also: ["bash", "zsh"] },
  { id: "sql", label: "SQL", ext: "sql", group: "bahasa", prompt: "SQL" },
  { id: "json", label: "JSON", ext: "json", group: "data", prompt: "JSON" },
  { id: "yaml", label: "YAML", ext: "yaml", group: "data", prompt: "YAML", also: ["yml"] },
  { id: "toml", label: "TOML", ext: "toml", group: "data", prompt: "TOML" },
  { id: "xml", label: "XML", ext: "xml", group: "data", prompt: "XML" },
  { id: "md", label: "Markdown", ext: "md", group: "data", prompt: "Markdown", also: ["markdown"] },
];

export const GROUP_LABEL: Record<LangGroup, string> = {
  web: "Web & framework",
  bahasa: "Bahasa pemrograman",
  data: "Data & dokumen",
};

/** Bahasa buatan pengguna (diketik bebas). */
export const CUSTOM_ID = "custom";

const byExt = new Map<string, Lang>();
for (const l of LANGS) {
  byExt.set(l.ext, l);
  for (const e of l.also ?? []) byExt.set(e, l);
}
byExt.set("htm", LANGS[0]);

export function langById(id: string): Lang | undefined {
  return LANGS.find((l) => l.id === id);
}

/** Deteksi bahasa dari nama file. "x.blade.php" dikenali sebagai Blade. */
export function langOfPath(path: string): Lang | undefined {
  const name = path.split("/").pop() ?? path;
  const lower = name.toLowerCase();
  if (lower.endsWith(".blade.php")) return langById("blade");
  if (lower.endsWith(".d.ts")) return undefined; // tipe saja, tidak dikonversi
  const dot = lower.lastIndexOf(".");
  if (dot <= 0) return undefined;
  return byExt.get(lower.slice(dot + 1));
}

/** Tebakan kasar dari isi kode (untuk mode "tempel kode"). */
export function guessLangFromCode(code: string): Lang | undefined {
  const t = code.trim();
  if (!t) return undefined;
  const has = (re: RegExp): boolean => re.test(t);
  if (has(/^<!doctype html|^<html[\s>]/i)) return langById("html");
  if (has(/^<\?php/)) return langById("php");
  if (has(/^<template[\s>]|<script setup/)) return langById("vue");
  if (has(/^#!.*\b(ba|z)?sh\b/)) return langById("sh");
  if (has(/^#!.*python|^\s*def \w+\(.*\):|^\s*from \w[\w.]* import |^\s*import \w+\s*$/m) && !has(/[;{]\s*$/m)) return langById("py");
  if (has(/^package main\b|^func \w+\(/m)) return langById("go");
  if (has(/^use std::|^fn \w+\(|let mut /m)) return langById("rs");
  if (has(/^(public\s+)?(class|interface|enum) \w+/m) && has(/System\.out\.|import java\./)) return langById("java");
  if (has(/^using System|namespace \w+|Console\.WriteLine/m)) return langById("cs");
  if (has(/^import SwiftUI|^import Foundation|\bfunc \w+\(.*\)\s*(->|\{)/m) && has(/\bvar |\blet /)) return langById("swift");
  if (has(/^fun \w+\(|^val \w+|^class \w+.*\(.*val /m)) return langById("kt");
  if (has(/^#include\s*[<"]/m)) return has(/std::|class |template\s*</) ? langById("cpp") : langById("c");
  if (has(/^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE TABLE)\b/i)) return langById("sql");
  if (has(/^\s*[{[]/) && has(/"\s*:/)) {
    try {
      JSON.parse(t);
      return langById("json");
    } catch {
      /* bukan JSON utuh */
    }
  }
  if (has(/<[A-Z]\w*[\s/>]|\buseState\b|\bReact\b/) && has(/:\s*(string|number|boolean|React\.)|interface \w+|<\w+>\(/)) return langById("tsx");
  if (has(/<[A-Z]\w*[\s/>]|\buseState\b|from ["']react["']/)) return langById("jsx");
  if (has(/\binterface \w+\s*\{|:\s*(string|number|boolean)\b|\btype \w+ =/)) return langById("ts");
  if (has(/\b(const|let|var|function)\b|=>|require\(|module\.exports/)) return langById("js");
  if (has(/^[\w.#-]+\s*\{[^}]*:[^}]*;?[^}]*\}/m)) return langById("css");
  if (has(/^[\w-]+:\s*\S/m) && !has(/[{};]/)) return langById("yaml");
  return undefined;
}

export interface TargetSpec {
  /** id bahasa, atau CUSTOM_ID untuk tujuan bebas. */
  id: string;
  label: string;
  /** Ekstensi tanpa titik. */
  ext: string;
  /** Nama untuk prompt. */
  prompt: string;
}

export function targetFromLang(l: Lang): TargetSpec {
  return { id: l.id, label: l.label, ext: l.ext, prompt: l.prompt };
}

/** Tujuan bebas dari teks pengguna, mis. "Elixir", ekstensi "ex". */
export function customTarget(name: string, ext: string): TargetSpec {
  const cleanExt = ext.trim().replace(/^\.+/, "").replace(/[^A-Za-z0-9._-]/g, "").slice(0, 16) || "txt";
  const cleanName = name.trim().replace(/\s+/g, " ").slice(0, 60) || "kode";
  return { id: CUSTOM_ID, label: cleanName, ext: cleanExt, prompt: cleanName };
}

/** Nama file hasil: ganti ekstensi lama dengan ekstensi tujuan, folder tetap. */
export function targetPath(path: string, target: TargetSpec): string {
  const i = path.lastIndexOf("/");
  const dir = i === -1 ? "" : path.slice(0, i + 1);
  const name = i === -1 ? path : path.slice(i + 1);
  const lower = name.toLowerCase();
  const base = lower.endsWith(".blade.php") ? name.slice(0, -".blade.php".length) : name.includes(".") ? name.slice(0, name.lastIndexOf(".")) : name;
  return `${dir}${base || "file"}.${target.ext}`;
}

/** Ekstensi file yang dianggap "kode/teks" dan layak ditawarkan untuk dikonversi. */
export function isConvertible(path: string): boolean {
  return langOfPath(path) !== undefined;
}

const SKIP_DIRS = /(^|\/)(node_modules|\.git|\.next|dist|build|out|coverage|\.turbo|\.vercel|vendor|__pycache__|target)\//;
const SKIP_FILES = /(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|composer\.lock|Cargo\.lock|\.DS_Store)$|\.min\.(js|css)$|\.(map|lock)$/;

export function isNoise(path: string): boolean {
  return SKIP_DIRS.test(path) || SKIP_FILES.test(path);
}
