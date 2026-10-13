"use client";

import * as React from "react";
import {
  ArrowRight,
  Check,
  Cloud,
  GitBranch,
  GitCommitHorizontal,
  Minus,
  RefreshCw,
  Train,
  Triangle,
  TriangleAlert,
} from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";

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
const TONE: Record<Level, string> = {
  ok: "bg-ok/15 text-ok",
  warn: "bg-warn/15 text-warn",
  blocked: "bg-fill/15 text-ink-3",
};
const LABEL: Record<Level, string> = { ok: "Cocok", warn: "Dengan catatan", blocked: "Tidak cocok" };

const DEPLOYS = [
  { name: "tokokopi-landing", platform: "VERCEL", ref: "main", when: "2 mnt lalu", status: "ready", link: "tokokopi.id" },
  { name: "api-toko", platform: "RAILWAY", ref: "main", when: "baru saja", status: "building", link: "sedang berjalan" },
  { name: "studio-portfolio", platform: "CLOUDFLARE", ref: "main", when: "18 mnt lalu", status: "ready", link: "studio.pages.dev" },
  { name: "bot-flask", platform: "RAILWAY", ref: "fix/webhook", when: "1 jam lalu", status: "failed", link: "Lihat log" },
] as const;

const PLATFORM_TILE = {
  VERCEL: { Icon: Triangle, tint: "tint-lav" },
  RAILWAY: { Icon: Train, tint: "tint-mint" },
  CLOUDFLARE: { Icon: Cloud, tint: "tint-rose" },
} as const;

const STATUS = {
  ready: { label: "Ready", cls: "bg-ok/15 text-ok" },
  building: { label: "Building", cls: "bg-warn/15 text-warn" },
  failed: { label: "Failed", cls: "bg-bad/15 text-bad" },
} as const;

