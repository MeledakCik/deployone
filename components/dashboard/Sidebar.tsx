"use client";

import { useT } from "@/lib/i18n";
import "@/lib/i18n/dict/app";
import * as React from "react";
import { useRouter } from "next/navigation";
import { LayoutDashboard, FolderKanban, Rocket, UploadCloud, Link2, Sparkles, RefreshCw, Globe2, KeyRound, BookOpen, Database, Settings2, Heart, Users, LogOut, ShieldCheck, LayoutGrid } from "@/components/ui/icons";
import { useAuth } from "@/lib/auth-context";
import { useDeploy } from "@/lib/deploy-context";
import { AppSidebar, SIDEBAR_LINK_CLASS, type NavGroup } from "@/components/ui/AppSidebar";
import { getInitials, avatarColorFor } from "@/lib/utils";
import type { DashboardView } from "@/types";
import { PREFER_DESKTOP_KEY } from "@/lib/mobile-routes";

export function Sidebar() {
  const t = useT();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { view, setView, stats } = useDeploy();
  const closeRef = React.useRef<(() => void) | null>(null);

  // Menu dikelompokkan menurut tujuan: melihat kondisi, merilis, mengatur, dan sisanya.
  const groups = React.useMemo<NavGroup[]>(
    () => [
      {
        label: "Ringkasan",
        items: [
          { id: "dashboard", label: t("Beranda"), icon: LayoutDashboard, badge: stats.failed, badgeLabel: t("{failed} deploy gagal", { failed: stats.failed }) },
          { id: "projects", label: "Project", icon: FolderKanban },
        ],
      },
      {
        label: "Rilis",
        items: [
          { id: "deploy", label: t("Deploy"), icon: Rocket },
          { id: "upload", label: t("Unggah"), icon: UploadCloud },
          { id: "hosting", label: t("Link Instan"), icon: Link2 },
          { id: "ai", label: t("AI Web Builder"), icon: Sparkles },
          { id: "convert", label: "Konversi", icon: RefreshCw },
        ],
      },
      {
        label: "Konfigurasi",
        items: [
          { id: "domains", label: t("Domain"), icon: Globe2 },
          { id: "env", label: t("Variabel env"), icon: KeyRound },
          { id: "database", label: "Database", icon: Database },
          { id: "settings", label: t("Pengaturan"), icon: Settings2 },
        ],
      },
      {
        label: "Lainnya",
        items: [
          { id: "docs", label: t("Dokumentasi"), icon: BookOpen },
          { id: "community", label: t("Komunitas"), icon: Users },
          { id: "donate", label: t("Donasi"), icon: Heart },
        ],
      },
    ],
    [stats.failed],
  );

  function handleLogout() {
    closeRef.current?.();
    void logout().then(() => router.push("/"));
  }

  return (
    <AppSidebar
      groups={groups}
      active={view}
      onSelect={(id) => setView(id as DashboardView)}
      navLabel={t("Menu dashboard")}
      onCloseDrawerRef={closeRef}
      footer={
        <>
          {user && (
            <div className="flex items-center gap-3 rounded-[14px] bg-[var(--sidebar-card)] p-2.5 text-white">
              {user.picture ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.picture} alt={user.name} referrerPolicy="no-referrer" className="h-9 w-9 shrink-0 rounded-[14px] object-cover" />
              ) : (
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-[14px] text-[12px] font-semibold text-white ${avatarColorFor(user.email)}`}>
                  {getInitials(user.name)}
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold">{user.name}</span>
                <span className="block truncate text-[12px] text-white" title={user.email}>
                  {user.email}
                </span>
              </span>
              <button
                type="button"
                onClick={handleLogout}
                aria-label={t("Keluar")}
                title={t("Keluar")}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-[14px] text-white transition hover:bg-white/15 max-md:h-10 max-md:w-10"
              >
                <LogOut size={18} aria-hidden />
              </button>
            </div>
          )}
          {user?.isAdmin && (
            <a href="/admin" className={SIDEBAR_LINK_CLASS}>
              <ShieldCheck size={18} />{" "}{t("Panel admin")}
            </a>
          )}
          {/* Hanya muncul di layar HP, bila pengguna sengaja memilih tampilan desktop. */}
          <button
            type="button"
            className={`${SIDEBAR_LINK_CLASS} md:hidden`}
            onClick={() => {
              try {
                localStorage.removeItem(PREFER_DESKTOP_KEY);
              } catch {
                /* abaikan */
              }
              router.replace("/m");
            }}
          >
            <LayoutGrid size={18} aria-hidden />{" "}{t("Tampilan HP")}
          </button>
          {!user && (
            <button type="button" onClick={handleLogout} className={SIDEBAR_LINK_CLASS}>
              <LogOut size={18} />{" "}{t("Keluar")}
            </button>
          )}
        </>
      }
    />
  );
}
