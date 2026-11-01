/**
 * Konverter file lokal (tanpa AI): hanya pasangan yang aturannya pasti.
 * Library berat dimuat saat dibutuhkan (dynamic import) supaya halaman Konversi tetap ringan.
 */

import { htmlToJsx } from "../html-to-next";
import { prettyHtml, renderComponentFile } from "./jsx-render";

export interface LocalResult {
  code: string;
  warnings: string[];
}

/** Bahasa asal → daftar tujuan yang bisa dikerjakan tanpa AI. */
const PAIRS: Record<string, string[]> = {
  ts: ["js"],
  js: ["ts"],
  tsx: ["jsx", "js", "html"],
  jsx: ["tsx", "js", "html"],
  css: ["scss"],
  html: ["jsx", "tsx", "vue", "svelte", "astro", "blade", "md"],
  md: ["html"],
  json: ["yaml", "toml", "xml"],
  yaml: ["json", "toml", "xml"],
  toml: ["json", "yaml", "xml"],
  xml: ["json", "yaml", "toml"],
};

export function localTargets(fromId: string): string[] {
  return PAIRS[fromId] ?? [];
}

export function canConvertLocal(fromId: string, toId: string): boolean {
  return (PAIRS[fromId] ?? []).includes(toId);
}

/** Alasan singkat bila pasangan tidak didukung (untuk pesan ke pengguna). */
export function whyNotLocal(fromId: string, toId: string): string {
  if (fromId === toId) return "bahasa asal dan tujuan sama";
  if (toId === "scss") return "SCSS ke CSS butuh kompiler Sass";
  if (fromId === "scss") return "SCSS ke bentuk lain butuh kompiler Sass";
  return "konversi antar bahasa pemrograman butuh pemahaman makna kode — tidak bisa dilakukan tanpa AI";
}

/* ------------------------------------------------------------------ */

const bodyOf = (html: string): string => /<body[^>]*>([\s\S]*?)<\/body>/i.exec(html)?.[1] ?? html.replace(/<!doctype[^>]*>|<\/?html[^>]*>|<head[\s\S]*?<\/head>/gi, "");
const stylesOf = (html: string): string[] => [...html.matchAll(/<style[^>]*>[\s\S]*?<\/style>/gi)].map((m) => m[0]);
const stripBlocks = (s: string, tags: string[]): string => tags.reduce((acc, t) => acc.replace(new RegExp(`<${t}[\\b\\s>][\\s\\S]*?</${t}>`, "gi"), ""), s);
const indent = (s: string, n: number): string => s.split("\n").map((l) => (l.trim() ? " ".repeat(n) + l : l)).join("\n");

const tidyCode = (s: string): string => s.replace(/[ \t]+$/gm, "").replace(/ +;$/gm, ";").replace(/^\n+/, "").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";

async function stripTypes(code: string, jsx: "keep" | "classic" | "none"): Promise<string> {
  const { transform } = await import("sucrase");
  return tidyCode(await stripTypesRaw(transform, code, jsx));
}

async function stripTypesRaw(transform: typeof import("sucrase").transform, code: string, jsx: "keep" | "classic" | "none"): Promise<string> {
  const transforms: ("typescript" | "jsx")[] = jsx === "none" ? ["typescript"] : jsx === "keep" ? ["typescript", "jsx"] : ["typescript", "jsx"];
  return transform(code, {
    transforms,
    disableESTransforms: true,
    jsxRuntime: jsx === "keep" ? "preserve" : "classic",
    production: true,
  }).code;
}

type Data = unknown;

async function parseData(from: string, code: string): Promise<Data> {
  switch (from) {
    case "json": return JSON.parse(code);
    case "yaml": {
      const { parse } = await import("yaml");
      return parse(code);
    }
    case "toml": {
      const { parse } = await import("smol-toml");
      return parse(code);
    }
    case "xml": {
      const { XMLParser, XMLValidator } = await import("fast-xml-parser");
      const ok = XMLValidator.validate(code);
      if (ok !== true) throw new Error(`XML tidak valid: ${ok.err.msg} (baris ${ok.err.line})`);
      const out = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", textNodeName: "#text", parseTagValue: false, parseAttributeValue: false, trimValues: true }).parse(code) as Record<string, unknown>;
      delete out["?xml"];
      return out;
    }
    default: throw new Error("format data tidak dikenal");
  }
}

