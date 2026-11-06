"use client";

import { useT } from "@/lib/i18n";
import "@/lib/i18n/dict/app";
import * as React from "react";
import { Check } from "lucide-react";
import { GOOGLE_FONTS, googleFontsHref } from "@/lib/ai-site-templates";
import { SELECTED_FILL } from "./shared";
import { cn } from "@/lib/utils";

const CAT_LABEL: Record<(typeof GOOGLE_FONTS)[number]["cat"], string> = { sans: "Sans", serif: "Serif", display: "Display", mono: "Mono", hand: "Tulisan tangan" };

/** Stylesheet contoh: hanya huruf-huruf nama font (parameter text=), jadi ringan untuk dimuat di dashboard. */
const PREVIEW_HREF = (() => {
  const letters = [...new Set(GOOGLE_FONTS.map((f) => f.name).join("").split(""))].join("") + "Aa";
  return `${googleFontsHref(GOOGLE_FONTS.map((f) => f.name))}&text=${encodeURIComponent(letters)}`;
})();

export function GoogleFontPicker({ label, value, onPick }: { label: string; value: string | null; onPick: (name: string | null) => void }) {
  const t = useT();
  return (
    <div>
      <link rel="stylesheet" href={PREVIEW_HREF} />
      <p className="mb-2 text-[13px] font-medium text-text-muted">{label}</p>
      <div role="radiogroup" aria-label={label} className="grid max-h-[248px] grid-cols-2 gap-1.5 overflow-y-auto pr-1">
        <button
          type="button"
          role="radio"
          aria-checked={!value}
          onClick={() => onPick(null)}
          className={cn("flex min-h-[48px] items-center gap-1.5 rounded-[12px] px-3 text-left text-[13px]", !value ? SELECTED_FILL : "bg-[var(--pill-bg)] hover:bg-[var(--card-hover)]")}
        >
          {!value && <Check size={13} aria-hidden />}{" "}{t("Bawaan gaya")}
        </button>
        {GOOGLE_FONTS.map((f) => {
          const on = value === f.name;
          return (
            <button
              key={f.name}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onPick(f.name)}
              className={cn("flex min-h-[48px] min-w-0 flex-col justify-center rounded-[12px] px-3 text-left", on ? SELECTED_FILL : "bg-[var(--pill-bg)] hover:bg-[var(--card-hover)]")}
            >
              <span className="truncate text-[16px] leading-tight" style={{ fontFamily: `'${f.name}', system-ui` }}>
                {f.name}
              </span>
              <span className="text-[11.5px] opacity-70">{t(CAT_LABEL[f.cat])}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
