"use client";

import * as React from "react";
import {
  UploadCloud,
  FileArchive,
  FolderUp,
  Loader2,
  Check,
  CircleAlert,
  ExternalLink,
  Rocket,
  Lock,
  X,
  Github,
} from "lucide-react";
import { ViewFade } from "@/components/ui/ViewFade";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import { useDeploy } from "@/lib/deploy-context";
import type { DeployFormValues, Platform } from "@/types";
import {
  collectFromDataTransfer,
  collectFromFileList,
  collectFromZip,
  sanitizeRepoName,
  uploadToGithub,
  UploadError,
  type CollectResult,
  type UploadProgress,
  type UploadResult,
} from "@/lib/github-upload";

const inputCls =
  "w-full rounded-xl border border-[var(--line)] bg-[var(--pill-bg)] px-3.5 py-2.5 text-[13px] outline-none transition focus:border-[var(--line-strong)]";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/** Nama repo yang masuk akal: package.json → folder pembungkus → nama file zip. */
function guessRepoName(result: CollectResult, sourceName: string): string {
  const pkg = result.files.find((f) => f.path === "package.json");
  if (pkg) {
    try {
      const name = (JSON.parse(new TextDecoder().decode(pkg.data)) as { name?: unknown }).name;
      if (typeof name === "string" && name.trim()) {
        return sanitizeRepoName(name.replace(/^@[^/]+\//, ""));
      }
    } catch {
      /* package.json rusak — lanjut ke tebakan berikutnya */
    }
  }
  return sanitizeRepoName(result.strippedRoot || sourceName) || "my-project";
}

type Stage = "idle" | "reading" | "ready" | "uploading" | "done";

export function UploadView() {
  const { showToast } = useToast();
  const {
    setView,
    setFormField,
    githubPat,
    savedVercelToken,
    savedCloudflareToken,
    savedRailwayToken,
    deployFromValues,
  } = useDeploy();

  const zipInputRef = React.useRef<HTMLInputElement>(null);
  const folderInputRef = React.useRef<HTMLInputElement>(null);
  const abortRef = React.useRef<AbortController | null>(null);

  const [stage, setStage] = React.useState<Stage>("idle");
  const [dragging, setDragging] = React.useState(false);
  const [collected, setCollected] = React.useState<CollectResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const [repoName, setRepoName] = React.useState("");
  const [isPrivate, setIsPrivate] = React.useState(true);
  const [allowExisting, setAllowExisting] = React.useState(false);
  const [deployNow, setDeployNow] = React.useState(false);
  const [platform, setPlatform] = React.useState<Platform | "">("");
  const [envText, setEnvText] = React.useState("");
  const [envFromLocal, setEnvFromLocal] = React.useState(false);

  const [progress, setProgress] = React.useState<UploadProgress | null>(null);
  const [result, setResult] = React.useState<UploadResult | null>(null);

  // Platform yang bisa dipakai = yang token-nya sudah tersimpan di Settings.
  const platforms = React.useMemo(() => {
    const list: { id: Platform; label: string }[] = [];
    if (savedVercelToken) list.push({ id: "vercel", label: "Vercel" });
    if (savedCloudflareToken) list.push({ id: "cloudflare", label: "Cloudflare Pages" });
    if (savedRailwayToken) list.push({ id: "railway", label: "Railway" });
    return list;
  }, [savedVercelToken, savedCloudflareToken, savedRailwayToken]);

  React.useEffect(() => {
    if (platforms.length > 0 && !platforms.some((p) => p.id === platform)) setPlatform(platforms[0].id);
  }, [platforms, platform]);

  // Halaman ditutup saat upload berjalan → batalkan request yang menggantung.
  React.useEffect(() => () => abortRef.current?.abort(), []);

  const busy = stage === "reading" || stage === "uploading";

  async function handleCollect(run: () => Promise<CollectResult>, sourceName: string) {
    setError(null);
    setResult(null);
    setStage("reading");
    try {
      const res = await run();
      setCollected(res);
      setRepoName(guessRepoName(res, sourceName));
      setEnvText(res.envText);
      setEnvFromLocal(res.envText.trim().length > 0);
      setStage("ready");
    } catch (e) {
      setCollected(null);
      setStage("idle");
      setError(e instanceof UploadError ? e.message : "Gagal membaca file. Coba lagi atau pakai zip lain.");
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
    void handleCollect(() => collectFromFileList(files), "my-project");
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (busy) return;
    const dt = e.dataTransfer;
    // DataTransfer hanya valid selama event berjalan — baca entry-nya sekarang, bukan di dalam callback async.
    const first = dt.files?.[0];
    const zipName = first && /\.zip$/i.test(first.name) ? first.name.replace(/\.zip$/i, "") : "my-project";
    void handleCollect(() => collectFromDataTransfer(dt), zipName);
  }

  async function startUpload() {
    if (!collected) return;
    if (!githubPat.trim()) {
      setError('GitHub Token belum diisi. Buka menu Settings, isi "GitHub Token" (izin repo), lalu kembali ke sini.');
      return;
    }
    const name = sanitizeRepoName(repoName);
    if (!name) {
      setError("Nama repo belum valid. Pakai huruf, angka, titik, strip, atau underscore.");
      return;
    }
    if (deployNow && !platform) {
      setError("Pilih platform tujuan deploy, atau matikan opsi deploy langsung.");
      return;
    }

    setError(null);
    setStage("uploading");
    setProgress({ phase: "repo", done: 0, total: 1, message: "Menyiapkan…" });
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await uploadToGithub(collected.files, {
        pat: githubPat,
        repoName: name,
        isPrivate,
        allowExisting,
        description: "Di-upload lewat Depup",
        onProgress: setProgress,
        signal: controller.signal,
      });
      setResult(res);
      setStage("done");
      showToast(`Berhasil di-upload ke ${res.owner}/${res.repo}`);
      if (deployNow && platform) startDeploy(res, platform);
    } catch (e) {
      setStage("ready");
      setError(e instanceof UploadError ? e.message : "Upload gagal karena kesalahan tak terduga. Coba lagi.");
    } finally {
      abortRef.current = null;
    }
  }

  function buildDeployValues(res: UploadResult, target: Platform): DeployFormValues | null {
    const base: DeployFormValues = {
      projectName: res.repo,
      platform: target,
      domain: "",
      platformToken: "",
      githubUrl: res.url,
      githubPat,
      note: "",
      accountId: "",
      buildCommand: "",
      outputDir: "",
      startCommand: "",
      envText: envText.trim(),
    };
    if (target === "vercel" && savedVercelToken) return { ...base, platformToken: savedVercelToken.token };
    if (target === "cloudflare" && savedCloudflareToken) {
      return { ...base, platformToken: savedCloudflareToken.token, accountId: savedCloudflareToken.accountId };
    }
    if (target === "railway" && savedRailwayToken) return { ...base, platformToken: savedRailwayToken.token };
    return null;
  }

  function startDeploy(res: UploadResult, target: Platform) {
    const values = buildDeployValues(res, target);
    if (!values) {
      showToast("Token platform belum tersimpan — lanjutkan dari menu Deploy.");
      return;
    }
    deployFromValues(values);
  }

  /** Repo sudah di-upload tapi belum di-deploy → buka wizard Deploy dengan URL terisi. */
  function continueInDeployWizard() {
    if (!result) return;
    setFormField("githubUrl", result.url);
    setFormField("projectName", result.repo);
    if (githubPat) setFormField("githubPat", githubPat);
    if (envText.trim()) setFormField("envText", envText.trim());
    setView("deploy");
  }

  function reset() {
    abortRef.current?.abort();
    setStage("idle");
    setCollected(null);
    setResult(null);
    setError(null);
    setProgress(null);
    setRepoName("");
    setEnvText("");
    setEnvFromLocal(false);
  }

  const pct = progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
  const overallPct =
    progress?.phase === "files" ? 10 + Math.round(pct * 0.8) : progress?.phase === "commit" ? 95 : progress?.phase === "done" ? 100 : 5;

  return (
    <ViewFade>
      <div className="mb-6">
        <h2 className="text-[22px] font-semibold">Upload Project</h2>
        <p className="mt-1 text-[13px] text-text-muted">
          Upload zip atau folder project — otomatis diekstrak, dikirim ke repo GitHub baru, dan (kalau mau) langsung
          di-deploy.
        </p>
      </div>

      {!githubPat.trim() && (
        <div className="mb-4 flex items-start gap-2.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-[12.5px] text-amber-300">
          <CircleAlert size={16} className="mt-0.5 shrink-0" />
          <span>
            Fitur ini butuh <b>GitHub Token</b> (izin <code>repo</code>) untuk membuat repo atas nama kamu.{" "}
            <button type="button" onClick={() => setView("settings")} className="underline underline-offset-4">
              Isi di Settings
            </button>
            .
          </span>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2.5 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-[12.5px] text-red-300"
        >
          <CircleAlert size={16} className="mt-0.5 shrink-0" />
          <span className="min-w-0 flex-1 break-words">{error}</span>
          <button type="button" onClick={() => setError(null)} aria-label="Tutup pesan" className="shrink-0">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ---------- Langkah 1: pilih sumber ---------- */}
      {(stage === "idle" || stage === "reading") && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (!busy) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            "surface-solid flex flex-col items-center rounded-3xl border-2 border-dashed px-6 py-14 text-center transition",
            dragging ? "border-violet-400 bg-violet-500/10" : "border-[var(--line-strong)]"
          )}
        >
          {stage === "reading" ? (
            <>
              <Loader2 size={34} className="animate-spin text-text-muted" />
              <p className="mt-4 text-[14px] font-medium">Membaca & mengekstrak file…</p>
              <p className="mt-1 text-[12px] text-text-muted">Project besar bisa butuh beberapa detik.</p>
            </>
          ) : (
            <>
              <UploadCloud size={38} className="text-text-muted" />
              <p className="mt-4 text-[15px] font-medium">Tarik &amp; lepas file .zip atau folder project ke sini</p>
              <p className="mt-1 text-[12px] text-text-muted">
                node_modules, .git, dan hasil build otomatis dilewati. File .env tidak ikut di-upload.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => zipInputRef.current?.click()}
                  className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-[13px]"
                >
                  <FileArchive size={15} /> Pilih file ZIP
                </button>
                <button
                  type="button"
                  onClick={() => folderInputRef.current?.click()}
                  className="pill inline-flex items-center gap-2 px-5 py-2.5 text-[13px] font-medium hover:bg-[var(--card-hover)]"
                >
                  <FolderUp size={15} /> Pilih folder
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <input ref={zipInputRef} type="file" accept=".zip,application/zip" className="hidden" onChange={onPickZip} />
      <input
        ref={folderInputRef}
        type="file"
        className="hidden"
        onChange={onPickFolder}
        // @ts-expect-error — webkitdirectory belum ada di tipe React, tapi didukung semua browser utama.
        webkitdirectory=""
        multiple
      />

      {/* ---------- Langkah 2: atur & upload ---------- */}
      {collected && (stage === "ready" || stage === "uploading") && (
        <div className="surface-solid rounded-3xl p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[14px] font-semibold">
                {collected.files.length} file siap di-upload{" "}
                <span className="font-normal text-text-muted">· {formatBytes(collected.totalBytes)}</span>
              </p>
              {collected.strippedRoot && (
                <p className="mt-0.5 text-[11.5px] text-text-muted">
                  Folder pembungkus <code>{collected.strippedRoot}/</code> dibuang, isinya jadi root repo.
                </p>
              )}
            </div>
            {!busy && (
              <button type="button" onClick={reset} className="text-[12px] text-text-muted underline underline-offset-4">
                Ganti file
              </button>
            )}
          </div>

          {collected.skipped.length > 0 && (
            <details className="mt-3 text-[12px] text-text-muted">
              <summary className="cursor-pointer select-none">{collected.skipped.length} file dilewati</summary>
              <ul className="mt-2 max-h-36 space-y-0.5 overflow-y-auto pl-4">
                {collected.skipped.slice(0, 100).map((s) => (
                  <li key={s.path} className="list-disc break-all">
                    <code>{s.path}</code> — {s.reason}
                  </li>
                ))}
                {collected.skipped.length > 100 && <li className="list-none">…dan {collected.skipped.length - 100} lainnya</li>}
              </ul>
            </details>
          )}

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="upload-repo" className="mb-1.5 block text-[12px] font-medium">
                Nama repo GitHub
              </label>
              <input
                id="upload-repo"
                value={repoName}
                disabled={busy}
                onChange={(e) => setRepoName(e.target.value)}
                onBlur={() => setRepoName((v) => sanitizeRepoName(v))}
                placeholder="nama-project"
                className={inputCls}
                autoComplete="off"
                spellCheck={false}
              />
            </div>

            <fieldset disabled={busy}>
              <legend className="mb-1.5 block text-[12px] font-medium">Visibilitas</legend>
              <div className="flex gap-2">
                {[
                  { v: true, label: "Private", icon: <Lock size={13} /> },
                  { v: false, label: "Public", icon: <Github size={13} /> },
                ].map((o) => (
                  <button
                    key={o.label}
                    type="button"
                    aria-pressed={isPrivate === o.v}
                    onClick={() => setIsPrivate(o.v)}
                    className={cn(
                      "inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-[13px] transition",
                      isPrivate === o.v
                        ? "border-violet-400 bg-violet-500/15 text-text"
                        : "border-[var(--line)] text-text-muted hover:bg-[var(--card-hover)]"
                    )}
                  >
                    {o.icon} {o.label}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>

          <label className="mt-4 flex items-start gap-2.5 text-[12.5px] text-text-muted">
            <input
              type="checkbox"
              checked={allowExisting}
              disabled={busy}
              onChange={(e) => setAllowExisting(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              Timpa repo yang sudah ada kalau namanya sama{" "}
              <span className="text-text-muted/80">(isi branch utama diganti dengan upload ini lewat commit baru)</span>
            </span>
          </label>

          {/* Pilihan deploy */}
          <div className="mt-5 rounded-2xl border border-[var(--line)] p-4">
            <p className="text-[12px] font-medium">Setelah upload…</p>
            <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
              {[
                { v: false, title: "Upload saja", desc: "Cuma kirim ke GitHub. Deploy nanti dari menu Deploy." },
                { v: true, title: "Langsung deploy", desc: "Otomatis deploy repo ini begitu upload selesai." },
              ].map((o) => (
                <button
                  key={o.title}
                  type="button"
                  disabled={busy}
                  aria-pressed={deployNow === o.v}
                  onClick={() => setDeployNow(o.v)}
                  className={cn(
                    "rounded-xl border px-3.5 py-3 text-left transition",
                    deployNow === o.v ? "border-violet-400 bg-violet-500/15" : "border-[var(--line)] hover:bg-[var(--card-hover)]"
                  )}
                >
                  <span className="block text-[13px] font-medium">{o.title}</span>
                  <span className="mt-0.5 block text-[11.5px] text-text-muted">{o.desc}</span>
                </button>
              ))}
            </div>

            {deployNow && (
              <div className="mt-3">
                {platforms.length === 0 ? (
                  <p className="text-[12px] text-amber-300">
                    Belum ada token platform yang tersimpan.{" "}
                    <button type="button" onClick={() => setView("settings")} className="underline underline-offset-4">
                      Isi token Vercel/Cloudflare/Railway di Settings
                    </button>{" "}
                    dulu, atau pilih &ldquo;Upload saja&rdquo;.
                  </p>
                ) : (
                  <>
                    <label htmlFor="upload-platform" className="mb-1.5 block text-[12px] font-medium">
                      Deploy ke
                    </label>
                    <select
                      id="upload-platform"
                      value={platform}
                      disabled={busy}
                      onChange={(e) => setPlatform(e.target.value as Platform)}
                      className={inputCls}
                    >
                      {platforms.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </>
                )}
              </div>
            )}

            <div className="mt-4">
              <label htmlFor="upload-env" className="mb-1.5 block text-[12px] font-medium">
                Environment variables <span className="font-normal text-text-muted">(opsional, satu per baris: KEY=value)</span>
              </label>
              <textarea
                id="upload-env"
                value={envText}
                disabled={busy}
                onChange={(e) => {
                  setEnvText(e.target.value);
                  setEnvFromLocal(false);
                }}
                rows={5}
                spellCheck={false}
                autoComplete="off"
                placeholder={"DATABASE_URL=postgres://...\nNEXT_PUBLIC_API_URL=https://..."}
                className={cn(inputCls, "resize-y font-mono text-[12px]")}
              />
              <p className="mt-1.5 text-[11.5px] text-text-muted">
                {envFromLocal
                  ? "Terisi otomatis dari file .env di project-mu. File .env-nya sendiri tidak di-upload ke GitHub. "
                  : ""}
                {deployNow
                  ? "Saat deploy, env ini dipasang ke platform sebelum build pertama dan otomatis muncul di menu Environment untuk project ini."
                  : "Dipakai kalau kamu lanjut deploy dari tombol “Deploy repo ini” setelah upload."}
              </p>
            </div>
          </div>

          {stage === "uploading" && progress && (
            <div className="mt-5" aria-live="polite">
              <div className="mb-1.5 flex justify-between text-[12px] text-text-muted">
                <span>{progress.message}</span>
                <span>{overallPct}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[var(--pill-bg)]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-[width] duration-300"
                  style={{ width: `${overallPct}%` }}
                />
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void startUpload()}
              disabled={busy || !repoName.trim() || (deployNow && platforms.length === 0)}
              className="btn-primary inline-flex items-center gap-2 px-6 py-2.5 text-[13px] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {stage === "uploading" ? (
                <>
                  <Loader2 size={15} className="animate-spin" /> Meng-upload…
                </>
              ) : deployNow ? (
                <>
                  <Rocket size={15} /> Upload &amp; Deploy
                </>
              ) : (
                <>
                  <UploadCloud size={15} /> Upload ke GitHub
                </>
              )}
            </button>
            {stage === "uploading" && (
              <button
                type="button"
                onClick={() => abortRef.current?.abort()}
                className="text-[12px] text-text-muted underline underline-offset-4"
              >
                Batalkan
              </button>
            )}
          </div>
        </div>
      )}

      {/* ---------- Langkah 3: selesai ---------- */}
      {stage === "done" && result && (
        <div className="surface-solid rounded-3xl p-6 text-center sm:p-8">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-500/15 text-emerald-400">
            <Check size={24} />
          </span>
          <h3 className="mt-4 text-[18px] font-semibold">Upload berhasil</h3>
          <p className="mt-1 text-[13px] text-text-muted">
            {result.fileCount} file masuk ke{" "}
            <a href={result.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
              {result.owner}/{result.repo}
            </a>{" "}
            ({result.isPrivate ? "private" : "public"}, branch {result.branch}).
          </p>
          {deployNow && platform && (
            <p className="mt-2 text-[12.5px] text-text-muted">Proses deploy sudah dimulai — ikuti progresnya di jendela yang muncul.</p>
          )}
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {!deployNow && (
              <button
                type="button"
                onClick={continueInDeployWizard}
                className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-[13px]"
              >
                <Rocket size={15} /> Deploy repo ini
              </button>
            )}
            <a
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              className="pill inline-flex items-center gap-2 px-5 py-2.5 text-[13px] font-medium hover:bg-[var(--card-hover)]"
            >
              <ExternalLink size={15} /> Buka di GitHub
            </a>
            <button
              type="button"
              onClick={reset}
              className="pill inline-flex items-center gap-2 px-5 py-2.5 text-[13px] font-medium hover:bg-[var(--card-hover)]"
            >
              Upload lagi
            </button>
          </div>
        </div>
      )}
    </ViewFade>
  );
}
