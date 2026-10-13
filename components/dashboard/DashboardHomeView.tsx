"use client";

import { Boxes, CheckCircle2, XCircle, Plus } from "lucide-react";
import { useDeploy } from "@/lib/deploy-context";
import { useAuth } from "@/lib/auth-context";
import { ViewFade } from "@/components/ui/ViewFade";
import { StatCard } from "./StatCard";
import { HistoryTable } from "./HistoryTable";

export function DashboardHomeView() {
  const { stats, setView } = useDeploy();
  const { user } = useAuth();

  return (
    <ViewFade>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-[28px] font-semibold tracking-[-0.035em] sm:text-[32px]">
              Halo, {user?.name ?? "Developer"} 👋
            </h2>
            <p className="mt-1 text-[14px] text-text-muted">Berikut ringkasan deployment kamu hari ini.</p>
          </div>
          <button
            type="button"
            onClick={() => setView("deploy")}
            className="btn-primary inline-flex h-12 items-center gap-2 px-6 text-[14px]"
          >
            <Plus size={15} /> Deploy Baru
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard id="total" label="Total Deployment" value={stats.total} icon={Boxes} tone="violet" index={0} />
          <StatCard id="ready" label="Ready" value={stats.ready} icon={CheckCircle2} tone="emerald" index={1} />
          <StatCard id="failed" label="Failed" value={stats.failed} icon={XCircle} tone="red" index={2} />
        </div>

        <HistoryTable />
      </div>
    </ViewFade>
  );
}
