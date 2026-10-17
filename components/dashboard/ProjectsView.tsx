"use client";

import { PageTitle } from "@/components/ui/primitives";
import * as React from "react";
import { FolderOpen, ExternalLink, RotateCw, Globe2, RefreshCw, ShieldAlert, Trash2, X, Download, AlertTriangle } from "@/components/ui/icons";
import { Surface } from "@/components/ui/Surface";
import { ViewFade } from "@/components/ui/ViewFade";
import { useDeploy } from "@/lib/deploy-context";
import { deployDomainToUrl, normalizeDeployDomain } from "@/lib/utils";
import type { CloudflareProjectSummary, HistoryItem, Platform, RailwayProjectSummary, VercelProjectSummary } from "@/types";

const BULAN: Record<string, string> = {
  jan: "Januari", feb: "Februari", mar: "Maret", apr: "April", may: "Mei", jun: "Juni",
  jul: "Juli", aug: "Agustus", sep: "September", sept: "September", oct: "Oktober", nov: "November", dec: "Desember",
};

/** "13 Oct 2026" → "13 Oktober 2026" (nama bulan lain dibiarkan apa adanya). */
function tanggalIndonesia(date: string) {
  return date.replace(/[A-Za-z]+/g, (w) => BULAN[w.toLowerCase().slice(0, w.toLowerCase().startsWith("sept") ? 4 : 3)] ?? w);
}

function groupByProject(history: HistoryItem[]) {
  const safeHistory = Array.isArray(history) ? history : [];
  // Key by name+platform, not name alone — the same project name can
  // legitimately exist on more than one platform (e.g. deployed to Vercel
  // once, then again to Railway under the same name), and each should show
  // up as its own card rather than one hiding the other.
  //
  // Entries marked "deleted" are excluded here — this view is "currently
  // live projects", not the full deploy log — but they're never removed
  // from `history` itself, so the Dashboard's "Riwayat Deploy" table still
  // shows them as a permanent record.
  const map = new Map<string, HistoryItem>();
  for (const item of safeHistory) {
    if (item.status === "deleted") continue;
    const key = `${item.name}::${item.platform}`;
    if (!map.has(key)) map.set(key, { ...item, domain: normalizeDeployDomain(item.domain, item.platform) });
  }
  return Array.from(map.values());
}

