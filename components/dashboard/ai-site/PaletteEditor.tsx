"use client";

import * as React from "react";
import { Plus, RefreshCw, X, TriangleAlert } from "lucide-react";
import { Btn } from "@/components/ui/primitives";
import { MAX_PALETTE, contrastRatio } from "@/lib/ai-site-templates";
import { hintCls, isHex, labelCls, swatchTileCls } from "./shared";

/** Pasangan warna siap pakai: [utama, kedua] beserta namanya (dibaca pembaca layar, bukan kode hex). */
const PALETTE_PRESETS: { name: string; colors: [string, string] }[] = [
  { name: "Ungu dan lime", colors: ["#7b50ff", "#c6f432"] },
  { name: "Biru dan jingga", colors: ["#0ea5e9", "#f97316"] },
  { name: "Hijau dan kuning", colors: ["#16a34a", "#facc15"] },
  { name: "Merah dan persik", colors: ["#e11d48", "#fdba74"] },
  { name: "Navy dan biru muda", colors: ["#0f172a", "#38bdf8"] },
];

const COLOR_ROLES: { name: string; hint: string }[] = [
  { name: "Warna utama", hint: "Tombol, tautan, dan blok sorot" },
  { name: "Warna kedua", hint: "Latar ikon dan cahaya hero" },
];

function HexInput({ value, label, id, onChange }: { value: string; label: string; id: string; onChange: (v: string) => void }) {
  const [draft, setDraft] = React.useState(value);
  const [reverted, setReverted] = React.useState(false);
  React.useEffect(() => setDraft(value), [value]);
  return (
    <>
      <input
        value={draft.toUpperCase()}
        maxLength={7}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        aria-label={`Kode hex ${label}`}
        aria-invalid={reverted || undefined}
        aria-describedby={reverted ? `${id}-err` : undefined}
        onChange={(e) => {
          const v = e.target.value.trim();
          const withHash = v.startsWith("#") ? v : `#${v}`;
          setDraft(withHash);
          setReverted(false);
          if (isHex(withHash)) onChange(withHash.toLowerCase());
        }}
        onBlur={() => {
          if (!isHex(draft)) setReverted(true);
          setDraft(value);
        }}
        className="input-solid mono h-11 w-[104px] shrink-0 px-3 text-[13px]"
      />
      {reverted && (
        <p id={`${id}-err`} role="status" className="basis-full text-[12.5px] leading-snug text-bad-fg">
          Kode hex tidak valid, dikembalikan ke {value.toUpperCase()}. Pakai 6 karakter, contoh #7B50FF.
        </p>
      )}
    </>
  );
}

export function PaletteEditor({
  colors,
  custom,
  pageBg,
  onChange,
  onReset,
}: {
  colors: string[];
  custom: boolean;
  /** Warna latar template yang dipakai, untuk memeriksa apakah warna utama cukup terlihat. */
  pageBg: string;
  onChange: (next: string[]) => void;
  onReset: () => void;
}) {
  const uid = React.useId();
  const setAt = (i: number, v: string) => onChange(colors.map((c, k) => (k === i ? v : c)));
  const addColor = () => {
    if (colors.length >= MAX_PALETTE) return;
    const hues = ["#f43f5e", "#22c55e", "#f59e0b", "#06b6d4", "#a855f7", "#64748b"];
    const next = hues.find((h) => !colors.includes(h)) ?? "#64748b";
    onChange([...colors, next]);
  };

  const ratio = contrastRatio(colors[0], pageBg);
  const weak = ratio < 3;

  return (
    <div className="space-y-3">
      <div className="flex h-2.5 overflow-hidden rounded-full" aria-hidden>
        {colors.map((c, i) => (
          <span key={i} className="h-full flex-1" style={{ background: c }} />
        ))}
      </div>

      <ul className="space-y-3">
        {colors.map((c, i) => {
          const role = COLOR_ROLES[i] ?? { name: `Warna tambahan ${i + 1}`, hint: "Variasi ikon dan cahaya hero" };
          const rowId = `${uid}-${i}`;
          return (
            <li key={i} className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
              <label className={swatchTileCls(false, "h-11 w-11")}>
                <span aria-hidden className="h-8 w-8 rounded-[10px]" style={{ background: c }} />
                <input
                  type="color"
                  value={c}
                  aria-label={`Pilih ${role.name.toLowerCase()}`}
                  onChange={(e) => setAt(i, e.target.value.toLowerCase())}
                  className="absolute inset-0 h-full w-full cursor-pointer rounded-[14px] opacity-0"
                />
              </label>
              <div className="min-w-0 flex-1 basis-[8.5rem]">
                <p className="text-[13.5px] font-medium">{role.name}</p>
                <p className={hintCls}>{role.hint}</p>
              </div>
              <HexInput value={c} label={role.name.toLowerCase()} id={rowId} onChange={(v) => setAt(i, v)} />
              {i >= 2 ? (
                <button
                  type="button"
                  onClick={() => onChange(colors.filter((_, k) => k !== i))}
                  aria-label={`Hapus ${role.name.toLowerCase()}`}
                  className="pill grid h-10 w-10 shrink-0 place-items-center hover:!bg-bad-bg hover:text-bad-fg"
                >
                  <X size={15} />
                </button>
              ) : (
                <span className="h-10 w-10 shrink-0 max-sm:hidden" aria-hidden />
              )}
            </li>
          );
        })}
      </ul>

      <div aria-live="polite">
        {weak && (
          <div className="notice notice-warn flex items-start gap-2 !p-3 text-[12.5px] leading-snug">
            <TriangleAlert size={15} className="mt-0.5 shrink-0" aria-hidden />
            <span className="min-w-0">
              Warna utama hampir sama dengan warna latar template (kontras {ratio.toFixed(1)}:1). Tombol dan blok sorot jadi sulit dibedakan.
              Coba warna yang lebih gelap atau lebih terang. Warna teks di atasnya sudah disesuaikan otomatis.
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Btn onClick={addColor} disabled={colors.length >= MAX_PALETTE}>
          <Plus size={13} /> Tambah warna
        </Btn>
        {custom && (
          <Btn onClick={onReset}>
            <RefreshCw size={13} /> Bawaan template
          </Btn>
        )}
        <span className={`ml-auto tabular-nums ${hintCls}`}>{colors.length}/{MAX_PALETTE} warna</span>
      </div>

      <div>
        <p className={labelCls}>Pasangan siap pakai</p>
        <div className="flex flex-wrap gap-2">
          {PALETTE_PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              aria-label={`Pakai pasangan ${p.name}`}
              title={p.name}
              onClick={() => onChange([...p.colors, ...colors.slice(2)])}
              className="pill inline-flex min-h-[40px] items-center gap-1 px-3"
            >
              <span className="h-4 w-4 rounded-full " style={{ background: p.colors[0] }} />
              <span className="h-4 w-4 rounded-full " style={{ background: p.colors[1] }} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
