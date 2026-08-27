"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  Rocket,
  Globe2,
  KeyRound,
  BookOpen,
  Settings2,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useDeploy } from "@/lib/deploy-context";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import type { DashboardView } from "@/types";

const NAV_ITEMS: { id: DashboardView; label: string; icon: React.ElementType }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "projects", label: "Projects", icon: FolderKanban },
  { id: "deploy", label: "Deploy", icon: Rocket },
  { id: "domains", label: "Domains", icon: Globe2 },
  { id: "env", label: "Environment", icon: KeyRound },
  { id: "docs", label: "Docs", icon: BookOpen },
  { id: "settings", label: "Settings", icon: Settings2 },
];

export function Sidebar() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { view, setView } = useDeploy();

  function handleLogout() {
    logout();
    router.push("/");
  }

  return (
    <aside className="sidebar flex h-screen w-64 shrink-0 flex-col p-4">
      <div className="flex items-center gap-2 px-2 py-3 mb-4">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 text-white">
          <Rocket size={16} />
        </span>
        <span className="text-[15px] font-semibold tracking-tight">DeployOne</span>
      </div>

      <nav className="flex-1 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = view === item.id;
          return (
            <button
              key={item.id}
              type="button"
              data-view={item.id}
              className={`nav flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-[13px] font-medium transition ${
                active ? "bg-[var(--card-hover)] text-text" : "text-text-muted hover:text-text hover:bg-[var(--card-hover)]"
              }`}
              onClick={() => setView(item.id)}
            >
              <item.icon size={17} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="pt-3 border-t border-[var(--line)]">
        <div className="mb-2 flex justify-end">
          <ThemeToggle />
        </div>
        {user && (
          <div className="pill flex items-center gap-3 px-3 py-2.5 mb-2">
            <span
              className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[12px] font-semibold text-white ${
                user.color === "violet" ? "bg-violet-500" : "bg-blue-500"
              }`}
            >
              {user.avatar}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium">{user.name}</span>
              <span className="block truncate text-[11px] text-text-muted">{user.email}</span>
            </span>
          </div>
        )}
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-[13px] font-medium text-text-muted transition hover:text-text hover:bg-[var(--card-hover)]"
        >
          <LogOut size={17} /> Logout
        </button>
      </div>
    </aside>
  );
}
