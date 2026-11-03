/**
 * Mesin Konversi milik Depup untuk satu file — deterministik, tanpa AI.
 *
 * Hanya pasangan yang hasilnya bisa dipastikan benar yang didukung (lihat SUPPORTED). Pasangan lain
 * (mis. Python → Rust) sengaja tidak ditawarkan: menerjemahkan logika antar bahasa pemrograman tidak bisa
 * dilakukan dengan aturan pasti, dan menebak justru menghasilkan kode yang salah diam-diam.
 */
import YAML from "yaml";
import * as TOML from "smol-toml";
import { XMLBuilder, XMLParser } from "fast-xml-parser";
import { marked } from "marked";
import TurndownService from "turndown";
import { transform } from "sucrase";
import { parse } from "@babel/parser";
import { renderJsx } from "./jsx-render.ts";

export interface FileResult {
  code: string;
  warnings: string[];
}

const DATA = ["json", "yaml", "toml", "xml"] as const;

export { SUPPORTED, canConvert } from "./pairs.ts";
import { canConvert } from "./pairs.ts";

/* ---------------- data ---------------- */

function parseData(from: string, code: string): unknown {
  switch (from) {
    case "json":
      return JSON.parse(code);
    case "yaml": {
      const docs = YAML.parseAllDocuments(code);
      const errs = docs.flatMap((d) => d.errors);
      if (errs.length) throw new Error(`YAML tidak valid: ${errs[0].message}`);
      return docs.length > 1 ? docs.map((d) => d.toJSON()) : docs[0]?.toJSON() ?? null;
    }
    case "toml":
      return TOML.parse(code);
    case "xml":
      return new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", parseTagValue: true, trimValues: true }).parse(code);
    default:
      throw new Error("format tidak dikenal");
  }
}

function stringifyData(to: string, value: unknown, warnings: string[]): string {
  switch (to) {
    case "json":
      return JSON.stringify(value, null, 2) + "\n";
    case "yaml":
      return YAML.stringify(value, { lineWidth: 0 });
    case "toml": {
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        warnings.push("TOML wajib berbentuk tabel (objek) di tingkat teratas; data dibungkus di bawah kunci \"data\".");
        value = { data: value };
      }
      const cleaned = JSON.parse(JSON.stringify(value, (_k, v) => (v === null ? undefined : v)));
      if (JSON.stringify(cleaned) !== JSON.stringify(value)) warnings.push("TOML tidak punya nilai null; kunci bernilai null dihapus.");
      return TOML.stringify(cleaned) + "\n";
    }
    case "xml": {
      let root = value;
      if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value as object).length !== 1) {
        warnings.push('XML butuh satu elemen akar; data dibungkus dalam <root>.');
        root = { root: value };
      }
      const xml = new XMLBuilder({ ignoreAttributes: false, attributeNamePrefix: "@_", format: true, indentBy: "  ", suppressEmptyNode: true }).build(root);
      return `<?xml version="1.0" encoding="UTF-8"?>\n${xml}`;
    }
    default:
      throw new Error("format tidak dikenal");
  }
}

/* ---------------- TS/JS ---------------- */

function stripTypes(code: string, keepJsx: boolean): string {
  const out = transform(code, {
    transforms: ["typescript", "jsx"],
    disableESTransforms: true,
    // "preserve" = JSX dibiarkan apa adanya (TSX → JSX); "automatic" = diubah jadi jsx() (→ JS biasa).
    jsxRuntime: keepJsx ? "preserve" : "automatic",
    production: true,
    keepUnusedImports: false,
  }).code;
  return out.replace(/\n{3,}/g, "\n\n");
}

/** .ts (tanpa JSX): "<T>x" di file .ts adalah cast tipe, bukan JSX. */
function stripTypesTs(code: string): string {
  return transform(code, { transforms: ["typescript"], disableESTransforms: true, keepUnusedImports: false }).code.replace(/\n{3,}/g, "\n\n");
}

