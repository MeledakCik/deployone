"use client";

import * as React from "react";
import Image from "next/image";
import {
  Check,
  FolderKanban,
  GitBranch,
  GitCommitHorizontal,
  Globe2,
  LayoutDashboard,
  Minus,
  RefreshCw,
  Rocket,
  Search,
  TriangleAlert,
} from "@/components/ui/icons";
import { CloudflareIcon, RailwayIcon, VercelIcon } from "@/components/ui/PlatformIcon";
import { Badge, type BadgeTone } from "@/components/ui/primitives";

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
const LABEL: Record<Level, string> = { ok: "Cocok", warn: "Dengan catatan", blocked: "Tidak cocok" };
const BADGE: Record<Level, BadgeTone> = { ok: "good", warn: "warn", blocked: "neutral" };
const PLATFORM_ICON = { Vercel: VercelIcon, "Cloudflare Pages": CloudflareIcon, Railway: RailwayIcon } as const;

const DEPLOYS: {
  name: string;
  platform: string;
  ref: string;
  when: string;
  status: "ready" | "building" | "failed";
  link: string;
}[] = [
  { name: "tokokopi-landing", platform: "Vercel", ref: "main", when: "2 mnt lalu", status: "ready", link: "tokokopi.id" },
  { name: "api-toko", platform: "Railway", ref: "main", when: "baru saja", status: "building", link: "sedang berjalan" },
  { name: "studio-portfolio", platform: "Cloudflare", ref: "main", when: "18 mnt lalu", status: "ready", link: "studio.pages.dev" },
  { name: "bot-flask", platform: "Railway", ref: "fix/webhook", when: "1 jam lalu", status: "failed", link: "Lihat log" },
];

const STATUS: Record<(typeof DEPLOYS)[number]["status"], { label: string; tone: BadgeTone }> = {
  ready: { label: "Berhasil", tone: "good" },
  building: { label: "Membangun", tone: "warn" },
  failed: { label: "Gagal", tone: "bad" },
};

const SIDE_ICONS = [LayoutDashboard, FolderKanban, Rocket, Globe2];

/**
 * Pratinjau dashboard. Dibuat dari bahan yang sama dengan dashboard asli
 * (sidebar ungu, kartu putih membulat tanpa garis, pilihan terpilih ungu solid, Badge status),
 * supaya yang dilihat orang di landing sama dengan yang mereka dapat setelah masuk.
 */
