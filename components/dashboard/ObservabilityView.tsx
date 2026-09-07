"use client";

import * as React from "react";
import { Activity, Loader2, RefreshCw, ShieldAlert } from "lucide-react";
import { Surface } from "@/components/ui/Surface";
import { ViewFade } from "@/components/ui/ViewFade";
import { StatCard } from "./StatCard";
import { ObservabilityModal } from "./ObservabilityModal";
import { useDeploy } from "@/lib/deploy-context";
import type { AnalyticsApiResult, ApiResponse, HistoryItem } from "@/types";

function uniqueVercelProjects(history: HistoryItem[]): string[] {
  const safeHistory = Array.isArray(history) ? history : [];
  const seen = new Set<string>();
  const names: string[] = [];
  for (const item of safeHistory) {
    if (item.platform === "vercel" && !seen.has(item.name)) {
      seen.add(item.name);
      names.push(item.name);
    }
  }
  return names;
}

async function fetchAnalytics(project: string, vercelToken: string): Promise<AnalyticsApiResult> {
  const res = await fetch(`/api/vercel/analytics?project=${encodeURIComponent(project)}`, {
    headers: { "x-vercel-token": vercelToken },
    cache: "no-store",
  });
  const body = (await res.json().catch(() => null)) as ApiResponse<AnalyticsApiResult> | null;
  if (!body || !body.ok) throw new Error(body?.error ?? `Request gagal (${res.status})`);
  return body.data;
}

function formatNumber(n: number): string {
  return n.toLocaleString("id-ID");
}

function formatBandwidth(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / Math.pow(1024, i);
  return `${value >= 100 || i === 0 ? Math.round(value) : value.toFixed(1)} ${units[i]}`;
}

type ProjectEntry =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: AnalyticsApiResult };

