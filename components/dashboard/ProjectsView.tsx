"use client";

import * as React from "react";
import {
  FolderOpen,
  ExternalLink,
  RotateCw,
  Globe2,
  RefreshCw,
  ShieldAlert,
  BarChart3,
  Trash2,
  X,
  Download,
  AlertTriangle,
} from "lucide-react";
import { Surface } from "@/components/ui/Surface";
import { ViewFade } from "@/components/ui/ViewFade";
import { useDeploy } from "@/lib/deploy-context";
import type { HistoryItem, VercelProjectSummary } from "@/types";

function groupByProject(history: HistoryItem[]) {
  const safeHistory = Array.isArray(history) ? history : [];
  const map = new Map<string, HistoryItem>();
  for (const item of safeHistory) {
    if (!map.has(item.name)) map.set(item.name, item);
  }
  return Array.from(map.values());
}

/** Confirms whether a project delete should also hit the real Vercel project, or stay local-only. */
function DeleteProjectModal({
  project,
  onClose,
}: {
  project: HistoryItem | null;
  onClose: () => void;
}) {
  const { deleteProject, deletingProject, vercelToken } = useDeploy();
  if (!project) return null;

  const isVercelProject = project.platform === "vercel";
  const busy = deletingProject === project.name;

  async function handleChoice(alsoDeleteFromVercel: boolean) {
    await deleteProject(project!.name, { alsoDeleteFromVercel });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4">
      <Surface className="w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="stat-icon text-red-400">
            <AlertTriangle size={18} />
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="grid h-8 w-8 place-items-center rounded-full hover:bg-[var(--row-hover)]"
          >
            <X size={16} />
          </button>
        </div>
        <h3 className="text-[15px] font-semibold mb-2">Hapus &quot;{project.name}&quot;?</h3>
        <p className="text-[13px] leading-relaxed text-text-muted mb-6">
          {isVercelProject
            ? "Pilih mau dihapus di kedua sisi (Vercel + Depush) atau di Depush saja — project di Vercel tetap jalan kalau kamu pilih Depush saja."
            : "Project ini bukan platform Vercel, jadi hanya akan dihapus dari daftar Depush."}
        </p>
        <div className="space-y-2">
          {isVercelProject && (
            <button
              type="button"
              onClick={() => void handleChoice(true)}
              disabled={busy || !vercelToken}
              className="btn-primary w-full py-2.5 text-[13px] disabled:opacity-50"
            >
              {busy ? "Menghapus..." : "Hapus di kedua sisi (Vercel + Depush)"}
            </button>
          )}
          {isVercelProject && !vercelToken && (
            <p className="text-[11px] text-text-faint text-center">
              Isi Vercel Token di Settings dulu untuk hapus di Vercel.
            </p>
          )}
          <button
            type="button"
            onClick={() => void handleChoice(false)}
            disabled={busy}
            className="pill w-full py-2.5 text-[13px] font-medium hover:brightness-110 disabled:opacity-50"
          >
            {isVercelProject ? "Hapus di Depush saja" : "Hapus"}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="w-full py-2 text-[12.5px] font-medium text-text-faint hover:text-text disabled:opacity-50"
          >
            Batal
          </button>
        </div>
      </Surface>
    </div>
  );
}

/** Lists real Vercel projects not yet tracked in Depush, so the user can pull one in without re-deploying it. */
function ImportProjectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { vercelToken, fetchImportableVercelProjects, importVercelProject } = useDeploy();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [candidates, setCandidates] = React.useState<VercelProjectSummary[]>([]);
  const [importingName, setImportingName] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    if (!vercelToken) {
      setError("Isi Vercel Token di Settings dulu untuk konek ke Vercel.");
      setCandidates([]);
      return;
    }
    setLoading(true);
    setError(null);
    fetchImportableVercelProjects()
      .then((result) => setCandidates(result))
      .catch((err) => setError(err instanceof Error ? err.message : "Gagal konek ke Vercel."))
      .finally(() => setLoading(false));
  }, [open, vercelToken, fetchImportableVercelProjects]);

  if (!open) return null;

  function handleImport(project: VercelProjectSummary) {
    setImportingName(project.name);
    importVercelProject(project);
    setCandidates((prev) => prev.filter((p) => p.name !== project.name));
    setImportingName(null);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4">
      <Surface className="w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[15px] font-semibold">Import Project dari Vercel</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="grid h-8 w-8 place-items-center rounded-full hover:bg-[var(--row-hover)]"
          >
            <X size={16} />
          </button>
        </div>

        {!vercelToken ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <ShieldAlert size={36} className="text-amber-400" />
            <p className="text-[13px] text-text-muted max-w-xs">
              Belum konek ke Vercel — isi Vercel Token di Settings dulu, baru bisa import project yang
              sudah ada di sana.
            </p>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <RefreshCw size={24} className="animate-spin text-text-faint" />
            <p className="text-[13px] text-text-muted">Menghubungkan ke Vercel...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <ShieldAlert size={36} className="text-red-400" />
            <p className="text-[13px] text-text-muted max-w-xs">{error}</p>
          </div>
        ) : candidates.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <FolderOpen size={36} className="text-text-faint" />
            <p className="text-[13px] text-text-muted max-w-xs">
              Semua project di Vercel kamu sudah ada di Depush — tidak ada yang bisa diimport.
            </p>
          </div>
        ) : (
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {candidates.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--surface-line)] px-3.5 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium">{p.name}</p>
                  <p className="mono truncate text-[11.5px] text-text-faint">{p.domain}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleImport(p)}
                  disabled={importingName === p.name}
                  className="pill shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-[11.5px] font-medium hover:brightness-110 disabled:opacity-50"
                >
                  <Download size={12} /> Import
                </button>
              </div>
            ))}
          </div>
        )}
      </Surface>
    </div>
  );
}