/** Saklar on/off yang aksesibel (role="switch"). */
function DeleteSwitch({
  id,
  title,
  description,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  title: string;
  description: React.ReactNode;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <label htmlFor={id} className={`block text-[13px] font-medium ${disabled ? "opacity-50" : "cursor-pointer"}`}>
          {title}
        </label>
        <p className="mt-0.5 text-[12px] leading-relaxed text-text-muted">{description}</p>
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
          checked ? "bg-bad" : "bg-[var(--line-strong)]"
        }`}
      >
        <span
          className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow transition-transform duration-300 [transition-timing-function:var(--ease-soft)] ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

/**
 * Dialog hapus project. Default-nya hanya menghapus dari Depup; user bisa
 * menyalakan saklar untuk ikut menghapus project di platformnya (Vercel /
 * Cloudflare / Railway) dan/atau repo GitHub-nya.
 */
function DeleteProjectModal({
  project,
  onClose,
}: {
  project: HistoryItem | null;
  onClose: () => void;
}) {
  const { deleteProject, deletingProject, vercelToken, savedCloudflareToken, savedRailwayToken, githubPat, setView } =
    useDeploy();
  const [deleteRemote, setDeleteRemote] = React.useState(false);
  const [deleteGithub, setDeleteGithub] = React.useState(false);
  const [repoInput, setRepoInput] = React.useState("");
  const [repoLookup, setRepoLookup] = React.useState<"idle" | "loading" | "found" | "notfound">("idle");

  const projectKey = project ? `${project.name}::${project.platform}` : null;
  const isVercelProject = project?.platform === "vercel";

  // Selalu mulai dari default (Depup saja) setiap dialog dibuka untuk project lain.
  React.useEffect(() => {
    setDeleteRemote(false);
    setDeleteGithub(false);
    setRepoInput("");
    setRepoLookup("idle");
  }, [projectKey]);

  // Repo GitHub diisi otomatis begitu dialog dibuka: pertama dari riwayat
  // (disimpan saat deploy), kalau tidak ada dibaca dari link project di
  // platformnya (Vercel / Cloudflare / Railway). User tetap bisa mengubahnya manual.
  React.useEffect(() => {
    if (!project) return;
    if (project.repo) {
      setRepoInput(project.repo);
      setRepoLookup("found");
      return;
    }
    let url: string | null = null;
    const headers: Record<string, string> = {};
    if (project.platform === "vercel" && vercelToken) {
      url = `/api/vercel/status?project=${encodeURIComponent(project.name)}`;
      headers["x-vercel-token"] = vercelToken;
    } else if (project.platform === "cloudflare" && savedCloudflareToken) {
      url = `/api/cloudflare/status?project=${encodeURIComponent(project.name)}&accountId=${encodeURIComponent(
        savedCloudflareToken.accountId,
      )}`;
      headers["x-cloudflare-token"] = savedCloudflareToken.token;
    } else if (project.platform === "railway" && savedRailwayToken) {
      url = `/api/railway/status?project=${encodeURIComponent(project.name)}`;
      headers["x-railway-token"] = savedRailwayToken.token;
    }
    if (!url) {
      setRepoLookup("notfound");
      return;
    }
    let cancelled = false;
    setRepoLookup("loading");
    fetch(url, { headers })
      .then((res) => res.json().catch(() => null))
      .then((body) => {
        if (cancelled) return;
        const repo: string | null = body?.ok ? body.data?.linkedRepoFullName ?? null : null;
        if (repo) {
          setRepoInput(repo);
          setRepoLookup("found");
        } else {
          setRepoLookup("notfound");
        }
      })
      .catch(() => {
        if (!cancelled) setRepoLookup("notfound");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectKey]);

  if (!project) return null;

  const isCloudflareProject = project.platform === "cloudflare";
  const isRailwayProject = project.platform === "railway";
  const busy = deletingProject === project.name;

  const platformLabel = isVercelProject ? "Vercel" : isCloudflareProject ? "Cloudflare" : isRailwayProject ? "Railway" : null;
  const canDeleteRemote = isVercelProject
    ? Boolean(vercelToken)
    : isCloudflareProject
      ? Boolean(savedCloudflareToken)
      : isRailwayProject
        ? Boolean(savedRailwayToken)
        : false;
  const canDeleteGithub = Boolean(githubPat);

  const repoValid = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repoInput.trim());
  const githubReady = !deleteGithub || (canDeleteGithub && repoValid);
  const remoteActive = deleteRemote && Boolean(platformLabel) && canDeleteRemote;
  const destructive = remoteActive || deleteGithub;

  async function handleDelete() {
    await deleteProject(project!.name, project!.platform, {
      alsoDeleteFromVercel: remoteActive && isVercelProject,
      alsoDeleteFromCloudflare: remoteActive && isCloudflareProject,
      alsoDeleteFromRailway: remoteActive && isRailwayProject,
      alsoDeleteGithubRepo: deleteGithub && repoValid ? repoInput.trim() : undefined,
    });
    onClose();
  }

  const targets = ["Depup", ...(remoteActive && platformLabel ? [platformLabel] : []), ...(deleteGithub ? ["GitHub"] : [])];
  const buttonLabel = busy
    ? "Menghapus..."
    : destructive
      ? `Hapus permanen (${targets.join(" + ")})`
      : platformLabel
        ? "Hapus di Depup saja"
        : "Hapus";

  return (
    <div className="anim-fade fixed inset-0 z-[100] flex items-center justify-center modal-scrim px-4">
      <Surface className="anim-pop w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="stat-icon text-bad-fg">
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
        <p className="text-[13px] leading-relaxed text-text-muted mb-5">
          Secara default, project hanya dihapus dari daftar Depup. Project di platform dan repo GitHub kamu tidak
          disentuh. Nyalakan saklar di bawah kalau ingin ikut menghapusnya.
        </p>

        <div className="mb-5 space-y-4 rounded-2xl bg-[var(--surface-solid-2)] p-4">
          <DeleteSwitch
            id="deleteAlsoDepup"
            title="Hapus di Depup"
            description="Selalu aktif — project dilepas dari daftar Depup."
            checked
            disabled
            onChange={() => {}}
          />

          {platformLabel && (
            <DeleteSwitch
              id="deleteAlsoRemote"
              title={`Hapus juga di ${platformLabel}`}
              description={
                canDeleteRemote
                  ? `Project di ${platformLabel} dihapus permanen beserta deployment-nya.`
                  : `Hubungkan ${platformLabel} Token di Settings dulu untuk menghapus di ${platformLabel}.`
              }
              checked={deleteRemote}
              disabled={busy || !canDeleteRemote}
              onChange={setDeleteRemote}
            />
          )}

          <DeleteSwitch
            id="deleteAlsoGithub"
            title="Hapus juga repo GitHub"
            description={
              canDeleteGithub
                ? "Repo di GitHub dihapus permanen. Token harus memiliki izin delete_repo (lihat Docs)."
                : "Isi GitHub PAT di Settings dulu untuk menghapus repo di GitHub."
            }
            checked={deleteGithub}
            disabled={busy || !canDeleteGithub}
            onChange={setDeleteGithub}
          />

          {deleteGithub && canDeleteGithub && (
            <div>
              <label htmlFor="deleteGithubRepo" className="mb-1 block text-[12px] font-medium text-text-muted">
                Repo yang akan dihapus
              </label>
              <input
                id="deleteGithubRepo"
                value={repoInput}
                onChange={(e) => setRepoInput(e.target.value)}
                disabled={busy}
                placeholder="nama-akun/nama-repo"
                spellCheck={false}
                autoComplete="off"
                className="mono w-full rounded-xl bg-[var(--surface-solid-2)] px-3 py-2 text-[12.5px] outline-none focus:shadow-[inset_0_0_0_2px_var(--bad-line)]"
              />
              <p className="mt-1 text-[12px] text-text-faint">
                {repoLookup === "loading"
                  ? "Mencari repo yang terhubung…"
                  : repoLookup === "found"
                    ? "Terisi otomatis dari project ini — pastikan sudah benar."
                    : repoInput && !repoValid
                      ? "Format harus nama-akun/nama-repo."
                      : "Isi manual dengan format nama-akun/nama-repo."}
              </p>
            </div>
          )}
        </div>

        {deleteGithub && canDeleteGithub && (
          <div className="mb-4 rounded-xl bg-[var(--warn-bg)] px-3 py-2.5 text-[12px] leading-relaxed text-warn-fg">
            <p className="flex items-start gap-2 font-medium">
              <ShieldAlert size={14} className="mt-0.5 shrink-0" />
              Pastikan GitHub Token kamu boleh menghapus repo.
            </p>
            <p className="mt-1 pl-[22px] text-warn-fg">
              Token classic harus memiliki scope <span className="mono">delete_repo</span>; token fine-grained harus memiliki{" "}
              <span className="mono">Administration: Read and write</span>. Kalau tidak, project di platform tetap
              terhapus tetapi repo GitHub gagal dihapus.{" "}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  setView("docs");
                }}
                className="underline underline-offset-2 hover:opacity-80"
              >
                Lihat panduan di Docs
              </button>
            </p>
          </div>
        )}

        {destructive && (
          <p className="mb-4 flex items-start gap-2 rounded-xl bg-[var(--bad-bg)] px-3 py-2 text-[12px] leading-relaxed text-bad-fg">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            Penghapusan di {targets.slice(1).join(" dan ")} tidak bisa dibatalkan.
          </p>
        )}

        <div className="space-y-2">
          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={busy || !githubReady}
            className={`w-full py-2.5 text-[13px] font-medium disabled:opacity-50 ${
              destructive ? "rounded-xl bg-bad text-white hover:brightness-110" : "pill hover:brightness-110"
            }`}
          >
            {buttonLabel}
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

/** Lists real Vercel, Cloudflare, or Railway projects not yet tracked in Depup, so the user can pull one in without re-deploying it. */
function ImportProjectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const {
    vercelToken,
    fetchImportableVercelProjects,
    importVercelProject,
    savedCloudflareToken,
    fetchImportableCloudflareProjects,
    importCloudflareProject,
    savedRailwayToken,
    fetchImportableRailwayProjects,
    importRailwayProject,
  } = useDeploy();
  const [tab, setTab] = React.useState<"railway" | "vercel" | "cloudflare">("railway");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [candidates, setCandidates] = React.useState<
    (VercelProjectSummary | CloudflareProjectSummary | RailwayProjectSummary)[]
  >([]);
  const [importingName, setImportingName] = React.useState<string | null>(null);

  const platformLabel = tab === "vercel" ? "Vercel" : tab === "cloudflare" ? "Cloudflare" : "Railway";
  const connected =
    tab === "vercel" ? Boolean(vercelToken) : tab === "cloudflare" ? Boolean(savedCloudflareToken) : Boolean(savedRailwayToken);

  React.useEffect(() => {
    if (!open) return;
    if (!connected) {
      setError(`Hubungkan ${platformLabel} Token di Settings dulu untuk terhubung ke ${platformLabel}.`);
      setCandidates([]);
      return;
    }
    setLoading(true);
    setError(null);
    const fetcher =
      tab === "vercel"
        ? fetchImportableVercelProjects
        : tab === "cloudflare"
          ? fetchImportableCloudflareProjects
          : fetchImportableRailwayProjects;
    fetcher()
      .then((result) => setCandidates(result))
      .catch((err) => setError(err instanceof Error ? err.message : "Gagal terhubung."))
      .finally(() => setLoading(false));
  }, [
    open,
    tab,
    connected,
    platformLabel,
    fetchImportableVercelProjects,
    fetchImportableCloudflareProjects,
    fetchImportableRailwayProjects,
  ]);

  if (!open) return null;

  function handleImport(project: VercelProjectSummary | CloudflareProjectSummary | RailwayProjectSummary) {
    setImportingName(project.name);
    if (tab === "vercel") importVercelProject(project as VercelProjectSummary);
    else if (tab === "cloudflare") importCloudflareProject(project as CloudflareProjectSummary);
    else importRailwayProject(project as RailwayProjectSummary);
    setCandidates((prev) => prev.filter((p) => p.name !== project.name));
    setImportingName(null);
  }

  return (
    <div className="anim-fade fixed inset-0 z-[100] flex items-center justify-center modal-scrim px-4">
      <Surface className="anim-pop w-full max-w-md p-6">
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
          {(["railway", "vercel", "cloudflare"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-xl px-3.5 py-1.5 text-[12.5px] font-medium capitalize transition-colors ${
                tab === t
                  ? "chip-on"
                  : "bg-[var(--surface-solid-2)] text-text-muted hover:text-text"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {!connected ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <ShieldAlert size={36} className="text-warn-fg" />
            <p className="text-[13px] text-text-muted max-w-xs">{error}</p>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <RefreshCw size={24} className="animate-spin text-text-faint" />
            <p className="text-[13px] text-text-muted">Menghubungkan ke {platformLabel}...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <ShieldAlert size={36} className="text-bad-fg" />
            <p className="text-[13px] text-text-muted max-w-xs">{error}</p>
          </div>
        ) : candidates.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <FolderOpen size={36} className="text-text-faint" />
            <p className="text-[13px] text-text-muted max-w-xs">
              Semua project di {platformLabel} kamu sudah ada di Depup — tidak ada yang bisa diimport.
            </p>
          </div>
        ) : (
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {candidates.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-3 rounded-2xl bg-[var(--surface-solid-2)] px-3.5 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium">{p.name}</p>
                  <p className="mono truncate text-[12px] text-text-faint">{p.domain}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleImport(p)}
                  disabled={importingName === p.name}
                  className="pill shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium hover:brightness-110 disabled:opacity-50"
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
  } = useDeploy();
  const safeHistory = Array.isArray(history) ? history : [];
  const [platformTab, setPlatformTab] = React.useState<"all" | Platform>("all");
  const projects = groupByProject(safeHistory).filter((p) => platformTab === "all" || p.platform === platformTab);
  const [checkingKey, setCheckingKey] = React.useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<HistoryItem | null>(null);
  const [importOpen, setImportOpen] = React.useState(false);
  const didAutoSync = React.useRef(false);

  React.useEffect(() => {
    if (didAutoSync.current || (!vercelToken && !savedCloudflareToken && !savedRailwayToken)) return;
    didAutoSync.current = true;
    void syncAllProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vercelToken, savedCloudflareToken, savedRailwayToken]);

  function canCheck(platform: Platform) {
    return (
      (platform === "vercel" && Boolean(vercelToken)) ||
      (platform === "cloudflare" && Boolean(savedCloudflareToken)) ||
      (platform === "railway" && Boolean(savedRailwayToken))
    );
  }

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
            <PageTitle title="Projects" desc={<>{projects.length} project {platformTab !== "all" ? `(${platformTab}) ` : ""}unik dari riwayat deployment kamu.</>} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setImportOpen(true)}
              className="pill inline-flex h-10 items-center gap-2 px-4 text-[13px] font-medium hover:brightness-110"
            >
              <Download size={13} /> Import Project
            </button>
            {(vercelToken || savedCloudflareToken || savedRailwayToken) ? (
              <button
                type="button"
                onClick={() => void syncAllProjects()}
                disabled={syncingProjects}
                className="pill inline-flex h-10 items-center gap-2 px-4 text-[13px] font-medium hover:brightness-110 disabled:opacity-50"
              >
                <RefreshCw size={13} className={syncingProjects ? "animate-spin" : ""} />
                {syncingProjects ? "Sinkronisasi..." : "Sinkronkan"}
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[12px] text-text-faint">
                <ShieldAlert size={13} /> Konek-kan token di Settings untuk sinkronisasi otomatis
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {(["all", "vercel", "cloudflare", "railway"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setPlatformTab(t)}
              className={`rounded-full px-4 py-1.5 text-[12.5px] font-medium capitalize transition-colors ${
                platformTab === t
                  ? "chip-on"
                  : "bg-[var(--surface-solid-2)] text-text-muted hover:text-text"
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
                <Surface key={`${project.name}::${project.platform}`} className="p-4 transition-transform hover:-translate-y-0.5 sm:p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="min-w-0 truncate text-[17px] font-semibold tracking-[-0.01em]">{project.name}</h3>
                    <span className="chip shrink-0">
                      <span className={`h-1.5 w-1.5 rounded-full ${isReady ? "bg-ok" : "bg-bad"}`} />
                      {isReady ? "Berhasil" : "Gagal"}
                    </span>
                  </div>

                  <div className="mt-4 text-[12px] leading-[1.45] text-text-muted">
                    <p className="capitalize">{project.platform}</p>
                    <p>{tanggalIndonesia(project.date)}</p>
                  </div>

                  <div className="mt-4 flex items-center gap-1.5 text-[12.5px] text-text-muted">
                    <Globe2 size={14} className="shrink-0" />
                    <span className="truncate">{project.domain}</span>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-2">
                    <a
                      href={deployDomainToUrl(project.domain, project.platform)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-9 max-md:h-11 items-center justify-center gap-1.5 rounded-full bg-violet-500 px-3 text-[12px] font-semibold text-white transition hover:brightness-110 active:scale-[0.98]"
                    >
                      <ExternalLink size={13} /> Visit
                    </a>
                    <button
                      type="button"
                      onClick={() => redeploy(project.name)}
                      className="pill inline-flex h-9 max-md:h-11 items-center justify-center gap-1.5 px-3 text-[12px] font-semibold hover:brightness-110"
                    >
                      <RotateCw size={13} /> Redeploy
                    </button>
                  </div>

                  {canCheck(project.platform) && (
                    <button
                      type="button"
                      onClick={() => void handleCheck(project.name, project.platform)}
                      disabled={isChecking}
                      className="pill mt-2 inline-flex h-9 max-md:h-11 w-full items-center justify-center gap-1.5 px-3 text-[12px] font-semibold hover:brightness-110 disabled:opacity-50"
                    >
                      <RefreshCw size={13} className={isChecking ? "animate-spin" : ""} />
                      {isChecking ? "Memeriksa..." : "Periksa Status"}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setDeleteTarget(project)}
                    className="mt-2 inline-flex h-9 max-md:h-11 w-full items-center justify-center gap-1.5 rounded-full bg-[var(--bad-solid)] px-3 text-[12px] font-semibold text-white transition hover:brightness-110 active:scale-[0.98]"
                  >
                    <Trash2 size={13} /> Hapus project
                  </button>
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