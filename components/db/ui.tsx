"use client";
/** ui.tsx — util + komponen kecil bersama untuk fitur Database. Ubah warna aksen di sini saja. */
import { ReactNode, useEffect, useState } from "react";

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function api<T = any>(url: string, init: Omit<RequestInit, "body"> & { json?: unknown; body?: BodyInit | null } = {}): Promise<T> {
  const { json, headers, ...rest } = init;
  const res = await fetch(url, {
    credentials: "same-origin",
    cache: "no-store",
    ...rest,
    headers: { ...(json !== undefined ? { "Content-Type": "application/json" } : {}), ...(headers as Record<string, string> | undefined) },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  let j: any = null;
  try {
    j = await res.json();
  } catch {
    /* bukan JSON */
  }
  if (!res.ok || !j?.ok) throw new ApiError((typeof j?.error === "string" ? j.error : j?.error?.message) || `Permintaan gagal (${res.status}).`, res.status, j?.error?.code ?? j?.code);
  return j.data as T;
}

export function fmtBytes(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 ** 2).toFixed(2)} MB`;
}
export const fmtDate = (ms: number) => new Date(ms).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(" ");

// ───────────── Kelas Tailwind (tema Depup: violet + lime, dual theme) ─────────────
export const surface =
  "rounded-2xl border border-violet-100 bg-white shadow-[0_1px_2px_rgba(56,35,129,0.05),0_14px_30px_-22px_rgba(90,57,192,0.28)] dark:border-white/10 dark:bg-[#1e1150] dark:shadow-none";
export const inputCls =
  "w-full min-w-0 rounded-xl border border-violet-100 bg-violet-50/60 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-violet-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/40 disabled:opacity-60 dark:border-white/10 dark:bg-[#150c3a] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-[#150c3a]";
export const th = "px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 whitespace-nowrap";
export const td = "px-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 align-top";
/** Tombol link (<a>) dengan gaya secondary, agar sama dengan <Btn>. */
export const linkBtn =
  "inline-flex items-center justify-center gap-1.5 rounded-xl border border-violet-200 bg-white px-3.5 py-2 text-sm font-medium text-violet-700 transition-colors hover:bg-violet-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-white/15 dark:bg-transparent dark:text-violet-200 dark:hover:bg-white/10";
export const subtle = "text-xs text-slate-500 dark:text-slate-400";
export const heading = "text-sm font-semibold text-slate-900 dark:text-slate-100";

const btnBase =
  "inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]";
const variants = {
  primary: "bg-violet-500 text-white shadow-sm hover:bg-violet-600 dark:bg-lime-500 dark:text-[#1e1150] dark:hover:bg-lime-400",
  secondary: "border border-violet-200 bg-white text-violet-700 hover:bg-violet-50 dark:border-white/15 dark:bg-transparent dark:text-violet-200 dark:hover:bg-white/10",
  danger: "bg-red-600 text-white hover:bg-red-500",
  ghost: "text-slate-600 hover:bg-violet-50 dark:text-slate-300 dark:hover:bg-white/10",
};
export function Btn({ variant = "secondary", small, className, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof variants; small?: boolean }) {
  return <button type="button" {...p} className={cx(btnBase, variants[variant], small && "!rounded-lg !px-2.5 !py-1.5 text-xs", className)} />;
}

export function Notice({ kind = "info", children }: { kind?: "info" | "warn" | "error" | "ok"; children: ReactNode }) {
  const c = {
    info: "border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-100",
    warn: "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100",
    error: "border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100",
    ok: "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100",
  }[kind];
  return (
    <div role={kind === "error" ? "alert" : "status"} className={cx("rounded-xl border px-3.5 py-2.5 text-sm leading-relaxed", c)}>
      {children}
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>
      {children}
      {hint && <span className="block text-xs text-slate-500 dark:text-slate-400">{hint}</span>}
    </label>
  );
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", h);
      document.body.style.overflow = prev;
    };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#120b2e]/55 backdrop-blur-[2px] sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cx(
          "max-h-[92dvh] w-full overflow-y-auto overscroll-contain rounded-t-3xl border border-violet-100 bg-white p-5 shadow-2xl pb-[max(1.25rem,env(safe-area-inset-bottom))] dark:border-white/10 dark:bg-[#1e1150] sm:max-h-[90vh] sm:rounded-3xl sm:p-6",
          wide ? "sm:max-w-3xl" : "sm:max-w-md"
        )}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 sm:text-lg">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Tutup" className="-mr-1 -mt-1 rounded-lg p-2 text-slate-500 hover:bg-violet-50 dark:hover:bg-white/10">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Tombol salin ke clipboard. */
export function CopyBtn({ text, label = "Salin" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <Btn
      small
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          /* clipboard ditolak */
        }
      }}
    >
      {done ? "Tersalin" : label}
    </Btn>
  );
}

export function SecretRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</div>
      <div className="flex items-stretch gap-2">
        <code className="min-w-0 flex-1 break-all rounded-xl bg-violet-50 px-3 py-2 font-mono text-xs leading-relaxed text-slate-900 dark:bg-[#150c3a] dark:text-slate-100">{value}</code>
        <CopyBtn text={value} />
      </div>
    </div>
  );
}

export function UsageBar({ used, quota }: { used: number; quota: number }) {
  const ratio = quota ? used / quota : 0;
  const pct = Math.min(100, Math.round(ratio * 100));
  const color = ratio >= 1 ? "bg-red-500" : ratio >= 0.8 ? "bg-amber-500" : "bg-violet-500 dark:bg-lime-500";
  return (
    <div>
      <div className="mb-1.5 flex justify-between gap-3 text-xs text-slate-600 dark:text-slate-300">
        <span>
          {fmtBytes(used)} dari {fmtBytes(quota)}
        </span>
        <span className="font-medium">{pct}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-violet-100 dark:bg-white/10" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Pemakaian kuota">
        <div className={cx("h-full rounded-full transition-all", color)} style={{ width: `${Math.max(pct, used > 0 ? 2 : 0)}%` }} />
      </div>
      {ratio >= 1 ? (
        <p className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">Kuota penuh. Operasi tulis ditolak; hapus data/tabel (DELETE/DROP) untuk melanjutkan.</p>
      ) : ratio >= 0.8 ? (
        <p className="mt-2 text-xs font-medium text-amber-600 dark:text-amber-400">Pemakaian sudah di atas 80%. Segera bersihkan data yang tidak dipakai.</p>
      ) : null}
    </div>
  );
}

/** Tabel responsif: bungkus dengan scroll horizontal + border halus. */
export function TableWrap({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("overflow-x-auto rounded-xl border border-violet-100 dark:border-white/10", className)}>{children}</div>;
}

/** Judul halaman + aksi di kanan; di mobile aksi turun ke bawah dan melebar. */
export function PageHeader({ title, subtitle, children }: { title: ReactNode; subtitle?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="truncate text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2 [&>*]:flex-1 sm:[&>*]:flex-none">{children}</div>}
    </div>
  );
}

export function renderCell(c: unknown): ReactNode {
  if (c === null || c === undefined) return <span className="rounded bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium italic text-slate-400 dark:bg-white/10">NULL</span>;
  if (typeof c === "object") return <span className="rounded bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 dark:bg-white/10">BLOB</span>;
  const s = String(c);
  return <span title={s.length > 120 ? s : undefined}>{s.length > 120 ? s.slice(0, 120) + "…" : s}</span>;
}
