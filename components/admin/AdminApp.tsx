"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LayoutDashboard, ShieldAlert, Link2, Users, MessageCircle, Settings2, History, ShieldCheck, LogOut, ArrowLeft, Database } from "@/components/ui/icons";
import { Megaphone } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/Toast";
import { ViewFade } from "@/components/ui/ViewFade";
import { AppSidebar, SIDEBAR_LINK_CLASS, type NavGroup } from "@/components/ui/AppSidebar";
import { getInitials, avatarColorFor } from "@/lib/utils";
import { adminFetch } from "./api";
import { AdminCountsContext } from "./context";
import { ConfirmProvider } from "./confirm";
import { OverviewTab } from "./OverviewTab";
import { AbuseTab } from "./AbuseTab";
import { LinksTab } from "./LinksTab";
import { UsersTab } from "./UsersTab";
import { SupportTab } from "./SupportTab";
import { PromoTab } from "./PromoTab";
import { SettingsTab } from "./SettingsTab";
import { AuditTab } from "./AuditTab";
import { HealthTab } from "./HealthTab";
import { DatabasesTab } from "./DatabasesTab";

const TABS = [
  { id: "overview", label: "Ringkasan", icon: LayoutDashboard },
  { id: "abuse", label: "Abuse & Takedown", icon: ShieldAlert },
  { id: "links", label: "Link aktif", icon: Link2 },
  { id: "users", label: "Pengguna", icon: Users },
  { id: "databases", label: "Database", icon: Database },
  { id: "support", label: "Bantuan", icon: MessageCircle },
  { id: "promo", label: "Promosi", icon: Megaphone },
  { id: "health", label: "Audit sistem", icon: ShieldCheck },
  { id: "settings", label: "Pengaturan", icon: Settings2 },
  { id: "audit", label: "Log admin", icon: History },
] as const;
type TabId = (typeof TABS)[number]["id"];

export function AdminApp({ name, email }: { name: string; email: string }) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const [tab, setTab] = React.useState<TabId>("overview");
  const closeRef = React.useRef<(() => void) | null>(null);
  const [abuseOpen, setAbuseOpen] = React.useState<number | null>(null);

  // Hitungan laporan abuse terbuka untuk badge menu: ringan (?countOnly=1), diperbarui tiap 60 dtk saat tab terlihat.
  React.useEffect(() => {
    let alive = true;
    const pull = async () => {
      if (document.hidden) return;
      try {
        const d = await adminFetch<{ counts: { open: number } }>("/api/admin/abuse?countOnly=1");
        if (alive) setAbuseOpen(d.counts.open);
      } catch {
        /* badge hanya tambahan; diam saja bila gagal */
      }
    };
    void pull();
    const id = window.setInterval(pull, 60_000);
    document.addEventListener("visibilitychange", pull);
    return () => {
      alive = false;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", pull);
    };
  }, []);
  const counts = React.useMemo(() => ({ abuseOpen, setAbuseOpen }), [abuseOpen]);

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

  function handleLogout() {
    closeRef.current?.();
    void logout().then(() => router.push("/"));
  }

  const picture = user?.picture ?? null;
  const GROUPS = React.useMemo<NavGroup[]>(
    () => [
      {
        items: TABS.map((t) => ({
          id: t.id,
          label: t.label,
          icon: t.icon,
          ...(t.id === "abuse" ? { badge: abuseOpen, badgeLabel: `${abuseOpen} laporan terbuka` } : {}),
        })),
      },
    ],
    [abuseOpen],
  );

  return (
    <AdminCountsContext.Provider value={counts}>
    <ConfirmProvider>
    <div className="app-canvas">
      <div className="admin-strip" aria-hidden />
      <div className="app-frame flex flex-col md:flex-row md:items-start md:gap-4">
        <AppSidebar
          groups={GROUPS}
          active={tab}
          onSelect={go}
          navLabel="Menu admin"
          tag="Mode Admin"
          tagShort="Admin"
          mobileDot={!!abuseOpen}
          mobileDotLabel={`${abuseOpen} laporan penyalahgunaan terbuka`}
          onCloseDrawerRef={closeRef}
          footer={
            <>
              <div className="flex items-center gap-3 rounded-2xl bg-[var(--sidebar-hover)] p-3 text-white">
                {picture ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={picture} alt={name} referrerPolicy="no-referrer" className="h-9 w-9 shrink-0 rounded-xl object-cover" />
                ) : (
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[12px] font-semibold text-white ${avatarColorFor(email)}`}>{getInitials(name)}</span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold">{name}</span>
                  <span className="block truncate text-[12px] text-white/80" title={email}>
                    {email}
                  </span>
                </span>
              </div>
              <a href="/dashboard" className={SIDEBAR_LINK_CLASS}>
                <ArrowLeft size={18} /> Ke Dashboard
              </a>
              <button type="button" onClick={handleLogout} className={SIDEBAR_LINK_CLASS}>
                <LogOut size={18} /> Logout
              </button>
            </>
          }
        />

        <div className="min-w-0 flex-1 px-2 py-4 sm:px-4 sm:py-5 lg:px-6">
          <main className="mx-auto max-w-6xl" id={tab}>
            <ViewFade key={tab}>
              {tab === "overview" && <OverviewTab goto={go} />}
              {tab === "abuse" && <AbuseTab toast={showToast} />}
              {tab === "links" && <LinksTab toast={showToast} />}
              {tab === "users" && <UsersTab toast={showToast} />}
              {tab === "databases" && <DatabasesTab toast={showToast} />}
              {tab === "support" && <SupportTab toast={showToast} />}
              {tab === "promo" && <PromoTab toast={showToast} />}
              {tab === "health" && <HealthTab toast={showToast} />}
              {tab === "settings" && <SettingsTab toast={showToast} />}
              {tab === "audit" && <AuditTab />}
            </ViewFade>
          </main>
        </div>
      </div>
    </div>
    </ConfirmProvider>
    </AdminCountsContext.Provider>
  );
}
