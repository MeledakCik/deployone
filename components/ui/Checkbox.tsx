"use client";

import * as React from "react";
import { Check } from "@/components/ui/icons";

/**
 * Kotak centang kustom 20×20 dengan centang yang "memantul" saat dicentang.
 * Tampilannya sama dengan <input type="checkbox"> bawaan yang sudah di-style global di globals.css,
 * jadi dua-duanya boleh dipakai berdampingan. Pakai komponen ini bila butuh label klik + animasi.
 */
export function Checkbox({
  checked,
  onChange,
  label,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  children?: React.ReactNode;
}) {
  return (
    <label className="inline-flex cursor-pointer select-none items-center gap-2.5 text-[13px] text-text-muted">
      <button type="button" role="checkbox" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className="check-box">
        <Check size={13} />
      </button>
      {children}
    </label>
  );
}
