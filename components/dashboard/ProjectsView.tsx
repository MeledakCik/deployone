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
import type { CloudflareProjectSummary, HistoryItem, Platform, VercelProjectSummary } from "@/types";

function groupByProject(history: HistoryItem[]) {
  const safeHistory = Array.isArray(history) ? history : [];
  // Key by name+platform, not name alone — the same project name can
  // legitimately exist on more than one platform (e.g. deployed to Vercel
  // once, then again to Railway under the same name), and each should show
  // up as its own card rather than one hiding the other.
  const map = new Map<string, HistoryItem>();
  for (const item of safeHistory) {
    const key = `${item.name}::${item.platform}`;
    if (!map.has(key)) map.set(key, item);
  }
  return Array.from(map.values());
}

/** Confirms whether a project delete should also hit the real Vercel/Cloudflare project, or stay local-only. */
function DeleteProjectModal({
  project,
  onClose,
}: {
  project: HistoryItem | null;
  onClose: () => void;
}) {
  const { deleteProject, deletingProject, vercelToken, savedCloudflareToken, savedRailwayToken } = useDeploy();
  if (!project) return null;

  const isVercelProject = project.platform === "vercel";
  const isCloudflareProject = project.platform === "cloudflare";
  const isRailwayProject = project.platform === "railway";
  const busy = deletingProject === project.name;

  async function handleChoice(alsoDelete: boolean) {
    await deleteProject(project!.name, project!.platform, {
      alsoDeleteFromVercel: alsoDelete && isVercelProject,
      alsoDeleteFromCloudflare: alsoDelete && isCloudflareProject,
      alsoDeleteFromRailway: alsoDelete && isRailwayProject,
    });
    onClose();
  }

  const platformLabel = isVercelProject ? "Vercel" : isCloudflareProject ? "Cloudflare" : isRailwayProject ? "Railway" : null;
  const canDeleteRemote = isVercelProject
    ? Boolean(vercelToken)
    : isCloudflareProject
      ? Boolean(savedCloudflareToken)
      : isRailwayProject
        ? Boolean(savedRailwayToken)
        : false;

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
          {platformLabel
            ? `Pilih mau dihapus di kedua sisi (${platformLabel} + Depup) atau di Depup saja — project di ${platformLabel} tetap jalan kalau kamu pilih Depup saja.`
            : "Project ini bukan platform Vercel/Cloudflare/Railway, jadi hanya akan dihapus dari daftar Depup."}
        </p>
        <div className="space-y-2">
          {platformLabel && (
            <button
              type="button"
              onClick={() => void handleChoice(true)}
              disabled={busy || !canDeleteRemote}
              className="btn-primary w-full py-2.5 text-[13px] disabled:opacity-50"
            >
              {busy ? "Menghapus..." : `Hapus di kedua sisi (${platformLabel} + Depup)`}
            </button>
          )}
          {platformLabel && !canDeleteRemote && (
            <p className="text-[11px] text-text-faint text-center">
              Konek-kan {platformLabel} Token di Settings dulu untuk hapus di {platformLabel}.
            </p>
          )}
          <button
            type="button"
            onClick={() => void handleChoice(false)}
            disabled={busy}
            className="pill w-full py-2.5 text-[13px] font-medium hover:brightness-110 disabled:opacity-50"
          >
            {platformLabel ? "Hapus di Depup saja" : "Hapus"}
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

/** Lists real Vercel or Cloudflare projects not yet tracked in Depup, so the user can pull one in without re-deploying it. */
function ImportProjectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const {
    vercelToken,
    fetchImportableVercelProjects,
    importVercelProject,
    savedCloudflareToken,
    fetchImportableCloudflareProjects,
    importCloudflareProject,
  } = useDeploy();
  const [tab, setTab] = React.useState<"vercel" | "cloudflare">("vercel");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [candidates, setCandidates] = React.useState<(VercelProjectSummary | CloudflareProjectSummary)[]>([]);
  const [importingName, setImportingName] = React.useState<string | null>(null);

  const connected = tab === "vercel" ? Boolean(vercelToken) : Boolean(savedCloudflareToken);

  React.useEffect(() => {
    if (!open) return;
    if (!connected) {
      setError(
        tab === "vercel"
          ? "Isi Vercel Token di Settings dulu untuk konek ke Vercel."
          : "Konek-kan Cloudflare Token di Settings dulu untuk konek ke Cloudflare."
      );
      setCandidates([]);
      return;
    }
    setLoading(true);
    setError(null);
    const fetcher = tab === "vercel" ? fetchImportableVercelProjects : fetchImportableCloudflareProjects;
    fetcher()
      .then((result) => setCandidates(result))
      .catch((err) => setError(err instanceof Error ? err.message : "Gagal konek."))
      .finally(() => setLoading(false));
  }, [open, tab, connected, fetchImportableVercelProjects, fetchImportableCloudflareProjects]);

  if (!open) return null;

  function handleImport(project: VercelProjectSummary | CloudflareProjectSummary) {
    setImportingName(project.name);
    if (tab === "vercel") importVercelProject(project as VercelProjectSummary);
    else importCloudflareProject(project as CloudflareProjectSummary);
    setCandidates((prev) => prev.filter((p) => p.name !== project.name));
    setImportingName(null);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4">
      <Surface className="w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[15px] font-semibold">Import Project</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="grid h-8 w-8 place-items-center rounded-full hover:bg-[var(--row-hover)]"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mb-4 flex gap-2">
          {(["vercel", "cloudflare"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-xl border px-3.5 py-1.5 text-[12.5px] font-medium capitalize transition-colors ${
                tab === t
                  ? "border-violet-500/50 bg-violet-500/15 text-text"
                  : "border-[var(--surface-line)] bg-[var(--surface-solid-2)] text-text-muted hover:text-text"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {!connected ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <ShieldAlert size={36} className="text-amber-400" />
            <p className="text-[13px] text-text-muted max-w-xs">{error}</p>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <RefreshCw size={24} className="animate-spin text-text-faint" />
            <p className="text-[13px] text-text-muted">Menghubungkan ke {tab === "vercel" ? "Vercel" : "Cloudflare"}...</p>
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
              Semua project di {tab === "vercel" ? "Vercel" : "Cloudflare"} kamu sudah ada di Depup — tidak ada yang
              bisa diimport.
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
  const {
    history,
    redeploy,
    vercelToken,
    savedCloudflareToken,
    savedRailwayToken,
    syncingProjects,
    syncAllProjects,
    syncProjectStatus,
    setView,
    setFocusedTrafficProject,
  } = useDeploy();
  const safeHistory = Array.isArray(history) ? history : [];
  const [platformTab, setPlatformTab] = React.useState<"all" | Platform>("all");
  const projects = groupByProject(safeHistory).filter((p) => platformTab === "all" || p.platform === platformTab);
  const [checkingKey, setCheckingKey] = React.useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<HistoryItem | null>(null);
  const [importOpen, setImportOpen] = React.useState(false);
  const didAutoSync = React.useRef(false);

  function viewTraffic(name: string) {
    setFocusedTrafficProject(name);
    setView("observability");
  }

  React.useEffect(() => {
    if (didAutoSync.current || (!vercelToken && !savedCloudflareToken && !savedRailwayToken)) return;
    didAutoSync.current = true;
    void syncAllProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vercelToken, savedCloudflareToken, savedRailwayToken]);

  async function handleCheck(name: string, platform: Platform) {
    const key = `${name}::${platform}`;
    setCheckingKey(key);
    await syncProjectStatus(name, platform);
    setCheckingKey(null);
  }

  return (
    <ViewFade>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Projects</h2>
            <p className="text-sm text-text-muted">
              {projects.length} project {platformTab !== "all" ? `(${platformTab}) ` : ""}unik dari riwayat deployment kamu.
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
            {(vercelToken || savedCloudflareToken || savedRailwayToken) ? (
              <button
                type="button"
                onClick={() => void syncAllProjects()}
                disabled={syncingProjects}
                className="pill inline-flex items-center gap-2 px-4 py-2 text-sm font-medium hover:brightness-110 disabled:opacity-50"
              >
                <RefreshCw size={13} className={syncingProjects ? "animate-spin" : ""} />
                {syncingProjects ? "Sinkronisasi..." : "Sinkronkan"}
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[11.5px] text-text-faint">
                <ShieldAlert size={13} /> Konek-kan token di Settings untuk sinkronisasi otomatis
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {(["all", "vercel", "cloudflare", "railway", "render"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setPlatformTab(t)}
              className={`rounded-xl border px-3.5 py-1.5 text-[12.5px] font-medium capitalize transition-colors ${
                platformTab === t
                  ? "border-violet-500/50 bg-violet-500/15 text-text"
                  : "border-[var(--surface-line)] bg-[var(--surface-solid-2)] text-text-muted hover:text-text"
              }`}
            >
              {t === "all" ? "Semua" : t}
            </button>
          ))}
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
              const isChecking = checkingKey === `${project.name}::${project.platform}`;
              return (
                <Surface key={`${project.name}::${project.platform}`} className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate text-base light:text-black dark:text-white font-semibold">{project.name}</h3>
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
                        onClick={() => void handleCheck(project.name, project.platform)}
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

                  {project.platform === "cloudflare" && savedCloudflareToken && (
                    <div className="mt-2 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => void handleCheck(project.name, project.platform)}
                        disabled={isChecking}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-faint hover:text-text disabled:opacity-50"
                      >
                        <RefreshCw size={11} className={isChecking ? "animate-spin" : ""} />
                        {isChecking ? "Mengecek..." : "Cek status di Cloudflare"}
                      </button>
                    </div>
                  )}

                  {project.platform === "railway" && savedRailwayToken && (
                    <div className="mt-2 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => void handleCheck(project.name, project.platform)}
                        disabled={isChecking}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-faint hover:text-text disabled:opacity-50"
                      >
                        <RefreshCw size={11} className={isChecking ? "animate-spin" : ""} />
                        {isChecking ? "Mengecek..." : "Cek status di Railway"}
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