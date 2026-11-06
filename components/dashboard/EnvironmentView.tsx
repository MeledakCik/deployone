"use client";

import { useT } from "@/lib/i18n";
import "@/lib/i18n/dict/app";
import { PageTitle } from "@/components/ui/primitives";
import * as React from "react";
import { InlineIcon } from "@/components/ui/Icon";
import { KeyRound, Plus, Trash2, Eye, EyeOff, Info, X, RefreshCw } from "@/components/ui/icons";
import { Surface } from "@/components/ui/Surface";
import { ViewFade } from "@/components/ui/ViewFade";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDeploy } from "@/lib/deploy-context";
import { useToast } from "@/components/ui/Toast";

type EnvName = "Production" | "Preview";
type EnvFilter = "all" | EnvName;

/** Opsi filter environment: Production saja, Preview saja, atau keduanya. */
const ENV_FILTER_OPTIONS: { value: EnvFilter; label: string }[] = [
  { value: "all", label: "Keduanya" },
  { value: "Production", label: "Production" },
  { value: "Preview", label: "Preview" },
];

/** All projects the user has ever deployed (any platform) — env vars can be scoped to any of these. */
function useProjectNames() {
  const { history } = useDeploy();
  return React.useMemo(() => Array.from(new Set(history.map((h) => h.name))), [history]);
}

/** Maps project name -> platform, so the modal knows which remote (if any) a project can push secrets to. */
function useProjectPlatforms() {
  const { history } = useDeploy();
  return React.useMemo(() => {
    const map = new Map<string, string>();
    for (const h of Array.isArray(history) ? history : []) if (!map.has(h.name)) map.set(h.name, h.platform);
    return map;
  }, [history]);
}

