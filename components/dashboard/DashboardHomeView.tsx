"use client";

import { Boxes, CheckCircle2, XCircle, Plus } from "lucide-react";
import { useDeploy } from "@/lib/deploy-context";
import { useAuth } from "@/lib/auth-context";
import { StatCard } from "./StatCard";
import { HistoryTable } from "./HistoryTable";

export function DashboardHomeView() {
  const { stats, setView } = useDeploy();
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-[22px] font-semibold">
            Halo, {user?.name ?? "Developer"} 👋
          </h2>
          <p className="text-[13px] text-text-muted">Berikut ringkasan deployment kamu hari ini.</p>
        </div>
        <button
          type="button"
          onClick={() => setView("deploy")}
          className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-[13px]"
        >
          <Plus size={15} /> Deploy Baru
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard id="total" label="Total Deployment" value={stats.total} icon={Boxes} tone="violet" />
        <StatCard id="ready" label="Ready" value={stats.ready} icon={CheckCircle2} tone="emerald" />
        <StatCard id="failed" label="Failed" value={stats.failed} icon={XCircle} tone="red" />
      </div>

      <HistoryTable />
    </div>
  );
}
