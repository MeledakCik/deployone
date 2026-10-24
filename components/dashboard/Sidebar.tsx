"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LayoutDashboard, FolderKanban, Rocket, UploadCloud, Link2, Sparkles, Globe2, KeyRound, BookOpen, Database, Settings2, Heart, LogOut, ShieldCheck } from "@/components/ui/icons";
import { useAuth } from "@/lib/auth-context";
import { useDeploy } from "@/lib/deploy-context";
import { AppSidebar, SIDEBAR_LINK_CLASS, type NavGroup } from "@/components/ui/AppSidebar";
import { getInitials, avatarColorFor } from "@/lib/utils";
import type { DashboardView } from "@/types";

export function Sidebar() {
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
          { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, badge: stats.failed, badgeLabel: `${stats.failed} deploy gagal` },
          { id: "projects", label: "Projects", icon: FolderKanban },
        ],
      },
      {
        label: "Rilis",
        items: [
          { id: "deploy", label: "Deploy", icon: Rocket },
          { id: "upload", label: "Upload", icon: UploadCloud },
          { id: "hosting", label: "Link Instan", icon: Link2 },
          { id: "ai", label: "AI Web Builder", icon: Sparkles },
        ],
      },
      {
        label: "Pengaturan",
        items: [
          { id: "domains", label: "Domains", icon: Globe2 },
          { id: "env", label: "Environment", icon: KeyRound },
          { id: "database", label: "Database", icon: Database },
          { id: "settings", label: "Settings", icon: Settings2 },
        ],
      },
      {
        label: "Lainnya",
        items: [
          { id: "docs", label: "Docs", icon: BookOpen },
          { id: "donate", label: "Donasi", icon: Heart },
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
      navLabel="Menu dashboard"
      onCloseDrawerRef={closeRef}
      footer={
        <>
          {user && (
            <div className="flex items-center gap-3 rounded-2xl bg-[var(--sidebar-hover)] p-3 text-white">
              {user.picture ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.picture} alt={user.name} referrerPolicy="no-referrer" className="h-9 w-9 shrink-0 rounded-xl object-cover" />
              ) : (
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[12px] font-semibold text-white ${avatarColorFor(user.email)}`}>
                  {getInitials(user.name)}
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold">{user.name}</span>
                <span className="block truncate text-[12px] text-white/80" title={user.email}>
                  {user.email}
                </span>
              </span>
            </div>
          )}
          {user?.isAdmin && (
            <a href="/admin" className={SIDEBAR_LINK_CLASS}>
              <ShieldCheck size={18} /> Panel Admin
            </a>
          )}
          <button type="button" onClick={handleLogout} className={SIDEBAR_LINK_CLASS}>
            <LogOut size={18} /> Logout
          </button>
        </>
      }
    />
  );
}
