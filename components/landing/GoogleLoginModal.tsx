"use client";

import * as React from "react";
import { X } from "lucide-react";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { useAuth } from "@/lib/auth-context";

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true" className="shrink-0">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6 29.6 4 24 4c-7.7 0-14.4 4.4-17.7 10.7z" />
      <path fill="#4CAF50" d="M24 44c5.5 0 10.4-1.9 14.2-5l-6.6-5.5c-2 1.4-4.6 2.5-7.6 2.5-5.3 0-9.7-3.4-11.3-8.1l-6.6 5.1C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.6 5.5C41.5 36.2 44 30.6 44 24c0-1.2-.1-2.4-.4-3.5z" />
    </svg>
  );
}

export function GoogleLoginModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { login } = useAuth();

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 dark:bg-black/70 backdrop-blur-md px-4 transition-all animate-in fade-in duration-200"
      onClick={onClose}
    >
      <GlassPanel 
        className="w-full max-w-sm p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/90 text-slate-900 dark:text-slate-100 shadow-xl dark:shadow-2xl transition-colors duration-200" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Masuk ke Depush
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="grid h-8 w-8 place-items-center rounded-full text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
          untuk melanjutkan ke dashboard Depush
        </p>

        {/* Google Login Button */}
        <button
          type="button"
          onClick={login}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/90 px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 active:scale-[0.99] transition-all shadow-sm"
        >
          <GoogleMark />
          <span>Lanjutkan dengan Google</span>
        </button>

        {/* Footer info */}
        <p className="mt-5 text-[11px] leading-relaxed text-slate-400 dark:text-slate-500 text-center">
          Kamu akan diarahkan ke halaman login Google asli, lalu kembali otomatis ke dashboard.
        </p>
      </GlassPanel>
    </div>
  );
}