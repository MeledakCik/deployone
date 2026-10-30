"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { FONT_OPTIONS, renderSite, type FontId, type RenderOpts, type SiteContent, type TemplateId } from "@/lib/ai-site-templates";
import { ScaledFrame } from "./ScaledFrame";

/** Miniatur tampilan nyata memakai Gaya desain & Warna yang sedang aktif, cuma huruf yang diganti. */
function FontThumb({ build, name }: { build: () => string; name: string }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [seen, setSeen] = React.useState(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { rootMargin: "160px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const html = React.useMemo(() => (seen ? build() : null), [seen, build]);

  return (
    <div ref={ref} className="h-[86px] w-full overflow-hidden rounded-lg ring-1 ring-[var(--line)]" aria-hidden>
      {html ? (
        <ScaledFrame html={html} title={`Contoh huruf ${name}`} vw={1100} fitHeight={86} sandbox="" interactive={false} />
      ) : (
        <span className="flex h-full w-full items-center justify-center bg-[var(--pill-bg)] text-[11px] text-text-faint">Aa</span>
      )}
    </div>
  );
}

export function FontPicker({
  value,
  template,
  accent,
  palette,
  preview,
  onPick,
}: {
  /** null = belum ada pilihan manual, ikut huruf bawaan Template. */
  value: FontId | null;
  /** Template yang sedang aktif, dipakai supaya pratinjau huruf memakai bentuk & warna yang sama. */
  template: TemplateId;
  accent: string;
  palette: string[] | null;
  /** Isi yang dirender di miniatur: hasil AI, atau isi contoh sebelum generate. */
  preview: SiteContent;
  onPick: (id: FontId) => void;
}) {
  return (
    <div role="group" aria-label="Pilih jenis huruf" className="grid grid-cols-2 gap-2.5 min-[420px]:grid-cols-3">
      {FONT_OPTIONS.map((f) => (
        <FontCard key={f.id} f={f} selected={value === f.id} template={template} accent={accent} palette={palette} preview={preview} onPick={onPick} />
      ))}
    </div>
  );
}

function FontCard({
  f,
  selected,
  template,
  accent,
  palette,
  preview,
  onPick,
}: {
  f: (typeof FONT_OPTIONS)[number];
  selected: boolean;
  template: TemplateId;
  accent: string;
  palette: string[] | null;
  preview: SiteContent;
  onPick: (id: FontId) => void;
}) {
  const build = React.useCallback(() => {
    const opts: RenderOpts = { palette: palette ?? undefined, shop: false, images: {}, font: f.id };
    return renderSite(preview, template, accent, opts);
  }, [preview, template, accent, palette, f.id]);

  return (
    <div
      className={cn(
        "relative flex min-w-0 flex-col gap-1.5 rounded-2xl p-2.5 transition",
        selected ? "bg-tone-lilac ring-2 ring-[var(--ring)]" : "bg-[var(--pill-bg)] hover:bg-[var(--card-hover)]",
      )}
    >
      <FontThumb build={build} name={f.name} />
      <span className="flex min-w-0 items-center gap-1.5">
        {selected && <Check size={14} className="shrink-0" aria-hidden />}
        <span className="block min-w-0 truncate text-[13px] font-semibold">{f.name}</span>
      </span>
      <span className="block text-[12px] leading-snug text-text-muted">{f.desc}</span>
      <button
        type="button"
        onClick={() => onPick(f.id)}
        aria-pressed={selected}
        aria-label={`${f.name}. ${f.desc}`}
        className="absolute inset-0 rounded-2xl"
      />
    </div>
  );
}
