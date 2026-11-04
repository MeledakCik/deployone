"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, GripVertical, LayoutTemplate } from "lucide-react";
import { sectionOrder, type SectionId, type SiteContent } from "@/lib/ai-site-templates";
import { cn } from "@/lib/utils";

/** Bagian yang benar-benar ada di website ini, dengan nama yang dikenali pengguna. */
export function presentSections(c: SiteContent, shop: boolean): { id: SectionId; label: string }[] {
  const has: Record<SectionId, boolean> = {
    katalog: c.kind !== "artikel" && c.items.length > 0,
    artikel: c.kind === "artikel" && (c.articles?.length ?? 0) > 0,
    fitur: c.features.length > 0,
    testimoni: !!c.testimonial?.text,
    cara: c.steps.length > 0,
    tentang: !!(c.about || c.address || c.hours || c.whatsapp || c.email),
    kontak: !!(c.whatsapp || c.email),
  };
  const label: Record<SectionId, string> = {
    katalog: shop ? `Katalog · ${c.itemsTitle}` : c.itemsTitle,
    artikel: `Artikel · ${c.itemsTitle}`,
    fitur: c.featuresTitle || "Keunggulan",
    testimoni: "Testimoni",
    cara: c.stepsTitle || "Langkah",
    tentang: c.about ? c.aboutTitle : "Info kontak",
    kontak: `Ajakan · ${c.closing}`,
  };
  return sectionOrder(c, shop)
    .filter((id) => has[id])
    .map((id) => ({ id, label: label[id] }));
}

export function SectionsPanel({
  content,
  shop,
  selected,
  onChange,
  onSelect,
}: {
  content: SiteContent;
  shop: boolean;
  selected: string | null;
  onChange: (next: NonNullable<SiteContent["sections"]>) => void;
  onSelect: (id: string) => void;
}) {
  const list = presentSections(content, shop);
  const hidden = new Set(content.sections?.hidden ?? []);
  const [drag, setDrag] = React.useState<SectionId | null>(null);
  const [over, setOver] = React.useState<SectionId | null>(null);

  const commit = (order: SectionId[], hid: Set<SectionId>) => onChange({ order, ...(hid.size ? { hidden: [...hid] } : {}) });
  const move = (id: SectionId, to: number) => {
    const ids = list.map((x) => x.id).filter((x) => x !== id);
    ids.splice(Math.max(0, Math.min(ids.length, to)), 0, id);
    commit(ids, hidden);
  };
  const toggle = (id: SectionId) => {
    const h = new Set(hidden);
    if (h.has(id)) h.delete(id);
    else h.add(id);
    commit(list.map((x) => x.id), h);
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => onSelect("hero")}
        className={cn(
          "flex min-h-[48px] w-full items-center gap-2.5 rounded-[14px] px-3 text-left text-[14px] font-medium transition",
          selected === "hero" ? "bg-[var(--ink-fill)] text-[var(--ink-fill-text)]" : "bg-[var(--pill-bg)] hover:bg-[var(--card-hover)]",
        )}
      >
        <LayoutTemplate size={16} className="shrink-0" aria-hidden />
        <span className="min-w-0 flex-1 truncate">Bagian paling atas</span>
        <span className="text-[12px] opacity-70">tetap di atas</span>
      </button>
      <ol className="space-y-2" aria-label="Urutan bagian halaman">
        {list.map((s, i) => {
          const off = hidden.has(s.id);
          return (
            <li
              key={s.id}
              draggable
              onDragStart={(e) => {
                setDrag(s.id);
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", s.id);
              }}
              onDragOver={(e) => {
                if (!drag) return;
                e.preventDefault();
                setOver(s.id);
              }}
              onDragLeave={() => setOver((o) => (o === s.id ? null : o))}
              onDrop={(e) => {
                e.preventDefault();
                if (drag && drag !== s.id) move(drag, i);
                setDrag(null);
                setOver(null);
              }}
              onDragEnd={() => {
                setDrag(null);
                setOver(null);
              }}
              className={cn(
                "flex min-h-[48px] items-center gap-1 rounded-[14px] pl-1.5 pr-1 transition",
                selected === s.id ? "bg-[var(--ink-fill)] text-[var(--ink-fill-text)]" : "bg-[var(--pill-bg)]",
                over === s.id && drag !== s.id && "ring-2 ring-[var(--ring)]",
                drag === s.id && "opacity-50",
              )}
            >
              <GripVertical size={16} className="shrink-0 cursor-grab opacity-60" aria-hidden />
              <button type="button" onClick={() => onSelect(s.id)} className={cn("min-w-0 flex-1 truncate py-3 text-left text-[14px] font-medium", off && "line-through opacity-60")}>
                {s.label}
              </button>
              <button type="button" onClick={() => move(s.id, i - 1)} disabled={i === 0} aria-label={`Naikkan ${s.label}`} className="grid h-10 w-9 place-items-center rounded-[10px] hover:bg-black/5 disabled:opacity-30">
                <ArrowUp size={15} aria-hidden />
              </button>
              <button type="button" onClick={() => move(s.id, i + 1)} disabled={i === list.length - 1} aria-label={`Turunkan ${s.label}`} className="grid h-10 w-9 place-items-center rounded-[10px] hover:bg-black/5 disabled:opacity-30">
                <ArrowDown size={15} aria-hidden />
              </button>
              <button type="button" onClick={() => toggle(s.id)} aria-pressed={off} aria-label={off ? `Tampilkan ${s.label}` : `Sembunyikan ${s.label}`} className="grid h-10 w-9 place-items-center rounded-[10px] hover:bg-black/5">
                {off ? <EyeOff size={15} aria-hidden /> : <Eye size={15} aria-hidden />}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
