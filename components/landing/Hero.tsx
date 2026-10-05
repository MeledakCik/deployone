"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight, Check, Minus, TriangleAlert } from "lucide-react";

type Level = "ok" | "warn" | "blocked";

/** Contoh nyata dari aturan pengecekan repo Depup (lihat lib/deploy-guides.ts). */
const SAMPLES: {
  tab: string;
  repo: string;
  type: string;
  verdict: Record<"Vercel" | "Cloudflare Pages" | "Railway", [Level, string]>;
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
  ok: "text-emerald-700 dark:text-emerald-400",
  warn: "text-amber-700 dark:text-amber-400",
  blocked: "text-[var(--text-faint)]",
};
const LABEL: Record<Level, string> = { ok: "Cocok", warn: "Dengan catatan", blocked: "Tidak cocok" };

export function Hero() {
  const [i, setI] = React.useState(0);
  const s = SAMPLES[i];

  return (
    <section className="mx-auto max-w-[1200px] px-6 pt-14 md:pt-24 pb-20 md:pb-28">
      <div className="grid lg:grid-cols-[1fr_540px] gap-14 lg:gap-16 items-center">
        <div>
          <h1 className="font-display text-[44px] sm:text-[58px] md:text-[72px] leading-[0.98] tracking-[-0.035em] font-bold">
            Tempel link GitHub.
            <br />
            Dapat website yang hidup.
          </h1>

          <p className="mt-6 max-w-[500px] text-[17px] md:text-[18px] leading-[1.6] text-[var(--text-muted)]">
            Depup mengecek isi repo kamu dulu, lalu men-deploy-nya ke Vercel, Cloudflare Pages, atau
            Railway. Kalau repo tidak cocok, kamu tahu alasannya sebelum membuang waktu.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href="/dashboard"
              className="group h-12 px-6 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-[15px] font-semibold inline-flex items-center gap-2 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
            >
              Deploy repo pertamamu
              <ArrowUpRight size={16} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
            <a
              href="#support"
              className="h-12 px-5 rounded-full text-[15px] font-medium inline-flex items-center text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
            >
              Lihat repo yang didukung
            </a>
          </div>
        </div>

        {/* Momen utama: hasil pengecekan repo, bisa dicoba */}
        <div
          className="rounded-[20px] overflow-hidden"
          style={{ border: "1px solid var(--line-strong)", background: "var(--surface-solid)" }}
        >
          <div role="tablist" aria-label="Contoh repo" className="flex flex-wrap gap-1 p-2" style={{ borderBottom: "1px solid var(--line)" }}>
            {SAMPLES.map((x, idx) => (
              <button
                key={x.tab}
                role="tab"
                aria-selected={idx === i}
                onClick={() => setI(idx)}
                className={`h-8 px-3 rounded-full whitespace-nowrap text-[12.5px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400 ${
                  idx === i ? "bg-blue-600 text-white" : "text-[var(--text-muted)] hover:text-[var(--text)]"
                }`}
              >
                {x.tab}
              </button>
            ))}
          </div>

          <div className="p-5 md:p-6" aria-live="polite">
            <div className="text-[12.5px] text-[var(--text-faint)]">Repo</div>
            <div className="mt-1 font-mono text-[14px] text-[var(--text)] break-all">github.com/{s.repo}</div>

            <div className="mt-5 text-[12.5px] text-[var(--text-faint)]">Terdeteksi</div>
            <div key={s.tab} className="lp-motion mt-1 font-display text-[26px] font-semibold tracking-[-0.02em]" style={{ animation: "dcFadeIn .35s ease" }}>
              {s.type}
            </div>

            <ul className="mt-6 divide-y" style={{ borderTop: "1px solid var(--line)", borderColor: "var(--line)" }}>
              {Object.entries(s.verdict).map(([name, [level, note]]) => {
                const Icon = ICON[level];
                return (
                  <li key={name} className="py-3.5 flex items-start gap-3" style={{ borderColor: "var(--line)" }}>
                    <Icon size={16} className={`mt-0.5 shrink-0 ${TONE[level]}`} strokeWidth={level === "ok" ? 3 : 2} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-[14px] font-medium">{name}</span>
                        <span className={`text-[12px] ${TONE[level]}`}>{LABEL[level]}</span>
                      </div>
                      <div className="text-[12.5px] text-[var(--text-muted)] mt-0.5">{note}</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
      <style>{`@keyframes dcFadeIn { from { opacity: 0; transform: translateY(4px) } to { opacity: 1; transform: none } }`}</style>
    </section>
  );
}
