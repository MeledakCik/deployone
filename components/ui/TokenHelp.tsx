"use client";

import * as React from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

export function TokenHelp({
  label = "Cara dapetin token ini?",
  href,
  linkLabel = "Buka halaman token",
  steps,
}: {
  label?: string;
  href: string;
  linkLabel?: string;
  steps: string[];
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="mt-1.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 text-[11.5px] font-medium text-violet-400 transition-colors hover:text-violet-300"
      >
        <ChevronDown size={13} className={cn("transition-transform duration-200", open && "rotate-180")} />
        {label}
      </button>

      {open && (
        <div className="mt-2 rounded-xl border border-[#2A2D3A] bg-[#0E101A] p-3.5">
          <ol className="space-y-2">
            {steps.map((step, i) => (
              <li key={i} className="flex gap-2.5 text-[12px] leading-relaxed text-white/65">
                <span className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-[10px] font-semibold text-violet-300">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium text-violet-400 hover:text-violet-300"
          >
            {linkLabel} <ExternalLink size={12} />
          </a>
        </div>
      )}
    </div>
  );
}
