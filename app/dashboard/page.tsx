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
import { ProjectsView } from "@/components/dashboard/ProjectsView";
import { DomainsView } from "@/components/dashboard/DomainsView";
import { EnvironmentView } from "@/components/dashboard/EnvironmentView";
import { ObservabilityView } from "@/components/dashboard/ObservabilityView";
import { DocsView } from "@/components/dashboard/DocsView";
import { SettingsView } from "@/components/dashboard/SettingsView";
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
      showToast("Perubahan belum tersimpan ke server — cek koneksi, lalu coba lagi.");
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
      <div className="flex min-h-screen items-center justify-center text-[13px] text-text-muted">
        Memuat dashboard…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col md:flex-row">
      <Sidebar />
      <div className="flex-1 min-w-0 px-5 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto max-w-6xl view active" id={view}>
          {view === "dashboard" && <DashboardHomeView />}
          {view === "deploy" && <DeployFormView />}
          {view === "projects" && <ProjectsView />}
          {view === "domains" && <DomainsView />}
          {view === "env" && <EnvironmentView />}
          {view === "observability" && <ObservabilityView />}
          {view === "docs" && <DocsView />}
          {view === "settings" && <SettingsView />}
        </div>
      </div>

      <DeployModal />
      <SupportChat />
    </div>
  );
}
