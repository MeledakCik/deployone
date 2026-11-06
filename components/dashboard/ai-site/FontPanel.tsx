"use client";

import { useT } from "@/lib/i18n";
import "@/lib/i18n/dict/app";
import * as React from "react";
import { Bold, Check, ChevronDown, Italic, Minus, Plus, RotateCcw, Search, X } from "lucide-react";
import { FONT_ROLES, GOOGLE_FONTS, googleFontsHref, type FontRoleId, type TextRole, type TextStyle } from "@/lib/ai-site-templates";
import { cn } from "@/lib/utils";

/**
 * Panel Huruf ala Canva:
 *  - pilih dulu teks yang mau diubah (Judul / Sub-judul / Isi) — otomatis terpilih saat teks di kanvas diklik,
 *  - daftar font tampil dengan bentuk hurufnya sendiri, bisa dicari, ada "Dipakai di desain ini", "Baru dipakai",
 *    dan "Kombinasi font" (judul + isi yang serasi, sekali klik),
 *  - bilah gaya teks: ukuran, tebal, miring, kapital, jarak huruf & baris.
 * Semua perubahan langsung terlihat di kanvas dan bisa diurungkan.
 */

export type FontPick = { kind: "google"; name: string } | { kind: "system"; id: FontRoleId } | { kind: "default" };

export interface RoleFont {
  /** Nama Google Font, id huruf sistem, atau null (ikut bawaan / ikut Judul untuk Sub-judul). */
  google: string | null;
  system: FontRoleId | null;
  weight: number | null;
}

export const ROLE_LABEL: Record<TextRole, string> = { title: "Judul", sub: "Sub-judul", body: "Isi teks" };
const ROLE_HINT: Record<TextRole, string> = {
  title: "Judul besar paling atas",
  sub: "Judul bagian & judul kartu",
  body: "Paragraf, daftar, & keterangan",
};

const CATS = [
  { id: "all", label: "Semua" },
  { id: "sans", label: "Sans" },
  { id: "serif", label: "Serif" },
  { id: "display", label: "Display" },
  { id: "hand", label: "Tulisan tangan" },
  { id: "mono", label: "Mono" },
  { id: "system", label: "Huruf sistem" },
] as const;
type CatId = (typeof CATS)[number]["id"];

/** Pasangan judul + isi yang sudah serasi (nama dari GOOGLE_FONTS). */
export const FONT_PAIRS: { id: string; name: string; title: string; body: string }[] = [
  { id: "elegan", name: "Elegan", title: "Playfair Display", body: "Inter" },
  { id: "poster", name: "Poster", title: "Bebas Neue", body: "DM Sans" },
  { id: "modern", name: "Modern", title: "Poppins", body: "Poppins" },
  { id: "hangat", name: "Hangat", title: "Fraunces", body: "Manrope" },
  { id: "tegas", name: "Tegas", title: "Unbounded", body: "Plus Jakarta Sans" },
  { id: "teknologi", name: "Teknologi", title: "Space Grotesk", body: "IBM Plex Mono" },
  { id: "butik", name: "Butik", title: "Cormorant Garamond", body: "Lato" },
  { id: "kreatif", name: "Kreatif", title: "Syne", body: "Inter" },
  { id: "ceria", name: "Ceria", title: "Pacifico", body: "Nunito" },
  { id: "brutal", name: "Brutal", title: "Archivo Black", body: "Work Sans" },
  { id: "majalah", name: "Majalah", title: "Abril Fatface", body: "Raleway" },
  { id: "klasik", name: "Klasik", title: "Merriweather", body: "Open Sans" },
  { id: "olahraga", name: "Olahraga", title: "Oswald", body: "Barlow" },
  { id: "anak", name: "Anak-anak", title: "Fredoka", body: "Quicksand" },
  { id: "kopi", name: "Kedai", title: "DM Serif Display", body: "Figtree" },
  { id: "retro", name: "Retro", title: "Righteous", body: "Rubik" },
  { id: "jurnal", name: "Jurnal", title: "Lora", body: "Mulish" },
  { id: "tangan", name: "Tulisan tangan", title: "Caveat", body: "Kalam" },
];

