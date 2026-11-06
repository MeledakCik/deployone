"use client";

import { useT } from "@/lib/i18n";
import "@/lib/i18n/dict/app";
import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { SESSION_EXPIRED_EVENT } from "@/lib/session-expired";
import { useToast } from "@/components/ui/Toast";
import { useDeploy } from "@/lib/deploy-context";
import { BrandLoader } from "@/components/ui/BrandLoader";
import { PREFER_DESKTOP_KEY, VIEW_ROUTE } from "@/lib/mobile-routes";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardHomeView } from "@/components/dashboard/DashboardHomeView";
import { DeployFormView } from "@/components/dashboard/DeployFormView";
import { UploadView } from "@/components/dashboard/UploadView";
import { HostingView } from "@/components/dashboard/HostingView";
import { AiSiteView } from "@/components/dashboard/AiSiteView";
import { ConvertView } from "@/components/dashboard/ConvertView";
import { ProjectsView } from "@/components/dashboard/ProjectsView";
import { DomainsView } from "@/components/dashboard/DomainsView";
import { EnvironmentView } from "@/components/dashboard/EnvironmentView";
import { DocsView } from "@/components/dashboard/DocsView";
import { SettingsView } from "@/components/dashboard/SettingsView";
import { DonateView } from "@/components/dashboard/DonateView";
import { DatabasesView } from "@/components/dashboard/DatabasesView";
import { CommunityView } from "@/components/dashboard/CommunityView";
import { AnnouncementBanner } from "@/components/dashboard/AnnouncementBanner";
import { DeployModal } from "@/components/dashboard/DeployModal";
import { SupportChat } from "@/components/dashboard/SupportChat";

export default function DashboardPage() {
  const t = useT();
  const router = useRouter();
  const { user, ready, refresh } = useAuth();
  const { view } = useDeploy();
  const { showToast } = useToast();

  // Kabari user kalau perubahan gagal tersimpan ke cloud (max 1x / 10 detik).
  React.useEffect(() => {
    let last = 0;
    const onError = () => {
      if (Date.now() - last < 10_000) return;
      last = Date.now();
      showToast(t("Perubahan belum tersimpan ke server — periksa koneksi, lalu coba lagi."));
    };
    window.addEventListener("depup:sync-error", onError);
    return () => window.removeEventListener("depup:sync-error", onError);
  }, [showToast]);

  // Sesi login habis di tengah pemakaian: kabari sekali, lalu balik ke halaman login.
  React.useEffect(() => {
    let handled = false;
    const onExpired = () => {
      if (handled) return;
      handled = true;
      showToast(t("Sesi login habis — silakan login lagi."));
      void refresh();
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, [refresh, showToast]);

  React.useEffect(() => {
    if (ready && !user) router.replace("/");
  }, [ready, user, router]);

  // ?view= saat halaman pertama dibuka (alur login bisa menghapus query sebelum efek di bawah jalan).
  const initialViewRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    initialViewRef.current = new URLSearchParams(window.location.search).get("view");
  }, []);

  // Di layar HP, pakai app mobile /m (bottom nav, deploy bertahap) — satu pengalaman untuk semua pengguna HP.
  // Bisa dimatikan dengan ?desktop=1 (diingat di perangkat ini) atau tombol "Tampilan desktop" di /m/akun.
  React.useEffect(() => {
    if (!ready || !user) return;
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("desktop") === "1") {
        localStorage.setItem(PREFER_DESKTOP_KEY, "1");
        return;
      }
      if (localStorage.getItem(PREFER_DESKTOP_KEY) === "1") return;
    } catch {
      /* storage tidak tersedia: tetap alihkan */
    }
    if (!window.matchMedia("(max-width: 767px)").matches) return;
    // Baca ?view= langsung dari URL: state `view` bisa belum terisi saat efek ini jalan pertama kali.
    const target = new URLSearchParams(window.location.search).get("view") ?? initialViewRef.current ?? view;
    router.replace(VIEW_ROUTE[target] ?? "/m");
    // hanya saat pertama dibuka; navigasi berikutnya di HP sudah terjadi di /m
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, user]);

  if (!ready || !user) {
    return <BrandLoader />;
  }

  return (
    <div className="app-canvas">
      <div className="app-frame flex flex-col md:flex-row md:items-start md:gap-4">
        <Sidebar />
        <main id="main" className="min-w-0 flex-1 px-2 py-4 sm:px-4 sm:py-5 lg:px-6">
          <div className="mx-auto max-w-6xl">
            <AnnouncementBanner />
          </div>
          <div className="mx-auto max-w-6xl view active" id={view}>
            {view === "dashboard" && <DashboardHomeView />}
            {view === "deploy" && <DeployFormView />}
            {view === "upload" && <UploadView />}
            {view === "hosting" && <HostingView />}
            {view === "ai" && <AiSiteView />}
            {view === "convert" && <ConvertView />}
            {view === "projects" && <ProjectsView />}
            {view === "domains" && <DomainsView />}
            {view === "env" && <EnvironmentView />}
            {view === "database" && <DatabasesView />}
            {view === "docs" && <DocsView />}
            {view === "settings" && <SettingsView />}
            {view === "donate" && <DonateView />}
            {view === "community" && <CommunityView />}
          </div>
        </main>
      </div>

      <DeployModal />
      <SupportChat />
    </div>
  );
}
