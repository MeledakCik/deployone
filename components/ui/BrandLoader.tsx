"use client";

import { BrandMark } from "@/components/ui/AppSidebar";

/**
 * Loading layar penuh Depup: ikon brand di kotak ungu (sama seperti sidebar) dengan cincin berputar.
 * Dipakai di semua tahap saat refresh (route loading, AuthGuard, dashboard) dengan posisi dan
 * teks yang sama, supaya tidak berkedip atau berganti tampilan di tengah jalan.
 */
export function BrandLoader({ label = "Memuat…" }: { label?: string }) {
  return (
    <div className="app-canvas flex min-h-[100dvh] items-center justify-center" role="status" aria-live="polite">
      <div className="brand-loader">
        <div className="brand-loader-tile">
          <span className="brand-loader-ring" aria-hidden />
          <BrandMark size={40} className="h-10 w-10 rounded-xl" />
        </div>
        <div className="flex flex-col items-center gap-3">
          <div className="brand-loader-bar" aria-hidden />
          <p className="text-[13px] font-medium text-text-muted">{label}</p>
        </div>
      </div>
    </div>
  );
}
