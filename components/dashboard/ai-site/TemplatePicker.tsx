"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { SELECTED_FILL } from "./shared";
import { cn } from "@/lib/utils";
import { TEMPLATES, defaultPalette, renderSite, type RenderOpts, type SiteContent, type TemplateId } from "@/lib/ai-site-templates";
import { ScaledFrame } from "./ScaledFrame";

/** Miniatur tampilan nyata. Iframe baru dibuat saat kartunya terlihat, tanpa skrip, tidak bisa difokus. */
function TemplateThumb({ build, swatch, name }: { build: () => string; swatch: [string, string]; name: string }) {
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
    <div ref={ref} className="h-[86px] w-full overflow-hidden rounded-lg" aria-hidden>
      {html ? (
        <ScaledFrame html={html} title={`Contoh tampilan ${name}`} vw={1100} fitHeight={86} sandbox="" interactive={false} />
      ) : (
        <span className="flex h-full w-full">
          <span className="flex-1" style={{ background: swatch[0] }} />
          <span className="w-1/3" style={{ background: swatch[1] }} />
        </span>
      )}
    </div>
  );
}

export function TemplatePicker({
  value,
  suggestedId,
  preview,
  palette,
  onPick,
}: {
  value: TemplateId;
  /** Template yang disarankan AI (hanya bila pengguna belum memilih sendiri). */
  suggestedId: TemplateId | null;
  /** Isi yang dirender di miniatur: hasil AI, atau isi contoh sebelum generate. */
  preview: SiteContent;
  /** Palet kustom pengguna, atau null = pakai warna bawaan tiap template. */
  palette: string[] | null;
  onPick: (id: TemplateId) => void;
}) {
  return (
    <div role="group" aria-label="Pilih template" className="grid grid-cols-2 gap-2.5 min-[420px]:grid-cols-3">
      {TEMPLATES.map((t) => (
        <TemplateCard key={t.id} t={t} selected={value === t.id} suggested={suggestedId === t.id} preview={preview} palette={palette} onPick={onPick} />
      ))}
    </div>
  );
}

function TemplateCard({
  t,
  selected,
  suggested,
  preview,
  palette,
  onPick,
}: {
  t: (typeof TEMPLATES)[number];
  selected: boolean;
  suggested: boolean;
  preview: SiteContent;
  palette: string[] | null;
  onPick: (id: TemplateId) => void;
}) {
  const build = React.useCallback(() => {
    const colors = palette ?? defaultPalette(t.id);
    const opts: RenderOpts = { palette: palette ?? undefined, shop: false, images: {} };
    return renderSite(preview, t.id, colors[0], opts);
  }, [preview, palette, t.id]);

  return (
    <div
      className={cn(
        "relative flex min-w-0 flex-col gap-1.5 rounded-[14px] p-2.5 transition",
        selected ? SELECTED_FILL : "bg-[var(--tile-fill,var(--pill-bg))] hover:bg-[var(--card-hover)]",
      )}
    >
      <TemplateThumb build={build} swatch={t.swatch} name={t.name} />
      <span className="flex min-w-0 items-center gap-1.5">
        {selected && <Check size={14} className="shrink-0" aria-hidden />}
        <span className="block min-w-0 truncate text-[13px] font-semibold">{t.name}</span>
      </span>
      {suggested ? (
        <span className={cn("block truncate text-[12px] font-medium", selected ? "opacity-90" : "text-lav-text")}>Saran AI</span>
      ) : (
        <span aria-hidden className="block h-[16px]" />
      )}
      <button
        type="button"
        onClick={() => onPick(t.id)}
        aria-pressed={selected}
        aria-label={`${t.name}${suggested ? ", saran AI" : ""}. ${t.desc}`}
        className="absolute inset-0 rounded-[14px]"
      />
    </div>
  );
}
