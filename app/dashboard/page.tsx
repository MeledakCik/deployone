"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useDeploy } from "@/lib/deploy-context";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardHomeView } from "@/components/dashboard/DashboardHomeView";
import { DeployFormView } from "@/components/dashboard/DeployFormView";
import { ProjectsView } from "@/components/dashboard/ProjectsView";
import { DomainsView } from "@/components/dashboard/DomainsView";
import { EnvironmentView } from "@/components/dashboard/EnvironmentView";
import { DocsView } from "@/components/dashboard/DocsView";
import { SettingsView } from "@/components/dashboard/SettingsView";
import { DeployModal } from "@/components/dashboard/DeployModal";
import { ConfirmModal } from "@/components/dashboard/ConfirmModal";

export default function DashboardPage() {
  const router = useRouter();
  const { user, ready } = useAuth();
  const { view } = useDeploy();

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
          {view === "docs" && <DocsView />}
          {view === "settings" && <SettingsView />}
        </div>
      </div>

      <DeployModal />
      <ConfirmModal />
    </div>
  );
}
