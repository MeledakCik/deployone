"use client";

import * as React from "react";
import { Check, Sparkles } from "lucide-react";
import { SELECTED_FILL } from "./shared";
import { cn } from "@/lib/utils";
import { renderSite, type RenderOpts, type SiteContent } from "@/lib/ai-site-templates";
import { SITE_PRESETS, type SitePreset } from "@/lib/ai-site-presets";
import { TemplateThumb } from "./TemplatePicker";

/**
 * Galeri Template: tiap kartu = gabungan Template dasar + Gaya desain + warna + hiasan, dirender dengan isi
 * website ini sendiri supaya pengguna melihat hasil akhirnya, bukan contoh umum.
 */
export function PresetPicker({
  preview,
  selectedId,
  aiSelected,
  aiLabel,
  onPick,
  onAi,
}: {
  preview: SiteContent;
  selectedId: string | null;
  /** true = sedang memakai saran AI (tanpa pilihan Template/gaya/warna sendiri). */
  aiSelected: boolean;
  aiLabel: string;
  onPick: (p: SitePreset) => void;
  onAi: () => void;
}) {
  return (
    <div role="group" aria-label="Pilih template" className="grid grid-cols-2 gap-2.5">
      <button
        type="button"
        onClick={onAi}
        aria-pressed={aiSelected}
        className={cn(
          "flex min-h-[132px] min-w-0 flex-col items-start justify-between gap-2 rounded-[14px] p-3 text-left transition",
          aiSelected ? SELECTED_FILL : "bg-[var(--tile-fill,var(--pill-bg))] hover:bg-[var(--card-hover)]",
        )}
      >
        <Sparkles size={22} aria-hidden />
        <span className="min-w-0">
          <span className="flex items-center gap-1.5 text-[13px] font-semibold">
            {aiSelected && <Check size={14} aria-hidden />}Saran AI
          </span>
          <span className={cn("mt-0.5 block text-[12px] leading-snug", aiSelected ? "opacity-90" : "text-text-muted")}>{aiLabel}</span>
        </span>
      </button>
      {SITE_PRESETS.map((p) => (
        <PresetCard key={p.id} p={p} preview={preview} selected={selectedId === p.id} onPick={onPick} />
      ))}
    </div>
  );
}

function PresetCard({ p, preview, selected, onPick }: { p: SitePreset; preview: SiteContent; selected: boolean; onPick: (p: SitePreset) => void }) {
  const build = React.useCallback(() => {
    const opts: RenderOpts = { palette: [...p.palette], style: p.style, bg: p.bg, decor: p.decor, shop: false, images: {}, look: false, ornaments: false };
    return renderSite(preview, p.template, p.palette[0], opts);
  }, [preview, p]);
  return (
    <div className={cn("relative flex min-w-0 flex-col gap-1.5 rounded-[14px] p-2 transition", selected ? SELECTED_FILL : "bg-[var(--tile-fill,var(--pill-bg))] hover:bg-[var(--card-hover)]")}>
      <TemplateThumb build={build} swatch={[p.bg ?? "#ffffff", p.palette[0]]} name={p.name} />
      <span className="flex min-w-0 items-center gap-1.5 px-0.5">
        {selected && <Check size={14} className="shrink-0" aria-hidden />}
        <span className="block min-w-0 truncate text-[13px] font-semibold">{p.name}</span>
      </span>
      <span className="flex gap-1 px-0.5" aria-hidden>
        {p.palette.map((c) => (
          <span key={c} className="h-3 w-3 rounded-full ring-1 ring-black/10" style={{ background: c }} />
        ))}
      </span>
      <button type="button" onClick={() => onPick(p)} aria-pressed={selected} aria-label={`${p.name}. ${p.desc}`} title={p.desc} className="absolute inset-0 rounded-[14px]" />
    </div>
  );
}
