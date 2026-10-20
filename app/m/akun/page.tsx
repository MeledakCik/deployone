"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronRight, KeyRound, LayoutDashboard, Coffee, LogOut, ShieldCheck, History, CheckCircle2, Circle, Globe, Variable } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useUserData } from "@/lib/m-data";
import { CARD, HERO_GRADIENT, uniqueProjects } from "@/components/m/ui";

export default function MobileAccount() {
  const { user, logout } = useAuth();
  const { tokens, history, loading } = useUserData();
  const [leaving, setLeaving] = React.useState(false);
  if (!user) return null;

  const projects = uniqueProjects(history).length;
  const conns = [
    { name: "Vercel", ok: !!tokens.vercelToken },
    { name: "GitHub", ok: !!tokens.githubPat },
    { name: "Cloudflare", ok: !!tokens.cloudflareToken },
    { name: "Railway", ok: !!tokens.railwayToken },
  ];

  const rows = [
    { href: "/m/pengaturan", label: "Pengaturan & token", hint: "Token Vercel, GitHub, Cloudflare, Railway", Icon: KeyRound },
    { href: "/m/riwayat", label: "Riwayat deploy", hint: "Semua deploy tercatat permanen", Icon: History },
    { href: "/m/kelola", label: "Kelola project", hint: "Sinkron, import, hapus project", Icon: LayoutDashboard },
    { href: "/m/domain", label: "Domain", hint: "Hubungkan domain ke project", Icon: Globe },
    { href: "/m/env", label: "Environment", hint: "Env variable per project", Icon: Variable },
    { href: "/m/donasi", label: "Dukung Depup", hint: "Traktir kopi lewat Saweria", Icon: Coffee },
    ...(user.isAdmin ? [{ href: "/admin", label: "Panel admin", hint: "Khusus admin Depup", Icon: ShieldCheck }] : []),
  ];

  return (
    <div className="space-y-5 pt-2">
      <section className={`relative overflow-hidden rounded-[24px] ${HERO_GRADIENT} p-5 text-white shadow-[0_18px_34px_-14px_rgba(109,40,217,0.7)]`}>
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/15 blur-xl" />
        <div className="relative flex items-center gap-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/20 text-[24px] font-extrabold ring-2 ring-white/60">
            {user.picture ? <img src={user.picture} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" /> : (user.name || user.email).charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[19px] font-extrabold tracking-[-0.02em]">{user.name}</p>
            <p className="truncate text-[12.5px] text-[#EDE0FF]">{user.email}</p>
            <p className="mt-1.5 inline-flex rounded-full bg-black/15 px-2.5 py-1 text-[11px] font-bold">{loading ? "…" : `${projects} project`}</p>
          </div>
        </div>
      </section>

      <section className={`${CARD} p-4`}>
        <p className="text-[13px] font-extrabold">Koneksi platform</p>
        <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5">
          {conns.map((c) => (
            <li key={c.name} className="flex items-center gap-2 text-[13px] font-semibold">
              {c.ok ? <CheckCircle2 className="h-[18px] w-[18px] text-[#10B981]" /> : <Circle className="h-[18px] w-[18px] text-[#CBD5E1]" />}
              <span className={c.ok ? "text-[#141B2B]" : "text-[#94A3B8]"}>{c.name}</span>
            </li>
          ))}
        </ul>
      </section>

      <ul className={`${CARD} divide-y divide-[#F1F5F9] overflow-hidden`}>
        {rows.map(({ href, label, hint, Icon }) => (
          <li key={label}>
            <Link href={href} className="flex items-center gap-3 px-4 py-3.5 active:bg-[#F5F3FF]">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[#F5F3FF] text-[#7C3AED]"><Icon className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14.5px] font-bold">{label}</span>
                <span className="block truncate text-[12px] text-[#64748B]">{hint}</span>
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 text-[#CBD5E1]" />
            </Link>
          </li>
        ))}
      </ul>

      <button
        onClick={async () => { setLeaving(true); await logout(); }}
        disabled={leaving}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-[16px] bg-[#FEF2F2] text-[14.5px] font-extrabold text-[#B91C1C] ring-1 ring-[#FECACA] transition active:scale-[0.98] disabled:opacity-60"
      >
        <LogOut className="h-[18px] w-[18px]" /> Keluar
      </button>
      <p className="pb-2 text-center text-[11px] text-[#94A3B8]">Depup · deploy dari HP</p>
    </div>
  );
}