async function stringifyData(to: string, data: Data, warnings: string[]): Promise<string> {
  switch (to) {
    case "json": return JSON.stringify(data, null, 2) + "\n";
    case "yaml": {
      const { stringify } = await import("yaml");
      return stringify(data, { indent: 2, lineWidth: 0 });
    }
    case "toml": {
      if (data === null || typeof data !== "object" || Array.isArray(data)) throw new Error("TOML butuh objek di level paling atas (bukan array atau nilai tunggal).");
      const { stringify } = await import("smol-toml");
      return stringify(data as Record<string, unknown>) + "\n";
    }
    case "xml": {
      const { XMLBuilder } = await import("fast-xml-parser");
      let root: Record<string, unknown>;
      if (data && typeof data === "object" && !Array.isArray(data) && Object.keys(data).length === 1) root = data as Record<string, unknown>;
      else {
        warnings.push('XML butuh satu elemen akar — data dibungkus <root>.');
        root = { root: Array.isArray(data) ? { item: data } : data };
      }
      const xml = new XMLBuilder({ ignoreAttributes: false, attributeNamePrefix: "@_", textNodeName: "#text", format: true, indentBy: "  ", suppressEmptyNode: false }).build(root) as string;
      return `<?xml version="1.0" encoding="UTF-8"?>\n${xml}`;
    }
    default: throw new Error("format data tidak dikenal");
  }
}

const isData = (id: string): boolean => id === "json" || id === "yaml" || id === "toml" || id === "xml";

