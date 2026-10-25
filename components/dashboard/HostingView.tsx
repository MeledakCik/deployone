"use client";

import { PageTitle } from "@/components/ui/primitives";
import * as React from "react";
import {
  UploadCloud,
  FileArchive,
  FolderUp,
  Loader2,
  CircleAlert,
  Copy,
  ExternalLink,
  Trash2,
  X,
  Clock,
  TriangleAlert,
  Info,
} from "lucide-react";
import { ViewFade } from "@/components/ui/ViewFade";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/confirm";
import { cn } from "@/lib/utils";
import { useDeploy } from "@/lib/deploy-context";
import {
  collectFromDataTransfer,
  collectFromFileList,
  collectFromZip,
  UploadError,
  type CollectResult,
} from "@/lib/github-upload";
import {
  SiteError,
  analyzeProject,
  deleteSite,
  fetchSites,
  prepareSite,
  checkSiteLinks,
  publishSite,
  type PreparedSite,
  type ProjectReport,
  type SiteConfig,
} from "@/lib/site-upload";

const inputCls =
  "w-full rounded-xl border border-[var(--line)] bg-[var(--pill-bg)] px-3.5 py-2.5 text-[13px] outline-none transition focus:border-[var(--line-strong)]";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function ttlLabel(h: number): string {
  if (h < 24) return `${h} jam`;
  return `${h / 24} hari`;
}

function remaining(expiresAt: number, now: number): string {
  const ms = expiresAt - now;
  if (ms <= 0) return "kedaluwarsa";
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${Math.max(m, 1)} menit lagi`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h} jam lagi`;
  return `${Math.floor(h / 24)} hari lagi`;
}

type Stage = "idle" | "reading" | "ready" | "publishing";

