"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Saklar on/off aksesibel (role="switch"). Satu sumber untuk semua halaman,
 * supaya ukuran, warna, dan perilakunya sama. Area sentuh 48x28 px.
 */
export function Switch({
  id,
  checked,
  onChange,
  disabled,
  "aria-describedby": describedBy,
  "aria-label": ariaLabel,
}: {
  id?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  "aria-describedby"?: string;
  "aria-label"?: string;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-describedby={describedBy}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        checked ? "bg-[var(--ink-fill)]" : "bg-[var(--line-strong)]"
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition-transform duration-300 [transition-timing-function:var(--ease-soft)] motion-reduce:transition-none",
          checked ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  );
}
