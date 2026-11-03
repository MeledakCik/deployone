"use client";
import { greeting } from "@/lib/mobile-routes";

import * as React from "react";
import Link from "next/link";
import { Rocket, UploadCloud, Link2, Sparkles, RefreshCw, Globe2, KeyRound, Users, Heart, Plus, Inbox } from "@/components/ui/icons";
import { useAuth } from "@/lib/auth-context";
import { useUserData } from "@/lib/m-data";
import { HistoryCard } from "@/components/m/HistoryCard";
import { CARD, Chip, EmptyState, HERO_GRADIENT, SectionTitle, SkeletonList, uniqueProjects } from "@/components/m/ui";

type Filter = "all" | "ready" | "failed";

/**
 * Pintasan. Nama dan ikonnya sama dengan menu di sidebar web; warna kotak mengikuti kelompoknya:
 * lilac = Deploy, sky = Konfigurasi, lemon = Bantuan. "Panduan" tidak ada di sini karena sudah jadi tab bawah.
 */
const TONE = { lilac: "bg-tone-lilac", sky: "bg-tone-sky", lemon: "bg-tone-lemon" } as const;
const ACTIONS = [
  { href: "/m/deploy", label: "Deploy", Icon: Rocket, tone: "lilac" },
  { href: "/m/upload", label: "Unggah", Icon: UploadCloud, tone: "lilac" },
  { href: "/m/link-instan", label: "Link Instan", Icon: Link2, tone: "lilac" },
  { href: "/m/ai", label: "AI Web Builder", Icon: Sparkles, tone: "lilac", badge: "Baru" },
  { href: "/m/convert", label: "Konversi", Icon: RefreshCw, tone: "lilac" },
  { href: "/m/domain", label: "Domain", Icon: Globe2, tone: "sky" },
  { href: "/m/env", label: "Environment", Icon: KeyRound, tone: "sky" },
  { href: "/m/komunitas", label: "Komunitas", Icon: Users, tone: "lemon" },
  { href: "/m/donasi", label: "Donasi", Icon: Heart, tone: "lemon" },
] as const;

export default function MobileHome() {
  const { user } = useAuth();
  const { history, loading } = useUserData();
  const [filter, setFilter] = React.useState<Filter>("all");

  const live = history.filter((h) => h.status !== "deleted");
  const projects = uniqueProjects(history);
  const online = projects.filter((p) => p.status === "ready").length;
  const ready = live.filter((h) => h.status === "ready").length;
  const failed = live.filter((h) => h.status === "failed").length;
  const done = ready + failed;
  const rate = done === 0 ? null : Math.round((ready / done) * 100);

  const shown = live.filter((h) => filter === "all" || h.status === filter).slice(0, 5);
  const first = (user?.name ?? "").split(" ")[0] || "kamu";

  return (
    <div className="space-y-6 pt-2">
      <div>
        <h2 className="break-words text-[22px] font-bold leading-tight tracking-tight">
          {greeting()}, {first}
        </h2>
        <p className="mt-0.5 text-[13px] text-text-muted">Semua deploy-mu ada di sini.</p>
      </div>

      {/* Hero */}
      <section className={`relative overflow-hidden rounded-card ${HERO_GRADIENT} p-5 text-white shadow-[0_18px_34px_-14px_rgba(90,57,192,0.7)]`}>
        <div className="pointer-events-none absolute -bottom-12 -right-10 h-44 w-44 rounded-full bg-violet-400/40 blur-2xl" />
        <div className="pointer-events-none absolute -left-8 -top-8 h-32 w-32 rounded-full bg-white/15 blur-xl" />
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-violet-100">Project aktif</p>
            <p className="mt-1 flex items-baseline gap-1.5">
              <span className="text-[40px] font-bold leading-none tracking-tight tabular-nums">{loading ? "–" : projects.length}</span>
              <span className="text-[14px] font-semibold text-violet-100">project</span>
            </p>
          </div>
          <Link
            href="/m/deploy"
            className="flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-white pl-3 pr-4 text-[13px] font-bold text-lav-text shadow-lg active:scale-95"
          >
            <Plus size={16} aria-hidden />
            Deploy baru
          </Link>
        </div>
        <div className="relative mt-4 grid grid-cols-3 gap-2">
          <Stat label="Online" value={loading ? "–" : `${online}`} dot />
          <Stat label="Berhasil" value={loading ? "–" : rate === null ? "–" : `${rate}%`} />
          <Stat label="Gagal" value={loading ? "–" : `${failed}`} />
        </div>
      </section>

      {/* Pintasan */}
      <section className="space-y-3">
        <SectionTitle>Layanan Kilat</SectionTitle>
        <div className={`${CARD} grid grid-cols-3 gap-x-2 gap-y-5 px-3 py-5`}>
          {ACTIONS.map(({ href, label, Icon, tone, ...rest }) => (
            <Link key={label} href={href} className="flex min-w-0 flex-col items-center gap-2 active:scale-95">
              <span className={`relative flex h-14 w-14 items-center justify-center rounded-[14px] ${TONE[tone]} text-lav-text`}>
                <Icon size={24} aria-hidden />
                {"badge" in rest && (
                  <span className="absolute -right-2 -top-2 rounded-full bg-lime-500 px-2 py-0.5 text-[12px] font-bold leading-none text-[var(--lime-text)] ring-2 ring-[color:var(--frame)]">
                    {rest.badge}
                  </span>
                )}
              </span>
              <span className="w-full truncate text-center text-[13px] font-medium leading-tight text-text">{label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Riwayat */}
      <section className="space-y-3">
        <SectionTitle action={{ href: "/m/riwayat", label: "Lihat semua" }}>Riwayat Deploy</SectionTitle>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Chip active={filter === "all"} onClick={() => setFilter("all")}>Semua ({live.length})</Chip>
          <Chip active={filter === "ready"} onClick={() => setFilter("ready")}>Berhasil ({ready})</Chip>
          <Chip active={filter === "failed"} onClick={() => setFilter("failed")}>Gagal ({failed})</Chip>
        </div>
        {loading ? (
          <SkeletonList />
        ) : shown.length === 0 ? (
          <EmptyState
            icon={<Inbox size={24} aria-hidden />}
            title={live.length === 0 ? "Belum ada deploy" : "Tidak ada yang cocok"}
            hint={live.length === 0 ? "Deploy repo GitHub pertamamu dalam hitungan detik." : "Coba filter lain."}
            cta={live.length === 0 ? { href: "/m/deploy", label: "Deploy sekarang" } : undefined}
          />
        ) : (
          <ul className="space-y-3">
            {shown.map((h) => (
              <HistoryCard key={h.id} item={h} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, dot }: { label: string; value: string; dot?: boolean }) {
  return (
    <div className="min-w-0 rounded-[14px] bg-black/15 p-2.5 backdrop-blur-sm">
      <p className="flex items-center gap-1.5 whitespace-nowrap text-[12px] font-semibold text-violet-100">
        {dot && <span className="h-2 w-2 animate-pulse rounded-full bg-lime-500" />}
        {label}
      </p>
      <p className="mt-0.5 text-[18px] font-bold tabular-nums tracking-tight">{value}</p>
    </div>
  );
}
