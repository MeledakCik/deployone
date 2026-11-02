"use client";

import * as React from "react";
import { PageTitle, Badge, Btn, type BadgeTone } from "@/components/ui/primitives";
import { ViewFade } from "@/components/ui/ViewFade";
import { UploadCloud, FileArchive, FolderUp, Loader2, CircleAlert, X, Download, Copy, Check, Sparkles, ArrowRight } from "@/components/ui/icons";
import { useToast } from "@/components/ui/Toast";
import { useDeploy } from "@/lib/deploy-context";
import { cn } from "@/lib/utils";
import { ON_MIST, SELECTED_FILL, chipCls } from "./ai-site/shared";
import { collectFromZip, collectFromFileList, collectFromDataTransfer, UploadError, type CollectResult } from "@/lib/github-upload";
import { convertHtmlProject } from "@/lib/convert/html-to-next";
import { analyzeNextProject, detectNext, MAX_PAGE_SOURCE } from "@/lib/convert/next-to-html";
import {
  LANGS, GROUP_LABEL, CUSTOM_ID, langById, langOfPath, guessLangFromCode, targetFromLang, customTarget, targetPath, isNoise,
  type Lang, type LangGroup, type TargetSpec,
} from "@/lib/convert/languages";
import { runItems, buildZip, saveBlob, type RunItem, type ItemStatus } from "@/lib/convert/run";

const inputCls =
  "input-solid w-full px-3.5 py-2.5 text-[13px]";
const MAX_FILE_CHARS = 36_000;
const NEXT16 = "next16";
const HTML_ID = "html";

const dec = new TextDecoder();
const enc = new TextEncoder();

interface KeyStatus {
  hasKey: boolean;
  masked: string | null;
  freePerDay: number;
}

interface Det {
  files: { path: string; data: string | Uint8Array }[];
  warnings: string[];
  note: string;
}

const STATUS: Record<ItemStatus, { label: string; tone: BadgeTone }> = {
  queued: { label: "Antre", tone: "neutral" },
  running: { label: "Diproses", tone: "violet" },
  done: { label: "Selesai", tone: "good" },
  warn: { label: "Cek hasil", tone: "warn" },
  error: { label: "Gagal", tone: "bad" },
  skipped: { label: "Dilewati", tone: "neutral" },
};

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const json = (await res.json().catch(() => null)) as { ok?: boolean; data?: T; error?: string } | null;
  if (!res.ok || !json?.ok) throw new Error(json?.error ?? `Server menjawab error (${res.status}).`);
  return json.data as T;
}

const TEXT_OUT = /\.(html?|css|scss|js|mjs|ts|tsx|jsx|json|md|txt|vue|svelte|astro|php|py|java|kt|swift|go|rs|cs|c|cpp|h|rb|dart|lua|sh|sql|ya?ml|toml|xml|mjs|svg)$/i;

