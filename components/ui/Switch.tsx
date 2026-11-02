"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Saklar on/off aksesibel (role="switch"). Satu-satunya saklar di aplikasi: ukuran 44×24, gerak knob,
 * dan warnanya didefinisikan di globals.css (.switch), jadi tampil sama di dashboard, admin, dan app.
 *
 * - `tone="danger"`: untuk saklar yang menyalakan tindakan merusak (mis. ikut menghapus di platform).
 *   Aktif = merah, supaya konsekuensinya terlihat sebelum disimpan.
 * - Beri `id` dan hubungkan dengan <label htmlFor> agar teksnya ikut menjadi area sentuh.
 */
export function Switch({
  id,
  checked,
  onChange,
  disabled,
  tone = "default",
  className,
  "aria-describedby": describedBy,
  "aria-label": ariaLabel,
}: {
  id?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  tone?: "default" | "danger";
  className?: string;
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
      data-tone={tone === "danger" ? "danger" : undefined}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn("switch", className)}
    >
      <span className="switch-knob" aria-hidden />
    </button>
  );
}
