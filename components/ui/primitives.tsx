"use client";

/**
 * Komponen dasar yang dipakai bersama oleh Dashboard dan Panel Admin.
 * Satu sumber supaya tombol, kartu, badge, judul halaman, dan status loading/kosong/error
 * selalu terlihat dan berperilaku sama di mana pun.
 */

import * as React from "react";
import { Loader2, AlertTriangle, RefreshCw } from "@/components/ui/icons";
import { CountUp } from "@/components/ui/CountUp";
import { cn } from "@/lib/utils";

/* ---------- Judul halaman ---------- */

/** Judul + deskripsi saja. Pakai ini bila halaman punya tata letak header sendiri. */
export function PageTitle({ title, desc }: { title: string; desc?: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <h2 className="page-title">{title}</h2>
      {desc && <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-text-muted">{desc}</p>}
    </div>
  );
}

/** Header halaman standar: judul + deskripsi di kiri, aksi di kanan. */
export function PageHead({ title, desc, right }: { title: string; desc?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <PageTitle title={title} desc={desc} />
      {right}
    </div>
  );
}

/* ---------- Kartu ---------- */

export function Card({ title, action, children, className }: { title?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("surface-solid overflow-hidden", className)}>
      {(title || action) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--surface-line)] px-6 py-5">
          <h3 className="text-[16px] font-bold tracking-tight">{title}</h3>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/* ---------- Badge ---------- */

const TONES = {
  neutral: "bg-[var(--chip-bg)] text-text-muted",
  good: "bg-tone-mint text-ok-fg",
  warn: "bg-tone-lemon text-warn-fg",
  bad: "bg-tone-pink text-bad-fg",
  violet: "bg-tone-lilac text-lav-text",
} as const;
export type BadgeTone = keyof typeof TONES;

export function Badge({ tone = "neutral", dot, children }: { tone?: BadgeTone; dot?: boolean; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12px] font-medium", TONES[tone])}>
      {dot && <span className="live-dot" aria-hidden />}
      {children}
    </span>
  );
}

/* ---------- Tombol ---------- */

export type BtnVariant = "primary" | "ghost" | "danger" | "destructive";

/**
 * - primary: aksi utama di satu area.
 * - ghost: aksi biasa (isian Mist).
 * - danger: aksi berisiko di dalam baris/daftar. Tenang saat diam, merah saat disorot, supaya
 *   daftar panjang tidak penuh warna merah.
 * - destructive: konfirmasi akhir yang merusak (isian merah solid, teks putih).
 */
export function Btn({
  variant = "ghost",
  busy,
  className,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; busy?: boolean }) {
  const base =
    "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[12.5px] font-medium active:scale-[0.97] max-md:min-h-[40px] max-md:px-4 disabled:cursor-not-allowed disabled:opacity-50";
  const v =
    variant === "primary"
      ? "btn-primary"
      : variant === "destructive"
        ? "bg-bad-solid text-white transition duration-150 hover:brightness-110"
        : variant === "danger"
          ? "pill text-bad-fg hover:!bg-bad-bg"
          : "pill";
  return (
    <button type="button" {...rest} disabled={rest.disabled || busy} className={cn(base, v, className)}>
      {busy && <Loader2 size={13} className="animate-spin" />}
      {children}
    </button>
  );
}

/* ---------- Status: memuat / error / kosong ---------- */

export function Loading({ label = "Memuat…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 px-6 py-12 text-[13px] text-text-muted" role="status">
      <Loader2 size={16} className="animate-spin" /> {label}
    </div>
  );
}

/** Kerangka pemuatan: blok abu-abu berdenyut yang meniru bentuk konten akhir. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-xl bg-[var(--pill-bg)]", className)} />;
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-3 px-5 py-6 text-[13px] text-bad-fg" role="alert">
      <AlertTriangle size={16} /> <span className="min-w-0 flex-1">{message}</span>
      {onRetry && (
        <Btn onClick={onRetry}>
          <RefreshCw size={13} /> Coba lagi
        </Btn>
      )}
    </div>
  );
}

/** Keadaan kosong: ikon netral, penjelasan singkat, dan (opsional) satu aksi berikutnya. */
export function Empty({
  children,
  icon,
  title,
  action,
}: {
  children?: React.ReactNode;
  icon?: React.ElementType;
  title?: string;
  action?: React.ReactNode;
}) {
  const Icon = icon;
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      {Icon && (
        <span className="grid h-12 w-12 place-items-center rounded-[16px] bg-tone-lilac text-lav-text">
          <Icon size={22} />
        </span>
      )}
      {title && <h3 className="text-[16px] font-bold tracking-tight">{title}</h3>}
      {children && <p className="max-w-sm text-[13px] leading-relaxed text-text-muted">{children}</p>}
      {action && <div className="mt-1 flex flex-wrap items-center justify-center gap-2">{action}</div>}
    </div>
  );
}

/* ---------- Kartu statistik ---------- */

/**
 * Kartu statistik netral. Warna dicadangkan untuk hal yang butuh perhatian: `tone="bad"` hanya
 * dipakai saat angkanya memang menandakan masalah. Bila diberi `onClick`, kartu menjadi tombol;
 * `selected` menandai kartu yang sedang dipakai sebagai filter.
 */
export function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  onClick,
  tone = "neutral",
  selected,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon?: React.ElementType;
  onClick?: () => void;
  tone?: "neutral" | "bad";
  selected?: boolean;
}) {
  const Comp = onClick ? "button" : "div";
  const iconTone = tone === "bad" ? "bg-tone-pink text-bad-fg" : "bg-tone-lilac text-lav-text";
  return (
    <Comp
      {...(onClick ? { type: "button" as const, onClick, "aria-pressed": selected ?? false } : {})}
      className={cn(
        "surface-solid p-5 text-left",
        onClick && "press w-full cursor-pointer transition hover:-translate-y-0.5",
        selected && "ring-2 ring-[var(--ring)]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="pt-1 text-[13.5px] font-medium text-text-muted">{label}</p>
        {Icon && (
          <span className={cn("grid h-11 w-11 place-items-center rounded-[14px]", iconTone)}>
            <Icon size={19} />
          </span>
        )}
      </div>
      <p className="mt-5 text-[36px] font-bold leading-none tracking-[-0.03em] tabular-nums">
        <CountUp value={value} />
      </p>
      {sub && <p className={cn("mt-2 text-[12.5px]", tone === "bad" ? "text-bad-fg" : "text-text-muted")}>{sub}</p>}
    </Comp>
  );
}
