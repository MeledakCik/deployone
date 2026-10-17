"use client";

import * as React from "react";
import { Check, ArrowLeft, ArrowRight } from "@/components/ui/icons";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge, Btn } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

// Komponen dasar kini ada di components/ui/primitives.tsx (dipakai juga oleh dashboard).
// Re-export di sini supaya impor lama dari "./ui" tetap berfungsi.
export { Card, Badge, Btn, Loading, Skeleton, ErrorBox, Empty, PageHead, PageTitle, KpiCard } from "@/components/ui/primitives";

export function fmtBytes(n: number): string {
  if (!n) return "0 B";
  const u = ["B", "KB", "MB", "GB"];
  const i = Math.min(u.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  return `${(n / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${u[i]}`;
}

export function fmtDateTime(ms: number | string | undefined): string {
  if (!ms) return "—";
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function timeLeft(expiresAt: number): string {
  const s = Math.floor((expiresAt - Date.now()) / 1000);
  if (s <= 0) return "kedaluwarsa";
  if (s < 3600) return `${Math.ceil(s / 60)} mnt lagi`;
  if (s < 86400) return `${Math.floor(s / 3600)} jam lagi`;
  return `${Math.floor(s / 86400)} hari lagi`;
}

/** Meter pemakaian terhadap batas paket. used = null → tampil "—" dengan keterangan. */
export function UsageCard({ label, used, limitBytes, note }: { label: string; used: number | null; limitBytes: number; note: string }) {
  const pct = used === null ? null : Math.min(100, (used / limitBytes) * 100);
  const tone = pct === null ? "neutral" : pct >= 90 ? "bad" : pct >= 70 ? "warn" : "good";
  const barColor = { neutral: "var(--text-faint)", good: "var(--ok-dot)", warn: "var(--warn-dot)", bad: "var(--bad-dot)" }[tone];
  return (
    <div className="px-6 py-4">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[12.5px] text-text-muted">{label}</p>
        {pct !== null && <Badge tone={tone}>{pct < 1 ? "<1" : Math.round(pct)}%</Badge>}
      </div>
      <p className="mt-1 text-[22px] font-bold tracking-tight tabular-nums">
        {used === null ? "—" : fmtBytes(used)}
        <span className="ml-1.5 text-[13px] font-normal text-text-muted">/ {fmtBytes(limitBytes)}</span>
      </p>
      <div
        role="progressbar"
        aria-label={`Pemakaian ${label}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct === null ? undefined : Math.round(pct)}
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--pill-bg)]"
      >
        <div className="h-full rounded-full transition-[width]" style={{ width: `${pct ?? 0}%`, background: barColor }} />
      </div>
      <p className="mt-1.5 text-[12px] text-text-muted">{note}</p>
    </div>
  );
}

/** Switch simetris 44×24: knob 20px dengan jarak 2px di keempat sisi, bergeser lewat transform. */
export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)} className="switch">
      <span className="switch-knob" />
    </button>
  );
}

/** Checkbox kustom 20×20 dengan centang yang "memantul" saat dicentang. */
export function Checkbox({ checked, onChange, label, children }: { checked: boolean; onChange: (v: boolean) => void; label?: string; children?: React.ReactNode }) {
  return (
    <label className="inline-flex cursor-pointer select-none items-center gap-2.5 text-[12.5px] text-text-muted">
      <button type="button" role="checkbox" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className="check-box">
        <Check size={13} />
      </button>
      {children}
    </label>
  );
}

/** Select kustom (Radix) — pengganti <select> bawaan browser supaya sama dengan dropdown di dashboard. */
export function SelectField({
  value,
  onValueChange,
  options,
  label,
  className,
}: {
  value: string;
  onValueChange: (v: string) => void;
  options: { value: string; label: string }[];
  label: string;
  className?: string;
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger aria-label={label} className={cn("h-10 w-auto min-w-[150px] gap-3 rounded-[14px]", className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Pagination sisi klien: reset ke halaman 1 saat `resetKey` (filter/pencarian) berubah. */
export function usePager<T>(rows: T[], size = 25, resetKey = "") {
  const [page, setPage] = React.useState(0);
  React.useEffect(() => setPage(0), [resetKey]);
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const cur = Math.min(page, pages - 1);
  return { page: cur, pages, size, total: rows.length, setPage, slice: rows.slice(cur * size, (cur + 1) * size) };
}
export type PagerState = { page: number; pages: number; size: number; total: number; setPage: (n: number) => void };

export function Pager({ pager }: { pager: PagerState }) {
  if (pager.pages <= 1) return null;
  const from = pager.page * pager.size + 1;
  const to = Math.min(pager.total, (pager.page + 1) * pager.size);
  return (
    <div className="flex items-center justify-between gap-3 border-t border-[var(--surface-line)] px-6 py-3 text-[12.5px] text-text-muted">
      <span className="tabular-nums">
        {from}–{to} dari {pager.total}
      </span>
      <div className="flex gap-2">
        <Btn aria-label="Halaman sebelumnya" disabled={pager.page === 0} onClick={() => pager.setPage(pager.page - 1)}>
          <ArrowLeft size={13} /> Sebelumnya
        </Btn>
        <Btn aria-label="Halaman berikutnya" disabled={pager.page >= pager.pages - 1} onClick={() => pager.setPage(pager.page + 1)}>
          Berikutnya <ArrowRight size={13} />
        </Btn>
      </div>
    </div>
  );
}

export function Avatar({ src, name }: { src: string | null; name: string }) {
  const [bad, setBad] = React.useState(false);
  if (src && !bad) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" referrerPolicy="no-referrer" onError={() => setBad(true)} className="h-9 w-9 rounded-xl object-cover" />;
  }
  return <span className="grid h-9 w-9 place-items-center rounded-xl bg-tone-lilac text-[12px] font-semibold text-lav-text">{(name || "?").slice(0, 1).toUpperCase()}</span>;
}