/** JS → TS: tambahkan anotasi `any` pada parameter fungsi yang belum bertipe, supaya lolos mode strict. */
function addAnyTypes(code: string, jsx: boolean, warnings: string[]): string {
  const ast = parse(code, { sourceType: "module", plugins: jsx ? ["jsx"] : [], errorRecovery: true });
  const inserts: { at: number; text: string }[] = [];
  const visit = (n: unknown): void => {
    if (!n || typeof n !== "object") return;
    if (Array.isArray(n)) return n.forEach(visit);
    const node = n as Record<string, any>;
    if (/Function|ArrowFunctionExpression|ObjectMethod|ClassMethod/.test(String(node.type)) && Array.isArray(node.params)) {
      for (const p of node.params) {
        if (p.typeAnnotation) continue;
        if (p.type === "Identifier") inserts.push({ at: p.end, text: ": any" });
        else if (p.type === "AssignmentPattern" && p.left.type === "Identifier") inserts.push({ at: p.left.end, text: ": any" });
        else if (p.type === "RestElement") inserts.push({ at: p.end, text: ": any[]" });
        else if (p.type === "ObjectPattern" || p.type === "ArrayPattern") inserts.push({ at: p.end, text: ": any" });
        else if (p.type === "AssignmentPattern" && (p.left.type === "ObjectPattern" || p.left.type === "ArrayPattern")) inserts.push({ at: p.left.end, text: ": any" });
      }
      // Arrow function satu parameter tanpa kurung: "x => ..." harus jadi "(x: any) => ..."
      if (node.type === "ArrowFunctionExpression" && node.params.length === 1 && node.params[0].type === "Identifier" && code[node.params[0].start - 1] !== "(" && code.slice(node.start, node.params[0].start).trim() !== "(") {
        const p = node.params[0];
        const last = inserts.pop();
        if (last) inserts.push({ at: p.start, text: "(" }, { at: p.end, text: ": any)" });
      }
    }
    for (const [k, v] of Object.entries(node)) if (k !== "loc" && k !== "start" && k !== "end" && v && typeof v === "object") visit(v);
  };
  visit(ast.program);
  if (inserts.length) warnings.push(`${inserts.filter((i) => i.text.startsWith(":")).length} parameter diberi tipe "any". Ganti dengan tipe yang lebih tepat bila sempat.`);
  let out = code;
  for (const ins of inserts.sort((a, b) => b.at - a.at)) out = out.slice(0, ins.at) + ins.text + out.slice(ins.at);
  return out;
}

/* ---------------- konversi ---------------- */

export async function convertFile(from: string, to: string, code: string, path: string): Promise<FileResult> {
  const warnings: string[] = [];
  if (!canConvert(from, to)) throw new Error(`Konversi ${from} → ${to} belum didukung mesin Depup.`);

  if ((DATA as readonly string[]).includes(from)) {
    const value = parseData(from, code);
    return { code: stringifyData(to, value, warnings), warnings };
  }

  if (from === "ts" && to === "js") return { code: stripTypesTs(code), warnings };
  if (from === "tsx" && to === "jsx") return { code: stripTypes(code, true), warnings };
  if ((from === "tsx" || from === "jsx") && to === "js") {
    warnings.push('JSX diubah menjadi panggilan jsx() dari "react/jsx-runtime".');
    return { code: stripTypes(code, false), warnings };
  }
  if (from === "js" && to === "ts") return { code: addAnyTypes(code, /<[A-Za-z][^>]*>/.test(code), warnings), warnings };
  if (from === "jsx" && to === "tsx") return { code: addAnyTypes(code, true, warnings), warnings };

  if (from === "scss" && to === "css") {
    const sass = await import("sass");
    const r = sass.compileString(code, { syntax: /\.sass$/i.test(path) ? "indented" : "scss", style: "expanded" });
    if (/@import|@use/.test(code)) warnings.push("File lain yang di-@import/@use tidak ikut dikompilasi bila tidak ada di sini; gabungkan dulu bila perlu.");
    return { code: r.css + "\n", warnings };
  }
  if (from === "css" && to === "scss") {
    warnings.push("CSS sudah valid sebagai SCSS; isinya disalin apa adanya.");
    return { code, warnings };
  }

  if (from === "md" && to === "html") {
    const titleMatch = /^#\s+(.+)$/m.exec(code);
    const body = await marked.parse(code, { gfm: true });
    const title = titleMatch ? titleMatch[1].trim() : path.replace(/^.*\//, "").replace(/\.\w+$/, "");
    return {
      code: `<!doctype html>\n<html lang="id">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>${title.replace(/</g, "&lt;")}</title>\n</head>\n<body>\n${body}</body>\n</html>\n`,
      warnings,
    };
  }
  if (from === "html" && to === "md") {
    const td = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced", bulletListMarker: "-" });
    td.remove(["script", "style", "noscript"]);
    const body = /<body\b[^>]*>([\s\S]*)<\/body>/i.exec(code)?.[1] ?? code;
    return { code: td.turndown(body).trim() + "\n", warnings };
  }
  if (from === "html" && (to === "jsx" || to === "tsx")) {
    const { htmlToJsx } = await import("../html-to-next.ts");
    const body = /<body\b[^>]*>([\s\S]*)<\/body>/i.exec(code)?.[1] ?? code;
    const r = htmlToJsx(body);
    warnings.push(...r.warnings);
    const name = (path.replace(/^.*\//, "").replace(/\.\w+$/, "").replace(/[^A-Za-z0-9]+(.)?/g, (_m, c: string) => (c ? c.toUpperCase() : "")) || "Halaman").replace(/^./, (c) => c.toUpperCase());
    const comp = /^\d/.test(name) ? `Halaman${name}` : name;
    return { code: `export default function ${comp}() {\n  return (\n    <>\n${r.jsx.replace(/^/gm, "      ")}\n    </>\n  );\n}\n`, warnings };
  }
  if ((from === "jsx" || from === "tsx") && to === "html") {
    const r = renderJsx({ entry: { path, code } });
    return { code: r.html, warnings: r.warnings };
  }
  throw new Error(`Konversi ${from} → ${to} belum didukung mesin Depup.`);
}
