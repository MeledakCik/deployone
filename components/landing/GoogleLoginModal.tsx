"use client";

import * as React from "react";
import { X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useDialogA11y } from "@/components/ui/useDialogA11y";

export function GoogleMark({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" className="shrink-0">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6 29.6 4 24 4c-7.7 0-14.4 4.4-17.7 10.7z" />
      <path fill="#4CAF50" d="M24 44c5.5 0 10.4-1.9 14.2-5l-6.6-5.5c-2 1.4-4.6 2.5-7.6 2.5-5.3 0-9.7-3.4-11.3-8.1l-6.6 5.1C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.6 5.5C41.5 36.2 44 30.6 44 24c0-1.2-.1-2.4-.4-3.5z" />
    </svg>
  );
}

export function GoogleLoginModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { login } = useAuth();
  const dialogRef = useDialogA11y<HTMLDivElement>(open, onClose);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Masuk ke Depup"
        tabIndex={-1}
        className="obs-overlay w-full max-w-sm rounded-2xl p-6 text-white outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center justify-between">
          <h3 className="f-display text-[18px] font-semibold tracking-tight">Masuk ke Depup</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="grid h-8 w-8 place-items-center rounded-lg text-obs-mute transition-colors hover:bg-white/10 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <p className="mb-6 text-[13px] text-obs-sec">untuk melanjutkan ke dashboard Depup</p>

        <button
          type="button"
          onClick={login}
          className="flex w-full items-center justify-center gap-3 rounded-lg bg-white px-4 py-3 text-[14px] font-semibold text-black transition hover:bg-white/90 active:scale-[0.99]"
        >
          <GoogleMark size={18} />
          <span>Lanjutkan dengan Google</span>
        </button>

        <p className="mt-5 text-center text-[12px] leading-relaxed text-obs-mute">
          Kamu akan diarahkan ke halaman login Google asli, lalu kembali otomatis ke dashboard.
        </p>
      </div>
    </div>
  );
}
