"use client";

import * as React from "react";
import Link from "next/link";
import { Search, FolderOpen, RefreshCw, RotateCw, Download, Copy, Check, Settings2, Clock } from "@/components/ui/icons";
import { useUserData } from "@/lib/m-data";
import { useDeploy } from "@/lib/deploy-context";
import {
  CARD, Chip, EmptyState, HERO_GRADIENT, MiniButton, OpenLink, PLATFORM_LABEL, PlatformTile, SkeletonList,
  StatusPill, hostOf, hrefOf, prettyDate, uniqueProjects, useCopy,
} from "@/components/m/ui";

export default function MobileProjects() {
  const { history, loading, reload, syncing } = useUserData();
  const { redeploy } = useDeploy();
  const { copied, copy } = useCopy();
  const [q, setQ] = React.useState("");
  const [plat, setPlat] = React.useState("all");

  const projects = uniqueProjects(history);
  const platforms = Array.from(new Set(projects.map((p) => p.platform)));
  const rows = projects.filter(
    (p) => (plat === "all" || p.platform === plat) && `${p.name} ${p.domain}`.toLowerCase().includes(q.trim().toLowerCase()),
  );
  const online = projects.filter((p) => p.status === "ready").length;

  const sync = () => void reload();

  return (
    <div className="space-y-4 pt-2">
      <label className="input-solid flex h-12 items-center gap-2.5 !rounded-full px-4 focus-within:[box-shadow:inset_0_0_0_2px_var(--ring)]">
        <Search size={18} className="shrink-0 text-text-muted" aria-hidden />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari project atau domain…"
          aria-label="Cari project atau domain"
          className="h-full min-w-0 flex-1 bg-transparent text-[14px] font-medium outline-none placeholder:text-text-faint"
        />
      </label>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Chip active={plat === "all"} onClick={() => setPlat("all")}>Semua ({projects.length})</Chip>
        {platforms.map((p) => (
          <Chip key={p} active={plat === p} onClick={() => setPlat(p)}>
            {PLATFORM_LABEL[p] ?? p} ({projects.filter((x) => x.platform === p).length})
          </Chip>
        ))}
      </div>

      <section className={`relative overflow-hidden rounded-card ${HERO_GRADIENT} p-5 text-white shadow-[0_18px_34px_-14px_rgba(90,57,192,0.7)]`}>
        <div className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-white/15 blur-xl" />
        <p className="relative flex items-center gap-2 text-[13px] font-semibold text-violet-100">
          <span className="h-2 w-2 rounded-full bg-lime-500" /> Status project
        </p>
        <p className="relative mt-1 text-[22px] font-bold leading-tight tracking-tight">
          {loading ? "Memuat…" : `${online} dari ${projects.length} project online`}
        </p>
        <div className="relative mt-4 grid grid-cols-2 gap-2">
          <Link href="/m/kelola" className="flex h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-white px-4 text-[13px] font-bold text-lav-text active:scale-95">
            <Download size={16} aria-hidden /> Import
          </Link>
          <button onClick={sync} disabled={syncing} className="flex h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-white/20 px-4 text-[13px] font-bold text-white backdrop-blur-sm active:scale-95 disabled:opacity-60">
            <RefreshCw size={16} aria-hidden className={syncing ? "animate-spin" : ""} /> Sinkronkan
          </button>
        </div>
      </section>

      {loading ? (
        <SkeletonList />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<FolderOpen size={24} aria-hidden />}
          title={projects.length === 0 ? "Belum ada project" : "Tidak ditemukan"}
          hint={projects.length === 0 ? "Deploy project pertamamu, atau import dari Vercel/Railway/Cloudflare." : "Coba kata kunci atau filter lain."}
          cta={projects.length === 0 ? { href: "/m/deploy", label: "Deploy sekarang" } : undefined}
        />
      ) : (
        <ul className="space-y-3">
          {rows.map((p) => (
            <li key={p.id} className={`${CARD} p-4`}>
              <div className="flex items-center gap-3">
                <PlatformTile platform={p.platform} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[16px] font-bold tracking-tight">{p.name}</p>
                  <p className="truncate text-[12px] font-medium text-text-muted">{PLATFORM_LABEL[p.platform] ?? p.platform}</p>
                </div>
                <StatusPill status={p.status} />
              </div>
              {p.domain && (
                <div className="mt-3 flex items-center gap-2 rounded-[14px] bg-[var(--pill-bg)] px-3 py-2">
                  <span className="min-w-0 flex-1 truncate font-mono text-[13px] font-medium text-lav-text">{hostOf(p.domain)}</span>
                  <OpenLink domain={p.domain} />
                </div>
              )}
              <p className="mt-2.5 flex items-center gap-1.5 text-[12px] text-text-muted">
                <Clock size={14} aria-hidden /> Deploy terakhir {prettyDate(p.date)}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {p.domain && (
                  <MiniButton full primary href={hrefOf(p.domain)}>Buka situs</MiniButton>
                )}
                {p.domain && (
                  <MiniButton full onClick={() => copy(p.id, hrefOf(p.domain))}>
                    {copied === p.id ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
                    {copied === p.id ? "Tersalin" : "Salin"}
                  </MiniButton>
                )}
                <MiniButton full onClick={() => redeploy(p.name)}>
                  <RotateCw size={14} aria-hidden /> Deploy ulang
                </MiniButton>
                <Link href="/m/kelola" className="pill inline-flex h-10 w-full items-center justify-center gap-1.5 whitespace-nowrap px-4 text-[13px] font-semibold active:scale-95">
                  <Settings2 size={14} aria-hidden /> Kelola
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
