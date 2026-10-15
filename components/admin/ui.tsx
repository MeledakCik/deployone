"use client";

import * as React from "react";
import { Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

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

export function Card({ title, action, children, className }: { title?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("surface-solid overflow-hidden", className)}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 border-b border-[var(--surface-line)] px-5 py-3.5">
          <h3 className="text-[14px] font-semibold">{title}</h3>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

const TONES = {
  neutral: "bg-zinc-500/10 text-text-muted border-zinc-500/20",
  good: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  warn: "bg-amber-500/10 text-amber-500 border-amber-500/25",
  bad: "bg-red-500/10 text-red-400 border-red-500/25",
  violet: "bg-violet-500/10 text-violet-400 border-violet-500/25",
} as const;

export function Badge({ tone = "neutral", children }: { tone?: keyof typeof TONES; children: React.ReactNode }) {
  return <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium", TONES[tone])}>{children}</span>;
}

type BtnVariant = "primary" | "ghost" | "danger";
export function Btn({
  variant = "ghost",
  busy,
  className,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; busy?: boolean }) {
  const base = "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition disabled:cursor-not-allowed disabled:opacity-50";
  const v =
    variant === "primary"
      ? "btn-primary"
      : variant === "danger"
        ? "border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20"
        : "border border-[var(--line-strong)] text-text hover:bg-[var(--card-hover)]";
  return (
    <button type="button" {...rest} disabled={rest.disabled || busy} className={cn(base, v, className)}>
      {busy && <Loader2 size={13} className="animate-spin" />}
      {children}
    </button>
  );
}

export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn("relative h-6 w-11 shrink-0 rounded-full border transition disabled:opacity-50", checked ? "border-violet-500/60 bg-violet-500" : "border-[var(--line-strong)] bg-[var(--pill-bg)]")}
    >
      <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", checked ? "left-[22px]" : "left-0.5")} />
    </button>
  );
}

export function Loading({ label = "Memuat…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 px-6 py-12 text-[13px] text-text-muted">
      <Loader2 size={16} className="animate-spin" /> {label}
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-3 px-5 py-6 text-[13px] text-red-400">
      <AlertTriangle size={16} /> <span className="min-w-0 flex-1">{message}</span>
      {onRetry && (
        <Btn onClick={onRetry}>
          <RefreshCw size={13} /> Coba lagi
        </Btn>
      )}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-6 py-10 text-center text-[13px] text-text-muted">{children}</p>;
}

export function PageHead({ title, desc, right }: { title: string; desc?: string; right?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="font-display text-[22px] font-semibold tracking-tight">{title}</h2>
        {desc && <p className="mt-0.5 text-[13px] text-text-muted">{desc}</p>}
      </div>
      {right}
    </div>
  );
}

export function KpiCard({ label, value, sub, tone, onClick }: { label: string; value: string | number; sub?: string; tone?: "bad" | "warn"; onClick?: () => void }) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      {...(onClick ? { type: "button" as const, onClick } : {})}
      className={cn("surface-solid p-4 text-left", onClick && "transition hover:border-violet-500/40")}
    >
      <p className="text-[12px] text-text-muted">{label}</p>
      <p className={cn("mt-1 text-[26px] font-semibold tracking-tight", tone === "bad" && "text-red-400", tone === "warn" && "text-amber-500")}>{value}</p>
      {sub && <p className="mt-0.5 text-[11.5px] text-text-faint">{sub}</p>}
    </Comp>
  );
}

export function Avatar({ src, name }: { src: string | null; name: string }) {
  const [bad, setBad] = React.useState(false);
  if (src && !bad) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" referrerPolicy="no-referrer" onError={() => setBad(true)} className="h-8 w-8 rounded-full object-cover" />;
  }
  return <span className="grid h-8 w-8 place-items-center rounded-full bg-violet-500/20 text-[12px] font-semibold text-violet-400">{(name || "?").slice(0, 1).toUpperCase()}</span>;
}
