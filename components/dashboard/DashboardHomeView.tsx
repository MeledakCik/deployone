"use client";

import { Boxes, CheckCircle2, XCircle, Plus, BarChart3, TrendingUp, ShieldCheck } from "lucide-react";
import { useDeploy } from "@/lib/deploy-context";
import { useAuth } from "@/lib/auth-context";
import { ViewFade } from "@/components/ui/ViewFade";
import { StatCard } from "./StatCard";
import { HistoryTable } from "./HistoryTable";
import { KpiChart } from "./KpiChart";

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

        <div className="grid gap-4 md:grid-cols-[1.2fr_.8fr]">
          <KpiChart />
          <div className="rounded-3xl border border-black/10 bg-slate-950 p-5 text-white shadow-[0_10px_40px_rgba(15,23,42,0.12)] dark:border-white/10">
            <p className="text-sm text-white/60">Operational health</p>
            <div className="mt-3 grid gap-3">
              {[
                ["Deploy success rate", "98.7%", "emerald"],
                ["Average build time", "2m 14s", "blue"],
                ["Rollback incidents", "1 this week", "amber"],
              ].map(([a,b,c]) => (
                <div key={a} className="rounded-2xl bg-white/5 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-white/70">{a}</span>
                    <span className="text-sm font-semibold">{b}</span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-white/10">
                    <div className={`h-2 rounded-full ${c==="emerald"?"bg-emerald-400":c==="blue"?"bg-blue-400":"bg-amber-400"}`} style={{width: c==="emerald"?"98%":c==="blue"?"72%":"18%"}} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <HistoryTable />
      </div>
    </ViewFade>
  );
}