function AddSecretModal({
  open,
  onClose,
  defaultProject,
  defaultEnvironment,
}: {
  open: boolean;
  onClose: () => void;
  defaultProject?: string;
  defaultEnvironment?: EnvName;
}) {
  const t = useT();
  const { addEnvVar, vercelToken, savedCloudflareToken, savedRailwayToken } = useDeploy();
  const { showToast } = useToast();
  const projectNames = useProjectNames();
  const projectPlatforms = useProjectPlatforms();
  const [key, setKey] = React.useState("");
  const [value, setValue] = React.useState("");
  const [environment, setEnvironment] = React.useState<EnvName>(defaultEnvironment ?? "Production");
  const [project, setProject] = React.useState(defaultProject ?? projectNames[0] ?? "");
  const [pushToRemote, setPushToRemote] = React.useState(true);

  React.useEffect(() => {
    if (open) setProject(defaultProject ?? projectNames[0] ?? "");
  }, [open, defaultProject, projectNames]);

  React.useEffect(() => {
    if (open) setEnvironment(defaultEnvironment ?? "Production");
  }, [open, defaultEnvironment]);

  if (!open) return null;

  const projectPlatform = projectPlatforms.get(project);
  const isVercelProject = projectPlatform === "vercel";
  const isCloudflareProject = projectPlatform === "cloudflare";
  const isRailwayProject = projectPlatform === "railway";
  const canPush =
    (isVercelProject && Boolean(vercelToken)) ||
    (isCloudflareProject && Boolean(savedCloudflareToken)) ||
    (isRailwayProject && Boolean(savedRailwayToken));
  const remotePlatformLabel = isVercelProject ? "Vercel" : isCloudflareProject ? t("Cloudflare Pages") : "Railway";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!key.trim() || !value.trim()) {
      showToast(t("Key dan value tidak boleh kosong"));
      return;
    }
    if (!project) {
      showToast(t("Pilih project untuk secret ini — env var selalu per-project, bukan global."));
      return;
    }
    addEnvVar(key.trim(), value.trim(), environment, project, {
      pushToVercel: canPush && pushToRemote && isVercelProject,
      pushToCloudflare: canPush && pushToRemote && isCloudflareProject,
      pushToRailway: canPush && pushToRemote && isRailwayProject,
    });
    setKey("");
    setValue("");
    onClose();
  }

  return (
    <div className="anim-fade fixed inset-0 z-[100] flex items-center justify-center modal-scrim px-4">
      <Surface className="anim-pop w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[16px] font-semibold">{t("Tambah secret")}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("Tutup")}
            className="grid h-8 w-8 place-items-center rounded-full hover:bg-[var(--row-hover)]"
          >
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-text-muted mb-1.5">{t("Project")}</label>
            {projectNames.length === 0 ? (
              <p className="input-solid h-11 flex items-center px-3.5 text-[13px] text-text-faint">
                {t("Belum ada project — deploy dulu untuk bisa menyimpan secret.")}
              </p>
            ) : (
              <Select value={project} onValueChange={setProject}>
                <SelectTrigger>
                  <SelectValue placeholder={t("Pilih project")} />
                </SelectTrigger>
                <SelectContent>
                  {projectNames.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <p className="mt-1.5 text-[12px] text-text-faint">
              {t("Secret hanya berlaku untuk project ini, tidak akan bocor/bentrok ke project lain.")}
            </p>
          </div>
          <div>
            <label htmlFor="envKey" className="block text-[12px] font-medium text-text-muted mb-1.5">
              {t("Key")}
            </label>
            <input
              id="envKey"
              type="text"
              autoFocus
              placeholder="DATABASE_URL"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="input-solid mono h-11 w-full px-3.5 text-[13px]"
            />
          </div>
          <div>
            <label htmlFor="envValue" className="block text-[12px] font-medium text-text-muted mb-1.5">
              {t("Value")}
            </label>
            <input
              id="envValue"
              type="text"
              placeholder="postgres://..."
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="input-solid mono h-11 w-full px-3.5 text-[13px]"
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-text-muted mb-1.5">{t("Environment")}</label>
            <Select value={environment} onValueChange={(v) => setEnvironment(v as EnvName)}>
              <SelectTrigger>
                <SelectValue placeholder={t("Pilih Environment")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Production">{t("Production")}</SelectItem>
                <SelectItem value="Preview">{t("Preview")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isVercelProject || isCloudflareProject || isRailwayProject ? (
            canPush ? (
              <div className="space-y-2 rounded-[14px] bg-[var(--surface-solid-2)] p-3.5">
                <label className="flex items-center gap-2.5 text-[13px] font-medium">
                  <input
                    type="checkbox"
                    checked={pushToRemote}
                    onChange={(e) => setPushToRemote(e.target.checked)}
                    className="h-4 w-4 accent-[var(--accent)]"
                  />
                  {t("Push otomatis ke project \"{project}\" di {remotePlatformLabel}", { project, remotePlatformLabel })}
                </label>
              </div>
            ) : (
              <p className="text-[12px] text-text-faint">
                {t("Hubungkan token {remotePlatformLabel} di Pengaturan untuk push otomatis.", { remotePlatformLabel })}
              </p>
            )
          ) : (
            <p className="text-[12px] text-text-faint">
              {t("Project ini bukan platform Vercel/Cloudflare/Railway — secret akan disimpan lokal saja untuk project ini.")}
            </p>
          )}

          <button type="submit" className="btn-primary btn-md w-full">
            {t("Simpan secret")}
          </button>
        </form>
      </Surface>
    </div>
  );
}

export function EnvironmentView() {
  const t = useT();
  const {
    envVars,
    removeEnvVar,
    toggleEnvVisible,
    vercelToken,
    savedCloudflareToken,
    savedRailwayToken,
    syncingEnvVars,
    syncAllEnvVars,
  } = useDeploy();
  const projectNames = useProjectNames();
  const [modalOpen, setModalOpen] = React.useState(false);
  const [activeProject, setActiveProject] = React.useState<string>("all");
  const [activeEnv, setActiveEnv] = React.useState<EnvFilter>("all");
  const didAutoSync = React.useRef(false);

  // Depup has no webhook for it, so we don't find out on our own when a
  // secret gets deleted straight from the Vercel/Cloudflare/Railway dashboard —
  // check once per visit so the list here doesn't quietly go stale.
  React.useEffect(() => {
    if (didAutoSync.current || (!vercelToken && !savedCloudflareToken && !savedRailwayToken)) return;
    didAutoSync.current = true;
    void syncAllEnvVars();
  }, [vercelToken, savedCloudflareToken, savedRailwayToken, syncAllEnvVars]);

  // Keep the filter valid if the underlying project list changes.
  React.useEffect(() => {
    if (activeProject !== "all" && !projectNames.includes(activeProject)) {
      setActiveProject("all");
    }
  }, [activeProject, projectNames]);

  // Filter project dulu, supaya hitungan di tombol Production/Preview ikut project yang dipilih.
  const projectEnvVars = React.useMemo(() => {
    const safeEnvVars = Array.isArray(envVars) ? envVars : [];
    return activeProject === "all" ? safeEnvVars : safeEnvVars.filter((v) => v.project === activeProject);
  }, [envVars, activeProject]);

  const envCounts = React.useMemo(
    () => ({
      all: projectEnvVars.length,
      Production: projectEnvVars.filter((v) => v.environment === "Production").length,
      Preview: projectEnvVars.filter((v) => v.environment === "Preview").length,
    }),
    [projectEnvVars]
  );

  const filteredEnvVars = React.useMemo(
    () => (activeEnv === "all" ? projectEnvVars : projectEnvVars.filter((v) => v.environment === activeEnv)),
    [projectEnvVars, activeEnv]
  );

  // Stable-sort by project so rows from the same project sit together, then
  // bucket the (now-contiguous) runs into groups — each gets a small header
  // row as a visual separator when browsing "Semua project".
  const groupedEnvVars = React.useMemo(() => {
    const sorted = [...filteredEnvVars].sort((a, b) => a.project.localeCompare(b.project));
    const groups: { project: string; items: typeof sorted }[] = [];
    for (const item of sorted) {
      const last = groups[groups.length - 1];
      if (last && last.project === item.project) {
        last.items.push(item);
      } else {
        groups.push({ project: item.project, items: [item] });
      }
    }
    return groups;
  }, [filteredEnvVars]);

  // Saat "Semua project", nama project sudah tampil di header grup → kolom Project redundan dan hanya memakan lebar.
  const showProjectColumn = activeProject !== "all";

  return (
    <ViewFade>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <PageTitle title={t("Variabel env")} desc={<>{t("Simpan variabel environment (secret, API key, URL database) per project. Nilainya dikirim ke platform saat build — tidak ada variabel global antar project.")}</>} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(vercelToken || savedCloudflareToken || savedRailwayToken) && (
              <button
                type="button"
                onClick={() => void syncAllEnvVars()}
                disabled={syncingEnvVars}
                className="pill btn-md inline-flex items-center gap-2 font-medium hover:brightness-110 disabled:opacity-50"
              >
                <RefreshCw size={13} className={syncingEnvVars ? "animate-spin" : undefined} />
                {syncingEnvVars ? t("Sinkronisasi...") : t("Sinkronkan")}
              </button>
            )}
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="btn-primary btn-md inline-flex items-center gap-2"
            >
              <Plus size={15} />{" "}{t("Add Secret")}
            </button>
          </div>
        </div>

        <Surface className="flex items-start gap-3 px-5 py-4">
          <Info size={16} className="mt-0.5 shrink-0 text-lav-text" />
          <p className="text-[13px] leading-relaxed text-text-muted">
            {t("Fitur injeksi")}{" "}<span className="mono">.env</span>{" "}{t("saat build — setiap secret terikat ke satu project dan hanya tersedia sebagai environment variable pada build & runtime project itu saja.")}
          </p>
        </Surface>

        <div className="flex flex-wrap items-end gap-4">
          {projectNames.length > 0 && (
            <div className="w-full max-w-xs">
              <label className="mb-1.5 block text-[12px] font-medium text-text-muted">{t("Filter berdasarkan project")}</label>
              <Select value={activeProject} onValueChange={setActiveProject}>
                <SelectTrigger>
                  <SelectValue placeholder={t("Semua project")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("Semua project")}</SelectItem>
                  {projectNames.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <span id="env-filter-label" className="mb-1.5 block text-[12px] font-medium text-text-muted">
              {t("Filter berdasarkan environment")}
            </span>
            <div role="group" aria-labelledby="env-filter-label" className="flex flex-wrap items-center gap-2">
              {ENV_FILTER_OPTIONS.map((opt) => {
                const selected = activeEnv === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setActiveEnv(opt.value)}
                    className={`pill inline-flex items-center gap-1.5 px-3.5 text-[13px] font-medium hover:brightness-110 ${
                      selected ? "!bg-[var(--accent)] !text-white" : ""
                    }`}
                  >
                    {opt.label}
                    <span className={`text-[12px] ${selected ? "opacity-90" : "text-text-faint"}`}>
                      {envCounts[opt.value]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {filteredEnvVars.length === 0 ? (
          <Surface className="flex flex-col items-center justify-center gap-3 px-6 py-24 text-center">
            <KeyRound size={52} className="text-text-faint" strokeWidth={1.5} />
            <h2 className="text-[16px] font-semibold">
              {activeEnv === "all" ? t("Belum ada secret") : t("Belum ada secret {activeEnv}", { activeEnv })}
            </h2>
            <p className="max-w-xs text-[13px] text-text-muted">
              {activeProject === "all" && activeEnv === "all"
                ? t("Tambahkan environment variable pertamamu untuk digunakan saat deploy.")
                : activeProject === "all"
                  ? t("Tidak ada secret dengan environment {activeEnv}.", { activeEnv })
                  : activeEnv === "all"
                    ? t("Belum ada secret untuk project \"{activeProject}\".", { activeProject })
                    : t("Belum ada secret {activeEnv} untuk project \"{activeProject}\".", { activeEnv, activeProject })}
            </p>
          </Surface>
        ) : (
          <Surface className="overflow-hidden">
            {/* Pembungkus scroll: kalau layar sangat sempit, tabel bisa digeser — kolom Aksi tidak pernah terpotong diam-diam */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left">
                <thead>
                  <tr className="text-[12px] text-text-faint">
                    <th className="px-4 py-3 font-medium sm:px-5">{t("Key")}</th>
                    <th className="px-4 py-3 font-medium sm:px-5">{t("Value")}</th>
                    {showProjectColumn && <th className="px-4 py-3 font-medium sm:px-5">{t("Project")}</th>}
                    <th className="px-4 py-3 font-medium sm:px-5">{t("Environment")}</th>
                    <th className="w-px whitespace-nowrap px-4 py-3 text-right font-medium sm:px-5">{t("Action")}</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    let rowIndex = 0;
                    return groupedEnvVars.map((group, groupIndex) => (
                      <React.Fragment key={group.project}>
                        {activeProject === "all" && (
                          <tr>
                            <td
                              colSpan={showProjectColumn ? 5 : 4}
                              className={`px-4 py-2 text-[12px] font-semibold text-text-faint bg-[var(--row-hover)] sm:px-5 ${
                                groupIndex > 0 ? "border-t" : ""
                              }`}
                              style={{ borderColor: "var(--surface-line)" }}
                            >
                              {group.project}
                            </td>
                          </tr>
                        )}
                        {group.items.map((item) => {
                          const i = rowIndex++;
                          return (
                            <tr
                              key={item.id}
                              className="surface-solid-row row-in border-b last:border-0"
                              style={{ borderColor: "var(--surface-line)", ["--i" as string]: i }}
                            >
                              <td className="px-4 py-3.5 mono text-[13px] font-medium break-all sm:px-5">{item.key}</td>
                              <td className="px-4 py-3.5 mono text-[12px] text-text-muted break-all sm:px-5">
                                {item.visible ? item.value : "•".repeat(Math.min(item.value.length, 14) || 8)}
                              </td>
                              {showProjectColumn && (
                                <td className="px-4 py-3.5 text-[12px] text-text-muted break-words sm:px-5">{item.project}</td>
                              )}
                              <td className="px-4 py-3.5 sm:px-5">
                                <div className="flex flex-col items-start gap-1.5 sm:flex-row sm:flex-wrap sm:items-center">
                                  {/* Label, bukan tombol: pakai .chip (bukan .pill) supaya tidak kena min-height 40px layar sentuh */}
                                  <span className="chip min-w-[92px] justify-center !bg-[var(--pill-bg)]">{item.environment}</span>
                                  {item.syncedToVercel && (
                                    <span className="chip min-w-[92px] justify-center !text-[12px] !text-ok-fg"><InlineIcon name="check" />{" "}{t("Vercel")}</span>
                                  )}
                                  {item.syncedToCloudflare && (
                                    <span className="chip min-w-[92px] justify-center !text-[12px] !text-ok-fg">
                                      <InlineIcon name="check" />{" "}{t("Cloudflare")}
                                    </span>
                                  )}
                                  {item.syncedToRailway && (
                                    <span className="chip min-w-[92px] justify-center !text-[12px] !text-ok-fg"><InlineIcon name="check" />{" "}{t("Railway")}</span>
                                  )}
                                </div>
                              </td>
                              <td className="whitespace-nowrap px-4 py-3.5 sm:px-5">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => toggleEnvVisible(item.id)}
                                    aria-label={item.visible ? t("Sembunyikan value") : t("Tampilkan value")}
                                    className="pill inline-flex min-w-[68px] items-center justify-center gap-1.5 px-3 py-1 text-[12px] font-medium hover:brightness-110"
                                  >
                                    {item.visible ? <EyeOff size={12} /> : <Eye size={12} />}
                                    {item.visible ? t("Hide") : t("Show")}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => removeEnvVar(item.id)}
                                    aria-label={t("Hapus {key}", { key: item.key })}
                                    className="pill inline-flex items-center gap-1.5 px-3 py-1 text-[12px] font-medium text-bad-fg hover:brightness-110"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </Surface>
        )}
      </div>

      <AddSecretModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultProject={activeProject !== "all" ? activeProject : undefined}
        defaultEnvironment={activeEnv !== "all" ? activeEnv : undefined}
      />
    </ViewFade>
  );
}