export function ObservabilityView() {
  const { history, vercelToken, focusedTrafficProject, setFocusedTrafficProject } = useDeploy();
  const projects = React.useMemo(() => uniqueVercelProjects(history), [history]);
  const [entries, setEntries] = React.useState<Record<string, ProjectEntry>>({});
  const [refreshKey, setRefreshKey] = React.useState(0);
  // Datang dari tombol "View Traffic" di halaman Projects -> langsung buka
  // detail modal project itu begitu halaman ini kebuka.
  const [detailProject, setDetailProject] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (focusedTrafficProject) {
      setDetailProject(focusedTrafficProject);
      setFocusedTrafficProject(null); // konsumsi sekali, jangan kebuka lagi tiap kunjungan berikutnya
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedTrafficProject]);

  React.useEffect(() => {
    if (!vercelToken || projects.length === 0) return;

    let cancelled = false;
    setEntries(Object.fromEntries(projects.map((name) => [name, { status: "loading" }])));

    void Promise.all(
      projects.map(async (name) => {
        try {
          const data = await fetchAnalytics(name, vercelToken);
          if (!cancelled) {
            setEntries((prev) => ({ ...prev, [name]: { status: "ready", data } }));
          }
        } catch (err) {
          if (!cancelled) {
            setEntries((prev) => ({
              ...prev,
              [name]: {
                status: "error",
                message: err instanceof Error ? err.message : "Gagal memuat.",
              },
            }));
          }
        }
      })
    );

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vercelToken, projects.join(","), refreshKey]);

  const readyEntries = Object.entries(entries).filter(
    (e): e is [string, Extract<ProjectEntry, { status: "ready" }>] => e[1].status === "ready"
  );

  const totals = readyEntries.reduce(
    (acc, [, entry]) => {
      if (!entry.data.enabled) return acc;
      acc.requests += entry.data.totalRequests;
      acc.bandwidth += entry.data.bandwidth;
      acc.errors += entry.data.errors["4xx"] + entry.data.errors["5xx"];
      return acc;
    },
    { requests: 0, bandwidth: 0, errors: 0 }
  );
  const errorRate = totals.requests > 0 ? (totals.errors / totals.requests) * 100 : 0;

  const isLoading = projects.some((p) => entries[p]?.status === "loading");
  const maxRequests =
    readyEntries.reduce(
      (max, [, e]) => (e.data.enabled ? Math.max(max, e.data.totalRequests) : max),
      0
    ) || 1;

  return (
    <ViewFade>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Observability</h2>
            <p className="text-sm text-text-muted">
              Ringkasan traffic 7 hari terakhir dari semua project Vercel kamu.
            </p>
          </div>
          {vercelToken && projects.length > 0 && (
            <button
              type="button"
              onClick={() => setRefreshKey((k) => k + 1)}
              disabled={isLoading}
              className="pill inline-flex items-center gap-2 px-4 py-2 text-sm font-medium hover:brightness-110 disabled:opacity-50"
            >
              <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
              {isLoading ? "Memuat..." : "Refresh"}
            </button>
          )}
        </div>

        {!vercelToken ? (
          <Surface className="flex flex-col items-center justify-center gap-3 px-6 py-24 text-center">
            <ShieldAlert size={44} className="text-text-faint" strokeWidth={1.5} />
            <h3 className="text-lg font-semibold">Vercel Token dibutuhkan</h3>
            <p className="max-w-xs text-sm text-text-muted">
              Isi Vercel Token di Settings untuk melihat data traffic project kamu.
            </p>
          </Surface>
        ) : projects.length === 0 ? (
          <Surface className="flex flex-col items-center justify-center gap-3 px-6 py-24 text-center">
            <Activity size={44} className="text-text-faint" strokeWidth={1.5} />
            <h3 className="text-lg font-semibold">Belum ada project Vercel</h3>
            <p className="max-w-xs text-sm text-text-muted">
              Deploy project ke Vercel dulu untuk mulai melihat data observability.
            </p>
          </Surface>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard
                id="obs-requests"
                label="Total Requests"
                value={formatNumber(totals.requests)}
                icon={Activity}
                tone="violet"
              />
              <StatCard
                id="obs-bandwidth"
                label="Bandwidth"
                value={formatBandwidth(totals.bandwidth)}
                icon={Activity}
                tone="emerald"
              />
              <StatCard
                id="obs-errors"
                label="Error Rate"
                value={`${errorRate.toFixed(1)}%`}
                icon={Activity}
                tone={errorRate > 5 ? "red" : "violet"}
              />
            </div>

            <Surface className="p-5">
              <p className="mono text-[11px] uppercase tracking-wide text-text-faint mb-3">
                Per project
              </p>
              <div className="space-y-2.5">
                {projects.map((name) => {
                  const entry = entries[name];
                  if (!entry || entry.status === "loading") {
                    return (
                      <div key={name} className="flex items-center gap-2.5 text-text-faint">
                        <Loader2 size={13} className="animate-spin shrink-0" />
                        <span className="mono text-[12.5px] truncate">{name}</span>
                      </div>
                    );
                  }
                  if (entry.status === "error") {
                    return (
                      <div key={name} className="flex items-center gap-2.5 text-red-400/80">
                        <span className="mono text-[12.5px] truncate">{name}</span>
                        <span className="text-[11.5px] truncate">— {entry.message}</span>
                      </div>
                    );
                  }
                  if (!entry.data.enabled) {
                    return (
                      <div key={name} className="flex items-center gap-2.5 text-text-faint">
                        <span className="mono text-[12.5px] truncate">{name}</span>
                        <span className="text-[11.5px] truncate">— Analytics belum aktif</span>
                      </div>
                    );
                  }
                  const pct = Math.max(3, Math.round((entry.data.totalRequests / maxRequests) * 100));
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setDetailProject(name)}
                      className="flex w-full items-center gap-2.5 rounded-xl px-1 py-1 text-left hover:bg-[var(--card-hover)]"
                    >
                      <span className="mono w-32 shrink-0 truncate text-[12.5px]">{name}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-pill bg-[var(--pill-bg)]">
                        <div
                          className="h-full rounded-pill bg-gradient-to-r from-violet-500 to-cyan-400"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="mono w-16 shrink-0 text-right text-[11.5px] text-text-muted">
                        {formatNumber(entry.data.totalRequests)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </Surface>
          </>
        )}
      </div>

      <ObservabilityModal
        projectName={detailProject}
        open={!!detailProject}
        onClose={() => setDetailProject(null)}
      />
    </ViewFade>
  );
}