export async function convertFileLocal(opts: { from: string; to: string; code: string; path: string }): Promise<LocalResult> {
  const { from, to, code, path } = opts;
  const warnings: string[] = [];
  if (!canConvertLocal(from, to)) throw new Error(`Tidak ada konverter lokal untuk ${from} → ${to}: ${whyNotLocal(from, to)}.`);

  /* ---- tipe & JSX ---- */
  if (from === "ts" && to === "js") return { code: await stripTypes(code, "none"), warnings: ["Tipe dibuang; enum/namespace diubah ke JavaScript biasa. Dekorator tidak didukung."] };
  if (from === "tsx" && to === "jsx") return { code: await stripTypes(code, "keep"), warnings };
  if ((from === "tsx" || from === "jsx") && to === "js") {
    warnings.push("JSX diubah ke React.createElement — pastikan React di-import di file ini.");
    return { code: await stripTypes(code, "classic"), warnings };
  }
  if ((from === "js" && to === "ts") || (from === "jsx" && to === "tsx")) {
    warnings.push("Hanya mengganti ekstensi: tipe TypeScript tidak ditambahkan, jadi mode strict mungkin menampilkan error tipe.");
    return { code, warnings };
  }
  if ((from === "tsx" || from === "jsx") && to === "html") {
    const r = await renderComponentFile(path, code);
    return { code: r.html, warnings: ["Komponen dirender dengan nilai awal (tanpa props, tanpa interaksi).", ...r.warnings] };
  }

  /* ---- CSS ---- */
  if (from === "css" && to === "scss") return { code, warnings: ["CSS sudah valid sebagai SCSS — isinya tidak diubah."] };

  /* ---- data ---- */
  if (isData(from) && isData(to)) {
    let data: Data;
    try {
      data = await parseData(from, code);
    } catch (e) {
      throw new Error(`Sumber ${from.toUpperCase()} tidak valid: ${e instanceof Error ? e.message.split("\n")[0] : "gagal dibaca"}`);
    }
    if (from === "xml") warnings.push("Atribut XML ditulis sebagai kunci berawalan @_ dan teks sebagai #text.");
    if (to === "xml" && from !== "xml") warnings.push("Kunci berawalan @_ dibaca sebagai atribut XML.");
    if (from === "yaml" && /^\s*[&*]|\s[&*]\w+/m.test(code)) warnings.push("Anchor/alias YAML diperluas jadi nilai biasa.");
    if (from === "yaml" || from === "toml") if (/^\s*#/m.test(code)) warnings.push("Komentar tidak ikut terbawa.");
    return { code: await stringifyData(to, data, warnings), warnings };
  }

  /* ---- Markdown / HTML ---- */
  if (from === "md" && to === "html") {
    const { marked } = await import("marked");
    const body = marked.parse(code, { async: false, gfm: true }) as string;
    const title = /^#\s+(.+)$/m.exec(code)?.[1]?.trim() ?? path.split("/").pop()?.replace(/\.\w+$/, "") ?? "Dokumen";
    const esc = title.replace(/&/g, "&amp;").replace(/</g, "&lt;");
    return {
      code: prettyHtml(`<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc}</title></head><body>${body.trim()}</body></html>`),
      warnings: ["Markdown diubah ke HTML polos tanpa CSS."],
    };
  }
  if (from === "html" && to === "md") {
    const { default: Turndown } = await import("turndown");
    const td = new Turndown({ headingStyle: "atx", codeBlockStyle: "fenced", bulletListMarker: "-", emDelimiter: "*" });
    td.remove(["script", "style", "noscript", "iframe"]);
    const out = td.turndown(bodyOf(code)).replace(/\n{3,}/g, "\n\n").replace(/^(\s*)-   /gm, "$1- ").trim() + "\n";
    return { code: out, warnings: ["Script, style, dan tata letak (kolom, kelas CSS) tidak ikut; hanya teks dan struktur dasar."] };
  }

  /* ---- HTML → komponen ---- */
  if (from === "html" && (to === "jsx" || to === "tsx")) {
    const body = stripBlocks(bodyOf(code), ["script"]);
    const { jsx, warnings: w } = htmlToJsx(body);
    warnings.push(...w);
    if (/<script/i.test(code)) warnings.push("Tag <script> tidak ikut — pindahkan logikanya ke React secara manual.");
    const styles = stylesOf(code);
    if (styles.length) warnings.push(`${styles.length} blok <style> tidak ikut; salin ke file CSS dan import.`);
    const out = `export default function Page() {\n  return (\n    <>\n${indent(jsx.trim(), 6)}\n    </>\n  );\n}\n`;
    return { code: out, warnings };
  }
  if (from === "html" && (to === "vue" || to === "svelte" || to === "astro" || to === "blade")) {
    const styles = stylesOf(code);
    const scripts = [...code.matchAll(/<script\b[^>]*>[\s\S]*?<\/script>/gi)].map((m) => m[0]);
    const body = stripBlocks(bodyOf(code), ["style", "script"]).trim();
    if (to === "blade") {
      if (/@\w|\{\{|\{!!/.test(code)) warnings.push("HTML ini memuat @ atau {{ }} yang dibaca Blade sebagai direktif — beri escape (@@, @{{ }}) bila itu teks biasa.");
      return { code, warnings };
    }
    if (to === "vue") {
      if (/\{\{/.test(body)) warnings.push("Teks {{ … }} dibaca Vue sebagai ekspresi — bungkus dengan v-pre bila itu teks biasa.");
      if (scripts.length) warnings.push("Skrip inline tidak dipindah — letakkan di <script setup> secara manual.");
      return { code: `<template>\n${indent(body, 2)}\n</template>\n${styles.length ? "\n" + styles.join("\n\n") + "\n" : ""}`, warnings };
    }
    if (to === "svelte") {
      if (/[{}]/.test(body)) warnings.push("Karakter { atau } di teks dibaca Svelte sebagai ekspresi — ganti dengan &#123; dan &#125; bila itu teks biasa.");
      if (scripts.length) warnings.push("Skrip inline dipindah apa adanya ke bawah; sesuaikan dengan siklus hidup Svelte.");
      return { code: `${body}\n${scripts.length ? "\n" + scripts.join("\n\n") + "\n" : ""}${styles.length ? "\n" + styles.join("\n\n") + "\n" : ""}`, warnings };
    }
    // astro
    if (/[{}]/.test(body)) warnings.push("Karakter { atau } di teks dibaca Astro sebagai ekspresi — ganti dengan &#123; dan &#125; bila itu teks biasa.");
    return { code: `---\n---\n\n${body}\n${scripts.length ? "\n" + scripts.join("\n\n") + "\n" : ""}${styles.length ? "\n" + styles.join("\n\n") + "\n" : ""}`, warnings };
  }

  throw new Error(`Tidak ada konverter lokal untuk ${from} → ${to}.`);
}

