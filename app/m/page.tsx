"use client";

import * as React from "react";
import Link from "next/link";
import {
  Rocket, CloudUpload, Zap, Sparkles, ArrowLeftRight, Globe, KeyRound, BookOpen, Coffee, PlusCircle, Inbox, Users,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useUserData } from "@/lib/m-data";
import { HistoryCard } from "@/components/m/HistoryCard";
import { Chip, EmptyState, HERO_GRADIENT, SectionTitle, SkeletonList, uniqueProjects } from "@/components/m/ui";

type Filter = "all" | "ready" | "failed";

const ACTIONS = [
  { href: "/m/deploy", label: "Deploy", Icon: Rocket, grad: "from-[#9876ff] to-[#7b50ff]" },
  { href: "/m/upload", label: "Upload Zip", Icon: CloudUpload, grad: "from-[#9876ff] to-[#7b50ff]" },
  { href: "/m/link-instan", label: "Link Instan", Icon: Zap, grad: "from-[#9876ff] to-[#7b50ff]" },
  { href: "/m/ai", label: "AI Builder", Icon: Sparkles, grad: "from-[#9876ff] to-[#7b50ff]", badge: "BARU" },
  { href: "/m/convert", label: "Konversi", Icon: ArrowLeftRight, grad: "from-[#9876ff] to-[#7b50ff]" },
  { href: "/m/domain", label: "Domain", Icon: Globe, grad: "from-[#9876ff] to-[#7b50ff]" },
  { href: "/m/env", label: "Env Secret", Icon: KeyRound, grad: "from-[#9876ff] to-[#7b50ff]" },
  { href: "/m/panduan", label: "Panduan", Icon: BookOpen, grad: "from-[#9876ff] to-[#7b50ff]" },
  { href: "/m/komunitas", label: "Komunitas", Icon: Users, grad: "from-[#9876ff] to-[#7b50ff]" },
  { href: "/m/donasi", label: "Donasi", Icon: Coffee, grad: "from-[#9876ff] to-[#7b50ff]" },
] as const;

function greeting() {
  const h = new Date().getHours();
  if (h < 11) return "Selamat pagi";
  if (h < 15) return "Selamat siang";
  if (h < 19) return "Selamat sore";
  return "Selamat malam";
}

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
        <h2 className="break-words text-[22px] font-extrabold leading-tight tracking-[-0.025em]">
          {greeting()}, {first} 👋
        </h2>
        <p className="mt-0.5 text-[13px] text-[#59546d]">Semua deploy-mu ada di sini.</p>
      </div>

      {/* Hero */}
      <section className={`relative overflow-hidden rounded-[24px] ${HERO_GRADIENT} p-5 text-white shadow-[0_18px_34px_-14px_rgba(90,57,192,0.7)]`}>
        <div className="pointer-events-none absolute -bottom-12 -right-10 h-44 w-44 rounded-full bg-[#9876ff]/40 blur-2xl" />
        <div className="pointer-events-none absolute -left-8 -top-8 h-32 w-32 rounded-full bg-white/15 blur-xl" />
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#e7e0ff]">Project Aktif</p>
            <p className="mt-1 flex items-baseline gap-1.5">
              <span className="text-[44px] font-extrabold leading-none tracking-[-0.04em] tabular-nums">{loading ? "–" : projects.length}</span>
              <span className="text-[14px] font-semibold text-[#e7e0ff]">project</span>
            </p>
          </div>
          <Link
            href="/m/deploy"
            className="flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-white pl-3 pr-4 text-[13px] font-extrabold text-[#5a39c0] shadow-lg active:scale-95"
          >
            <PlusCircle className="h-[18px] w-[18px]" />
            Deploy Baru
          </Link>
        </div>
        <div className="relative mt-4 grid grid-cols-3 gap-2">
          <Stat label="Online" value={loading ? "–" : `${online}`} dot />
          <Stat label="Berhasil" value={loading ? "–" : rate === null ? "–" : `${rate}%`} />
          <Stat label="Gagal" value={loading ? "–" : `${failed}`} />
        </div>
      </section>

      {/* Layanan */}
      <section className="space-y-3">
        <SectionTitle>Layanan Kilat</SectionTitle>
        <div className="grid grid-cols-3 gap-x-2 gap-y-5">
          {ACTIONS.map(({ href, label, Icon, grad, ...rest }) => (
            <Link key={label} href={href} className="group flex min-w-0 flex-col items-center gap-2 active:scale-95">
              <span className={`relative flex h-14 w-14 items-center justify-center rounded-[18px] bg-gradient-to-br ${grad} text-white shadow-[0_8px_16px_-6px_rgba(152,118,255,0.55)]`}>
                <Icon className="h-6 w-6" strokeWidth={2.1} />
                {"badge" in rest && (
                  <span className="absolute -right-1.5 -top-1.5 rounded-full bg-[#d6455d] px-1.5 py-[1px] text-[12px] font-extrabold tracking-wide text-white ring-2 ring-[#f4f1ff]">
                    {rest.badge}
                  </span>
                )}
              </span>
              <span className="w-full truncate text-center text-[13px] font-semibold leading-tight text-[#59546d]">{label}</span>
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
            icon={<Inbox className="h-6 w-6" />}
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
      <p className="flex items-center gap-1.5 whitespace-nowrap text-[12px] font-bold text-[#e7e0ff]">
        {dot && <span className="h-2 w-2 animate-pulse rounded-full bg-[#c6f432]" />}
        {label}
      </p>
      <p className="mt-0.5 text-[18px] font-extrabold tabular-nums tracking-[-0.02em]">{value}</p>
    </div>
  );
}
