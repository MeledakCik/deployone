"use client";

import * as React from "react";
import { ShieldAlert } from "@/components/ui/icons";
import { useDialogA11y } from "@/components/ui/useDialogA11y";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/admin/ui";

export interface ConfirmOptions {
  title: string;
  description?: string;
  /** Daftar dampak yang akan terjadi, ditampilkan sebagai ringkasan sebelum konfirmasi. */
  impact?: string[];
  confirmLabel?: string;
  tone?: "danger" | "default";
  /** Opsi tambahan berupa checkbox (mis. "larang pemilik 30 hari"). */
  option?: { label: string; defaultChecked?: boolean };
}
export interface ConfirmResult {
  ok: boolean;
  option: boolean;
}
type Confirm = (o: ConfirmOptions) => Promise<ConfirmResult>;

const ConfirmContext = React.createContext<Confirm>(() => Promise.resolve({ ok: false, option: false }));

/** Pengganti window.confirm: dialog bergaya sendiri, fokus awal di "Batal" (aman untuk aksi destruktif). */
export const useConfirm = () => React.useContext(ConfirmContext);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<{ opts: ConfirmOptions; resolve: (r: ConfirmResult) => void } | null>(null);
  const [checked, setChecked] = React.useState(false);

  const confirm = React.useCallback<Confirm>(
    (opts) =>
      new Promise((resolve) => {
        setChecked(!!opts.option?.defaultChecked);
        setState({ opts, resolve });
      }),
    []
  );

  const finish = React.useCallback(
    (ok: boolean) => {
      setState((cur) => {
        cur?.resolve({ ok, option: ok && checked });
        return null;
      });
    },
    [checked]
  );

  const dialogRef = useDialogA11y<HTMLDivElement>(!!state, () => finish(false));
  const o = state?.opts;
  const danger = (o?.tone ?? "danger") === "danger";

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && o && (
        <div className="anim-fade fixed inset-0 z-[120] grid place-items-end bg-[var(--scrim-bg)] p-3 sm:place-items-center sm:p-6" onClick={() => finish(false)}>
          <div
            ref={dialogRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby={o.description ? "confirm-desc" : undefined}
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            className="surface-solid anim-pop w-full max-w-md p-6 shadow-2xl"
          >
            <span className={cn("grid h-11 w-11 place-items-center rounded-[14px]", danger ? "bg-tone-pink text-bad-fg" : "bg-tone-lilac text-lav-text")}>
              <ShieldAlert size={20} />
            </span>
            <h3 id="confirm-title" className="mt-4 text-[18px] font-bold tracking-tight">
              {o.title}
            </h3>
            {o.description && (
              <p id="confirm-desc" className="mt-1.5 text-[13.5px] text-text-muted">
                {o.description}
              </p>
            )}
            {o.impact && o.impact.length > 0 && (
              <ul className="mt-4 space-y-2 rounded-2xl bg-[var(--chip-bg)] p-4 text-[13px]">
                {o.impact.map((line) => (
                  <li key={line} className="flex gap-2.5">
                    <span className={cn("mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full", danger ? "bg-bad" : "bg-violet-500")} />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            )}
            {o.option && (
              <div className="mt-4">
                <Checkbox checked={checked} onChange={setChecked}>
                  <span className="text-[13px] text-text">{o.option.label}</span>
                </Checkbox>
              </div>
            )}
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" autoFocus onClick={() => finish(false)} className="pill press px-5 py-2.5 text-[13px] font-medium">
                Batal
              </button>
              <button
                type="button"
                onClick={() => finish(true)}
                className={cn(
                  "press rounded-full px-5 py-2.5 text-[13px] font-semibold text-white transition",
                  danger ? "bg-bad-solid hover:brightness-110" : "bg-[var(--ink-fill)] hover:bg-[var(--ink-fill-hover)]"
                )}
              >
                {o.confirmLabel ?? "Lanjutkan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