export function HeroMockup() {
  const [i, setI] = React.useState(0);
  const s = SAMPLES[i];
  const platforms = Object.keys(s.verdict) as Platform[];

  return (
    <section className="relative mx-auto mb-10 w-full max-w-6xl px-4 sm:px-8" id="dashboard" aria-label="Contoh tampilan dashboard">
      <Reveal>
        <div className="overflow-hidden rounded-[36px] bg-card shadow-pop">
          {/* Bar jendela */}
          <div className="flex items-center gap-2 px-6 pb-1 pt-5">
            <span className="h-3 w-3 rounded-full bg-[#ff5f57]" aria-hidden="true" />
            <span className="h-3 w-3 rounded-full bg-[#febc2e]" aria-hidden="true" />
            <span className="h-3 w-3 rounded-full bg-[#28c840]" aria-hidden="true" />
            <span className="ml-3 select-none text-[12.5px] font-medium text-ink-3">depup / cek-repo</span>
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)] gap-4 p-3 sm:p-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
            {/* Kolom kiri: cek repo */}
            <div className="flex min-w-0 flex-col gap-4">
              {/* Kartu pastel: input repo + pilihan contoh */}
              <div className="tint-lav relative overflow-hidden rounded-[28px] p-5 sm:p-6">
                <p className="text-[17px] font-semibold tracking-[-0.025em] text-ink">Cek repo</p>
                <p className="mt-0.5 text-[13px] text-ink-2">Pilih contoh repo untuk melihat hasil pengecekannya.</p>

                <div className="mt-4 flex items-center gap-2 rounded-full bg-card p-1.5 pl-5 shadow-card" aria-hidden="true">
                  <span key={s.repo} className="pop-in mono flex-1 truncate text-[13px] text-ink">
                    github.com/{s.repo}
                  </span>
                  <span className="btn-orb h-10 w-10 shrink-0">
                    <ArrowRight size={17} />
                  </span>
                </div>

                <div
                  role="tablist"
                  aria-label="Contoh repo"
                  className="relative mt-4 grid grid-cols-4 rounded-full bg-card/60 p-1 backdrop-blur"
                >
                  <span
                    className="seg-thumb pointer-events-none absolute inset-y-1 left-1 w-[calc(25%-2px)] rounded-full bg-card shadow-card"
                    style={{ transform: `translateX(${i * 100}%)` }}
                    aria-hidden="true"
                  />
                  {SAMPLES.map((x, idx) => (
                    <button
                      key={x.tab}
                      role="tab"
                      type="button"
                      aria-selected={idx === i}
                      onClick={() => setI(idx)}
                      className={`relative z-10 flex min-h-[44px] items-center justify-center rounded-full px-1 text-center text-[11px] font-semibold leading-tight transition-colors duration-300 sm:text-[12.5px] ${
                        idx === i ? "text-ink" : "text-ink-2 hover:text-ink"
                      }`}
                    >
                      {x.tab}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hasil pengecekan */}
              <div className="tint-mint rounded-[28px] p-5 sm:p-6" aria-live="polite">
                <p className="text-[13px] text-ink-2">Terdeteksi</p>
                <p key={s.type} className="pop-in mt-0.5 text-[26px] font-semibold leading-tight tracking-[-0.035em] text-ink">
                  {s.type}
                </p>
                <p className="text-[13px] text-ink-3">dibaca dari isi repo</p>

                <ul key={s.repo} className="mt-4 flex flex-col gap-2">
                  {platforms.map((name, k) => {
                    const [level, note] = s.verdict[name];
                    const Icon = ICON[level];
                    return (
                      <li
                        key={name}
                        style={{ "--i": k } as React.CSSProperties}
                        className="rise flex items-center gap-3 rounded-[20px] bg-card/80 p-3 pr-4 backdrop-blur"
                      >
                        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${TONE[level]}`}>
                          <Icon size={17} strokeWidth={level === "ok" ? 3 : 2} aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[14px] font-semibold text-ink">{name}</span>
                          <span className="block truncate text-[12.5px] text-ink-2">{note}</span>
                        </span>
                        <span className={`hidden shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-semibold sm:inline ${TONE[level]}`}>
                          {LABEL[level]}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>

            {/* Kolom kanan: daftar deploy (contoh) */}
            <div className="flex min-w-0 flex-col rounded-[28px] bg-paper p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between gap-2 px-1">
                <div className="flex items-center gap-2">
                  <span className="text-[17px] font-semibold tracking-[-0.025em] text-ink">Deploy terakhir</span>
                  <span className="rounded-full bg-fill/15 px-2.5 py-0.5 text-[11px] font-medium text-ink-2">contoh data</span>
                </div>
                <span className="hidden items-center gap-1.5 text-[13px] text-ink-2 sm:flex">
                  <RefreshCw size={14} aria-hidden="true" /> Redeploy
                </span>
              </div>

              <ul className="flex flex-1 flex-col gap-2">
                {DEPLOYS.map((d, k) => {
                  const st = STATUS[d.status];
                  const { Icon, tint } = PLATFORM_TILE[d.platform];
                  return (
                    <li
                      key={d.name}
                      style={{ "--i": k + 2 } as React.CSSProperties}
                      className="rise lift flex items-center gap-3 rounded-[22px] bg-card p-3 pr-4 shadow-card"
                    >
                      <span className={`${tint} grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-ink`}>
                        <Icon size={19} aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-semibold tracking-[-0.015em] text-ink">{d.name}</span>
                        <span className="mt-0.5 flex items-center gap-1.5 text-[12px] text-ink-3">
                          {d.ref === "main" ? <GitCommitHorizontal size={13} aria-hidden="true" /> : <GitBranch size={13} aria-hidden="true" />}
                          <span className="mono">{d.ref}</span>
                          <span>{d.when}</span>
                        </span>
                        <span className="mt-0.5 block truncate text-[12px] text-ink-2">
                          <span className="text-ink-3">{d.platform.charAt(0) + d.platform.slice(1).toLowerCase()}</span> · {d.link}
                        </span>
                      </span>
                      <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold ${st.cls}`}>
                        <span
                          className={`h-1.5 w-1.5 rounded-full bg-current ${d.status === "building" ? "animate-pulse" : ""}`}
                          aria-hidden="true"
                        />
                        {st.label}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
