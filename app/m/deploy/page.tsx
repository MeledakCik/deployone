"use client";

import * as React from "react";
import Link from "next/link";
import { Check, GitBranch, UploadCloud, Link2, CircleAlert, Loader2, Clock, ChevronRight, Sparkles } from "@/components/ui/icons";
import { useDeploy } from "@/lib/deploy-context";
import { RepoCheckCard } from "@/components/dashboard/RepoCheckCard";
import { CARD, PlatformTile } from "@/components/m/ui";
import { cn } from "@/lib/utils";
import type { Platform } from "@/types";

const PLATFORMS: { id: Platform; name: string; desc: string }[] = [
  { id: "vercel", name: "Vercel", desc: "Frontend cloud terbaik untuk Next.js, React, Astro & situs statis." },
  { id: "railway", name: "Railway", desc: "Backend Node, Python, Dockerfile & database." },
  { id: "cloudflare", name: "Cloudflare", desc: "Pages super cepat di jaringan edge global." },
];

function suggestName(url: string) {
  const m = /github\.com\/[^/\s]+\/([^/\s#?]+)/i.exec(url);
  return m ? m[1].replace(/\.git$/, "").toLowerCase().replace(/[^a-z0-9-]/g, "-") : "";
}

/**
 * Deploy dari HP. Memakai mesin deploy yang SAMA dengan dashboard web (deploy-context):
 * cek repo, deteksi env otomatis, cek kecocokan platform, auto-fix Railway, panduan error, dst.
 * Progres & hasil tampil lewat DeployModal yang sama.
 */
export default function MobileDeploy() {
  const {
    form, setFormField, submitDeploy, deployState, repoEnvCheck,
    vercelToken, railwayToken, cloudflareToken, cloudflareAccountId, githubPat, historyReady,
  } = useDeploy();
  const [nameTouched, setNameTouched] = React.useState(false);
  const [envOpen, setEnvOpen] = React.useState(false);
  const platform = (form.platform || "vercel") as Platform;
  const busy = deployState.status === "deploying";

  // Platform default + token tersimpan otomatis masuk ke form (sama seperti form web).
  React.useEffect(() => {
    if (!form.platform) setFormField("platform", "vercel");
  }, [form.platform, setFormField]);
  React.useEffect(() => {
    const token = platform === "vercel" ? vercelToken : platform === "railway" ? railwayToken : cloudflareToken;
    if (token && form.platformToken !== token) setFormField("platformToken", token);
    if (platform === "cloudflare" && cloudflareAccountId && form.accountId !== cloudflareAccountId) {
      setFormField("accountId", cloudflareAccountId);
    }
    if (githubPat && form.githubPat !== githubPat) setFormField("githubPat", githubPat);
  }, [platform, vercelToken, railwayToken, cloudflareToken, cloudflareAccountId, githubPat, form.platformToken, form.accountId, form.githubPat, setFormField]);

  function pickPlatform(p: Platform) {
    if (p === platform) return;
    setFormField("platform", p);
    setFormField("platformToken", "");
  }

  function onUrl(v: string) {
    setFormField("githubUrl", v);
    if (!nameTouched) setFormField("projectName", suggestName(v));
  }

  const hasToken: Record<Platform, boolean> = {
    vercel: !!vercelToken,
    railway: !!railwayToken,
    cloudflare: !!cloudflareToken && !!cloudflareAccountId,
  };
  const missing: Record<Platform, string> = {
    vercel: "Token Vercel belum diisi",
    railway: "Token Railway belum diisi",
    cloudflare: "Token & akun Cloudflare belum lengkap",
  };
  const noToken = historyReady && !hasToken[platform];
  const blocked = repoEnvCheck.validation?.compat[platform]?.level === "blocked";
  const ready = !!form.githubUrl.trim() && !!form.projectName.trim() && !busy && hasToken[platform] && !blocked;
  const platName = PLATFORMS.find((p) => p.id === platform)?.name ?? "";

  // Status tiap langkah dihitung dari isian sebenarnya, supaya pengguna tahu apa yang masih kurang.
  const stepDone = [hasToken[platform], !!form.githubUrl.trim() && !!form.projectName.trim() && !blocked, false];
  const currentStep = stepDone.findIndex((d) => !d);
  // Alasan tombol deploy belum aktif (tombol nonaktif tanpa penjelasan membingungkan).
  const reason = busy
    ? ""
    : !form.githubUrl.trim()
      ? "Isi link repo GitHub dulu."
      : !form.projectName.trim()
        ? "Beri nama project dulu."
        : noToken
          ? `${missing[platform]}.`
          : blocked
            ? `Repo ini belum cocok dengan ${platName}. Cek detailnya di atas.`
            : "";

  const input = "input-solid h-12 w-full px-4 text-[16px] font-medium";
  const label = "mb-1.5 block text-[12px] font-semibold text-text-muted";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (ready) submitDeploy(e);
      }}
      className="space-y-5 pb-20 pt-2"
    >
      <ol className="flex items-center gap-2 px-1 text-[12px] font-semibold" aria-label="Langkah deploy">
        {["Platform", "Sumber kode", "Deploy"].map((s, i, all) => {
          const done = stepDone[i];
          const active = i === currentStep;
          return (
            <li key={s} aria-current={active ? "step" : undefined} className="flex flex-1 items-center gap-1.5 whitespace-nowrap last:flex-none">
              <span
                className={cn(
                  "grid h-6 w-6 place-items-center rounded-full text-[12px]",
                  done ? "bg-[var(--ink-fill)] text-white" : active ? "bg-tone-lilac text-lav-text ring-2 ring-[color:var(--accent)]" : "bg-[var(--pill-bg)] text-text-muted",
                )}
              >
                {done ? <Check size={13} aria-hidden /> : i + 1}
              </span>
              <span className={done || active ? "text-lav-text" : "text-text-muted"}>{s}</span>
              {i < all.length - 1 && <span className={cn("h-px flex-1", done ? "bg-[var(--accent)]" : "bg-[var(--line-strong)]")} />}
            </li>
          );
        })}
      </ol>

      <section className="space-y-3">
        <h2 className="text-[16px] font-bold tracking-tight">Pilih platform</h2>
        {PLATFORMS.map((p) => {
          const sel = platform === p.id;
          const connected = historyReady && hasToken[p.id];
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => pickPlatform(p.id)}
              disabled={busy}
              aria-pressed={sel}
              className={cn(CARD, "flex w-full items-start gap-3 p-4 text-left transition active:scale-[0.99] disabled:opacity-60", sel && "ring-2 ring-[color:var(--accent)]")}
            >
              <PlatformTile platform={p.id} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[16px] font-bold tracking-tight">{p.name}</p>
                  {connected ? (
                    <span className="rounded-full bg-ok-bg px-2 py-0.5 text-[12px] font-semibold text-ok-fg">Terhubung</span>
                  ) : historyReady ? (
                    <span className="rounded-full bg-[var(--pill-bg)] px-2 py-0.5 text-[12px] font-semibold text-text-muted">Belum ada token</span>
                  ) : null}
                </div>
                <p className="mt-0.5 text-[13px] leading-snug text-text-muted">{p.desc}</p>
              </div>
              {sel ? (
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--ink-fill)] text-white">
                  <Check size={14} aria-hidden />
                </span>
              ) : (
                <span className="mt-0.5 h-6 w-6 shrink-0 rounded-full border-2 border-[var(--line-strong)]" />
              )}
            </button>
          );
        })}
      </section>

      {noToken && (
        <Link href="/m/pengaturan" className="notice notice-warn items-center active:scale-[0.99]">
          <CircleAlert size={20} className="shrink-0 text-warn" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold">{missing[platform]}</p>
            <p className="text-[13px] leading-snug">Isi sekali di Settings, lalu deploy dari HP kapan saja.</p>
          </div>
          <ChevronRight size={18} className="shrink-0" aria-hidden />
        </Link>
      )}

      <section className="space-y-3">
        <h2 className="text-[16px] font-bold tracking-tight">Sumber kode</h2>
        <div className="grid grid-cols-3 gap-1 rounded-[14px] bg-[var(--pill-bg)] p-1 text-[13px] font-semibold">
          <span className="flex h-10 items-center justify-center gap-1.5 rounded-[10px] bg-white text-lav-text shadow-sm">
            <GitBranch size={16} aria-hidden /> <span className="truncate">GitHub</span>
          </span>
          <Link href="/m/upload" className="flex h-10 items-center justify-center gap-1.5 rounded-[10px] text-text-muted active:bg-white/60">
            <UploadCloud size={16} aria-hidden /> <span className="truncate">Unggah</span>
          </Link>
          <Link href="/m/link-instan" className="flex h-10 min-w-0 items-center justify-center gap-1.5 rounded-[10px] text-text-muted active:bg-white/60">
            <Link2 size={16} aria-hidden /> <span className="truncate">Link Instan</span>
          </Link>
        </div>

        <div className={`${CARD} space-y-3 p-4`}>
          <label className="block">
            <span className={label}>Link repo GitHub</span>
            <input className={input} inputMode="url" autoCapitalize="none" autoCorrect="off" placeholder="https://github.com/user/repo" value={form.githubUrl} onChange={(e) => onUrl(e.target.value)} />
            <RepoCheckCard platform={platform} />
          </label>
          <label className="block">
            <span className={label}>Nama project</span>
            <input className={input} autoCapitalize="none" autoCorrect="off" placeholder="nama-project" value={form.projectName} onChange={(e) => { setNameTouched(true); setFormField("projectName", e.target.value); }} />
          </label>

          {platform === "cloudflare" && (
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className={label}>Build command</span>
                <input className={input} autoCapitalize="none" autoCorrect="off" placeholder="otomatis" value={form.buildCommand} onChange={(e) => setFormField("buildCommand", e.target.value)} />
              </label>
              <label className="block">
                <span className={label}>Output dir</span>
                <input className={input} autoCapitalize="none" autoCorrect="off" placeholder="otomatis" value={form.outputDir} onChange={(e) => setFormField("outputDir", e.target.value)} />
              </label>
            </div>
          )}
          {platform === "railway" && (
            <label className="block">
              <span className={label}>Start command (opsional)</span>
              <input className={input} autoCapitalize="none" autoCorrect="off" placeholder="npm start" value={form.startCommand} onChange={(e) => setFormField("startCommand", e.target.value)} />
            </label>
          )}

          <div>
            <button type="button" onClick={() => setEnvOpen((o) => !o)} aria-expanded={envOpen} className="flex min-h-[40px] w-full items-center justify-between text-[13px] font-semibold text-lav-text">
              Variabel environment {repoEnvCheck.detectedEnvVars.length > 0 && `(${repoEnvCheck.detectedEnvVars.length} terdeteksi)`}
              <ChevronRight size={16} aria-hidden className={`transition ${envOpen ? "rotate-90" : ""}`} />
            </button>
            {(envOpen || form.envText.trim().length > 0) && (
              <textarea
                value={form.envText}
                onChange={(e) => setFormField("envText", e.target.value)}
                rows={5}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder={"KEY=value\nDATABASE_URL=..."}
                className="input-solid mt-2 w-full px-4 py-3 font-mono text-[13px]"
              />
            )}
          </div>
        </div>
      </section>

      <Link href="/m/ai" className={`${CARD} flex items-center gap-3 p-3.5 active:scale-[0.99]`}>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] bg-tone-lilac text-lav-text">
          <Sparkles size={20} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold">Belum punya repo?</p>
          <p className="text-[12px] text-text-muted">Buat situsnya dengan AI Web Builder.</p>
        </div>
        <ChevronRight size={18} className="shrink-0 text-text-faint" aria-hidden />
      </Link>

      <div className="notice notice-info items-center">
        <Clock size={20} className="shrink-0" aria-hidden />
        <div>
          <p className="text-[14px] font-semibold">Estimasi sekitar 1–3 menit</p>
          <p className="text-[12px]">Otomatis SSL & CDN dari {platName}.</p>
        </div>
      </div>

      {/* pb-10: tombol CTA harus berada di atas FAB "Deploy" bilah bawah (FAB menjulang 32px di atas bilah). */}
      <div className="fixed inset-x-0 z-40 bg-white/95 px-4 pb-10 pt-2.5 shadow-[0_-10px_25px_-5px_rgba(18,11,46,0.08)] backdrop-blur-md" style={{ bottom: "calc(64px + env(safe-area-inset-bottom))" }}>
        <div className="mx-auto w-full max-w-[540px]">
          {!ready && reason && (
            <p role="status" className="mb-2 text-center text-[12px] text-text-muted">
              {reason}
            </p>
          )}
          <button type="submit" disabled={!ready} className="btn-primary btn-xl w-full disabled:cursor-not-allowed disabled:opacity-50">
            {busy ? <><Loader2 size={20} className="animate-spin" aria-hidden /> Sedang deploy…</> : `Mulai deploy ke ${platName}`}
          </button>
        </div>
      </div>
    </form>
  );
}
