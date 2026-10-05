"use client";

import * as React from "react";
import { Check, GitBranch, GitCommitHorizontal, Minus, RefreshCw, Search, TriangleAlert } from "lucide-react";

type Level = "ok" | "warn" | "blocked";
type Platform = "Vercel" | "Cloudflare Pages" | "Railway";

/** Contoh nyata dari aturan pengecekan repo Depup (lihat lib/deploy-guides.ts). */
const SAMPLES: {
  tab: string;
  repo: string;
  type: string;
  verdict: Record<Platform, [Level, string]>;
}[] = [
  {
    tab: "HTML biasa",
    repo: "tokokopi/landing",
    type: "HTML statis",
    verdict: {
      Vercel: ["ok", "Siap deploy, tanpa package.json"],
      "Cloudflare Pages": ["ok", "Siap deploy, tanpa build"],
      Railway: ["ok", "Siap deploy"],
    },
  },
  {
    tab: "Vue + TypeScript",
    repo: "studio/portfolio",
    type: "Vue + Vite (TypeScript)",
    verdict: {
      Vercel: ["ok", "Build otomatis"],
      "Cloudflare Pages": ["ok", "Output dist/ diatur otomatis"],
      Railway: ["ok", "Siap deploy"],
    },
  },
  {
    tab: "Express",
    repo: "dimas/api-toko",
    type: "Express (server Node.js)",
    verdict: {
      Vercel: ["warn", "Butuh penyesuaian serverless"],
      "Cloudflare Pages": ["blocked", "Server Node.js tidak jalan di Pages"],
      Railway: ["ok", "Cocok untuk server"],
    },
  },
  {
    tab: "Python",
    repo: "rani/bot-flask",
    type: "Python",
    verdict: {
      Vercel: ["blocked", "Hanya untuk situs web"],
      "Cloudflare Pages": ["blocked", "Hanya untuk situs web"],
      Railway: ["ok", "Dibangun otomatis"],
    },
  },
];

const ICON = { ok: Check, warn: TriangleAlert, blocked: Minus } as const;
const TONE: Record<Level, string> = { ok: "text-obs-ok", warn: "text-obs-warn", blocked: "text-obs-mute" };
const LABEL: Record<Level, string> = { ok: "Cocok", warn: "Dengan catatan", blocked: "Tidak cocok" };

const DEPLOYS = [
  { name: "tokokopi-landing", platform: "VERCEL", ref: "main", when: "2 mnt lalu", status: "ready", link: "tokokopi.id" },
  { name: "api-toko", platform: "RAILWAY", ref: "main", when: "baru saja", status: "building", link: "sedang berjalan" },
  { name: "studio-portfolio", platform: "CLOUDFLARE", ref: "main", when: "18 mnt lalu", status: "ready", link: "studio.pages.dev" },
  { name: "bot-flask", platform: "RAILWAY", ref: "fix/webhook", when: "1 jam lalu", status: "failed", link: "Lihat log" },
] as const;

const STATUS = {
  ready: { label: "Ready", cls: "bg-obs-ok/15 text-obs-ok" },
  building: { label: "Building", cls: "bg-obs-warn/15 text-obs-warn" },
  failed: { label: "Failed", cls: "bg-obs-bad/15 text-obs-bad" },
} as const;

