"use client";

import { useT } from "@/lib/i18n";
import "@/lib/i18n/dict/app";
import { LanguageSwitch } from "@/components/ui/LanguageSwitch";
import * as React from "react";
import Link from "next/link";
import { ChevronRight, Settings2, FolderKanban, Heart, LogOut, ShieldCheck, History, CheckCircle2, Circle, Globe2, KeyRound } from "@/components/ui/icons";
import { useAuth } from "@/lib/auth-context";
import { useUserData } from "@/lib/m-data";
import { CARD, HERO_GRADIENT, uniqueProjects } from "@/components/m/ui";

export default function MobileAccount() {
  const t = useT();
  const { user, logout } = useAuth();
  const { tokens, history, loading } = useUserData();
  const [leaving, setLeaving] = React.useState(false);
  // Di browser HP (bukan app Android), sediakan jalan keluar ke dashboard versi desktop.
  const [inBrowser, setInBrowser] = React.useState(false);
  React.useEffect(() => {
    setInBrowser(!(window as unknown as { Capacitor?: unknown }).Capacitor);
  }, []);
  if (!user) return null;

  const projects = uniqueProjects(history).length;
  const conns = [
    { name: "Vercel", ok: !!tokens.vercelToken },
    { name: "Cloudflare Pages", ok: !!tokens.cloudflareToken },
    { name: "Railway", ok: !!tokens.railwayToken },
    { name: "GitHub", ok: !!tokens.githubPat },
  ];

  // Nama dan ikon sama dengan menu di sidebar web.
  const rows = [
    { href: "/m/pengaturan", label: t("Pengaturan & token"), hint: t("Token Vercel, Cloudflare Pages, Railway, GitHub"), Icon: Settings2 },
    { href: "/m/riwayat", label: t("Riwayat deploy"), hint: t("Semua deploy tercatat permanen"), Icon: History },
    { href: "/m/kelola", label: t("Kelola project"), hint: t("Sinkron, import, hapus project"), Icon: FolderKanban },
    { href: "/m/domain", label: t("Domain"), hint: t("Hubungkan domain ke project"), Icon: Globe2 },
    { href: "/m/env", label: t("Variabel env"), hint: t("Variabel environment per project"), Icon: KeyRound },
    { href: "/m/donasi", label: t("Donasi"), hint: t("Traktir kopi lewat Saweria"), Icon: Heart },
    ...(user.isAdmin ? [{ href: "/admin", label: t("Panel admin"), hint: t("Khusus admin Depup"), Icon: ShieldCheck }] : []),
  ];

  return (
    <div className="space-y-5 pt-2">
      <section className={`relative overflow-hidden rounded-card ${HERO_GRADIENT} p-5 text-white shadow-[0_18px_34px_-14px_rgba(90,57,192,0.7)]`}>
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/15 blur-xl" />
        <div className="relative flex items-center gap-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/20 text-[24px] font-bold ring-2 ring-white/60">
            {user.picture ? <img src={user.picture} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" /> : (user.name || user.email).charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[18px] font-bold tracking-tight">{user.name}</p>
            <p className="truncate text-[13px] text-violet-100">{user.email}</p>
            <p className="mt-1.5 inline-flex rounded-full bg-black/15 px-2.5 py-1 text-[12px] font-semibold">{loading ? "…" : `${projects} project`}</p>
          </div>
        </div>
      </section>

      <section className={`${CARD} p-4`}>
        <p className="text-[16px] font-bold tracking-tight">{t("Koneksi platform")}</p>
        <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5">
          {conns.map((c) => (
            <li key={c.name} className="flex min-w-0 items-center gap-2 text-[13px] font-medium [&>svg]:shrink-0">
              {c.ok ? <CheckCircle2 size={18} className="text-ok" aria-hidden /> : <Circle size={18} className="text-violet-200" aria-hidden />}
              <span className={c.ok ? "text-text" : "text-text-faint"}>{c.name}</span>
              <span className="sr-only">{c.ok ? t("terhubung") : t("belum terhubung")}</span>
            </li>
          ))}
        </ul>
      </section>

      <ul className={`${CARD} divide-y divide-[var(--line)] overflow-hidden`}>
        {rows.map(({ href, label, hint, Icon }) => (
          <li key={label}>
            <Link href={href} className="flex items-center gap-3 px-4 py-3.5 active:bg-[var(--card-hover)]">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-tone-lilac text-lav-text">
                <Icon size={20} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-semibold">{label}</span>
                <span className="block truncate text-[12px] text-text-muted">{hint}</span>
              </span>
              <ChevronRight size={18} className="shrink-0 text-text-faint" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>

      <div className={`${CARD} flex items-center justify-between gap-3 p-4`}>
        <span className="text-[14px] font-semibold">{t("Bahasa")}</span>
        <LanguageSwitch compact />
      </div>

      <button
        onClick={async () => { setLeaving(true); await logout(); }}
        disabled={leaving}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-bad-bg text-[14px] font-semibold text-bad-fg transition active:scale-[0.98] disabled:opacity-60"
      >
        <LogOut size={18} aria-hidden />{" "}{t("Keluar")}
      </button>
      {inBrowser && (
        <p className="text-center text-[13px] text-text-muted">
          <a href="/dashboard?desktop=1" className="font-semibold text-lav-text underline underline-offset-4">
            {t("Buka tampilan desktop")}
          </a>
        </p>
      )}
      <p className="pb-2 text-center text-[12px] text-text-muted">{t("Depup · deploy dari HP")}</p>
    </div>
  );
}