const SYS_FACE: Record<FontRoleId, string> = Object.fromEntries(FONT_ROLES.map((r) => [r.id, r.stack])) as Record<FontRoleId, string>;
const face = (name: string) => `'${name}', system-ui, sans-serif`;

/** Stylesheet contoh: hanya huruf yang dipakai untuk nama font & contoh (parameter text=), jadi ringan. */
const PREVIEW_HREF = (() => {
  const sample = GOOGLE_FONTS.map((f) => f.name).join("") + "JudulIsitekHeadingBodytxAa0123456789";
  const letters = [...new Set(sample.split(""))].join("");
  return `${googleFontsHref(GOOGLE_FONTS.map((f) => f.name))}&text=${encodeURIComponent(letters)}`;
})();

const RECENT_KEY = "depup:recent-fonts:v1";
function readRecent(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && GOOGLE_FONTS.some((f) => f.name === x)).slice(0, 6) : [];
  } catch {
    return [];
  }
}
function pushRecent(name: string): string[] {
  const next = [name, ...readRecent().filter((x) => x !== name)].slice(0, 6);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* penyimpanan diblokir */
  }
  return next;
}

/** Nama font yang sedang dipakai sebuah peran, untuk ditampilkan di tombol. */
export function roleFontName(fonts: Record<TextRole, RoleFont>, role: TextRole, defaultLabel: string): string {
  const f = fonts[role];
  if (f.google) return f.google;
  if (f.system) return FONT_ROLES.find((r) => r.id === f.system)?.name ?? defaultLabel;
  if (role === "sub") return roleFontName(fonts, "title", defaultLabel);
  return defaultLabel;
}
function roleFace(fonts: Record<TextRole, RoleFont>, role: TextRole): string | undefined {
  const f = fonts[role];
  if (f.google) return face(f.google);
  if (f.system) return SYS_FACE[f.system];
  if (role === "sub") return roleFace(fonts, "title");
  return undefined;
}

/* ---------------- bilah gaya teks (dipakai di panel & di atas kanvas) ---------------- */

const DEFAULT_WEIGHT: Record<TextRole, number> = { title: 800, sub: 700, body: 400 };