export function HeroMockup() {
  const [i, setI] = React.useState(0);
  const s = SAMPLES[i];
  const platforms = Object.keys(s.verdict) as Platform[];

  return (
    <section className="relative mx-auto mb-8 w-full max-w-6xl px-3 sm:px-8" id="dashboard" aria-label="Contoh tampilan dashboard">
      <div className="lp-window isolate overflow-hidden">
        <div className="flex gap-3 p-2.5 sm:gap-4 sm:p-4">
          {/* Sidebar ungu mini (hanya hiasan) */}
          <div
            className="hidden w-[68px] shrink-0 flex-col items-center gap-3 rounded-[26px] py-5 md:flex"
            style={{ background: "var(--sidebar-bg)" }}
            aria-hidden="true"
          >
            <Image src="/logo-white.png" alt="" width={36} height={36} className="mb-3 h-9 w-9" />
            {SIDE_ICONS.map((Ic, k) => (
              <span
                key={k}
                className="grid h-11 w-11 place-items-center rounded-2xl"
                style={
                  k === 2
                    ? { background: "var(--sidebar-active-bg)", color: "var(--sidebar-active-text)" }
                    : { color: "var(--sidebar-text)" }
                }
              >
                <Ic size={19} />
              </span>
            ))}
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-4 sm:gap-5">
            {/* Judul halaman + kolom repo */}
            <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-end">
              <div className="min-w-0 text-left">
                <h2 className="text-[24px] font-bold leading-[1.1] tracking-[-0.03em] sm:text-[28px]">Deploy</h2>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-text-muted">Depup membaca isi repo sebelum deploy dimulai.</p>
              </div>
              <div className="input-solid flex w-full items-center gap-2 truncate px-3.5 py-2.5 sm:w-96">
                <Search size={15} className="shrink-0 text-text-faint" aria-hidden="true" />
                <span key={s.repo} className="truncate font-mono text-[12.5px] text-text">
                  github.com/{s.repo}
                </span>
              </div>
            </div>

            {/* Pilih contoh repo */}
            <div role="tablist" aria-label="Contoh repo" className="flex flex-wrap gap-2 self-start">
              {SAMPLES.map((x, idx) => (
                <button
                  key={x.tab}
                  role="tab"
                  aria-selected={idx === i}
                  onClick={() => setI(idx)}
                  className={`press rounded-full px-4 py-2 text-[12.5px] font-medium transition-colors ${
                    idx === i ? "chip-on" : "pill"
                  }`}
                >
                  {x.tab}
                </button>
              ))}
            </div>

            {/* Hasil pengecekan: kartu putih yang sama dengan KpiCard dashboard */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-live="polite">
              <div className="surface-solid flex flex-col gap-1 p-5 text-left">
                <span className="text-[13px] font-medium text-text-muted">Terdeteksi</span>
                <span key={s.type} className="mt-3 text-[21px] font-bold leading-tight tracking-[-0.02em]">
                  {s.type}
                </span>
                <span className="mt-1 text-[12.5px] text-text-muted">dibaca dari isi repo</span>
              </div>
              {platforms.map((name) => {
                const [level, note] = s.verdict[name];
                const Icon = ICON[level];
                const PIcon = PLATFORM_ICON[name];
                return (
                  <div key={name} className="surface-solid flex flex-col gap-1 p-5 text-left">
                    <span className="flex items-center gap-2 text-[13px] font-medium text-text-muted">
                      <PIcon size={15} className="text-lav-text" aria-hidden="true" />
                      {name}
                    </span>
                    <span className="mt-3">
                      <Badge tone={BADGE[level]}>
                        <Icon size={13} strokeWidth={level === "ok" ? 3 : 2} aria-hidden="true" />
                        {LABEL[level]}
                      </Badge>
                    </span>
                    <span className="mt-1 text-[12.5px] text-text-muted">{note}</span>
                  </div>
                );
              })}
            </div>

            {/* Daftar deploy (contoh): baris yang sama dengan HistoryTable */}
            <div className="surface-solid overflow-hidden text-left">
              <div className="flex items-center justify-between gap-3 px-5 py-4 sm:px-6">
                <div className="flex items-center gap-2.5">
                  <span className="text-[16px] font-bold tracking-tight">Deploy terakhir</span>
                  <Badge tone="violet">Contoh data</Badge>
                </div>
                <span className="hidden items-center gap-1.5 text-[12.5px] font-medium text-text-muted sm:flex">
                  <RefreshCw size={14} aria-hidden="true" /> Redeploy
                </span>
              </div>
              <ul>
                {DEPLOYS.map((d) => {
                  const st = STATUS[d.status];
                  return (
                    <li
                      key={d.name}
                      className="grid grid-cols-12 items-center gap-2 border-t border-[var(--surface-line)] px-5 py-3.5 sm:px-6"
                    >
                      <div className="col-span-12 flex items-center gap-3 md:col-span-4">
                        <span className="truncate font-mono text-[13px] font-semibold">{d.name}</span>
                        <Badge>{d.platform}</Badge>
                      </div>
                      <div className="col-span-7 flex min-w-0 flex-wrap items-center gap-x-1.5 text-text-muted md:col-span-3">
                        {d.ref === "main" ? <GitCommitHorizontal size={15} aria-hidden="true" /> : <GitBranch size={15} aria-hidden="true" />}
                        <span className="min-w-0 break-all font-mono text-[12.5px]">{d.ref}</span>
                        <span className="text-[12.5px]">· {d.when}</span>
                      </div>
                      <div className="col-span-5 md:col-span-3">
                        <Badge tone={st.tone} dot>
                          {st.label}
                        </Badge>
                      </div>
                      <div className="col-span-12 truncate font-mono text-[12px] text-text-muted md:col-span-2 md:text-right">{d.link}</div>
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
