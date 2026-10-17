"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Flag, Gauge, History, LifeBuoy, Link2, LogOut, Megaphone, Settings2, Users, ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/Toast";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { cn } from "@/lib/utils";
import { OverviewTab } from "./OverviewTab";
import { AbuseTab } from "./AbuseTab";
import { LinksTab } from "./LinksTab";
import { UsersTab } from "./UsersTab";
import { SupportTab } from "./SupportTab";
import { PromoTab } from "./PromoTab";
import { SettingsTab } from "./SettingsTab";
import { AuditTab } from "./AuditTab";

const TABS = [
  { id: "overview", label: "Ringkasan", icon: Gauge },
  { id: "abuse", label: "Abuse & Takedown", icon: Flag },
  { id: "links", label: "Link aktif", icon: Link2 },
  { id: "users", label: "Pengguna", icon: Users },
  { id: "promo", label: "Promosi", icon: Megaphone },
  { id: "support", label: "Bantuan", icon: LifeBuoy },
  { id: "settings", label: "Pengaturan", icon: Settings2 },
  { id: "audit", label: "Log admin", icon: History },
] as const;
type TabId = (typeof TABS)[number]["id"];

export function AdminApp({ name, email }: { name: string; email: string }) {
  const router = useRouter();
  const { logout } = useAuth();
  const { showToast } = useToast();
  const [tab, setTab] = React.useState<TabId>("overview");

  React.useEffect(() => {
    const fromHash = window.location.hash.replace("#", "") as TabId;
    if (TABS.some((t) => t.id === fromHash)) setTab(fromHash);
  }, []);

  const go = React.useCallback((id: string) => {
    if (!TABS.some((t) => t.id === id)) return;
    setTab(id as TabId);
    window.history.replaceState(null, "", `#${id}`);
    window.scrollTo({ top: 0 });
  }, []);

  return (
    <div className="min-h-[100dvh]">
      <header className="sidebar sidebar-topbar sticky top-0 z-30 flex items-center gap-3 px-4 py-3 sm:px-6">
        <span className="grid h-8 w-8 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-violet-500 to-cyan-400">
          <Image src="/logo.png" alt="Depup" width={32} height={32} />
        </span>
        <div className="min-w-0">
          <p className="font-display text-[15px] font-semibold leading-tight">Depup Admin</p>
          <p className="truncate text-[11.5px] text-text-faint" title={email}>
            {name} · {email}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="hidden items-center gap-1.5 rounded-full border border-[var(--line-strong)] px-3 py-1.5 text-[12.5px] text-text-muted hover:bg-[var(--card-hover)] sm:inline-flex"
          >
            <ArrowLeft size={13} /> Dashboard
          </button>
          <ThemeToggle />
          <button
            type="button"
            aria-label="Keluar"
            title="Keluar"
            onClick={() => void logout().then(() => router.push("/"))}
            className="grid h-9 w-9 place-items-center rounded-full text-text-muted hover:bg-[var(--card-hover)] hover:text-text"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 md:flex-row md:py-6">
        <nav aria-label="Menu admin" className="md:w-52 md:shrink-0">
          <ul className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 md:sticky md:top-20 md:flex-col md:overflow-visible">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <li key={t.id} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => go(t.id)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex w-full items-center gap-2.5 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-[13.5px] transition",
                      active ? "bg-violet-500/15 font-medium text-text" : "text-text-muted hover:bg-[var(--card-hover)] hover:text-text"
                    )}
                  >
                    <Icon size={16} className={active ? "text-violet-400" : undefined} /> {t.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <main className="min-w-0 flex-1">
          {tab === "overview" && <OverviewTab goto={go} />}
          {tab === "abuse" && <AbuseTab toast={showToast} />}
          {tab === "links" && <LinksTab toast={showToast} />}
          {tab === "users" && <UsersTab toast={showToast} />}
          {tab === "promo" && <PromoTab toast={showToast} />}
          {tab === "support" && <SupportTab toast={showToast} />}
          {tab === "settings" && <SettingsTab toast={showToast} />}
          {tab === "audit" && <AuditTab />}
        </main>
      </div>
    </div>
  );
}
