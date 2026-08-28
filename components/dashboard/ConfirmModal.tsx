"use client";

import { AlertTriangle } from "lucide-react";
import { Surface } from "@/components/ui/Surface";
import { useDeploy } from "@/lib/deploy-context";

export function ConfirmModal() {
  const { confirmOpen, closeConfirm, proceedDeploy } = useDeploy();

  if (!confirmOpen) return null;

  return (
    <div id="confirmModal" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4">
      <Surface className="w-full max-w-sm p-6">
        <span className="stat-icon text-amber-400 mb-4">
          <AlertTriangle size={18} />
        </span>
        <h3 className="text-[15px] font-semibold mb-2">Riwayat sudah penuh</h3>
        <p className="text-[13px] leading-relaxed text-text-muted mb-6">
          Menyimpan maksimal 10 riwayat deploy — history terlama akan otomatis terhapus untuk
          menyimpan project baru ini. Lanjutkan?
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={closeConfirm}
            className="pill px-4 py-2 text-[13px] font-medium hover:bg-[var(--card-hover)]"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={proceedDeploy}
            className="btn-primary px-5 py-2.5 text-[13px]"
          >
            Lanjutkan
          </button>
        </div>
      </Surface>
    </div>
  );
}
