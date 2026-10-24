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

// ───────────── Kelas Tailwind (permukaan solid, dual theme) ─────────────
export const surface = "rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900";
export const inputCls =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";
export const th = "px-3 py-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap";
export const td = "px-3 py-2 text-sm text-slate-800 dark:text-slate-200 align-top";

const btnBase =
  "inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50";
const variants = {
  primary: "bg-indigo-600 text-white hover:bg-indigo-500",
  secondary: "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800",
  danger: "bg-red-600 text-white hover:bg-red-500",
  ghost: "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
};
export function Btn({ variant = "secondary", small, className, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof variants; small?: boolean }) {
  return <button type="button" {...p} className={cx(btnBase, variants[variant], small && "!px-2 !py-1 text-xs", className)} />;
}

export function Notice({ kind = "info", children }: { kind?: "info" | "warn" | "error" | "ok"; children: ReactNode }) {
  const c = {
    info: "border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-100",
    warn: "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100",
    error: "border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100",
    ok: "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100",
  }[kind];
  return (
    <div role={kind === "error" ? "alert" : "status"} className={cx("rounded-md border px-3 py-2 text-sm", c)}>
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
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className={cx("max-h-[90vh] w-full overflow-y-auto rounded-lg border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900", wide ? "max-w-3xl" : "max-w-md")}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Tutup" className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
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
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 break-all rounded bg-slate-100 px-2 py-1.5 text-xs text-slate-900 dark:bg-slate-800 dark:text-slate-100">{value}</code>
        <CopyBtn text={value} />
      </div>
    </div>
  );
}

export function UsageBar({ used, quota }: { used: number; quota: number }) {
  const ratio = quota ? used / quota : 0;
  const pct = Math.min(100, Math.round(ratio * 100));
  const color = ratio >= 1 ? "bg-red-500" : ratio >= 0.8 ? "bg-amber-500" : "bg-indigo-500";
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-slate-600 dark:text-slate-300">
        <span>
          {fmtBytes(used)} dari {fmtBytes(quota)}
        </span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Pemakaian kuota">
        <div className={cx("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
      </div>
      {ratio >= 1 ? (
        <p className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">Kuota penuh. Operasi tulis ditolak; hapus data/tabel (DELETE/DROP) untuk melanjutkan.</p>
      ) : ratio >= 0.8 ? (
        <p className="mt-2 text-xs font-medium text-amber-600 dark:text-amber-400">Pemakaian sudah di atas 80%. Segera bersihkan data yang tidak dipakai.</p>
      ) : null}
    </div>
  );
}

export function renderCell(c: unknown): ReactNode {
  if (c === null || c === undefined) return <span className="italic text-slate-400">NULL</span>;
  if (typeof c === "object") return <span className="text-slate-400">[BLOB]</span>;
  const s = String(c);
  return <span title={s.length > 120 ? s : undefined}>{s.length > 120 ? s.slice(0, 120) + "…" : s}</span>;
}
