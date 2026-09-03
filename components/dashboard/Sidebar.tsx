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
  Menu,
  X,
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
  const [open, setOpen] = React.useState(false);

  // Close the mobile drawer automatically whenever the active view changes.
  React.useEffect(() => {
    setOpen(false);
  }, [view]);

  function handleLogout() {
    setOpen(false);
    logout();
    router.push("/");
  }

  return (
    <>
      {/* Mobile top bar — only visible below md, sits above the page content */}
      <div className="sidebar sidebar-topbar sticky top-0 z-30 flex items-center justify-between px-4 py-3 md:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Buka menu"
          className="grid h-9 w-9 place-items-center rounded-xl text-text-muted hover:bg-[var(--card-hover)] hover:text-text"
        >
          <Menu size={19} />
        </button>
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 text-white">
            <Rocket size={14} />
          </span>
          <span className="text-[14px] font-semibold tracking-tight">Depush</span>
        </div>
        <ThemeToggle />
      </div>

      {/* Backdrop for the mobile drawer */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={`sidebar fixed inset-y-0 left-0 z-50 flex h-screen w-72 max-w-[82%] shrink-0 flex-col p-4 transition-transform duration-300 ease-out md:sticky md:top-0 md:z-auto md:w-64 md:max-w-none md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-2 py-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 text-white">
              <Rocket size={16} />
            </span>
            <span className="text-[15px] font-semibold tracking-tight">Depush</span>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Tutup menu"
            className="grid h-8 w-8 place-items-center rounded-full text-text-muted hover:bg-[var(--card-hover)] hover:text-text md:hidden"
          >
            <X size={16} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto">
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
          <div className="mb-2 hidden justify-end md:flex">
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
    </>
  );
}