export function TextStyleBar({
  role,
  style,
  weight,
  onStyle,
  onWeight,
  compact = false,
}: {
  role: TextRole;
  style: TextStyle | undefined;
  weight: number | null;
  onStyle: (patch: Partial<TextStyle> | null, merge?: boolean) => void;
  onWeight: (w: number | null) => void;
  compact?: boolean;
}) {
  const t = useT();
  const size = style?.size ?? 1;
  const bold = (weight ?? DEFAULT_WEIGHT[role]) >= 600;
  const [open, setOpen] = React.useState(false);
  const btn = (on: boolean) =>
    cn(
      "grid h-9 min-w-9 place-items-center rounded-[10px] px-2 text-[13px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
      on ? "bg-[var(--ink-fill)] text-[var(--ink-fill-text)]" : "hover:bg-[var(--card-hover)]",
    );
  const step = (d: number) => onStyle({ size: Math.round(Math.min(1.8, Math.max(0.6, size + d)) * 100) / 100 });
  const changed = !!style && Object.keys(style).length > 0;
  return (
    <div className={cn("flex flex-wrap items-center gap-1", compact ? "" : "rounded-[14px] bg-[var(--pill-bg)] p-1")} role="toolbar" aria-label={t("Gaya teks {role}", { role: t(ROLE_LABEL[role]) })}>
      <div className="flex items-center rounded-[10px] bg-[var(--surface-solid)]">
        <button type="button" className={btn(false)} onClick={() => step(-0.1)} disabled={size <= 0.6} aria-label={t("Perkecil")}>
          <Minus size={14} aria-hidden />
        </button>
        <span className="min-w-[46px] text-center text-[13px] font-semibold tabular-nums" aria-live="polite" title={t("Ukuran teks")}>
          {Math.round(size * 100)}%
        </span>
        <button type="button" className={btn(false)} onClick={() => step(0.1)} disabled={size >= 1.8} aria-label={t("Perbesar")}>
          <Plus size={14} aria-hidden />
        </button>
      </div>
      <button type="button" className={btn(bold)} aria-pressed={bold} onClick={() => onWeight(bold ? 400 : role === "body" ? 700 : DEFAULT_WEIGHT[role])} aria-label={t("Tebal")} title={t("Tebal")}>
        <Bold size={15} aria-hidden />
      </button>
      <button type="button" className={btn(!!style?.italic)} aria-pressed={!!style?.italic} onClick={() => onStyle({ italic: !style?.italic })} aria-label={t("Miring")} title={t("Miring")}>
        <Italic size={15} aria-hidden />
      </button>
      <button
        type="button"
        className={btn(style?.upper === true)}
        aria-pressed={style?.upper === true}
        onClick={() => onStyle({ upper: style?.upper !== true })}
        aria-label={t("Huruf kapital")}
        title={t("Huruf kapital")}
      >
        aA
      </button>
      <div className="relative">
        <button type="button" className={btn(open || style?.spacing !== undefined || style?.line !== undefined)} aria-expanded={open} onClick={() => setOpen((o) => !o)} title={t("Jarak")}>
          <span className="inline-flex items-center gap-0.5 whitespace-nowrap text-[13px]">
            {t("Jarak")}
            <ChevronDown size={13} aria-hidden />
          </span>
        </button>
        {open && (
          <div className="absolute right-0 top-full z-30 mt-1.5 w-[240px] rounded-[14px] bg-[var(--surface-solid)] p-3.5 text-text [box-shadow:var(--surface-shadow)]">
            <label className="block text-[13px] font-medium">
              <span className="flex justify-between">
                {t("Jarak huruf")}
                <span className="tabular-nums text-text-muted">{Math.round((style?.spacing ?? 0) * 100)}</span>
              </span>
              <input
                type="range"
                min={-10}
                max={40}
                step={1}
                value={Math.round((style?.spacing ?? 0) * 100)}
                onChange={(e) => onStyle({ spacing: Number(e.target.value) / 100 }, true)}
                className="mt-1.5 w-full accent-[var(--accent)]"
              />
            </label>
            <label className="mt-3 block text-[13px] font-medium">
              <span className="flex justify-between">
                {t("Jarak baris")}
                <span className="tabular-nums text-text-muted">{(style?.line ?? (role === "body" ? 1.65 : 1.1)).toFixed(2)}</span>
              </span>
              <input
                type="range"
                min={80}
                max={240}
                step={5}
                value={Math.round((style?.line ?? (role === "body" ? 1.65 : 1.1)) * 100)}
                onChange={(e) => onStyle({ line: Number(e.target.value) / 100 }, true)}
                className="mt-1.5 w-full accent-[var(--accent)]"
              />
            </label>
            <button type="button" onClick={() => onStyle({ spacing: undefined, line: undefined })} className="mt-3 text-[13px] text-text-muted underline">
              {t("Atur ulang jarak")}
            </button>
          </div>
        )}
      </div>
      {changed && (
        <button type="button" className={btn(false)} onClick={() => onStyle(null)} aria-label={t("Atur ulang gaya teks")} title={t("Atur ulang gaya teks")}>
          <RotateCcw size={14} aria-hidden />
        </button>
      )}
    </div>
  );
}

/* ---------------- panel ---------------- */

