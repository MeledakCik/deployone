"use client";

import * as React from "react";
import { Languages } from "lucide-react";
import { setLang, useLang, useT, type Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const OPTS: { id: Lang; short: string; label: string }[] = [
  { id: "id", short: "ID", label: "Bahasa Indonesia" },
  { id: "en", short: "EN", label: "English" },
];

/** Pilihan bahasa ID/EN. Tersimpan di cookie, halaman dimuat ulang dalam bahasa baru. */
export function LanguageSwitch({ className, compact = false }: { className?: string; compact?: boolean }) {
  const lang = useLang();
  const t = useT();
  return (
    <div role="radiogroup" aria-label={t("Bahasa")} className={cn("inline-flex items-center gap-0.5 rounded-full bg-[var(--pill-bg)] p-0.5 text-[12.5px] font-semibold", className)}>
      {!compact && <Languages size={14} className="ml-2 mr-1 opacity-70" aria-hidden />}
      {OPTS.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={lang === o.id}
          lang={o.id}
          title={o.label}
          aria-label={o.label}
          onClick={() => lang !== o.id && setLang(o.id)}
          className={cn(
            "min-h-[32px] min-w-[38px] rounded-full px-2.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
            lang === o.id ? "bg-[var(--ink-fill)] text-[var(--ink-fill-text)]" : "hover:bg-[var(--card-hover)]",
          )}
        >
          {o.short}
        </button>
      ))}
    </div>
  );
}
