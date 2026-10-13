"use client";

import type * as React from "react";
import { normalizeDeployDomain } from "@/lib/utils";
import { CheckCircle2, XCircle, Trash2 } from "lucide-react";
import { Surface } from "@/components/ui/Surface";
import { useDeploy } from "@/lib/deploy-context";

export function HistoryTable() {
  const { history, redeploy } = useDeploy();

  return (
    <Surface className="rise overflow-hidden" style={{ "--i": 4 } as React.CSSProperties}>
      <div className="flex items-center justify-between px-6 pb-3 pt-6">
        <h3 className="text-[18px] font-semibold tracking-[-0.025em]">Riwayat Deploy</h3>
        <span className="badge px-3 py-1 text-[12px]">{history.length}/10</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-[12px] text-text-faint">
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
              const isDeleted = item.status === "deleted";
              return (
                <tr
                  key={item.id}
                  className={`surface-solid-row transition-colors ${isDeleted ? "opacity-60" : ""}`}
                >
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      <span
                        className={`grid h-9 w-9 place-items-center rounded-full ${
                          isDeleted
                            ? "bg-zinc-500/10 text-zinc-400"
                            : isReady
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                              : "bg-red-500/15 text-red-500 dark:text-red-400"
                        }`}
                      >
                        {isDeleted ? (
                          <Trash2 size={16} />
                        ) : isReady ? (
                          <CheckCircle2 size={16} />
                        ) : (
                          <XCircle size={16} />
                        )}
                      </span>
                      <div>
                        <div className="text-[13px] font-semibold">{item.name}</div>
                        <div className="mono text-[11px] opacity-50">
                          {item.platform} • {item.date}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3.5 text-[12px] capitalize">{item.platform}</td>
                  <td className="px-6 py-3.5 mono text-[12px] opacity-70">{normalizeDeployDomain(item.domain, item.platform)}</td>
                  <td className="px-6 py-3.5">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-pill px-3 py-1 text-[12px] font-medium ${
                        isDeleted
                          ? "bg-zinc-500/10 text-zinc-400"
                          : isReady
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                            : "bg-red-500/15 text-red-500 dark:text-red-400"
                      }`}
                    >
                      <span
                        className={`dot-flat h-1.5 w-1.5 rounded-full ${
                          isDeleted ? "bg-zinc-400" : isReady ? "bg-emerald-400" : "bg-red-400"
                        }`}
                      />
                      {isDeleted ? "Deleted" : isReady ? "Ready" : "Failed"}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <button
                      type="button"
                      onClick={() => redeploy(item.name)}
                      className="pill px-4 py-1.5 text-[12px] font-medium"
                    >
                      {isDeleted ? "Deploy Ulang" : "Redeploy"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Surface>
  );
}