export function FontPanel({
  role,
  onRole,
  fonts,
  styles,
  onFont,
  onPair,
  onStyle,
  onWeight,
  onResetAll,
}: {
  role: TextRole;
  onRole: (r: TextRole) => void;
  fonts: Record<TextRole, RoleFont>;
  styles: Partial<Record<TextRole, TextStyle>>;
  onFont: (role: TextRole, pick: FontPick) => void;
  onPair: (title: string, body: string) => void;
  onStyle: (role: TextRole, patch: Partial<TextStyle> | null, merge?: boolean) => void;
  onWeight: (role: TextRole, w: number | null) => void;
  onResetAll: () => void;
}) {
  const t = useT();
  const [q, setQ] = React.useState("");
  const [cat, setCat] = React.useState<CatId>("all");
  const [recent, setRecent] = React.useState<string[]>([]);
  React.useEffect(() => setRecent(readRecent()), []);

  const cur = fonts[role];
  const pickGoogle = (name: string) => {
    onFont(role, { kind: "google", name });
    setRecent(pushRecent(name));
  };
  const used = [...new Set((["title", "sub", "body"] as TextRole[]).map((r) => fonts[r].google).filter((x): x is string => !!x))];
  const query = q.trim().toLowerCase();
  const list = GOOGLE_FONTS.filter((f) => (cat === "all" || cat === f.cat) && (!query || f.name.toLowerCase().includes(query)));
  const sysList = FONT_ROLES.filter((r) => (cat === "all" || cat === "system") && (!query || r.name.toLowerCase().includes(query) || t(r.name).toLowerCase().includes(query)));
  const anyChange = (["title", "sub", "body"] as TextRole[]).some((r) => fonts[r].google || fonts[r].system || fonts[r].weight || styles[r]);

  const row = (key: string, label: string, fam: string | undefined, on: boolean, onClick: () => void, sub?: string) => (
    <button
      key={key}
      type="button"
      role="radio"
      aria-checked={on}
      onClick={onClick}
      className={cn(
        "flex min-h-[48px] w-full items-center gap-3 rounded-[12px] px-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
        on ? "bg-[var(--ink-fill)] text-[var(--ink-fill-text)]" : "hover:bg-[var(--card-hover)]",
      )}
    >
      <span className="min-w-0 flex-1 truncate text-[17px] leading-tight" style={fam ? { fontFamily: fam } : undefined}>
        {label}
      </span>
      {sub && <span className="shrink-0 text-[11.5px] opacity-60">{sub}</span>}
      {on && <Check size={15} className="shrink-0" aria-hidden />}
    </button>
  );

  return (
    <div className="space-y-5">
      <link rel="stylesheet" href={PREVIEW_HREF} />

      {/* 1. Teks yang diubah */}
      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="text-[13px] font-medium text-text-muted">{t("Teks yang diubah")}</span>
          {anyChange && (
            <button type="button" onClick={onResetAll} className="text-[13px] text-text-muted underline max-md:min-h-[40px]">
              {t("Bawaan semua")}
            </button>
          )}
        </div>
        <div role="radiogroup" aria-label={t("Teks yang diubah")} className="grid grid-cols-3 gap-1.5">
          {(["title", "sub", "body"] as TextRole[]).map((r) => (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={role === r}
              onClick={() => onRole(r)}
              className={cn(
                "flex min-h-[60px] min-w-0 flex-col justify-center rounded-[12px] px-2.5 text-left transition",
                role === r ? "bg-[var(--ink-fill)] text-[var(--ink-fill-text)]" : "bg-[var(--pill-bg)] hover:bg-[var(--card-hover)]",
              )}
            >
              <span className={cn("truncate leading-tight", r === "title" ? "text-[17px] font-bold" : r === "sub" ? "text-[15px] font-semibold" : "text-[14px]")} style={{ fontFamily: roleFace(fonts, r) }}>
                {t(ROLE_LABEL[r])}
              </span>
              <span className="truncate text-[11.5px] opacity-70">{t(roleFontName(fonts, r, t("Bawaan gaya")))}</span>
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[12px] text-text-faint">{t(ROLE_HINT[role])} · {t("klik teks di kanvas untuk memilih otomatis")}</p>
      </div>

      {/* 2. Gaya teks */}
      <TextStyleBar role={role} style={styles[role]} weight={cur.weight} onStyle={(p, m) => onStyle(role, p, m)} onWeight={(w) => onWeight(role, w)} />

      {/* 3. Cari */}
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" aria-hidden />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("Cari font")}
          aria-label={t("Cari font")}
          className="h-11 w-full rounded-[12px] bg-[var(--pill-bg)] pl-9 pr-9 text-[14px] outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        />
        {q && (
          <button type="button" onClick={() => setQ("")} aria-label={t("Hapus pencarian")} className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-[8px] hover:bg-[var(--card-hover)]">
            <X size={14} aria-hidden />
          </button>
        )}
      </div>

      {!query && (
        <>
          {(used.length > 0 || recent.length > 0) && (
            <div className="space-y-3">
              {used.length > 0 && (
                <div>
                  <p className="mb-1.5 text-[13px] font-medium text-text-muted">{t("Dipakai di desain ini")}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {used.map((n) => (
                      <button key={n} type="button" onClick={() => pickGoogle(n)} aria-pressed={cur.google === n} className={cn("min-h-[38px] rounded-full px-3.5 text-[14px]", cur.google === n ? "bg-[var(--ink-fill)] text-[var(--ink-fill-text)]" : "bg-[var(--pill-bg)] hover:bg-[var(--card-hover)]")} style={{ fontFamily: face(n) }}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {recent.filter((n) => !used.includes(n)).length > 0 && (
                <div>
                  <p className="mb-1.5 text-[13px] font-medium text-text-muted">{t("Baru dipakai")}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {recent
                      .filter((n) => !used.includes(n))
                      .map((n) => (
                        <button key={n} type="button" onClick={() => pickGoogle(n)} className="min-h-[38px] rounded-full bg-[var(--pill-bg)] px-3.5 text-[14px] hover:bg-[var(--card-hover)]" style={{ fontFamily: face(n) }}>
                          {n}
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <p className="mb-1.5 text-[13px] font-medium text-text-muted">{t("Kombinasi font")}</p>
            <div className="grid grid-cols-2 gap-1.5">
              {FONT_PAIRS.map((p) => {
                const on = fonts.title.google === p.title && fonts.body.google === p.body && !fonts.sub.google;
                return (
                  <button
                    key={p.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      onPair(p.title, p.body);
                      setRecent(pushRecent(p.title));
                    }}
                    title={`${p.title} + ${p.body}`}
                    aria-label={`${t(p.name)}: ${p.title} + ${p.body}`}
                    className={cn(
                      "flex min-h-[84px] min-w-0 flex-col justify-center gap-0.5 rounded-[12px] px-3 py-2.5 text-left transition",
                      on ? "bg-[var(--ink-fill)] text-[var(--ink-fill-text)]" : "bg-[var(--pill-bg)] hover:bg-[var(--card-hover)]",
                    )}
                  >
                    <span className="truncate text-[20px] leading-tight" style={{ fontFamily: face(p.title) }}>
                      {t("Judul")}
                    </span>
                    <span className="truncate text-[13px]" style={{ fontFamily: face(p.body) }}>
                      {t("Isi teks")}
                    </span>
                    <span className="mt-0.5 truncate text-[11px] opacity-60">{t(p.name)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* 4. Semua font */}
      <div>
        <div className="mb-2 flex flex-wrap gap-1.5" role="tablist" aria-label={t("Jenis font")}>
          {CATS.map((c) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={cat === c.id}
              onClick={() => setCat(c.id)}
              className={cn("min-h-[34px] rounded-full px-3 text-[12.5px] font-medium", cat === c.id ? "bg-[var(--ink-fill)] text-[var(--ink-fill-text)]" : "bg-[var(--pill-bg)] hover:bg-[var(--card-hover)]")}
            >
              {t(c.label)}
            </button>
          ))}
        </div>
        <div role="radiogroup" aria-label={t("Font untuk {role}", { role: t(ROLE_LABEL[role]) })} className="space-y-0.5">
          {!query && cat === "all" && row("default", role === "sub" ? t("Ikuti Judul") : t("Bawaan gaya"), undefined, !cur.google && !cur.system, () => onFont(role, { kind: "default" }))}
          {list.map((f) => row(f.name, f.name, face(f.name), cur.google === f.name, () => pickGoogle(f.name), t(CATS.find((c) => c.id === f.cat)?.label ?? "")))}
          {sysList.map((r) => row("sys-" + r.id, t(r.name), r.stack, !cur.google && cur.system === r.id, () => onFont(role, { kind: "system", id: r.id }), t("sistem")))}
          {!list.length && !sysList.length && <p className="px-1 py-3 text-[13px] text-text-muted">{t("Tidak ada font yang cocok dengan “{q}”.", { q: q.trim() })}</p>}
        </div>
        <p className="mt-3 text-[12px] leading-relaxed text-text-faint">{t("Huruf Google Fonts dimuat dari server Google saat website dibuka. Bila tidak terjangkau, huruf sistem yang mirip dipakai.")}</p>
      </div>
    </div>
  );
}
