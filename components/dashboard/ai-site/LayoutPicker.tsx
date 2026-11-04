"use client";

import * as React from "react";
import { HERO_LAYOUTS, FEAT_LAYOUTS, type HeroLayout, type FeatLayout } from "@/lib/ai-site-templates";
import { cn } from "@/lib/utils";

/** Sketsa kecil tiap tata letak (120×78), supaya pilihan dikenali dari bentuknya, bukan dari nama. */
const T = "currentColor";
const bar = (x: number, y: number, w: number, h = 5, o = 1) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="${T}" opacity="${o}"/>`;
const box = (x: number, y: number, w: number, h: number, o = 0.28, r = 4) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${T}" opacity="${o}"/>`;
const btn = (x: number, y: number, w = 22) => `<rect x="${x}" y="${y}" width="${w}" height="8" rx="4" fill="var(--accent,#7c5cff)"/>`;

const HERO_ART: Record<HeroLayout, string> = {
  center: bar(30, 18, 60, 7) + bar(38, 29, 44, 7) + bar(40, 42, 40, 3, 0.4) + btn(49, 52),
  left: bar(12, 18, 62, 7) + bar(12, 29, 46, 7) + bar(12, 42, 50, 3, 0.4) + btn(12, 52),
  split: bar(10, 20, 44, 6) + bar(10, 30, 36, 6) + bar(10, 42, 40, 3, 0.4) + btn(10, 52) + box(66, 14, 44, 50),
  "split-bold": bar(10, 18, 54, 8) + bar(10, 30, 44, 8) + btn(10, 50) + box(74, 12, 36, 16) + box(74, 31, 36, 16) + box(74, 50, 36, 16),
  asymmetric: bar(10, 22, 46, 6) + bar(10, 32, 38, 6) + btn(10, 48) + box(64, 12, 46, 30, 0.34) + box(64, 46, 21, 20) + box(89, 46, 21, 20),
  editorial: bar(10, 12, 100, 12) + bar(10, 28, 80, 12) + bar(10, 52, 40, 3, 0.4) + btn(88, 50),
  poster: bar(10, 10, 100, 3, 0.4) + bar(10, 18, 100, 16) + box(10, 40, 32, 28) + box(46, 40, 32, 28, 0.6) + box(82, 40, 28, 28),
  breaker: bar(10, 16, 40, 10) + bar(10, 30, 34, 10) + box(56, 12, 30, 54, 0.55) + bar(92, 28, 20, 3, 0.4) + btn(92, 40, 18),
  terminal: box(8, 8, 104, 62, 0.12, 2) + bar(18, 16, 4, 46, 0.4) + bar(28, 18, 40, 8) + bar(28, 30, 32, 8) + btn(28, 54) + box(74, 14, 32, 50),
  dashboard: bar(10, 10, 100, 2, 0.4) + bar(10, 18, 60, 9) + bar(10, 31, 44, 3, 0.4) + box(10, 46, 32, 22, 0.6) + box(44, 46, 32, 22) + box(78, 46, 32, 22, 0.45),
  label: box(8, 8, 26, 62, 0.5) + box(36, 8, 36, 40) + bar(78, 14, 32, 6) + bar(78, 24, 26, 6) + btn(78, 40, 20) + box(36, 52, 74, 18, 0.18),
  neo: bar(10, 18, 30, 7) + `<rect x="40" y="17" width="20" height="9" rx="2" fill="#c6f432"/>` + bar(10, 30, 46, 7) + btn(10, 46) + box(66, 14, 42, 46, 0.3, 6) + `<rect x="70" y="18" width="42" height="46" rx="6" fill="none" stroke="${T}" stroke-width="2"/>` + `<circle cx="64" cy="16" r="7" fill="#ffd23f" stroke="${T}" stroke-width="1.5"/>`,
  collage: bar(28, 10, 64, 7) + bar(36, 20, 48, 7) + btn(49, 31) + `<g transform="rotate(-6 30 56)"><rect x="16" y="46" width="28" height="22" rx="4" fill="#ff8fbd" stroke="${T}" stroke-width="1.5"/></g><rect x="46" y="44" width="28" height="22" rx="4" fill="#9ad7ff" stroke="${T}" stroke-width="1.5"/><g transform="rotate(5 90 56)"><rect x="76" y="46" width="28" height="22" rx="4" fill="#ffd23f" stroke="${T}" stroke-width="1.5"/></g>`,
};

const FEAT_ART: Record<FeatLayout, string> = {
  grid: bar(10, 10, 50, 7) + box(10, 24, 31, 44) + box(45, 24, 31, 44) + box(80, 24, 30, 44),
  bento: bar(10, 10, 50, 7) + box(10, 24, 48, 44, 0.5) + box(62, 24, 48, 20) + box(62, 48, 22, 20) + box(88, 48, 22, 20),
  list: bar(10, 12, 34, 7) + bar(10, 23, 28, 3, 0.4) + box(54, 10, 56, 16) + box(54, 31, 56, 16) + box(54, 52, 56, 16),
  editorial: bar(10, 12, 34, 7) + [0, 1, 2, 3].map((i) => bar(54, 12 + i * 15, 8, 6, 0.5) + bar(66, 12 + i * 15, 44, 6)).join(""),
  index: box(10, 10, 38, 58, 0.18) + bar(16, 16, 18, 14) + bar(16, 36, 26, 5) + [0, 1, 2, 3].map((i) => bar(54, 12 + i * 15, 56, 10, 0.3)).join(""),
};

function Thumb({ art, label, selected, onClick }: { art: string; label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        "group flex min-w-0 flex-col gap-1.5 rounded-[14px] p-1.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
        selected ? "bg-[var(--ink-fill)] text-[var(--ink-fill-text)]" : "bg-[var(--pill-bg)] hover:bg-[var(--card-hover)]",
      )}
    >
      <span className={cn("block overflow-hidden rounded-[10px]", selected ? "bg-white/95 text-[#1d1b26]" : "bg-[var(--surface-solid)] text-text")}>
        <svg viewBox="0 0 120 78" className="block h-auto w-full" aria-hidden dangerouslySetInnerHTML={{ __html: art }} />
      </span>
      <span className="truncate px-1 text-[12.5px] font-medium">{label}</span>
    </button>
  );
}

export function HeroLayoutPicker({ value, suggested, onPick }: { value: HeroLayout; suggested?: HeroLayout | null; onPick: (v: HeroLayout) => void }) {
  return (
    <div role="radiogroup" aria-label="Bagian paling atas" className="grid grid-cols-2 gap-2">
      {HERO_LAYOUTS.map((l) => (
        <Thumb key={l.id} art={HERO_ART[l.id]} label={l.id === suggested ? `${l.name} · saran` : l.name} selected={value === l.id} onClick={() => onPick(l.id)} />
      ))}
    </div>
  );
}

export function FeatLayoutPicker({ value, onPick }: { value: FeatLayout; onPick: (v: FeatLayout) => void }) {
  return (
    <div role="radiogroup" aria-label="Tata letak keunggulan" className="grid grid-cols-2 gap-2">
      {FEAT_LAYOUTS.map((l) => (
        <Thumb key={l.id} art={FEAT_ART[l.id]} label={l.name} selected={value === l.id} onClick={() => onPick(l.id)} />
      ))}
    </div>
  );
}
