"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useDeploy } from "@/lib/deploy-context";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardHomeView } from "@/components/dashboard/DashboardHomeView";
import { DeployFormView } from "@/components/dashboard/DeployFormView";
import { PlaceholderView } from "@/components/dashboard/PlaceholderView";
import { DeployModal } from "@/components/dashboard/DeployModal";
import { ConfirmModal } from "@/components/dashboard/ConfirmModal";

const PLACEHOLDER_TITLES: Record<string, string> = {
  projects: "Projects",
  domains: "Domains",
  env: "Environment",
  docs: "Docs",
  settings: "Settings",
};

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
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <div className="flex-1 min-w-0 px-5 py-8 sm:px-8">
        <div className="mx-auto max-w-6xl view active" id={view}>
          {view === "dashboard" && <DashboardHomeView />}
          {view === "deploy" && <DeployFormView />}
          {PLACEHOLDER_TITLES[view] && <PlaceholderView title={PLACEHOLDER_TITLES[view]} />}
        </div>
      </div>

      <DeployModal />
      <ConfirmModal />
    </div>
  );
}
