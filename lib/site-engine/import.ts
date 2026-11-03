/**
 * Impor data latihan mesin AI Web Builder: membaca teks JSON/JSONL, memisahkan paket domain dan contoh
 * pengguna, memeriksa isinya, dan melengkapi kolom paket yang kosong dari paket umum sejenis.
 *
 * Murni (tanpa alias "@/"), dipakai bersama oleh Panel Admin (app/api/admin/engine) dan
 * scripts/train-site-engine.mjs, supaya aturan validasinya satu.
 */
import { KINDS, type DomainPack, type FeedbackExample, type Kind } from "./core.ts";
import { isStylePack, validateStyle, type StylePack } from "../site-look.ts";

export interface PackRules {
  icons: ReadonlySet<string>;
  banned: readonly string[];
  templates: ReadonlySet<string>;
  heroes: ReadonlySet<string>;
  feats: ReadonlySet<string>;
}

export interface ParsedImport {
  packs: DomainPack[];
  /** Paket gaya visual (type: "style"). */
  styles: StylePack[];
  feedback: FeedbackExample[];
  /** Masalah yang membuat satu paket/contoh ditolak. */
  errors: string[];
  /** Hal yang diperbaiki otomatis (mis. kolom dilengkapi dari paket umum). */
  notes: string[];
}

/** Kolom wajib. Selain ini boleh kosong; diisi dari paket umum jenisnya. */
export const REQUIRED_PACK_FIELDS = ["id", "kind", "label", "prompts", "keywords", "brandIcon", "templates", "heroes", "feats", "headlines", "features"] as const;

const STRING_LISTS = [
  "prompts", "keywords", "templates", "heroes", "feats", "brandFallback", "badges", "slogans", "headlines", "subheadlines",
  "cta", "featuresTitle", "itemsTitle", "stepsTitle", "aboutTitle", "about", "closing", "closingText",
] as const;
const OBJECT_LISTS = ["features", "items", "steps", "testimonials"] as const;

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const looksLikePack = (v: unknown) => isObj(v) && ("prompts" in v || "headlines" in v || "keywords" in v) && "id" in v;
const looksLikeFeedback = (v: unknown) => isObj(v) && typeof v.prompt === "string" && isObj(v.content);

/**
 * Baca teks impor. Bentuk yang diterima:
 *  - satu paket `{...}` atau array paket `[{...}, ...]` (isi file data/site-engine/packs/*.json)
 *  - JSONL contoh pengguna, satu baris `{"prompt": "...", "content": {...}}` (hasil Ekspor)
 *  - array contoh pengguna `[{"prompt": ..., "content": ...}]`
 *  - campuran: `{"packs": [...], "feedback": [...]}`
 */
export function parseImport(text: string): ParsedImport {
  const out: ParsedImport = { packs: [], styles: [], feedback: [], errors: [], notes: [] };
  const src = text.replace(/^﻿/, "").trim();
  if (!src) {
    out.errors.push("Isi impor kosong.");
    return out;
  }

  let values: unknown[] = [];
  try {
    const v = JSON.parse(src);
    if (isObj(v) && (Array.isArray(v.packs) || Array.isArray(v.feedback) || Array.isArray(v.styles)))
      values = [...((v.packs as unknown[]) ?? []), ...((v.styles as unknown[]) ?? []), ...((v.feedback as unknown[]) ?? [])];
    else values = Array.isArray(v) ? v : [v];
  } catch {
    // Bukan satu dokumen JSON: coba JSONL.
    src.split(/\r?\n/).forEach((line, i) => {
      if (!line.trim()) return;
      try {
        values.push(JSON.parse(line));
      } catch {
        out.errors.push(`Baris ${i + 1}: bukan JSON yang valid.`);
      }
    });
  }

  values.forEach((v, i) => {
    if (isStylePack(v)) {
      out.styles.push(v as unknown as StylePack);
      return;
    }
    if (looksLikeFeedback(v)) {
      const f = v as Record<string, unknown>;
      const prompt = String(f.prompt).trim().slice(0, 1400);
      if (prompt.length < 10) out.errors.push(`Contoh #${i + 1}: "prompt" terlalu pendek (minimal 10 huruf).`);
      else out.feedback.push({ prompt, content: f.content as Record<string, unknown>, at: typeof f.at === "number" ? f.at : Date.now() });
    } else if (looksLikePack(v)) out.packs.push(v as unknown as DomainPack);
    else out.errors.push(`Entri #${i + 1}: tidak dikenali. Paket domain butuh "id" dan "prompts"; paket gaya butuh "type": "style"; contoh butuh "prompt" dan "content".`);
  });
  return out;
}

