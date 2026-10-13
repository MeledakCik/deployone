"use client";

import * as React from "react";

/**
 * Kontrol segmen: penanda terpilih meluncur ke pilihan baru dengan gerakan spring.
 * Lebar tiap segmen sama, supaya penanda cukup digeser dengan translateX.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  className = "",
}: {
  options: { value: T; label: React.ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  className?: string;
}) {
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <div
      role="tablist"
      aria-label={label}
      className={`relative grid rounded-full bg-fill/15 p-1 ${className}`}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden="true"
        className="seg-thumb pointer-events-none absolute inset-y-1 left-1 rounded-full bg-card shadow-card"
        style={{
          width: `calc((100% - 8px) / ${options.length})`,
          transform: `translateX(${index * 100}%)`,
        }}
      />
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={o.value === value}
          onClick={() => onChange(o.value)}
          className={`relative z-10 h-9 truncate rounded-full px-3 text-[12.5px] font-medium transition-colors duration-300 ${
            o.value === value ? "text-ink" : "text-ink-2 hover:text-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
