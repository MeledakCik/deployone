"use client";

import * as React from "react";
import Link from "next/link";
import { Search, FolderOpen, RefreshCw, RotateCw, Download, Copy, Check, Settings2, Clock } from "lucide-react";
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
      <label className="flex h-12 items-center gap-2.5 rounded-full bg-[#F1EEFF] px-4 ring-1 ring-transparent focus-within:bg-white focus-within:ring-[#7C3AED]">
        <Search className="h-[18px] w-[18px] text-[#7B7487]" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari project atau domain…"
          className="h-full min-w-0 flex-1 bg-transparent text-[14px] font-medium outline-none placeholder:text-[#7B7487]"
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

      <section className={`relative overflow-hidden rounded-[24px] ${HERO_GRADIENT} p-5 text-white shadow-[0_18px_34px_-14px_rgba(109,40,217,0.7)]`}>
        <div className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-white/15 blur-xl" />
        <p className="relative flex items-center gap-2 text-[11.5px] font-bold uppercase tracking-[0.08em] text-[#EDE0FF]">
          <span className="h-2 w-2 rounded-full bg-[#4EDEA3]" /> Status project
        </p>
        <p className="relative mt-1 text-[22px] font-extrabold leading-tight tracking-[-0.025em]">
          {loading ? "Memuat…" : `${online} dari ${projects.length} project online`}
        </p>
        <div className="relative mt-4 flex gap-2">
          <Link href="/m/kelola" className="flex h-10 items-center gap-1.5 rounded-full bg-white px-4 text-[13px] font-extrabold text-[#6D28D9] active:scale-95">
            <Download className="h-4 w-4" /> Import
          </Link>
          <button onClick={sync} disabled={syncing} className="flex h-10 items-center gap-1.5 rounded-full bg-white/20 px-4 text-[13px] font-extrabold text-white backdrop-blur-sm active:scale-95 disabled:opacity-60">
            <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} /> Sinkronkan
          </button>
        </div>
      </section>

      {loading ? (
        <SkeletonList />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<FolderOpen className="h-6 w-6" />}
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
                  <p className="truncate text-[15.5px] font-extrabold tracking-[-0.01em]">{p.name}</p>
                  <p className="truncate text-[12px] font-semibold text-[#64748B]">{PLATFORM_LABEL[p.platform] ?? p.platform}</p>
                </div>
                <StatusPill status={p.status} />
              </div>
              {p.domain && (
                <div className="mt-3 flex items-center gap-2 rounded-[14px] bg-[#F1F3FF] px-3 py-2.5">
                  <span className="min-w-0 flex-1 truncate font-mono text-[12.5px] font-medium text-[#4338CA]">{hostOf(p.domain)}</span>
                  <OpenLink domain={p.domain} />
                </div>
              )}
              <p className="mt-2.5 flex items-center gap-1.5 text-[11.5px] text-[#64748B]">
                <Clock className="h-3.5 w-3.5" /> Deploy terakhir {prettyDate(p.date)}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {p.domain && (
                  <MiniButton primary href={hrefOf(p.domain)}>Buka situs</MiniButton>
                )}
                {p.domain && (
                  <MiniButton onClick={() => copy(p.id, hrefOf(p.domain))}>
                    {copied === p.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied === p.id ? "Tersalin" : "Salin"}
                  </MiniButton>
                )}
                <MiniButton onClick={() => redeploy(p.name)}>
                  <RotateCw className="h-3.5 w-3.5" /> Deploy ulang
                </MiniButton>
                <Link href="/m/kelola" className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-full bg-[#F5F3FF] px-3.5 text-[12.5px] font-bold text-[#6D28D9] ring-1 ring-[#DDD6FE] active:scale-95">
                  <Settings2 className="h-3.5 w-3.5" /> Kelola
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