export function HostingView() {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const { setView } = useDeploy();
  const zipRef = React.useRef<HTMLInputElement>(null);
  const folderRef = React.useRef<HTMLInputElement>(null);

  const [config, setConfig] = React.useState<SiteConfig | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [stage, setStage] = React.useState<Stage>("idle");
  const [dragging, setDragging] = React.useState(false);
  const [prepared, setPrepared] = React.useState<PreparedSite | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [report, setReport] = React.useState<ProjectReport | null>(null);
  const [name, setName] = React.useState("");
  const [ttl, setTtl] = React.useState(24);
  const [spa, setSpa] = React.useState(false);
  const [progress, setProgress] = React.useState<{ done: number; total: number; label: string } | null>(null);
  const [now, setNow] = React.useState(() => Date.now());

  const reload = React.useCallback(async () => {
    try {
      const c = await fetchSites();
      setConfig(c);
      setTtl((cur) => (c.ttlOptionsHours.includes(cur) ? cur : c.defaultTtlHours));
      setLoadError(null);
    } catch (e) {
      setLoadError(e instanceof SiteError ? e.message : "Gagal memuat daftar link.");
    }
  }, []);

  React.useEffect(() => {
    void reload();
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, [reload]);

  const busy = stage === "reading" || stage === "publishing";

  async function handleCollect(run: () => Promise<CollectResult>, guessName: string) {
    setError(null);
    setReport(null);
    setStage("reading");
    try {
      const res = await run();
      const rep = analyzeProject(res);
      setReport(rep);
      if (rep.status === "blocked") {
        setPrepared(null);
        setStage("idle");
        return;
      }
      const site = prepareSite(res.files);
      if (config && site.totalBytes > config.maxBytes) {
        throw new SiteError(
          `Ukuran ${formatBytes(site.totalBytes)} melebihi batas ${formatBytes(config.maxBytes)}. Kecilkan gambar/video atau buang file yang tidak dipakai.`
        );
      }
      if (config && site.files.length > config.maxFiles) {
        throw new SiteError(`Terlalu banyak file (${site.files.length}). Maksimal ${config.maxFiles}.`);
      }
      const extra = checkSiteLinks(res.files, site);
      if (extra.length > 0) {
        setReport((r) => (r ? { ...r, status: r.status === "ok" ? "warn" : r.status, notes: [...r.notes, ...extra] } : r));
      }
      setPrepared(site);
      setName((n) => n || guessName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 20));
      setStage("ready");
    } catch (e) {
      setPrepared(null);
      setStage("idle");
      setError(
        e instanceof SiteError || e instanceof UploadError ? e.message : "Gagal membaca file. Coba lagi atau pakai zip lain."
      );
    }
  }

  function onPickZip(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!/\.zip$/i.test(file.name)) {
      setError("File harus berformat .zip");
      return;
    }
    void handleCollect(() => collectFromZip(file), file.name.replace(/\.zip$/i, ""));
  }

  function onPickFolder(e: React.ChangeEvent<HTMLInputElement>) {
    const list = e.target.files;
    if (!list || list.length === 0) return;
    const files = Array.from(list);
    e.target.value = "";
    const first = (files[0] as File & { webkitRelativePath?: string }).webkitRelativePath ?? "";
    void handleCollect(() => collectFromFileList(files), first.split("/")[0] || "situs");
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (busy) return;
    const dt = e.dataTransfer;
    const first = dt.files?.[0];
    const guess = first && /\.zip$/i.test(first.name) ? first.name.replace(/\.zip$/i, "") : first?.name ?? "situs";
    void handleCollect(() => collectFromDataTransfer(dt), guess);
  }

  async function publish() {
    if (!prepared) return;
    setError(null);
    setStage("publishing");
    setProgress({ done: 0, total: 1, label: "Menyiapkan link…" });
    try {
      const res = await publishSite(prepared.files, {
        name,
        ttlHours: ttl,
        spa,
        onProgress: (done, total, label) => setProgress({ done, total, label }),
      });
      showToast("Link aktif: " + res.url.replace(/^https?:\/\//, "").replace(/\/$/, ""));
      setPrepared(null);
      setReport(null);
      setStage("idle");
      setName("");
      setSpa(false);
      await reload();
    } catch (e) {
      setStage("ready");
      setError(e instanceof SiteError ? e.message : "Upload gagal karena kesalahan tak terduga. Coba lagi.");
    } finally {
      setProgress(null);
    }
  }

  async function remove(id: string) {
    const site = config?.sites.find((x) => x.id === id);
    const { ok } = await confirm({
      title: "Hapus link ini?",
      description: site ? `${site.name} akan langsung dihapus.` : "Link akan langsung dihapus.",
      impact: ["Orang yang membuka link ini akan melihat halaman 404.", "File yang diunggah ikut terhapus dan tidak bisa dikembalikan."],
      confirmLabel: "Ya, hapus",
    });
    if (!ok) return;
    try {
      await deleteSite(id);
      showToast("Link dihapus");
      await reload();
    } catch (e) {
      setError(e instanceof SiteError ? e.message : "Gagal menghapus link.");
    }
  }

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      showToast("Link disalin");
    } catch {
      showToast("Gagal menyalin — salin manual dari daftar");
    }
  }

  const pct = progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
  const full = !!config && config.sites.length >= config.maxSites;

  return (
    <ViewFade>
      <div className="mb-6">
        <PageTitle title="Link Instan" desc={<>Upload website statis (zip atau folder) dan langsung dapat link publik sementara
          {config?.baseDomain ? (
            <>
              {" "}
              seperti <code>nama-xxxxx.{config.baseDomain}</code>
            </>
          ) : null}
          . Tanpa CLI, tanpa GitHub.</>} />
      </div>

      {config && !config.enabled && (
        <div className="notice notice-warn mb-4">
          <CircleAlert size={16} className="mt-0.5 shrink-0" />
          <span>
            Fitur ini belum aktif di server. Admin perlu mengisi env <code>TUNNEL_BASE_DOMAIN</code> (domain wildcard) lalu
            redeploy — lihat panduan &quot;Aktifkan Link Instan dan Link Gaib&quot; di menu Docs.
          </span>
        </div>
      )}

      {(error || loadError) && (
        <div
          role="alert"
          className="notice notice-bad mb-4"
        >
          <CircleAlert size={16} className="mt-0.5 shrink-0" />
          <span className="min-w-0 flex-1 break-words">{error ?? loadError}</span>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setLoadError(null);
            }}
            aria-label="Tutup pesan"
            className="shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {report && (
        <div
          className={cn(
            "notice mb-4 !block !px-4 !py-3.5",
            report.status === "blocked" ? "notice-bad" : report.status === "warn" ? "notice-warn" : "notice-ok"
          )}
        >
          <p className="text-[13px] font-semibold">
            Terdeteksi: {report.label}
            {report.status === "blocked" && " — belum bisa dipublikasikan"}
          </p>
          <ul className="mt-2 space-y-1.5">
            {report.notes.map((n, i) => (
              <li key={i} className="flex items-start gap-2">
                {n.level === "info" ? (
                  <Info size={14} className="mt-0.5 shrink-0 text-text-muted" />
                ) : (
                  <TriangleAlert size={14} className={cn("mt-0.5 shrink-0", n.level === "error" ? "text-bad-fg" : "text-warn-fg")} />
                )}
                <span className="min-w-0 break-words">{n.text}</span>
              </li>
            ))}
          </ul>
          {report.needsServer && (
            <button
              type="button"
              onClick={() => setView("upload")}
              className="pill mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[12px] font-medium"
            >
              Butuh server? Buka menu Upload (GitHub + deploy)
            </button>
          )}
        </div>
      )}

      {config?.enabled && (stage === "idle" || stage === "reading") && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (!busy && !full) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => (full ? e.preventDefault() : onDrop(e))}
          className={cn(
            "surface-solid flex flex-col items-center rounded-3xl border-2 border-dashed px-6 py-14 text-center transition",
            dragging ? "border-violet-400 bg-violet-500/10" : "border-[var(--line-strong)]"
          )}
        >
          {stage === "reading" ? (
            <>
              <Loader2 size={34} className="animate-spin text-text-muted" />
              <p className="mt-4 text-[14px] font-medium">Membaca file…</p>
            </>
          ) : full ? (
            <>
              <CircleAlert size={34} className="text-warn-fg" />
              <p className="mt-4 text-[14px] font-medium">Batas {config.maxSites} link aktif tercapai</p>
              <p className="mt-1 text-[12px] text-text-muted">Hapus salah satu link di bawah, atau tunggu sampai kedaluwarsa.</p>
            </>
          ) : (
            <>
              <UploadCloud size={38} className="text-text-muted" />
              <p className="mt-4 text-[15px] font-medium">Tarik &amp; lepas file .zip atau folder website ke sini</p>
              <p className="mt-1 text-[12px] text-text-muted">
                Harus ada <code>index.html</code>. Maks {formatBytes(config.maxBytes)} &amp; {config.maxFiles} file. Project
                React/Vue/Next: upload folder hasil build-nya (dist / build / out).
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => zipRef.current?.click()}
                  className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-[13px]"
                >
                  <FileArchive size={15} /> Pilih file ZIP
                </button>
                <button
                  type="button"
                  onClick={() => folderRef.current?.click()}
                  className="pill inline-flex items-center gap-2 px-5 py-2.5 text-[13px] font-medium hover:bg-[var(--card-hover)]"
                >
                  <FolderUp size={15} /> Pilih folder
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <input ref={zipRef} type="file" accept=".zip,application/zip" className="hidden" onChange={onPickZip} />
      <input
        ref={folderRef}
        type="file"
        className="hidden"
        onChange={onPickFolder}
        // @ts-expect-error — webkitdirectory belum ada di tipe React, tapi didukung semua browser utama.
        webkitdirectory=""
        multiple
      />

      {prepared && (stage === "ready" || stage === "publishing") && (
        <div className="surface-solid rounded-3xl p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[14px] font-semibold">
                {prepared.files.length} file siap{" "}
                <span className="font-normal text-text-muted">· {formatBytes(prepared.totalBytes)}</span>
              </p>
              {prepared.rootDir && (
                <p className="mt-0.5 text-[12px] text-text-muted">
                  Folder <code>{prepared.rootDir}/</code> dipakai sebagai root situs.
                </p>
              )}
            </div>
            {!busy && (
              <button
                type="button"
                onClick={() => {
                  setPrepared(null);
                  setReport(null);
                  setStage("idle");
                }}
                className="text-[12px] text-text-muted underline underline-offset-4"
              >
                Ganti file
              </button>
            )}
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="site-name" className="mb-1.5 block text-[12px] font-medium">
                Nama link (opsional)
              </label>
              <input
                id="site-name"
                value={name}
                disabled={busy}
                maxLength={20}
                onChange={(e) => setName(e.target.value)}
                placeholder="mis. tugas-web"
                className={inputCls}
              />
              <p className="mt-1 text-[12px] text-text-muted">Huruf kecil, angka, strip. Akhiran acak ditambah otomatis.</p>
            </div>
            <div>
              <label htmlFor="site-ttl" className="mb-1.5 block text-[12px] font-medium">
                Aktif selama
              </label>
              <select
                id="site-ttl"
                value={ttl}
                disabled={busy}
                onChange={(e) => setTtl(Number(e.target.value))}
                className={inputCls}
              >
                {(config?.ttlOptionsHours ?? [24]).map((h) => (
                  <option key={h} value={h}>
                    {ttlLabel(h)}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[12px] text-text-muted">Setelah itu link & file otomatis dihapus.</p>
            </div>
          </div>

          <label className="mt-4 flex items-start gap-2.5 text-[12.5px]">
            <input type="checkbox" checked={spa} disabled={busy} onChange={(e) => setSpa(e.target.checked)} className="mt-0.5" />
            <span>
              Mode SPA — halaman yang tidak ditemukan diarahkan ke <code>index.html</code> (untuk React/Vue Router).
            </span>
          </label>

          {stage === "publishing" && progress && (
            <div className="mt-5">
              <div className="mb-1.5 flex justify-between text-[12px] text-text-muted">
                <span>{progress.label}</span>
                <span>{pct}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[var(--pill-bg)]">
                <div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={publish}
            disabled={busy}
            className="btn-primary mt-5 inline-flex items-center gap-2 px-6 py-2.5 text-[13px] disabled:opacity-60"
          >
            {stage === "publishing" ? <Loader2 size={15} className="animate-spin" /> : <UploadCloud size={15} />}
            {stage === "publishing" ? "Mengupload…" : "Buat link publik"}
          </button>
        </div>
      )}


      <div className="mt-8">
        <h3 className="mb-3 text-[15px] font-semibold">
          Link aktif{config ? ` (${config.sites.length}/${config.maxSites})` : ""}
        </h3>
        {!config && !loadError && <p className="text-[12.5px] text-text-muted">Memuat…</p>}
        {config && config.sites.length === 0 && (
          <p className="text-[12.5px] text-text-muted">Belum ada link aktif.</p>
        )}
        <ul className="space-y-3">
          {config?.sites.map((s) => (
            <li key={s.id} className="surface-solid flex flex-wrap items-center gap-3 rounded-2xl px-4 py-3.5">
              <div className="min-w-0 flex-1">
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block break-all text-[13.5px] font-medium underline-offset-4 hover:underline"
                >
                  {s.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                </a>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[12px] text-text-muted">
                  <span className="inline-flex items-center gap-1">
                    <Clock size={11} /> {remaining(s.expiresAt, now)}
                  </span>
                  <span>
                    {s.fileCount} file · {formatBytes(s.totalBytes)}
                  </span>
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button type="button" onClick={() => copy(s.url)} className="pill inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px]">
                  <Copy size={13} /> Salin
                </button>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Buka link"
                  className="pill inline-flex items-center px-2.5 py-1.5"
                >
                  <ExternalLink size={13} />
                </a>
                <button
                  type="button"
                  onClick={() => remove(s.id)}
                  aria-label="Hapus link"
                  className="pill inline-flex items-center px-2.5 py-1.5 text-bad-fg"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </ViewFade>
  );
}
