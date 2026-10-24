"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { SESSION_EXPIRED_EVENT } from "@/lib/session-expired";
import { useToast } from "@/components/ui/Toast";
import { useDeploy } from "@/lib/deploy-context";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardHomeView } from "@/components/dashboard/DashboardHomeView";
import { DeployFormView } from "@/components/dashboard/DeployFormView";
import { UploadView } from "@/components/dashboard/UploadView";
import { HostingView } from "@/components/dashboard/HostingView";
import { AiSiteView } from "@/components/dashboard/AiSiteView";
import { ProjectsView } from "@/components/dashboard/ProjectsView";
import { DomainsView } from "@/components/dashboard/DomainsView";
import { EnvironmentView } from "@/components/dashboard/EnvironmentView";
import { DocsView } from "@/components/dashboard/DocsView";
import { SettingsView } from "@/components/dashboard/SettingsView";
import { DonateView } from "@/components/dashboard/DonateView";
import { DatabasesView } from "@/components/dashboard/DatabasesView";
import { AnnouncementBanner } from "@/components/dashboard/AnnouncementBanner";
import { DeployModal } from "@/components/dashboard/DeployModal";
import { SupportChat } from "@/components/dashboard/SupportChat";

export default function DashboardPage() {
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
      showToast("Perubahan belum tersimpan ke server — periksa koneksi, lalu coba lagi.");
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
      showToast("Sesi login habis — silakan login lagi.");
      void refresh();
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, [refresh, showToast]);

  React.useEffect(() => {
    if (ready && !user) router.replace("/");
  }, [ready, user, router]);

  if (!ready || !user) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center text-[13px] text-text-muted">
        Memuat dashboard…
      </div>
    );
  }

  return (
    <div className="app-canvas">
      <div className="app-frame flex flex-col md:flex-row md:items-start md:gap-4">
        <Sidebar />
        <div className="min-w-0 flex-1 px-2 py-4 sm:px-4 sm:py-5 lg:px-6">
          <div className="mx-auto max-w-6xl">
            <AnnouncementBanner />
          </div>
          <div className="mx-auto max-w-6xl view active" id={view}>
            {view === "dashboard" && <DashboardHomeView />}
            {view === "deploy" && <DeployFormView />}
            {view === "upload" && <UploadView />}
            {view === "hosting" && <HostingView />}
            {view === "ai" && <AiSiteView />}
            {view === "projects" && <ProjectsView />}
            {view === "domains" && <DomainsView />}
            {view === "env" && <EnvironmentView />}
            {view === "database" && <DatabasesView />}
            {view === "docs" && <DocsView />}
            {view === "settings" && <SettingsView />}
            {view === "donate" && <DonateView />}
          </div>
        </div>
      </div>

      <DeployModal />
      <SupportChat />
    </div>
  );
}