export function ProjectsView() {
  const { history, redeploy, vercelToken, syncingProjects, syncAllProjects, syncProjectStatus, setView, setFocusedTrafficProject } =
    useDeploy();
  const safeHistory = Array.isArray(history) ? history : [];
  const projects = groupByProject(safeHistory);
  const [checkingName, setCheckingName] = React.useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<HistoryItem | null>(null);
  const [importOpen, setImportOpen] = React.useState(false);
  const didAutoSync = React.useRef(false);

  function viewTraffic(name: string) {
    setFocusedTrafficProject(name);
    setView("observability");
  }

  React.useEffect(() => {
    if (didAutoSync.current || !vercelToken) return;
    didAutoSync.current = true;
    void syncAllProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vercelToken]);

  async function handleCheck(name: string) {
    setCheckingName(name);
    await syncProjectStatus(name);
    setCheckingName(null);
  }

  return (
    <ViewFade>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Projects</h2>
            <p className="text-sm text-text-muted">
              {projects.length} project unik dari riwayat deployment kamu.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setImportOpen(true)}
              className="pill inline-flex items-center gap-2 px-4 py-2 text-sm font-medium hover:brightness-110"
            >
              <Download size={13} /> Import Project
            </button>
            {vercelToken ? (
              <button
                type="button"
                onClick={() => void syncAllProjects()}
                disabled={syncingProjects}
                className="pill inline-flex items-center gap-2 px-4 py-2 text-sm font-medium hover:brightness-110 disabled:opacity-50"
              >
                <RefreshCw size={13} className={syncingProjects ? "animate-spin" : ""} />
                {syncingProjects ? "Sinkronisasi..." : "Sinkronkan dengan Vercel"}
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[11.5px] text-text-faint">
                <ShieldAlert size={13} /> Isi Vercel Token di Settings untuk sinkronisasi otomatis
              </span>
            )}
          </div>
        </div>

        {projects.length === 0 ? (
          <Surface className="flex flex-col items-center justify-center gap-3 px-6 py-24 text-center">
            <FolderOpen size={52} className="text-text-faint" strokeWidth={1.5} />
            <h3 className="text-lg font-semibold">Manajemen Proyek</h3>
            <p className="max-w-xs text-sm text-text-muted">
              Belum ada project. Deploy project pertamamu untuk melihatnya di sini.
            </p>
          </Surface>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(Array.isArray(projects) ? projects : []).map((project) => {
              const isReady = project.status === "ready";
              const isChecking = checkingName === project.name;
              return (
                <Surface key={project.name} className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-semibold">{project.name}</h3>
                      <p className="mono text-xs text-text-faint capitalize mt-0.5">
                        {project.platform} • {project.date}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-0.5 text-xs font-medium ${isReady
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                          : "border-red-500/20 bg-red-500/10 text-red-400"
                        }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${isReady ? "bg-emerald-400" : "bg-red-400"}`} />
                      {isReady ? "Ready" : "Failed"}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center gap-1.5 text-sm text-text-muted">
                    <Globe2 size={13} className="shrink-0" />
                    <span className="mono truncate">{project.domain}</span>
                  </div>

                  <div className="mt-5 flex items-center gap-2">
                    <a
                      href={`https://${project.domain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="pill flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium hover:brightness-110"
                    >
                      <ExternalLink size={13} /> Visit
                    </a>
                    <button
                      type="button"
                      onClick={() => redeploy(project.name)}
                      className="pill flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium hover:brightness-110"
                    >
                      <RotateCw size={13} /> Redeploy
                    </button>
                  </div>

                  {project.platform === "vercel" && vercelToken && (
                    <div className="mt-2 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => void handleCheck(project.name)}
                        disabled={isChecking}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-faint hover:text-text disabled:opacity-50"
                      >
                        <RefreshCw size={11} className={isChecking ? "animate-spin" : ""} />
                        {isChecking ? "Mengecek..." : "Cek status di Vercel"}
                      </button>
                      <button
                        type="button"
                        onClick={() => viewTraffic(project.name)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-faint hover:text-text"
                      >
                        <BarChart3 size={13} /> View Traffic
                      </button>
                    </div>
                  )}

                  <div className="mt-1">
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(project)}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-400 hover:brightness-110"
                    >
                      <Trash2 size={12} /> Hapus Project
                    </button>
                  </div>
                </Surface>
              );
            })}
          </div>
        )}
      </div>

      <DeleteProjectModal project={deleteTarget} onClose={() => setDeleteTarget(null)} />
      <ImportProjectModal open={importOpen} onClose={() => setImportOpen(false)} />
    </ViewFade>
  );
}