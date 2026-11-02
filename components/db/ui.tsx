"use client";
/** ui.tsx — util + komponen kecil bersama untuk fitur Database. Ubah warna aksen di sini saja. */
import { ReactNode, useEffect, useState } from "react";
import { X } from "@/components/ui/icons";
import { useDialogA11y } from "@/components/ui/useDialogA11y";

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
  "rounded-[28px] bg-[var(--surface-solid)] [box-shadow:var(--surface-shadow)]";
export const inputCls =
  "input-solid w-full min-w-0 px-3.5 py-2.5 text-[13px] text-text placeholder:text-text-faint disabled:opacity-60";
export const th =
  "px-3 py-2.5 text-left text-[12px] font-medium text-text-muted whitespace-nowrap";
export const td =
  "px-3 py-2.5 text-[13px] text-text align-top";
/** Tombol link (<a>) dengan gaya secondary, agar sama dengan <Btn>. */
export const linkBtn =
  "pill inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-[13px] font-medium max-md:min-h-[40px]";
export const subtle =
  "text-[12px] text-text-muted";
export const heading =
  "text-[13px] font-semibold text-text";

const btnBase =
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-medium active:scale-[0.97] max-md:min-h-[40px] disabled:cursor-not-allowed disabled:opacity-50";
const variants = {
  primary: "btn-primary",
  secondary: "pill",
  danger: "bg-bad-solid text-white transition duration-150 hover:brightness-110",
  ghost: "text-text-muted transition hover:bg-[var(--card-hover)]",
};
export function Btn({ variant = "secondary", small, className, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof variants; small?: boolean }) {
  return <button type="button" {...p} className={cx(btnBase, variants[variant], small && "!px-2.5 !py-1 !text-[12px]", className)} />;
}

export function Notice({ kind = "info", children }: { kind?: "info" | "warn" | "error" | "ok"; children: ReactNode }) {
  const c = { info: "notice-info", warn: "notice-warn", error: "notice-bad", ok: "notice-ok" }[kind];
  return (
    <div role={kind === "error" ? "alert" : "status"} className={cx("notice", c)}>
      {children}
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-text">{label}</span>
      {children}
      {hint && <span className="block text-xs text-text-muted">{hint}</span>}
    </label>
  );
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  // Perilaku dialog yang sama dengan semua modal lain: Esc menutup, Tab berputar di dalam, fokus kembali ke pemicu,
  // scroll halaman dikunci (ref-count).
  const dialogRef = useDialogA11y<HTMLDivElement>(true, onClose);
  // Fokus awal ke isian pertama bila ada (lebih berguna bagi pengguna daripada tombol tutup).
  useEffect(() => {
    dialogRef.current?.querySelector<HTMLElement>("input:not([type=hidden]):not([type=checkbox]):not([type=file]), textarea, select")?.focus();
  }, [dialogRef]);
  return (
    <div className="modal-scrim fixed inset-0 z-50 flex items-end justify-center backdrop-blur-[2px] sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cx(
          "anim-pop max-h-[92dvh] w-full overflow-y-auto overscroll-contain rounded-t-[28px] bg-[var(--surface-solid)] p-5 shadow-2xl pb-[max(1.25rem,env(safe-area-inset-bottom))] focus:outline-none sm:max-h-[90vh] sm:rounded-[28px] sm:p-6",
          wide ? "sm:max-w-3xl" : "sm:max-w-md"
        )}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="text-[18px] font-bold tracking-tight text-text">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Tutup" className="-mr-1 -mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-full text-text-muted transition-colors hover:bg-[var(--card-hover)] hover:text-text">
            <X size={16} />
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
      <div className="text-xs font-medium text-text-muted">{label}</div>
      <div className="flex items-stretch gap-2">
        <code className="min-w-0 flex-1 break-all rounded-xl bg-[var(--pill-bg)] px-3 py-2 font-mono text-xs leading-relaxed text-text">{value}</code>
        <CopyBtn text={value} />
      </div>
    </div>
  );
}

export function UsageBar({ used, quota }: { used: number; quota: number }) {
  const ratio = quota ? used / quota : 0;
  const pct = Math.min(100, Math.round(ratio * 100));
  const color = ratio >= 1 ? "bg-bad-solid" : ratio >= 0.8 ? "bg-warn" : "bg-[var(--accent)]";
  return (
    <div>
      <div className="mb-1.5 flex justify-between gap-3 text-xs text-text-muted">
        <span>
          {fmtBytes(used)} dari {fmtBytes(quota)}
        </span>
        <span className="font-medium">{pct}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-tone-lilac" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Pemakaian kuota">
        <div className={cx("h-full rounded-full transition-all", color)} style={{ width: `${Math.max(pct, used > 0 ? 2 : 0)}%` }} />
      </div>
      {ratio >= 1 ? (
        <p className="mt-2 text-xs font-medium text-bad-fg">Kuota penuh. Operasi tulis ditolak; hapus data/tabel (DELETE/DROP) untuk melanjutkan.</p>
      ) : ratio >= 0.8 ? (
        <p className="mt-2 text-xs font-medium text-warn-fg">Pemakaian sudah di atas 80%. Segera bersihkan data yang tidak dipakai.</p>
      ) : null}
    </div>
  );
}

/** Tabel responsif: bungkus dengan scroll horizontal + border halus. */
export function TableWrap({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("overflow-x-auto rounded-xl", className)}>{children}</div>;
}

/** Judul halaman + aksi di kanan; di mobile aksi turun ke bawah dan melebar. */
export function PageHeader({ title, subtitle, children }: { title: ReactNode; subtitle?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="page-title truncate">{title}</h1>
        {subtitle && <p className="mt-1.5 text-[14px] leading-relaxed text-text-muted">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2 [&>*]:flex-1 sm:[&>*]:flex-none">{children}</div>}
    </div>
  );
}

export function renderCell(c: unknown): ReactNode {
  if (c === null || c === undefined) return <span className="rounded bg-[var(--pill-bg)] px-1.5 py-0.5 text-[12px] font-medium italic text-text-faint">NULL</span>;
  if (typeof c === "object") return <span className="rounded bg-[var(--pill-bg)] px-1.5 py-0.5 text-[12px] font-medium text-text-faint">BLOB</span>;
  const s = String(c);
  return <span title={s.length > 120 ? s : undefined}>{s.length > 120 ? s.slice(0, 120) + "…" : s}</span>;
}
