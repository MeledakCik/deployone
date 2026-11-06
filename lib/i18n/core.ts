/**
 * Dua bahasa (Indonesia & Inggris). Kunci terjemahan = teks Indonesia aslinya, jadi teks yang belum
 * diterjemahkan otomatis tampil dalam bahasa Indonesia, dan kode tetap terbaca seperti biasa.
 * Kamus Inggris didaftarkan per area (lihat ./dict) lewat registerEn, supaya halaman hanya memuat kamusnya sendiri.
 */
export type Lang = "id" | "en";
export const LANGS: readonly Lang[] = ["id", "en"];
export const LANG_COOKIE = "depup_lang";
/** Header internal dari middleware: bahasa halaman ini (selalu ditimpa middleware, tidak bisa dipalsukan klien). */
export const LANG_HEADER = "x-depup-lang";
export const LANG_NAMES: Record<Lang, string> = { id: "Bahasa Indonesia", en: "English" };

export type Vars = Record<string, string | number | null | undefined>;

const EN: Record<string, string> = Object.create(null);

let PATTERNS: { re: RegExp; names: string[]; en: string }[] | null = null;

export function registerEn(dict: Record<string, string>): void {
  for (const k in dict) if (dict[k]) EN[k] = dict[k];
  PATTERNS = null;
}

function patterns() {
  if (PATTERNS) return PATTERNS;
  PATTERNS = [];
  for (const k in EN) {
    if (!/\{\w+\}/.test(k)) continue;
    const names: string[] = [];
    const src = k.split(/(\{\w+\})/).map((part) => {
      const m = part.match(/^\{(\w+)\}$/);
      if (m) { names.push(m[1]); return "([\\s\\S]*?)"; }
      return part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }).join("");
    PATTERNS.push({ re: new RegExp(`^${src}$`), names, en: EN[k] });
  }
  return PATTERNS;
}

/** Seperti translate, tetapi juga mengenali pesan yang sudah terisi nilai, mis. "Coba lagi 5 menit lagi." */
export function translateLoose(lang: Lang, msg: string): string {
  if (lang !== "en" || typeof msg !== "string" || !msg) return msg;
  const hit = EN[msg];
  if (hit !== undefined) return hit;
  for (const p of patterns()) {
    const m = msg.match(p.re);
    if (m) {
      const vars: Vars = {};
      p.names.forEach((n, i) => (vars[n] = m[i + 1]));
      return fill(p.en, vars);
    }
  }
  return msg;
}

export function isLang(v: unknown): v is Lang {
  return v === "id" || v === "en";
}

function fill(s: string, vars?: Vars): string {
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k] ?? "") : m));
}

export function translate(lang: Lang, key: string, vars?: Vars): string {
  if (lang === "en" && typeof key === "string") {
    const hit = EN[key];
    if (hit !== undefined) return fill(hit, vars);
  }
  return fill(key, vars);
}

export function hasEn(key: string): boolean {
  return EN[key] !== undefined;
}

export type TFn = (key: string, vars?: Vars) => string;

export function makeT(lang: Lang): TFn {
  return (key, vars) => translate(lang, key, vars);
}

const BOT_RE = /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|embedly|quora link preview|whatsapp|telegram|discord|lighthouse|google-inspectiontool|headless/i;

/**
 * Bahasa awal pengunjung baru: dari negara IP (Indonesia -> id, lainnya -> en). Kalau negara tidak diketahui
 * (dev lokal, proxy), pakai Accept-Language. Mesin pencari selalu id supaya halaman Indonesia tetap terindeks;
 * versi Inggris punya URL sendiri (/en) untuk mereka.
 */
export function detectLang(country: string | null | undefined, acceptLanguage: string | null | undefined, userAgent?: string | null): Lang {
  if (userAgent && BOT_RE.test(userAgent)) return "id";
  const c = (country || "").trim().toUpperCase();
  if (/^[A-Z]{2}$/.test(c) && c !== "XX" && c !== "T1") return c === "ID" ? "id" : "en";
  const al = (acceptLanguage || "").toLowerCase();
  if (!al) return "id";
  const first = al.split(",")[0]?.trim() ?? "";
  if (/^(id|in|ms|jv|su)\b/.test(first)) return "id";
  if (/\b(id|in)(-|;|,|$)/.test(al.split(",").slice(0, 3).join(","))) return "id";
  return "en";
}

const KEEP_KEYS = /^(id|key|slug|href|url|path|icon|tone|kind|type|platform|provider|code|cmd|command|env|value|color|accent|docsHref|related|image|img|src|email|domain)$/;

/** Terjemahkan semua teks di data statis (objek/array bersarang); kunci teknis seperti slug/href dibiarkan. */
export function tDeep<T>(data: T, t: TFn): T {
  const walk = (v: unknown, key?: string): unknown => {
    if (typeof v === "string") return key && KEEP_KEYS.test(key) ? v : t(v);
    if (Array.isArray(v)) return v.map((x) => walk(x, key));
    if (v && typeof v === "object" && Object.getPrototypeOf(v) === Object.prototype) {
      const out: Record<string, unknown> = {};
      for (const [k, x] of Object.entries(v as Record<string, unknown>)) out[k] = walk(x, k);
      return out;
    }
    return v;
  };
  return walk(data) as T;
}

/** Bahasa aktif di browser, untuk fungsi bantu di luar komponen (format waktu, pesan error). Di server selalu Indonesia. */
let CLIENT_LANG: Lang = "id";
export function setClientLang(lang: Lang): void {
  CLIENT_LANG = lang;
}
/**
 * Terjemahan untuk fungsi bantu biasa (bukan komponen). Hanya untuk teks yang muncul setelah data dimuat di browser,
 * karena di server hasilnya selalu Indonesia.
 */
export function tl(key: string, vars?: Vars): string {
  return translate(typeof window === "undefined" ? "id" : CLIENT_LANG, key, vars);
}
