"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  LayoutDashboard,
  FolderKanban,
  Rocket,
  UploadCloud,
  Globe2,
  KeyRound,
  BookOpen,
  Settings2,
  Heart,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useDeploy } from "@/lib/deploy-context";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { getInitials, avatarColorFor } from "@/lib/utils";
import type { DashboardView } from "@/types";

const NAV_ITEMS: { id: DashboardView; label: string; icon: React.ElementType }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "projects", label: "Projects", icon: FolderKanban },
  { id: "deploy", label: "Deploy", icon: Rocket },
  { id: "upload", label: "Upload", icon: UploadCloud },
  { id: "domains", label: "Domains", icon: Globe2 },
  { id: "env", label: "Environment", icon: KeyRound },
  { id: "docs", label: "Docs", icon: BookOpen },
  { id: "settings", label: "Settings", icon: Settings2 },
  { id: "donate", label: "Donasi", icon: Heart },
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
    void logout().then(() => router.push("/"));
  }

  const activeIndex = Math.max(0, NAV_ITEMS.findIndex((item) => item.id === view));

  return (
    <>
      {/* Mobile top bar — only visible below md, sits above the page content */}
      <div className="sidebar sidebar-topbar sticky top-0 z-30 flex items-center justify-between px-4 py-3 md:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Buka menu"
          className="pill grid h-10 w-10 place-items-center text-text"
        >
          <Menu size={19} />
        </button>
        <div className="flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="Depup logo"
            width={28}
            height={28}
            className="h-7 w-7 rounded-[9px] shadow-sm"
            priority
          />
          <span className="text-[15px] font-semibold tracking-[-0.03em]">Depup</span>
        </div>
        <ThemeToggle />
      </div>

      {/* Backdrop for the mobile drawer */}
      <div
        className={`fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity duration-500 md:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setOpen(false)}
        aria-hidden
      />

      <aside
        className={`sidebar fixed left-3 top-3 z-50 flex h-[calc(100dvh-1.5rem)] w-72 max-w-[82%] shrink-0 flex-col p-4 md:sticky md:left-auto md:top-4 md:m-4 md:mr-0 md:h-[calc(100dvh-2rem)] md:w-64 md:max-w-none md:translate-x-0 md:self-start ${
          open ? "translate-x-0" : "-translate-x-[125%]"
        }`}
      >
        <div className="mb-5 flex items-center justify-between px-2 pt-2">
          <div className="flex items-center gap-2.5">
            <Image
              src="/logo.png"
              alt="Depup logo"
              width={32}
              height={32}
              className="h-8 w-8 rounded-[10px] shadow-sm"
              priority
            />
            <span className="text-[17px] font-semibold tracking-[-0.03em]">Depup</span>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Tutup menu"
            className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white/70 transition-transform duration-500 ease-bounce hover:scale-110 hover:text-white active:scale-90 md:hidden"
          >
            <X size={16} />
          </button>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-0.5 py-0.5">
          <div className="nav-track flex flex-col gap-1">
            {/* Penanda aktif: meluncur ke menu terpilih dengan gerakan spring */}
            <span
              className="nav-thumb"
              style={{ transform: `translateY(${activeIndex * 48}px)` }}
              aria-hidden="true"
            />
            {NAV_ITEMS.map((item) => {
              const active = view === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  data-view={item.id}
                  aria-current={active ? "page" : undefined}
                  className="nav-item nav flex w-full items-center gap-3 px-4 text-[14px] font-medium"
                  onClick={() => setView(item.id)}
                >
                  <item.icon size={18} />
                  {item.label}
                </button>
              );
            })}
          </div>
        </nav>

        <div className="pt-3">
          <div className="mb-3 hidden justify-end md:flex">
            <ThemeToggle />
          </div>
          {user && (
            <div className="mb-2 flex items-center gap-3 rounded-[22px] bg-white/[0.07] px-3 py-2.5">
              {user.picture ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.picture}
                  alt={user.name}
                  referrerPolicy="no-referrer"
                  className="h-9 w-9 shrink-0 rounded-full object-cover"
                />
              ) : (
                <span
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-[12px] font-semibold text-white ${avatarColorFor(
                    user.email
                  )}`}
                >
                  {getInitials(user.name)}
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-white">{user.name}</span>
                <span className="block truncate text-[11px] text-white/50">{user.email}</span>
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="nav-item flex w-full items-center gap-3 px-4 text-[14px] font-medium"
          >
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>
    </>
  );
}
