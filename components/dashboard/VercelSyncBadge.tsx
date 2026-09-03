"use client";

import { Loader2, RefreshCw, AlertTriangle, ShieldCheck, Trash2 } from "lucide-react";
import { useDeploy } from "@/lib/deploy-context";
import type { SyncStatus } from "@/types";

/**
 * Shown next to Vercel-platform projects/history rows. Lets the user
 * actively ask Vercel "is this project still there?" — since nothing here
 * gets removed automatically just because it was deleted on vercel.com.
 */
export function VercelSyncBadge({ projectName }: { projectName: string }) {
  const { settingsTokens, projectSync, checkProjectStatus, removeHistoryItem, setView } = useDeploy();
  const status: SyncStatus = projectSync[projectName] ?? "idle";
  const hasToken = Boolean(settingsTokens.vercelToken);

  if (!hasToken) {
    return (
      <button
        type="button"
        onClick={() => setView("settings")}
        className="pill inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-text-muted hover:text-text hover:brightness-110"
        title="Isi Vercel Token di Settings dulu untuk pakai fitur ini"
      >
        <RefreshCw size={11} /> Isi token dulu
      </button>
    );
  }

  if (status === "checking") {
    return (
      <span className="pill inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-text-muted">
        <Loader2 size={11} className="animate-spin" /> Mengecek…
      </span>
    );
  }

  if (status === "deleted") {
    return (
      <div className="flex items-center gap-1.5">
        <span className="inline-flex items-center gap-1.5 rounded-pill border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-[11px] font-medium text-red-400">
          <AlertTriangle size={11} /> Dihapus di Vercel
        </span>
        <button
          type="button"
          onClick={() => removeHistoryItem(projectName)}
          className="pill inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-red-400 hover:brightness-110"
        >
          <Trash2 size={11} /> Hapus dari daftar
        </button>
      </div>
    );
  }

  if (status === "exists") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-pill border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-400">
        <ShieldCheck size={11} /> Ada di Vercel
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void checkProjectStatus(projectName, settingsTokens.vercelToken)}
      className="pill inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium hover:brightness-110"
    >
      <RefreshCw size={11} /> Cek Status
    </button>
  );
}
