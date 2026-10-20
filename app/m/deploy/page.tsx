"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2, GitBranch, CloudUpload, Zap, AlertCircle, Loader2, Timer, ChevronRight, Sparkles } from "lucide-react";
import { useDeploy } from "@/lib/deploy-context";
import { RepoCheckCard } from "@/components/dashboard/RepoCheckCard";
import { CARD, PlatformTile } from "@/components/m/ui";
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

  const input =
    "h-12 w-full rounded-[14px] bg-[#F1F3FF] px-4 text-[15px] font-medium text-[#141B2B] outline-none ring-1 ring-[#E2E8F0] transition placeholder:text-[#94A3B8] focus:bg-white focus:ring-2 focus:ring-[#7C3AED]";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (ready) submitDeploy(e);
      }}
      className="space-y-5 pb-20 pt-2"
    >
      <ol className="flex items-center gap-2 px-1 text-[11.5px] font-bold">
        {["Platform", "Sumber kode", "Deploy"].map((s, i) => (
          <li key={s} className="flex flex-1 items-center gap-1.5 whitespace-nowrap last:flex-none">
            <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] ${i < 2 ? "bg-[#7C3AED] text-white" : "bg-[#E2E8F0] text-[#64748B]"}`}>{i + 1}</span>
            <span className={i < 2 ? "text-[#6D28D9]" : "text-[#64748B]"}>{s}</span>
            {i < 2 && <span className="h-px flex-1 bg-[#DDD6FE]" />}
          </li>
        ))}
      </ol>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-[16px] font-extrabold tracking-[-0.02em]">
          <span className="h-2 w-2 rounded-full bg-[#7C3AED]" /> Pilih platform
        </h2>
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
              className={`${CARD} flex w-full items-start gap-3 p-4 text-left transition active:scale-[0.99] disabled:opacity-60 ${sel ? "ring-2 ring-[#7C3AED]" : ""}`}
            >
              <PlatformTile platform={p.id} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[16px] font-extrabold">{p.name}</p>
                  {connected ? (
                    <span className="rounded-full bg-[#ECFDF5] px-2 py-0.5 text-[10.5px] font-bold text-[#065F46]">Terhubung</span>
                  ) : historyReady ? (
                    <span className="rounded-full bg-[#F1F5F9] px-2 py-0.5 text-[10.5px] font-bold text-[#64748B]">Belum ada token</span>
                  ) : null}
                </div>
                <p className="mt-0.5 text-[12.5px] leading-snug text-[#64748B]">{p.desc}</p>
              </div>
              {sel ? <CheckCircle2 className="h-6 w-6 shrink-0 text-[#7C3AED]" fill="#7C3AED" stroke="white" /> : <span className="mt-0.5 h-6 w-6 shrink-0 rounded-full bg-[#F1EEFF]" />}
            </button>
          );
        })}
      </section>

      {noToken && (
        <Link href="/m/pengaturan" className="flex items-start gap-3 rounded-[16px] bg-[#FFFBEB] p-4 ring-1 ring-[#FDE68A] active:scale-[0.99]">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#D97706]" />
          <div className="min-w-0 flex-1">
            <p className="text-[13.5px] font-bold text-[#92400E]">{missing[platform]}</p>
            <p className="text-[12.5px] leading-snug text-[#92400E]/80">Isi sekali di Pengaturan, lalu deploy dari HP kapan saja.</p>
          </div>
          <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-[#D97706]" />
        </Link>
      )}

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-[16px] font-extrabold tracking-[-0.02em]">
          <span className="h-2 w-2 rounded-full bg-[#7C3AED]" /> Sumber kode
        </h2>
        <div className="grid grid-cols-3 gap-1 rounded-[16px] bg-[#EEF1FF] p-1 text-[12.5px] font-bold">
          <span className="flex h-10 items-center justify-center gap-1.5 rounded-[12px] bg-white text-[#6D28D9] shadow-sm">
            <GitBranch className="h-4 w-4" /> GitHub
          </span>
          <Link href="/m/upload" className="flex h-10 items-center justify-center gap-1.5 rounded-[12px] text-[#64748B] active:bg-white/60">
            <CloudUpload className="h-4 w-4" /> Zip
          </Link>
          <Link href="/m/link-instan" className="flex h-10 items-center justify-center gap-1.5 rounded-[12px] text-[#64748B] active:bg-white/60">
            <Zap className="h-4 w-4" /> Instan
          </Link>
        </div>

        <div className={`${CARD} space-y-3 p-4`}>
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-bold text-[#4A4455]">Link repo GitHub</span>
            <input className={input} inputMode="url" autoCapitalize="none" autoCorrect="off" placeholder="https://github.com/user/repo" value={form.githubUrl} onChange={(e) => onUrl(e.target.value)} />
            <RepoCheckCard platform={platform} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-bold text-[#4A4455]">Nama project</span>
            <input className={input} autoCapitalize="none" autoCorrect="off" placeholder="nama-project" value={form.projectName} onChange={(e) => { setNameTouched(true); setFormField("projectName", e.target.value); }} />
          </label>

          {platform === "cloudflare" && (
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-bold text-[#4A4455]">Build command</span>
                <input className={input} autoCapitalize="none" autoCorrect="off" placeholder="otomatis" value={form.buildCommand} onChange={(e) => setFormField("buildCommand", e.target.value)} />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-bold text-[#4A4455]">Output dir</span>
                <input className={input} autoCapitalize="none" autoCorrect="off" placeholder="otomatis" value={form.outputDir} onChange={(e) => setFormField("outputDir", e.target.value)} />
              </label>
            </div>
          )}
          {platform === "railway" && (
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-bold text-[#4A4455]">Start command (opsional)</span>
              <input className={input} autoCapitalize="none" autoCorrect="off" placeholder="npm start" value={form.startCommand} onChange={(e) => setFormField("startCommand", e.target.value)} />
            </label>
          )}

          <div>
            <button type="button" onClick={() => setEnvOpen((o) => !o)} className="flex w-full items-center justify-between text-[12px] font-bold text-[#6D28D9]">
              Variabel environment {repoEnvCheck.detectedEnvVars.length > 0 && `(${repoEnvCheck.detectedEnvVars.length} terdeteksi)`}
              <ChevronRight className={`h-4 w-4 transition ${envOpen ? "rotate-90" : ""}`} />
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
                className="mt-2 w-full rounded-[14px] bg-[#F1F3FF] px-4 py-3 font-mono text-[13px] outline-none ring-1 ring-[#E2E8F0] focus:bg-white focus:ring-2 focus:ring-[#7C3AED]"
              />
            )}
          </div>
        </div>
      </section>

      <Link href="/m/ai" className="flex items-center gap-3 rounded-[16px] bg-gradient-to-r from-[#F5F3FF] to-[#FDF4FF] p-3.5 ring-1 ring-[#E9D5FF] active:scale-[0.99]">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#8B5CF6] to-[#D946EF] text-white"><Sparkles className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-bold">Belum punya repo?</p>
          <p className="text-[12px] text-[#64748B]">Buat situsnya dengan AI Web Builder.</p>
        </div>
        <ChevronRight className="h-5 w-5 text-[#A78BFA]" />
      </Link>

      <div className="flex items-center gap-3 rounded-[16px] bg-[#EEF1FF] p-3.5">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#10B981] text-white"><Timer className="h-5 w-5" /></span>
        <div>
          <p className="text-[13.5px] font-bold">Estimasi sekitar 1–3 menit</p>
          <p className="text-[12px] text-[#64748B]">Otomatis SSL & CDN dari {platName}.</p>
        </div>
      </div>

      <div className="fixed inset-x-0 z-40 border-t border-[#EDE9FE] bg-white/95 px-4 py-3 backdrop-blur-md" style={{ bottom: "calc(64px + env(safe-area-inset-bottom))" }}>
        <button
          type="submit"
          disabled={!ready}
          className="mx-auto flex h-[52px] w-full max-w-[540px] items-center justify-center gap-2 rounded-[16px] bg-gradient-to-r from-[#6D28D9] to-[#7C3AED] text-[15px] font-extrabold text-white shadow-[0_10px_20px_-6px_rgba(124,58,237,0.55)] transition active:scale-[0.98] disabled:opacity-50 disabled:shadow-none"
        >
          {busy ? <><Loader2 className="h-5 w-5 animate-spin" /> Sedang deploy…</> : `Mulai Deploy ke ${platName} 🚀`}
        </button>
      </div>
    </form>
  );
}