export function ConvertView() {
  const { showToast } = useToast();
  const { setView } = useDeploy();

  const zipRef = React.useRef<HTMLInputElement>(null);
  const folderRef = React.useRef<HTMLInputElement>(null);
  const filesRef = React.useRef<HTMLInputElement>(null);
  const abortRef = React.useRef<AbortController | null>(null);

  const [tab, setTab] = React.useState<"upload" | "paste">("upload");
  const [reading, setReading] = React.useState(false);
  const [dragging, setDragging] = React.useState(false);
  const [source, setSource] = React.useState<CollectResult | null>(null);
  const [pasteCode, setPasteCode] = React.useState("");
  const [pasteName, setPasteName] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const [targetId, setTargetId] = React.useState<string>(NEXT16);
  const [customName, setCustomName] = React.useState("");
  const [customExt, setCustomExt] = React.useState("");
  const [hint, setHint] = React.useState("");
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [includeOthers, setIncludeOthers] = React.useState(false);

  const [items, setItems] = React.useState<RunItem[]>([]);
  const [det, setDet] = React.useState<Det | null>(null);
  const [skipped, setSkipped] = React.useState<{ path: string; reason: string }[]>([]);
  const [running, setRunning] = React.useState(false);
  const [finished, setFinished] = React.useState(false);
  const [fatal, setFatal] = React.useState<string | null>(null);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  const [keyStatus, setKeyStatus] = React.useState<KeyStatus | null>(null);
  const [keyInput, setKeyInput] = React.useState("");
  const [savingKey, setSavingKey] = React.useState(false);

  React.useEffect(() => () => abortRef.current?.abort(), []);
  React.useEffect(() => {
    api<KeyStatus>("/api/ai/key").then(setKeyStatus).catch(() => setKeyStatus({ hasKey: false, masked: null, freePerDay: 0 }));
  }, []);

  /* ---------- analisis sumber ---------- */

  const files = React.useMemo(() => source?.files ?? [], [source]);
  const nextKind = React.useMemo(() => (files.length ? detectNext(files) : null), [files]);
  const htmlPages = React.useMemo(() => files.filter((f) => /\.html?$/i.test(f.path)).length, [files]);

  const pasteLang: Lang | undefined = React.useMemo(() => {
    if (tab !== "paste") return undefined;
    return langOfPath(pasteName) ?? guessLangFromCode(pasteCode);
  }, [tab, pasteName, pasteCode]);

  const target: TargetSpec | null = React.useMemo(() => {
    if (targetId === NEXT16) return { id: NEXT16, label: "Next.js 16", ext: "tsx", prompt: "Next.js 16" };
    if (targetId === CUSTOM_ID) return customName.trim() ? customTarget(customName, customExt) : null;
    const l = langById(targetId);
    return l ? targetFromLang(l) : null;
  }, [targetId, customName, customExt]);

  const projectHtml = targetId === HTML_ID && !!nextKind && tab === "upload";
  const needsAi = targetId !== NEXT16;
  const aiReady = !!keyStatus && (keyStatus.hasKey || keyStatus.freePerDay > 0);

  const langStats = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const f of files) {
      if (isNoise(f.path)) continue;
      const l = langOfPath(f.path);
      if (l) m.set(l.label, (m.get(l.label) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [files]);

  const candidates = React.useMemo(
    () => files.filter((f) => !isNoise(f.path) && langOfPath(f.path)).map((f) => ({ path: f.path, size: f.data.byteLength, lang: langOfPath(f.path)! })),
    [files],
  );

  // Pilihan awal: semua file kode yang bukan bahasa tujuan dan muat di batas AI.
  React.useEffect(() => {
    if (projectHtml || targetId === NEXT16) return;
    setSelected(new Set(candidates.filter((c) => c.lang.id !== targetId && c.size <= MAX_FILE_CHARS * 3).map((c) => c.path)));
  }, [candidates, targetId, projectHtml]);

  /* ---------- membaca sumber ---------- */

  function resetResults() {
    abortRef.current?.abort();
    setItems([]);
    setDet(null);
    setSkipped([]);
    setFinished(false);
    setFatal(null);
    setPreview(null);
    setRunning(false);
  }

  async function load(run: () => Promise<CollectResult>) {
    setError(null);
    resetResults();
    setReading(true);
    try {
      const res = await run();
      if (res.files.length === 0) throw new UploadError("Tidak ada file yang bisa dibaca.");
      setSource(res);
      const hasHtml = res.files.some((f) => /\.html?$/i.test(f.path));
      const next = detectNext(res.files);
      setTargetId(hasHtml && !next ? NEXT16 : next ? HTML_ID : "ts");
    } catch (e) {
      setSource(null);
      setError(e instanceof UploadError ? e.message : "Gagal membaca file. Coba lagi atau pakai zip lain.");
    } finally {
      setReading(false);
    }
  }

  function onPickZip(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!/\.zip$/i.test(file.name)) return setError("File harus berformat .zip");
    void load(() => collectFromZip(file));
  }
  function onPickList(e: React.ChangeEvent<HTMLInputElement>) {
    const list = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = "";
    if (list.length) void load(() => collectFromFileList(list));
  }
  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (reading || running) return;
    const dt = e.dataTransfer;
    void load(() => collectFromDataTransfer(dt));
  }
  function clearSource() {
    resetResults();
    setSource(null);
    setError(null);
  }

  /* ---------- menyusun & menjalankan ---------- */

  function plan(): { items: RunItem[]; det: Det | null; skipped: { path: string; reason: string }[] } | string {
    // Tempel kode
    if (tab === "paste") {
      if (!pasteCode.trim()) return "Tempel kodenya dulu.";
      if (!target) return "Isi nama bahasa tujuan.";
      const from = pasteLang;
      const name = pasteName.trim() || `kode.${from?.ext ?? "txt"}`;
      if (targetId === NEXT16) {
        const out = convertHtmlProject({ files: [{ path: "index.html", data: enc.encode(pasteCode) }], projectName: "proyek-next" });
        return { items: [], det: { files: out.files, warnings: out.warnings, note: "Satu halaman HTML → proyek Next.js 16 lengkap." }, skipped: [] };
      }
      if (pasteCode.length > MAX_FILE_CHARS) return `Kodenya terlalu panjang (${Math.round(pasteCode.length / 1000)} KB; batas ${MAX_FILE_CHARS / 1000} KB). Bagi jadi beberapa bagian.`;
      if (!from) return "Bahasa asal tidak terdeteksi. Isi nama file dengan ekstensi yang benar, mis. app.py.";
      return {
        items: [{ id: name, path: name, outPath: targetPath(name, target), status: "queued", payload: { mode: "file", path: name, code: pasteCode, from: from.prompt, to: target.prompt, hint: hint.trim() || undefined } }],
        det: null,
        skipped: [],
      };
    }

    if (!source) return "Pilih file atau zip dulu.";

    if (targetId === NEXT16) {
      if (htmlPages === 0) return "Tidak ada file .html di sumber ini.";
      const out = convertHtmlProject({ files, projectName: source.strippedRoot ?? "proyek-next" });
      return {
        items: [],
        det: { files: out.files, warnings: out.warnings, note: `${out.pages.length} halaman HTML → proyek Next.js 16 (App Router, TypeScript).` },
        skipped: [],
      };
    }

    if (projectHtml) {
      const a = analyzeNextProject(files);
      if (a.jobs.length === 0) return a.warnings[0] ?? "Tidak ada halaman yang bisa dikonversi.";
      const its: RunItem[] = a.jobs.map((j) => ({
        id: j.id,
        path: j.sourcePath,
        outPath: j.outPath,
        status: "queued",
        payload: {
          mode: "page", path: j.sourcePath, code: j.code, context: j.context, routeMap: j.routeMap, assetPrefix: j.assetPrefix,
          cssLinks: j.cssLinks, imageImports: j.imageImports, tailwind: j.tailwind, hint: hint.trim() || undefined,
        },
      }));
      return {
        items: its,
        det: { files: a.staticFiles, warnings: a.warnings, note: `${a.jobs.length} halaman Next.js → HTML statis. CSS dan aset publik disalin otomatis.` },
        skipped: a.skipped,
      };
    }

    if (!target) return "Isi nama bahasa tujuan.";
    const chosen = candidates.filter((c) => selected.has(c.path));
    if (chosen.length === 0) return "Centang minimal satu file untuk dikonversi.";
    const sk: { path: string; reason: string }[] = [];
    const its: RunItem[] = [];
    for (const c of chosen) {
      const code = dec.decode(files.find((f) => f.path === c.path)!.data);
      if (code.length > MAX_FILE_CHARS) {
        sk.push({ path: c.path, reason: `terlalu besar (${Math.round(code.length / 1000)} KB; batas ${MAX_FILE_CHARS / 1000} KB) — pecah dulu` });
        continue;
      }
      if (!code.trim()) {
        sk.push({ path: c.path, reason: "file kosong" });
        continue;
      }
      its.push({
        id: c.path, path: c.path, outPath: targetPath(c.path, target), status: "queued",
        payload: { mode: "file", path: c.path, code, from: c.lang.prompt, to: target.prompt, hint: hint.trim() || undefined },
      });
    }
    if (its.length === 0) return "Semua file yang dipilih dilewati (terlalu besar atau kosong).";
    return { items: its, det: null, skipped: sk };
  }

  const patchItem = React.useCallback((id: string, patch: Partial<RunItem>) => {
    setItems((cur) => cur.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }, []);

  async function execute(list: RunItem[]) {
    const ctl = new AbortController();
    abortRef.current = ctl;
    setRunning(true);
    setFatal(null);
    const r = await runItems(list, { signal: ctl.signal, onChange: patchItem, concurrency: 2 });
    abortRef.current = null;
    setRunning(false);
    if (r.fatal) setFatal(r.fatal);
    else if (!ctl.signal.aborted) {
      setFinished(true);
      showToast("Konversi selesai.");
    }
  }

  async function start() {
    setError(null);
    const p = plan();
    if (typeof p === "string") return setError(p);
    if (needsAi && !aiReady) return setError("Pasang token Groq dulu (kartu di bawah), lalu coba lagi.");
    resetResults();
    setItems(p.items);
    setDet(p.det);
    setSkipped(p.skipped);
    setPreview(p.items[0]?.outPath ?? p.det?.files.find((f) => /app\/page\.tsx$|index\.html$/.test(f.path))?.path ?? null);
    if (p.items.length === 0) {
      setFinished(true);
      return;
    }
    await execute(p.items);
  }

  async function resume() {
    const list = items.map((i) => (i.status === "error" ? { ...i, status: "queued" as const, message: undefined } : i));
    setItems(list);
    setFinished(false);
    await execute(list);
  }

  function cancel() {
    abortRef.current?.abort();
  }

  /* ---------- hasil ---------- */

  const doneItems = items.filter((i) => (i.status === "done" || i.status === "warn") && i.output);
  const stats = {
    done: items.filter((i) => i.status === "done").length,
    warn: items.filter((i) => i.status === "warn").length,
    error: items.filter((i) => i.status === "error").length,
    total: items.length,
  };
  const finishedCount = stats.done + stats.warn + stats.error;
  const pct = stats.total ? Math.round((finishedCount / stats.total) * 100) : 0;

  const outputFiles = React.useMemo(() => {
    const out: { path: string; data: string | Uint8Array }[] = [];
    if (det) out.push(...det.files);
    for (const i of doneItems) out.push({ path: i.outPath, data: i.output! });
    return out;
  }, [det, doneItems]);

  const previewText = React.useMemo(() => {
    if (!preview) return null;
    const it = items.find((i) => i.outPath === preview);
    if (it?.output) return it.output;
    const f = det?.files.find((x) => x.path === preview);
    if (!f) return null;
    if (typeof f.data === "string") return f.data;
    return TEXT_OUT.test(f.path) ? dec.decode(f.data) : null;
  }, [preview, items, det]);

  function report(): string {
    const lines = ["# Laporan konversi", "", `Tujuan: ${target?.label ?? "-"}`, ""];
    if (det) lines.push(det.note, "");
    for (const i of items) lines.push(`- ${STATUS[i.status].label}: \`${i.path}\` → \`${i.outPath}\`${i.message ? ` — ${i.message}` : ""}`);
    for (const s of skipped) lines.push(`- Dilewati: \`${s.path}\` — ${s.reason}`);
    if (det?.warnings.length) lines.push("", "## Catatan", "", ...det.warnings.map((w) => `- ${w}`));
    lines.push("", "Hasil konversi AI perlu diperiksa dan diuji sebelum dipakai.", "");
    return lines.join("\n");
  }

  async function download() {
    try {
      const all = [...outputFiles];
      if (includeOthers && !projectHtml && targetId !== NEXT16) {
        const taken = new Set(all.map((f) => f.path));
        for (const f of files) if (!isNoise(f.path) && !taken.has(f.path) && !items.some((i) => i.path === f.path)) all.push({ path: `asli/${f.path}`, data: f.data });
      }
      if (items.length) all.push({ path: "LAPORAN-KONVERSI.md", data: report() });
      const base = (source?.strippedRoot || "konversi").replace(/[^A-Za-z0-9._-]+/g, "-");
      saveBlob(await buildZip(all), `${base}-${targetId === NEXT16 ? "next16" : targetId}.zip`);
    } catch {
      setError("Gagal membuat file ZIP. Coba lagi.");
    }
  }

  async function copyPreview() {
    if (!previewText) return;
    try {
      await navigator.clipboard.writeText(previewText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      showToast("Tidak bisa menyalin otomatis. Pilih teksnya lalu salin manual.");
    }
  }

  async function saveKey() {
    setSavingKey(true);
    try {
      const r = await api<{ hasKey: boolean; masked: string }>("/api/ai/key", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: keyInput.trim() }),
      });
      setKeyStatus((s) => ({ hasKey: r.hasKey, masked: r.masked, freePerDay: s?.freePerDay ?? 0 }));
      setKeyInput("");
      setFatal(null);
      showToast("Token Groq tersimpan dan terverifikasi.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Token gagal disimpan.");
    } finally {
      setSavingKey(false);
    }
  }

  /* ---------- tampilan ---------- */

  const groups = (["web", "bahasa", "data"] as LangGroup[]).map((g) => ({ g, list: LANGS.filter((l) => l.group === g) }));
  const hasInput = tab === "paste" ? pasteCode.trim().length > 0 : !!source;
  const busy = reading || running;
  const showResults = items.length > 0 || det !== null;

  const modeNote = !hasInput
    ? null
    : targetId === NEXT16
      ? "Tanpa AI: dikonversi langsung di browser, gratis dan tanpa kuota. Tiap halaman jadi app/…/page.tsx, aset masuk public/, skrip lama tetap jalan."
      : projectHtml
        ? "Proyek Next.js terdeteksi. Tiap halaman jadi satu file HTML lengkap (layout + komponen digabung) oleh AI; CSS dan aset publik disalin otomatis. Rute dinamis ([param]) dilewati."
        : "AI mengonversi file satu per satu dengan menjaga struktur dan perilakunya. Hasil perlu dicek sebelum dipakai.";

  return (
    <ViewFade>
      <div className="mb-6">
        <PageTitle
          title="Konversi"
          desc="Ubah HTML ke Next.js 16, Next.js ke HTML statis, atau kode ke bahasa dan format lain — dari zip, folder, file, atau tempel langsung."
        />
      </div>

      {error && (
        <div role="alert" className="mb-4 flex items-start gap-2.5 rounded-[14px] bg-[var(--bad-bg)] px-4 py-3 text-[13px] text-bad-fg">
          <CircleAlert size={16} className="mt-0.5 shrink-0" />
          <span className="min-w-0 flex-1 break-words">{error}</span>
          <button type="button" onClick={() => setError(null)} aria-label="Tutup pesan" className="shrink-0">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ---------- 1. Sumber ---------- */}
      <section className="surface-solid mb-4 p-5 sm:p-6" aria-labelledby="cv-src">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="cv-src" className="text-[14px] font-semibold">1. Sumber</h2>
          <div className="flex gap-1.5" role="tablist" aria-label="Cara memasukkan sumber">
            {(["upload", "paste"] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                disabled={busy}
                onClick={() => {
                  setTab(t);
                  resetResults();
                  setTargetId(t === "paste" ? "ts" : source ? (detectNext(files) ? HTML_ID : htmlPages ? NEXT16 : "ts") : NEXT16);
                }}
                className={chipCls(tab === t, true)}
              >
                {t === "upload" ? "Upload file" : "Tempel kode"}
              </button>
            ))}
          </div>
        </div>

        {tab === "upload" && !source && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              if (!busy) setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={cn("mt-4 flex flex-col items-center rounded-[14px] bg-[var(--pill-bg)] px-6 py-10 text-center transition", ON_MIST, dragging && "scale-[1.01] !bg-[var(--select-bg)]")}
          >
            {reading ? (
              <>
                <Loader2 size={30} className="animate-spin text-text-muted" />
                <p className="mt-3 text-[14px] font-medium">Membaca file…</p>
              </>
            ) : (
              <>
                <UploadCloud size={34} className="text-text-muted" />
                <p className="mt-3 text-[14px] font-medium">Tarik &amp; lepas zip, folder, atau file ke sini</p>
                <p className="mt-1 text-[12px] text-text-muted">node_modules, .git, dan hasil build otomatis dilewati. File .env tidak dibaca.</p>
                <div className="mt-5 flex flex-wrap justify-center gap-2.5">
                  <button type="button" onClick={() => zipRef.current?.click()} className="btn-primary btn-md inline-flex items-center gap-2">
                    <FileArchive size={15} /> Pilih ZIP
                  </button>
                  <button type="button" onClick={() => folderRef.current?.click()} className="pill btn-md inline-flex items-center gap-2 font-medium hover:bg-[var(--card-hover)]">
                    <FolderUp size={15} /> Pilih folder
                  </button>
                  <button type="button" onClick={() => filesRef.current?.click()} className="pill btn-md inline-flex items-center gap-2 font-medium hover:bg-[var(--card-hover)]">
                    Pilih file
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {tab === "upload" && source && (
          <div className="mt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[13px] font-medium">
                {source.files.length} file <span className="font-normal text-text-muted">· {formatBytes(source.totalBytes)}</span>
                {nextKind && <span className="ml-2"><Badge tone="violet">Next.js ({nextKind === "app" ? "App Router" : "Pages"})</Badge></span>}
                {!nextKind && htmlPages > 0 && <span className="ml-2"><Badge tone="violet">{htmlPages} halaman HTML</Badge></span>}
              </p>
              {!busy && (
                <button type="button" onClick={clearSource} className="text-[12px] text-text-muted underline underline-offset-4">
                  Ganti sumber
                </button>
              )}
            </div>
            {langStats.length > 0 && (
              <p className="mt-1.5 text-[12px] text-text-muted">{langStats.slice(0, 8).map(([l, n]) => `${l} ${n}`).join(" · ")}</p>
            )}
          </div>
        )}

        {tab === "paste" && (
          <div className="mt-4 grid gap-3">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <div>
                <label htmlFor="cv-name" className="mb-1.5 block text-[12px] font-medium">Nama file (opsional)</label>
                <input id="cv-name" value={pasteName} disabled={busy} onChange={(e) => setPasteName(e.target.value)} placeholder="app.py, index.html, Button.tsx …" className={inputCls} autoComplete="off" spellCheck={false} />
              </div>
              <p className="pb-2.5 text-[12px] text-text-muted">
                Bahasa asal: <b>{pasteLang?.label ?? "belum terdeteksi"}</b>
              </p>
            </div>
            <div>
              <label htmlFor="cv-code" className="mb-1.5 block text-[12px] font-medium">Kode</label>
              <textarea id="cv-code" value={pasteCode} disabled={busy} onChange={(e) => setPasteCode(e.target.value)} rows={10} spellCheck={false} placeholder="Tempel kode di sini…" className={cn(inputCls, "resize-y font-mono text-[13px] leading-relaxed")} />
              <p className="mt-1 text-[12px] text-text-muted">{pasteCode.length.toLocaleString("id-ID")} karakter · batas {MAX_FILE_CHARS.toLocaleString("id-ID")} untuk konversi AI</p>
            </div>
          </div>
        )}

        <input ref={zipRef} type="file" accept=".zip,application/zip" className="hidden" onChange={onPickZip} />
        <input ref={filesRef} type="file" multiple className="hidden" onChange={onPickList} />
        <input
          ref={folderRef}
          type="file"
          className="hidden"
          onChange={onPickList}
          // @ts-expect-error — webkitdirectory belum ada di tipe React, tapi didukung semua browser utama.
          webkitdirectory=""
          multiple
        />
      </section>

      {/* ---------- 2. Tujuan ---------- */}
      {hasInput && (
        <section className="surface-solid mb-4 p-5 sm:p-6" aria-labelledby="cv-tgt">
          <h2 id="cv-tgt" className="text-[14px] font-semibold">2. Konversi ke</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="cv-target" className="mb-1.5 block text-[12px] font-medium">Tujuan</label>
              <select id="cv-target" value={targetId} disabled={busy} onChange={(e) => { setTargetId(e.target.value); resetResults(); }} className={inputCls}>
                <optgroup label="Proyek utuh">
                  <option value={NEXT16} disabled={tab === "upload" ? htmlPages === 0 : pasteLang?.id !== "html"}>
                    Next.js 16 (dari HTML){(tab === "upload" ? htmlPages === 0 : pasteLang?.id !== "html") ? " — butuh sumber HTML" : ""}
                  </option>
                </optgroup>
                {groups.map(({ g, list }) => (
                  <optgroup key={g} label={GROUP_LABEL[g]}>
                    {list.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.id === HTML_ID && nextKind && tab === "upload" ? "HTML statis (dari proyek Next.js)" : l.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
                <optgroup label="Lainnya">
                  <option value={CUSTOM_ID}>Ketik sendiri…</option>
                </optgroup>
              </select>
            </div>
            {targetId === CUSTOM_ID && (
              <div className="grid grid-cols-[1fr_6rem] gap-2">
                <div>
                  <label htmlFor="cv-cname" className="mb-1.5 block text-[12px] font-medium">Bahasa / format</label>
                  <input id="cv-cname" value={customName} disabled={busy} onChange={(e) => setCustomName(e.target.value)} placeholder="Elixir, Twig, Zig …" className={inputCls} autoComplete="off" />
                </div>
                <div>
                  <label htmlFor="cv-cext" className="mb-1.5 block text-[12px] font-medium">Ekstensi</label>
                  <input id="cv-cext" value={customExt} disabled={busy} onChange={(e) => setCustomExt(e.target.value)} placeholder="ex" className={inputCls} autoComplete="off" spellCheck={false} />
                </div>
              </div>
            )}
          </div>

          {needsAi && (
            <div className="mt-4">
              <label htmlFor="cv-hint" className="mb-1.5 block text-[12px] font-medium">Instruksi tambahan (opsional)</label>
              <input id="cv-hint" value={hint} maxLength={300} disabled={busy} onChange={(e) => setHint(e.target.value)} placeholder="mis. pakai Tailwind, gunakan async/await, tanpa dependensi eksternal" className={inputCls} />
            </div>
          )}

          {modeNote && (
            <p className="mt-4 flex items-start gap-2 text-[13px] leading-relaxed text-text-muted">
              {needsAi ? <Sparkles size={15} className="mt-0.5 shrink-0" /> : <ArrowRight size={15} className="mt-0.5 shrink-0" />}
              {modeNote}
            </p>
          )}

          {/* pilih file (mode per-file) */}
          {tab === "upload" && source && targetId !== NEXT16 && !projectHtml && (
            <div className="mt-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[13px] font-medium">File yang dikonversi <span className="font-normal text-text-muted">({selected.size} dari {candidates.length})</span></p>
                <div className="flex gap-3 text-[12px]">
                  <button type="button" className="underline underline-offset-4" disabled={busy} onClick={() => setSelected(new Set(candidates.filter((c) => c.lang.id !== targetId).map((c) => c.path)))}>Pilih semua</button>
                  <button type="button" className="underline underline-offset-4" disabled={busy} onClick={() => setSelected(new Set())}>Kosongkan</button>
                </div>
              </div>
              {candidates.length === 0 ? (
                <p className="mt-2 text-[13px] text-text-muted">Tidak ada file kode yang dikenali di sumber ini.</p>
              ) : (
                <ul className="mt-2 max-h-64 space-y-0.5 overflow-y-auto rounded-[14px] bg-[var(--pill-bg)] p-2" aria-label="Daftar file">
                  {candidates.slice(0, 400).map((c) => {
                    const big = c.size > MAX_FILE_CHARS * 3;
                    return (
                      <li key={c.path}>
                        <label className={cn("flex cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-[13px] hover:bg-[var(--card-hover)]", big && "opacity-60")}>
                          <input
                            type="checkbox"
                            checked={selected.has(c.path)}
                            disabled={busy}
                            onChange={(e) => setSelected((s) => { const n = new Set(s); if (e.target.checked) n.add(c.path); else n.delete(c.path); return n; })}
                          />
                          <span className="min-w-0 flex-1 truncate font-mono" title={c.path}>{c.path}</span>
                          <span className="shrink-0 text-text-muted">{c.lang.label} · {formatBytes(c.size)}</span>
                        </label>
                      </li>
                    );
                  })}
                  {candidates.length > 400 && <li className="px-2.5 py-1 text-[12px] text-text-muted">…dan {candidates.length - 400} file lain (tidak ditampilkan)</li>}
                </ul>
              )}
              <label className="mt-3 flex items-center gap-2 text-[13px]">
                <input type="checkbox" checked={includeOthers} onChange={(e) => setIncludeOthers(e.target.checked)} />
                Sertakan file asli yang tidak dikonversi di ZIP (folder <code>asli/</code>)
              </label>
            </div>
          )}

          {/* token AI */}
          {needsAi && keyStatus && !aiReady && (
            <div className="mt-5 rounded-[14px] bg-[var(--warn-bg)] p-4 text-[13px] text-warn-fg">
              <p className="font-medium">Konversi AI butuh token Groq (gratis).</p>
              <p className="mt-1 leading-relaxed">
                Buat di{" "}
                <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="underline">console.groq.com/keys<span className="sr-only"> (buka di tab baru)</span></a>
                , lalu tempel di sini. Disimpan terenkripsi dan dipakai juga oleh AI Web Builder.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <label htmlFor="cv-key" className="sr-only">Token Groq</label>
                <input id="cv-key" type="password" autoComplete="off" spellCheck={false} value={keyInput} onChange={(e) => setKeyInput(e.target.value)} placeholder="gsk_…" className={cn(inputCls, "min-w-0 flex-1 !bg-[var(--surface-solid)]")} />
                <Btn variant="primary" busy={savingKey} disabled={!keyInput.trim()} onClick={saveKey}>Simpan token</Btn>
              </div>
            </div>
          )}
          {needsAi && keyStatus?.hasKey && <p className="mt-4 text-[12px] text-text-muted">Memakai token Groq-mu ({keyStatus.masked}). Kuota mengikuti akun Groq-mu.</p>}
          {needsAi && keyStatus && !keyStatus.hasKey && keyStatus.freePerDay > 0 && (
            <p className="mt-4 text-[12px] text-text-muted">Jatah gratis: {keyStatus.freePerDay * 5} file per hari. Pasang token sendiri di <button type="button" className="underline underline-offset-4" onClick={() => setView("ai")}>AI Web Builder</button> untuk tanpa batas dari Depup.</p>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Btn variant="primary" onClick={start} busy={running} disabled={reading || (needsAi && !aiReady)} className="!px-6 !py-2.5 !text-[13px]">
              {running ? "Mengonversi…" : finished || showResults ? "Konversi ulang" : "Mulai konversi"}
            </Btn>
            {running && <Btn onClick={cancel}>Batalkan</Btn>}
          </div>
        </section>
      )}

      {/* ---------- 3. Hasil ---------- */}
      {showResults && (
        <section className="surface-solid p-5 sm:p-6" aria-labelledby="cv-res" aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 id="cv-res" className="text-[14px] font-semibold">3. Hasil</h2>
              {det && <p className="mt-0.5 text-[13px] text-text-muted">{det.note}</p>}
            </div>
            <Btn variant="primary" onClick={download} disabled={outputFiles.length === 0}>
              <Download size={14} /> Unduh ZIP
            </Btn>
          </div>

          {items.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-[12px] text-text-muted">
                <span>{finishedCount} dari {stats.total} file{stats.warn ? ` · ${stats.warn} perlu dicek` : ""}{stats.error ? ` · ${stats.error} gagal` : ""}</span>
                <span>{pct}%</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[var(--pill-bg)]" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Kemajuan konversi">
                <div className="h-full rounded-full bg-[var(--lime)] transition-[width] duration-300" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )}

          {fatal && (
            <div role="alert" className="mt-4 flex flex-wrap items-center gap-3 rounded-[14px] bg-[var(--bad-bg)] px-4 py-3 text-[13px] text-bad-fg">
              <CircleAlert size={16} className="shrink-0" />
              <span className="min-w-0 flex-1">{fatal}</span>
              <Btn onClick={resume}>Lanjutkan</Btn>
            </div>
          )}

          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <ul className="max-h-[28rem] space-y-1 overflow-y-auto" aria-label="Daftar hasil">
              {items.map((i) => (
                <li key={i.id}>
                  <button
                    type="button"
                    onClick={() => setPreview(i.outPath)}
                    aria-pressed={preview === i.outPath}
                    className={cn("flex w-full items-center gap-2.5 rounded-[14px] px-3 py-2 text-left text-[13px] transition", preview === i.outPath ? SELECTED_FILL : "bg-[var(--pill-bg)] hover:bg-[var(--card-hover)]")}
                  >
                    {i.status === "running" ? <Loader2 size={14} className="shrink-0 animate-spin" /> : <span className="h-3.5 w-3.5 shrink-0" aria-hidden />}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-mono" title={i.outPath}>{i.outPath}</span>
                      {i.message && <span className={cn("block truncate text-[12px]", preview === i.outPath ? "opacity-90" : "text-text-muted")} title={i.message}>{i.message}</span>}
                    </span>
                    <Badge tone={STATUS[i.status].tone}>{STATUS[i.status].label}</Badge>
                  </button>
                </li>
              ))}
              {det && det.files.length > 0 && items.length === 0 &&
                det.files.slice(0, 200).map((f) => (
                  <li key={f.path}>
                    <button
                      type="button"
                      onClick={() => setPreview(f.path)}
                      aria-pressed={preview === f.path}
                      className={cn("flex w-full items-center rounded-[14px] px-3 py-2 text-left font-mono text-[13px] transition", preview === f.path ? SELECTED_FILL : "bg-[var(--pill-bg)] hover:bg-[var(--card-hover)]")}
                    >
                      <span className="truncate" title={f.path}>{f.path}</span>
                    </button>
                  </li>
                ))}
              {det && det.files.length > 0 && items.length > 0 && (
                <li className="px-1 pt-1 text-[12px] text-text-muted">+ {det.files.length} file aset &amp; CSS disalin otomatis (ada di ZIP)</li>
              )}
            </ul>

            <div className="min-w-0">
              {previewText !== null ? (
                <>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate font-mono text-[12px] text-text-muted" title={preview ?? ""}>{preview}</span>
                    <button type="button" onClick={copyPreview} className="pill inline-flex shrink-0 items-center gap-1.5 px-3 py-1 text-[12px] font-medium">
                      {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? "Tersalin" : "Salin"}
                    </button>
                  </div>
                  <pre tabIndex={0} className="max-h-[26rem] overflow-auto rounded-[14px] bg-[var(--pill-bg)] p-3.5 font-mono text-[12px] leading-relaxed" aria-label="Pratinjau kode hasil"><code>{previewText.length > 60_000 ? previewText.slice(0, 60_000) + "\n… (dipotong; lengkapnya ada di ZIP)" : previewText}</code></pre>
                </>
              ) : (
                <p className="rounded-[14px] bg-[var(--pill-bg)] p-4 text-[13px] text-text-muted">
                  {running ? "Pilih file yang sudah selesai untuk melihat hasilnya." : "Pilih file di kiri untuk melihat isinya."}
                </p>
              )}
            </div>
          </div>

          {skipped.length > 0 && (
            <details className="mt-4 text-[12px] text-text-muted">
              <summary className="cursor-pointer select-none">{skipped.length} file dilewati</summary>
              <ul className="mt-2 max-h-40 space-y-0.5 overflow-y-auto pl-4">
                {skipped.map((s) => (
                  <li key={s.path} className="list-disc break-all"><code>{s.path}</code> — {s.reason}</li>
                ))}
              </ul>
            </details>
          )}
          {det && det.warnings.length > 0 && (
            <details className="mt-3 text-[12px] text-text-muted" open={det.warnings.length <= 3}>
              <summary className="cursor-pointer select-none">{det.warnings.length} catatan konversi</summary>
              <ul className="mt-2 space-y-1 pl-4">
                {det.warnings.slice(0, 40).map((w, idx) => (
                  <li key={idx} className="list-disc break-words">{w}</li>
                ))}
              </ul>
            </details>
          )}
          {stats.warn + stats.done > 0 && needsAi && (
            <p className="mt-4 text-[12px] text-text-muted">Hasil AI bukan jaminan 100% benar. Jalankan, uji, dan baca ulang sebelum dipakai di produksi.</p>
          )}
        </section>
      )}
    </ViewFade>
  );
}