/** Periksa satu paket. Mengembalikan daftar masalah (kosong = lolos). */
export function validatePack(p: DomainPack, rules: PackRules): string[] {
  const where = `Paket "${(p as { id?: unknown }).id ?? "?"}"`;
  const errs: string[] = [];
  const raw = p as unknown as Record<string, unknown>;

  for (const k of REQUIRED_PACK_FIELDS) {
    const v = raw[k];
    if (v === undefined || v === null || v === "" || (Array.isArray(v) && !v.length)) errs.push(`${where}: kolom "${k}" wajib diisi.`);
  }
  if (typeof p.id === "string" && !/^[a-z0-9][a-z0-9-]{1,47}$/.test(p.id)) errs.push(`${where}: "id" hanya huruf kecil, angka, dan tanda minus (2–48 karakter).`);
  if (p.kind && !KINDS.includes(p.kind)) errs.push(`${where}: "kind" harus salah satu dari ${KINDS.join(", ")}.`);
  // Bentuk kolom salah (mis. teks di tempat array) membuat pemeriksaan isi tidak bisa jalan: berhenti di sini.
  const shape: string[] = [];
  for (const k of STRING_LISTS) {
    const v = raw[k];
    if (v !== undefined && (!Array.isArray(v) || v.some((s) => typeof s !== "string"))) shape.push(`${where}: "${k}" harus array teks.`);
  }
  for (const k of OBJECT_LISTS) {
    const v = raw[k];
    if (v !== undefined && (!Array.isArray(v) || v.some((s) => !isObj(s)))) shape.push(`${where}: "${k}" harus array objek.`);
  }
  if (shape.length) return [...errs, ...shape];

  const bad = (list: string[] | undefined, allowed: ReadonlySet<string>, k: string) => {
    const wrong = (list ?? []).filter((x) => !allowed.has(x));
    if (wrong.length) errs.push(`${where}: ${k} tidak dikenal: ${wrong.join(", ")}. Pilihan: ${[...allowed].join(", ")}.`);
  };
  bad(p.templates, rules.templates, "templates");
  bad(p.heroes, rules.heroes, "heroes");
  bad(p.feats, rules.feats, "feats");

  for (const f of p.features ?? []) if (!f.title || !f.text) errs.push(`${where}: setiap "features" butuh "title" dan "text".`);
  for (const it of p.items ?? []) {
    if (!it.name) errs.push(`${where}: setiap "items" butuh "name".`);
    if (it.price !== undefined && typeof it.price !== "number") errs.push(`${where}: harga "${it.name}" harus angka (mis. 15000), bukan teks.`);
  }
  for (const s of p.steps ?? []) if (!s.title || !s.text) errs.push(`${where}: setiap "steps" butuh "title" dan "text".`);
  for (const t of p.testimonials ?? []) if (!t.text) errs.push(`${where}: setiap "testimonials" butuh "text".`);

  const icons = [p.brandIcon, ...(p.features ?? []).map((f) => f.icon), ...(p.items ?? []).map((i) => i.icon)].filter(Boolean) as string[];
  const unknownIcons = [...new Set(icons.filter((ic) => !rules.icons.has(ic)))];
  if (unknownIcons.length) errs.push(`${where}: ikon tidak tersedia: ${unknownIcons.join(", ")}.`);

  const text = JSON.stringify(p).toLowerCase();
  for (const w of rules.banned)
    if (new RegExp(`(?<![\\p{L}])${w.replace(/ /g, "\\s+")}(?![\\p{L}])`, "iu").test(text)) errs.push(`${where}: memakai ungkapan generik terlarang "${w}".`);

  if (!p.generic && (p.prompts ?? []).length < 5) errs.push(`${where}: tulis minimal 5 contoh deskripsi di "prompts" supaya mesin bisa mengenalinya.`);
  return errs;
}

/**
 * Lengkapi kolom opsional yang kosong dari paket umum sejenis (mis. "umkm-umum"),
 * supaya website yang dihasilkan tidak pernah punya bagian kosong.
 */
export function completePack(p: DomainPack, all: DomainPack[]): { pack: DomainPack; filled: string[] } {
  const generic = all.find((g) => g.generic && g.kind === p.kind && g.id !== p.id) ?? all.find((g) => g.kind === p.kind && g.id !== p.id);
  const pack = JSON.parse(JSON.stringify(p)) as DomainPack;
  const raw = pack as unknown as Record<string, unknown>;
  const filled: string[] = [];
  for (const k of [...STRING_LISTS, ...OBJECT_LISTS]) {
    const v = raw[k];
    if (Array.isArray(v) && v.length) continue;
    const g = generic ? (generic as unknown as Record<string, unknown>)[k] : undefined;
    raw[k] = Array.isArray(g) ? JSON.parse(JSON.stringify(g)) : [];
    if (Array.isArray(g) && g.length) filled.push(k);
  }
  if (pack.kind === "artikel" && !pack.articles?.length && generic?.articles?.length) {
    pack.articles = JSON.parse(JSON.stringify(generic.articles));
    pack.subtopics = pack.subtopics?.length ? pack.subtopics : generic.subtopics;
    filled.push("articles");
  }
  delete (pack as { generic?: boolean }).generic; // paket impor tidak menggantikan paket umum
  return { pack, filled };
}

/** Gabungkan paket bawaan dengan paket impor: id sama = paket impor menggantikan bawaan. */
export function mergePacks(bundled: DomainPack[], imported: DomainPack[]): DomainPack[] {
  const byId = new Map(bundled.map((p) => [p.id, p]));
  for (const p of imported) {
    const base = byId.get(p.id);
    byId.set(p.id, base?.generic ? { ...p, generic: true } : p);
  }
  return [...byId.values()];
}

export function isKind(v: unknown): v is Kind {
  return KINDS.includes(v as Kind);
}

export { validateStyle };
export type { StylePack };

/** Gabungkan gaya bawaan dengan gaya impor (id sama = impor menggantikan). */
export function mergeStyles(bundled: StylePack[], imported: StylePack[]): StylePack[] {
  const byId = new Map(bundled.map((x) => [x.id, x]));
  for (const x of imported) byId.set(x.id, x);
  return [...byId.values()];
}
