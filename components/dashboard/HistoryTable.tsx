"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { useDeploy } from "@/lib/deploy-context";

export function HistoryTable() {
  const { history, redeploy } = useDeploy();

  return (
    <GlassPanel className="overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--line)]">
        <h3 className="text-[14px] font-semibold">Riwayat Deploy</h3>
        <span className="mono text-[11px] text-text-faint">{history.length}/10</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-[11px] uppercase tracking-wide text-text-faint">
              <th className="px-6 py-3 font-medium">Project</th>
              <th className="px-6 py-3 font-medium">Platform</th>
              <th className="px-6 py-3 font-medium">Domain</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium text-right">Aksi</th>
            </tr>
          </thead>
          <tbody id="history">
            {history.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-[13px] text-text-muted">
                  Belum ada riwayat deploy.
                </td>
              </tr>
            )}
            {history.map((item) => {
              const isReady = item.status === "ready";
              return (
                <tr
                  key={item.id}
                  className="card-hover-row group border-b last:border-0 transition"
                  style={{ borderColor: "var(--line)" }}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span
                        className={`grid h-8 w-8 place-items-center rounded-full border ${
                          isReady
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                            : "bg-red-500/10 text-red-400 border-red-500/20"
                        }`}
                      >
                        {isReady ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                      </span>
                      <div>
                        <div className="text-[13px] font-semibold">{item.name}</div>
                        <div className="mono text-[11px] opacity-50">
                          {item.platform} • {item.date}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[12px] capitalize">{item.platform}</td>
                  <td className="px-6 py-4 mono text-[12px] opacity-70">{item.domain}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-0.5 text-[11px] font-medium ${
                        isReady
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-500"
                          : "border-red-500/20 bg-red-500/10 text-red-400"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${isReady ? "bg-emerald-500" : "bg-red-400"} glow-dot`} />
                      {isReady ? "Ready" : "Failed"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => redeploy(item.name)}
                      className="pill px-3 py-1 text-[11px] font-medium hover:brightness-110"
                    >
                      Redeploy
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </GlassPanel>
  );
}
