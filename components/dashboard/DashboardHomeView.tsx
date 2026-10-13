"use client";

import * as React from "react";
import { Boxes, CheckCircle2, XCircle, Plus, ArrowUpRight, Activity, Zap, ShieldCheck } from "lucide-react";
import { useDeploy } from "@/lib/deploy-context";
import { useAuth } from "@/lib/auth-context";
import { ViewFade } from "@/components/ui/ViewFade";
import { StatCard } from "./StatCard";
import { HistoryTable } from "./HistoryTable";

function MiniChart({ data }: { data: number[] }) {
  const max = Math.max(...data, 1);
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - (v / max) * 100;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg viewBox="0 0 100 100" className="h-32 w-full">
      <defs>
        <linearGradient id="chartLine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.25" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="1" />
        </linearGradient>
      </defs>
      <polyline fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" points={points} />
      <polyline fill="none" stroke="url(#chartLine)" strokeWidth="6" strokeLinejoin="round" strokeLinecap="round" opacity="0.12" points={points} />
      {data.map((v, i) => {
        const x = (i / (data.length - 1)) * 100;
        const y = 100 - (v / max) * 100;
        return <circle key={i} cx={x} cy={y} r="1.9" fill="currentColor" />;
      })}
    </svg>
  );
}

export function DashboardHomeView() {
  const { stats, setView } = useDeploy();
  const { user } = useAuth();
  const chartData = React.useMemo(() => [18, 26, 22, 34, 41, 38, 49, 57, 52, 68, 63, 79], []);

  return (
    <ViewFade>
      <div className="space-y-6">
        <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.18)] backdrop-blur-xl transition-transform duration-500 hover:-translate-y-0.5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[12px] text-text-muted">
                <Activity size={14} /> Live KPI Dashboard
              </div>
              <h2 className="text-[28px] font-semibold tracking-[-0.04em] sm:text-[36px]">
                Halo, {user?.name ?? "Developer"} 👋
              </h2>
              <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-text-muted">
                Pantau deployment, status proyek, dan performa sistem dalam satu dashboard yang cepat, halus, dan profesional.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setView("deploy")}
              className="btn-primary inline-flex h-12 items-center gap-2 px-6 text-[14px] transition-all duration-300 hover:scale-[1.01]"
            >
              <Plus size={15} /> Deploy Baru
            </button>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md transition-transform duration-300 hover:-translate-y-0.5">
              <div className="flex items-center justify-between text-text-muted">
                <span className="text-[13px]">Deployment Trend</span>
                <ArrowUpRight size={16} />
              </div>
              <div className="mt-2 text-3xl font-semibold tracking-[-0.04em]">{stats.total}</div>
              <div className="mt-2 text-[12px] text-emerald-300">+12.4% dari minggu lalu</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md transition-transform duration-300 hover:-translate-y-0.5">
              <div className="flex items-center justify-between text-text-muted">
                <span className="text-[13px]">System Health</span>
                <ShieldCheck size={16} />
              </div>
              <div className="mt-2 text-3xl font-semibold tracking-[-0.04em]">{stats.ready}</div>
              <div className="mt-2 text-[12px] text-sky-300">Ready untuk produksi</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md transition-transform duration-300 hover:-translate-y-0.5">
              <div className="flex items-center justify-between text-text-muted">
                <span className="text-[13px]">Failures</span>
                <Zap size={16} />
              </div>
              <div className="mt-2 text-3xl font-semibold tracking-[-0.04em]">{stats.failed}</div>
              <div className="mt-2 text-[12px] text-rose-300">Perlu perhatian</div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[13px] text-text-muted">Performance chart</p>
                  <h3 className="text-[18px] font-medium">Deployment velocity</h3>
                </div>
                <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[12px] text-text-muted">
                  Real-time
                </div>
              </div>
              <div className="mt-4 text-violet-300">
                <MiniChart data={chartData} />
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-[13px] text-text-muted">Status ringkas</p>
              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-400/15" />
                    <div>
                      <div className="text-[14px] font-medium">Ready</div>
                      <div className="text-[12px] text-text-muted">Siap rilis</div>
                    </div>
                  </div>
                  <div className="text-[14px] font-semibold">{stats.ready}</div>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-violet-400/15" />
                    <div>
                      <div className="text-[14px] font-medium">Total</div>
                      <div className="text-[12px] text-text-muted">Seluruh aktivitas</div>
                    </div>
                  </div>
                  <div className="text-[14px] font-semibold">{stats.total}</div>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-rose-400/15" />
                    <div>
                      <div className="text-[14px] font-medium">Failed</div>
                      <div className="text-[12px] text-text-muted">Butuh review</div>
                    </div>
                  </div>
                  <div className="text-[14px] font-semibold">{stats.failed}</div>
                </div>
              </div>
            </div>
          </div>
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