export function HeroMockup() {
  const [i, setI] = React.useState(0);
  const s = SAMPLES[i];
  const platforms = Object.keys(s.verdict) as Platform[];

  return (
    <section className="relative mx-auto mb-8 w-full max-w-7xl px-4 sm:px-8" id="dashboard" aria-label="Contoh tampilan dashboard">
      <div className="rounded-2xl bg-gradient-to-b from-white/15 via-white/5 to-transparent p-1 shadow-[0_20px_70px_rgba(0,0,0,0.85)]">
        <div className="overflow-hidden rounded-[14px] bg-obs-subtle/95 backdrop-blur-2xl">
          {/* Bar jendela */}
          <div className="flex flex-col items-stretch justify-between gap-3 bg-obs-lowest/60 px-4 py-3 sm:flex-row sm:items-center sm:px-6">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-obs-bad" aria-hidden="true" />
              <span className="h-3 w-3 rounded-full bg-obs-warn" aria-hidden="true" />
              <span className="h-3 w-3 rounded-full bg-obs-ok" aria-hidden="true" />
              <span className="f-mono ml-3 select-none text-[12px] text-obs-mute">depup / cek-repo</span>
            </div>
            <div className="flex w-full items-center gap-2 truncate rounded-lg bg-obs-base px-3 py-1.5 shadow-inner sm:w-96">
              <Search size={15} className="shrink-0 text-obs-violet" aria-hidden="true" />
              <span key={s.repo} className="f-mono truncate text-[12.5px] text-white">
                github.com/{s.repo}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-6 p-4 sm:p-6">
            {/* Pilih contoh repo */}
            <div role="tablist" aria-label="Contoh repo" className="flex flex-wrap gap-2">
              {SAMPLES.map((x, idx) => (
                <button
                  key={x.tab}
                  role="tab"
                  aria-selected={idx === i}
                  onClick={() => setI(idx)}
                  className={`f-mono rounded-lg px-3 py-1.5 text-[11.5px] font-semibold transition-colors ${
                    idx === i
                      ? "bg-obs-violet/25 text-obs-lilac ring-1 ring-obs-violet/60"
                      : "bg-obs-container text-obs-sec hover:text-white"
                  }`}
                >
                  {x.tab}
                </button>
              ))}
            </div>

            {/* Hasil pengecekan */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-live="polite">
              <div className="flex flex-col gap-1 rounded-xl bg-obs-low/70 p-4">
                <span className="f-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-obs-sec">Terdeteksi</span>
                <span key={s.type} className="f-display mt-1 text-[22px] font-bold leading-tight tracking-tight text-white">
                  {s.type}
                </span>
                <span className="text-[13px] text-obs-mute">dibaca dari isi repo</span>
              </div>
              {platforms.map((name) => {
                const [level, note] = s.verdict[name];
                const Icon = ICON[level];
                return (
                  <div key={name} className="flex flex-col gap-1 rounded-xl bg-obs-low/70 p-4">
                    <span className="f-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-obs-sec">{name}</span>
                    <span className={`mt-1 flex items-center gap-1.5 text-[18px] font-semibold ${TONE[level]}`}>
                      <Icon size={17} strokeWidth={level === "ok" ? 3 : 2} aria-hidden="true" />
                      {LABEL[level]}
                    </span>
                    <span className="text-[13px] text-obs-mute">{note}</span>
                  </div>
                );
              })}
            </div>

            {/* Daftar deploy (contoh) */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="f-display text-[18px] font-semibold text-white">Deploy terakhir</span>
                  <span className="rounded-full bg-obs-highest px-2 py-0.5 text-[11px] text-obs-sec">contoh data</span>
                </div>
                <span className="hidden items-center gap-1 text-[13px] text-obs-sec sm:flex">
                  <RefreshCw size={14} aria-hidden="true" /> Redeploy
                </span>
              </div>
              <ul className="flex flex-col gap-2">
                {DEPLOYS.map((d) => {
                  const st = STATUS[d.status];
                  return (
                    <li
                      key={d.name}
                      className="grid grid-cols-12 items-center gap-2 rounded-lg bg-obs-low p-3 transition-colors hover:bg-obs-container"
                    >
                      <div className="col-span-12 flex items-center gap-3 md:col-span-4">
                        <span className="f-mono truncate text-[13px] font-semibold text-white">{d.name}</span>
                        <span className="f-mono rounded bg-obs-elevated px-2 py-0.5 text-[10px] font-semibold text-obs-sec">
                          {d.platform}
                        </span>
                      </div>
                      <div className="col-span-7 flex items-center gap-1.5 text-obs-sec md:col-span-3">
                        {d.ref === "main" ? <GitCommitHorizontal size={15} aria-hidden="true" /> : <GitBranch size={15} aria-hidden="true" />}
                        <span className="f-mono text-[12.5px]">{d.ref}</span>
                        <span className="text-[12.5px] text-obs-mute">· {d.when}</span>
                      </div>
                      <div className="col-span-5 md:col-span-3">
                        <span className={`f-mono inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] ${st.cls}`}>
                          <span
                            className={`h-1.5 w-1.5 rounded-full bg-current ${d.status === "building" ? "animate-pulse" : ""}`}
                            aria-hidden="true"
                          />
                          {st.label}
                        </span>
                      </div>
                      <div className="f-mono col-span-12 truncate text-[12px] text-obs-sec md:col-span-2 md:text-right">{d.link}</div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
