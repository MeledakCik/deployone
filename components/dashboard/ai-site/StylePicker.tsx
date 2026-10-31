"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { SELECTED_FILL } from "./shared";
import { cn } from "@/lib/utils";
import { DESIGN_STYLES, renderSite, type DesignStyleId, type RenderOpts, type SiteContent, type TemplateId } from "@/lib/ai-site-templates";
import { ScaledFrame } from "./ScaledFrame";

/** Miniatur tampilan nyata: warna & huruf ikut pilihan aktif, cuma bentuk/bayangan/dekorasi yang beda per gaya. */
function StyleThumb({ build, name }: { build: () => string; name: string }) {
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
        <ScaledFrame html={html} title={`Contoh gaya ${name}`} vw={1100} fitHeight={86} sandbox="" interactive={false} />
      ) : (
        <span className="flex h-full w-full items-center justify-center bg-[var(--pill-bg)] text-[12px] text-text-faint">{name}</span>
      )}
    </div>
  );
}

export function StylePicker({
  value,
  template,
  accent,
  palette,
  fonts,
  preview,
  onPick,
}: {
  /** null = belum diubah, ikut bentuk bawaan Template. */
  value: DesignStyleId | null;
  template: TemplateId;
  accent: string;
  palette: string[] | null;
  fonts: RenderOpts["fonts"];
  /** Isi yang dirender di miniatur: hasil AI, atau isi contoh sebelum generate. */
  preview: SiteContent;
  onPick: (id: DesignStyleId) => void;
}) {
  return (
    <div role="group" aria-label="Pilih gaya desain" className="grid grid-cols-2 gap-2.5 min-[420px]:grid-cols-3">
      {DESIGN_STYLES.map((s) => (
        <StyleCard key={s.id} s={s} selected={value === s.id} template={template} accent={accent} palette={palette} fonts={fonts} preview={preview} onPick={onPick} />
      ))}
    </div>
  );
}

function StyleCard({
  s,
  selected,
  template,
  accent,
  palette,
  fonts,
  preview,
  onPick,
}: {
  s: (typeof DESIGN_STYLES)[number];
  selected: boolean;
  template: TemplateId;
  accent: string;
  palette: string[] | null;
  fonts: RenderOpts["fonts"];
  preview: SiteContent;
  onPick: (id: DesignStyleId) => void;
}) {
  const build = React.useCallback(() => {
    const opts: RenderOpts = { palette: palette ?? undefined, fonts, shop: false, images: {}, style: s.id };
    return renderSite(preview, template, accent, opts);
  }, [preview, template, accent, palette, fonts, s.id]);

  return (
    <div
      className={cn(
        "relative flex min-w-0 flex-col gap-1.5 rounded-[14px] p-2.5 transition",
        selected ? SELECTED_FILL : "bg-[var(--tile-fill,var(--pill-bg))] hover:bg-[var(--card-hover)]",
      )}
    >
      <StyleThumb build={build} name={s.name} />
      <span className="flex min-w-0 items-center gap-1.5">
        {selected && <Check size={14} className="shrink-0" aria-hidden />}
        <span className="block min-w-0 truncate text-[13px] font-semibold">{s.name}</span>
      </span>
      <span className={cn("block text-[12px] leading-snug", selected ? "opacity-90" : "text-text-muted")}>{s.desc}</span>
      <button
        type="button"
        onClick={() => onPick(s.id)}
        aria-pressed={selected}
        aria-label={`${s.name}. ${s.desc}`}
        className="absolute inset-0 rounded-[14px]"
      />
    </div>
  );
}
