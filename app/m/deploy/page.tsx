"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2, GitBranch, CloudUpload, Zap, ExternalLink, AlertCircle, Loader2, Timer, ChevronRight } from "lucide-react";
import { addHistory, useUserData } from "@/lib/m-data";
import { CARD, PlatformTile, hrefOf } from "@/components/m/ui";
import type { CreateDeployResult, DeployStatusResult } from "@/types";

type Api<T> = { ok: boolean; data?: T; error?: string };

const PLATFORMS = [
  { id: "vercel", name: "Vercel", desc: "Frontend cloud terbaik untuk Next.js, React, Astro & situs statis.", live: true },
  { id: "railway", name: "Railway", desc: "Backend Node, Python, Dockerfile & database.", live: false },
  { id: "cloudflare", name: "Cloudflare", desc: "Pages super cepat di jaringan edge global.", live: false },
] as const;

function suggestName(url: string) {
  const m = /github\.com\/[^/\s]+\/([^/\s#?]+)/i.exec(url);
  return m ? m[1].replace(/\.git$/, "").toLowerCase().replace(/[^a-z0-9-]/g, "-") : "";
}

/** Deploy dari HP: Vercel via GitHub. Platform lain & sumber lain dikelola di dashboard web. */
export default function MobileDeploy() {
  const { tokens, loading } = useUserData();
  const [githubUrl, setGithubUrl] = React.useState("");
  const [name, setName] = React.useState("");
  const [nameTouched, setNameTouched] = React.useState(false);
  const [msg, setMsg] = React.useState("");
  const [err, setErr] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [liveUrl, setLiveUrl] = React.useState("");

  function onUrl(v: string) {
    setGithubUrl(v);
    if (!nameTouched) setName(suggestName(v));
  }

  async function run() {
    if (!tokens.vercelToken) {
      setErr(true);
      return setMsg("Isi token Vercel dulu di Akun → Pengaturan token.");
    }
    setBusy(true);
    setErr(false);
    setLiveUrl("");
    setMsg("Memulai deploy…");
    try {
      const res = await fetch("/api/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName: name.trim(),
          githubUrl: githubUrl.trim(),
          vercelToken: tokens.vercelToken,
          githubPat: tokens.githubPat,
        }),
      });
      const body = (await res.json()) as Api<CreateDeployResult>;
      if (!body.ok || !body.data) throw new Error(body.error || "Deploy gagal.");
      const { deploymentId } = body.data;

      let state = body.data.readyState;
      let url = body.data.url;
      for (let i = 0; i < 90 && state !== "READY" && state !== "ERROR" && state !== "CANCELED"; i++) {
        setMsg(`Status: ${state}…`);
        await new Promise((r) => setTimeout(r, 4000));
        const s = await fetch(`/api/deploy/${deploymentId}`, { headers: { "x-vercel-token": tokens.vercelToken } });
        const sb = (await s.json()) as Api<DeployStatusResult>;
        if (sb.ok && sb.data) {
          state = sb.data.readyState;
          url = sb.data.url;
        }
      }

      const okDeploy = state === "READY";
      await addHistory({
        id: deploymentId,
        name: name.trim(),
        platform: "vercel",
        domain: url,
        date: new Date().toISOString().slice(0, 10),
        status: okDeploy ? "ready" : "failed",
        repo: githubUrl.replace(/^https?:\/\/github\.com\//, ""),
      });
      setErr(!okDeploy);
      setMsg(okDeploy ? "Selesai! Situsmu sudah online." : `Deploy berakhir: ${state}.`);
      if (okDeploy) setLiveUrl(hrefOf(url));
    } catch (e) {
      setErr(true);
      setMsg(e instanceof Error ? e.message : "Terjadi kesalahan.");
    } finally {
      setBusy(false);
    }
  }

  const ready = !!githubUrl.trim() && !!name.trim() && !busy && !loading;
  const noToken = !loading && !tokens.vercelToken;
  const input =
    "h-12 w-full rounded-[14px] bg-[#F1F3FF] px-4 text-[15px] font-medium text-[#141B2B] outline-none ring-1 ring-[#E2E8F0] transition placeholder:text-[#94A3B8] focus:bg-white focus:ring-2 focus:ring-[#7C3AED]";

  return (
    <div className="space-y-5 pb-20 pt-2">
      {/* Langkah */}
      <ol className="flex items-center gap-2 px-1 text-[11.5px] font-bold">
        {["Platform", "Sumber kode", "Deploy"].map((s, i) => (
          <li key={s} className="flex flex-1 items-center gap-1.5 whitespace-nowrap last:flex-none">
            <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] ${i < 2 ? "bg-[#7C3AED] text-white" : "bg-[#E2E8F0] text-[#64748B]"}`}>{i + 1}</span>
            <span className={i < 2 ? "text-[#6D28D9]" : "text-[#64748B]"}>{s}</span>
            {i < 2 && <span className="h-px flex-1 bg-[#DDD6FE]" />}
          </li>
        ))}
      </ol>

      {/* 1. Platform */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-[16px] font-extrabold tracking-[-0.02em]">
          <span className="h-2 w-2 rounded-full bg-[#7C3AED]" /> Pilih platform
        </h2>
        {PLATFORMS.map((p) =>
          p.live ? (
            <div key={p.id} className={`${CARD} flex items-start gap-3 p-4 ring-2 ring-[#7C3AED]`}>
              <PlatformTile platform={p.id} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-[16px] font-extrabold">{p.name}</p>
                  {!loading && !noToken && (
                    <span className="rounded-full bg-[#ECFDF5] px-2 py-0.5 text-[10.5px] font-bold text-[#065F46]">Terhubung</span>
                  )}
                </div>
                <p className="mt-0.5 text-[12.5px] leading-snug text-[#64748B]">{p.desc}</p>
              </div>
              <CheckCircle2 className="h-6 w-6 shrink-0 text-[#7C3AED]" fill="#7C3AED" stroke="white" />
            </div>
          ) : (
            <Link key={p.id} href="/dashboard?view=deploy" className={`${CARD} flex items-start gap-3 p-4 opacity-90 active:scale-[0.99]`}>
              <PlatformTile platform={p.id} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-[16px] font-extrabold">{p.name}</p>
                  <span className="rounded-full bg-[#F1F5F9] px-2 py-0.5 text-[10.5px] font-bold text-[#64748B]">Lewat web</span>
                </div>
                <p className="mt-0.5 text-[12.5px] leading-snug text-[#64748B]">{p.desc}</p>
              </div>
              <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-[#94A3B8]" />
            </Link>
          ),
        )}
      </section>

      {noToken && (
        <Link href="/m/akun" className="flex items-start gap-3 rounded-[16px] bg-[#FFFBEB] p-4 ring-1 ring-[#FDE68A] active:scale-[0.99]">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#D97706]" />
          <div className="min-w-0 flex-1">
            <p className="text-[13.5px] font-bold text-[#92400E]">Token Vercel belum diisi</p>
            <p className="text-[12.5px] leading-snug text-[#92400E]/80">Isi sekali di Akun, lalu deploy dari HP kapan saja.</p>
          </div>
          <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-[#D97706]" />
        </Link>
      )}

      {/* 2. Sumber kode */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-[16px] font-extrabold tracking-[-0.02em]">
          <span className="h-2 w-2 rounded-full bg-[#7C3AED]" /> Sumber kode
        </h2>
        <div className="grid grid-cols-3 gap-1 rounded-[16px] bg-[#EEF1FF] p-1 text-[12.5px] font-bold">
          <span className="flex h-10 items-center justify-center gap-1.5 rounded-[12px] bg-white text-[#6D28D9] shadow-sm">
            <GitBranch className="h-4 w-4" /> GitHub
          </span>
          <Link href="/dashboard?view=upload" className="flex h-10 items-center justify-center gap-1.5 rounded-[12px] text-[#64748B] active:bg-white/60">
            <CloudUpload className="h-4 w-4" /> Zip
          </Link>
          <Link href="/dashboard?view=hosting" className="flex h-10 items-center justify-center gap-1.5 rounded-[12px] text-[#64748B] active:bg-white/60">
            <Zap className="h-4 w-4" /> Instan
          </Link>
        </div>
        <div className={`${CARD} space-y-3 p-4`}>
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-bold text-[#4A4455]">Link repo GitHub</span>
            <input className={input} inputMode="url" autoCapitalize="none" autoCorrect="off" placeholder="https://github.com/user/repo" value={githubUrl} onChange={(e) => onUrl(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-bold text-[#4A4455]">Nama project</span>
            <input className={input} autoCapitalize="none" autoCorrect="off" placeholder="nama-project" value={name} onChange={(e) => { setNameTouched(true); setName(e.target.value); }} />
          </label>
        </div>
      </section>

      <div className="flex items-center gap-3 rounded-[16px] bg-[#EEF1FF] p-3.5">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#10B981] text-white"><Timer className="h-5 w-5" /></span>
        <div>
          <p className="text-[13.5px] font-bold">Estimasi sekitar 1–2 menit</p>
          <p className="text-[12px] text-[#64748B]">Otomatis SSL & CDN dari Vercel.</p>
        </div>
      </div>

      {msg && (
        <div className={`flex items-start gap-3 rounded-[16px] p-4 ring-1 ${err ? "bg-[#FEF2F2] ring-[#FECACA]" : liveUrl ? "bg-[#ECFDF5] ring-[#A7F3D0]" : "bg-[#F5F3FF] ring-[#DDD6FE]"}`} role="status">
          {busy ? <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-[#7C3AED]" /> : err ? <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#DC2626]" /> : <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#059669]" />}
          <div className="min-w-0 flex-1">
            <p className="text-[13.5px] font-bold leading-snug">{msg}</p>
            {liveUrl && (
              <a href={liveUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 break-all font-mono text-[12.5px] font-semibold text-[#047857]">
                {liveUrl.replace(/^https?:\/\//, "")} <ExternalLink className="h-3.5 w-3.5 shrink-0" />
              </a>
            )}
          </div>
        </div>
      )}

      {/* CTA tetap di atas nav */}
      <div
        className="fixed inset-x-0 z-40 border-t border-[#EDE9FE] bg-white/95 px-4 py-3 backdrop-blur-md"
        style={{ bottom: "calc(64px + env(safe-area-inset-bottom))" }}
      >
        <button
          onClick={run}
          disabled={!ready}
          className="mx-auto flex h-[52px] w-full max-w-[540px] items-center justify-center gap-2 rounded-[16px] bg-gradient-to-r from-[#6D28D9] to-[#7C3AED] text-[15px] font-extrabold text-white shadow-[0_10px_20px_-6px_rgba(124,58,237,0.55)] transition active:scale-[0.98] disabled:opacity-50 disabled:shadow-none"
        >
          {busy ? <><Loader2 className="h-5 w-5 animate-spin" /> Sedang deploy…</> : "Mulai Deploy ke Vercel 🚀"}
        </button>
      </div>
    </div>
  );
}
