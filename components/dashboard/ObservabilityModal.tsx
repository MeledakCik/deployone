"use client";

import * as React from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  ExternalLink,
  Gauge,
  Loader2,
  X,
} from "lucide-react";
import { Surface } from "@/components/ui/Surface";
import { useDeploy } from "@/lib/deploy-context";
import type { AnalyticsApiResult, ApiResponse } from "@/types";

interface ObservabilityModalProps {
  projectName: string | null;
  open: boolean;
  onClose: () => void;
}

type LoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: AnalyticsApiResult };

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

function formatDayLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
}

async function fetchAnalytics(project: string, vercelToken: string): Promise<AnalyticsApiResult> {
  const res = await fetch(`/api/vercel/analytics?project=${encodeURIComponent(project)}`, {
    headers: { "x-vercel-token": vercelToken },
    cache: "no-store",
  });
  const body = (await res.json().catch(() => null)) as ApiResponse<AnalyticsApiResult> | null;
  if (!body || !body.ok) {
    throw new Error(body?.error ?? `Request gagal (${res.status})`);
  }
  return body.data;
}

export function ObservabilityModal({ projectName, open, onClose }: ObservabilityModalProps) {
  const { vercelToken } = useDeploy();
  const [state, setState] = React.useState<LoadState>({ status: "idle" });

  React.useEffect(() => {
    if (!open || !projectName) return;

    if (!vercelToken) {
      setState({
        status: "error",
        message: "Isi Vercel Token di Settings dulu untuk melihat data traffic.",
      });
      return;
    }

    let cancelled = false;
    setState({ status: "loading" });

    fetchAnalytics(projectName, vercelToken)
      .then((data) => {
        if (!cancelled) setState({ status: "ready", data });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState({
            status: "error",
            message: err instanceof Error ? err.message : "Gagal memuat data analytics.",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, projectName, vercelToken]);

  if (!open || !projectName) return null;

  const ready = state.status === "ready" ? state.data : null;
  const enabled = ready && ready.enabled ? ready : null;
  const disabledMessage = ready && !ready.enabled ? ready.message : null;

  const totalErrors = enabled ? enabled.errors["4xx"] + enabled.errors["5xx"] : 0;
  const errorRate =
    enabled && enabled.totalRequests > 0 ? (totalErrors / enabled.totalRequests) * 100 : 0;

  const timeseries = enabled ? enabled.timeseries.slice(-14) : [];
  const maxRequests = timeseries.reduce((max, p) => Math.max(max, p.requests), 0) || 1;
  const maxPathCount = enabled
    ? enabled.topPaths.reduce((max, p) => Math.max(max, p.count), 0) || 1
    : 1;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4">
      <Surface className="w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="flex items-center gap-2 text-[17px] font-semibold">
              <Activity size={16} className="text-violet-400 shrink-0" />
              <span className="truncate">Observability</span>
            </h3>
            <p className="mono text-[12px] text-text-faint mt-0.5 truncate">{projectName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-pill p-1.5 text-text-faint hover:bg-[var(--card-hover)] hover:text-text"
            aria-label="Tutup"
          >
            <X size={16} />
          </button>
        </div>

        <p className="mt-1 text-[13px] text-text-muted">
          Traffic &amp; performa 7 hari terakhir, ditarik langsung dari Vercel Web Analytics.
        </p>

        {/* Loading */}
        {state.status === "loading" && (
          <div className="mt-10 mb-6 flex flex-col items-center justify-center gap-3 text-text-muted">
            <Loader2 size={22} className="animate-spin" />
            <p className="text-[13px]">Memuat data analytics…</p>
          </div>
        )}

        {/* Error */}
        {state.status === "error" && (
          <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-[13px] text-red-300">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span className="break-words">{state.message}</span>
          </div>
        )}

        {/* Analytics not enabled on this project */}
        {disabledMessage && (
          <div className="mt-6 flex flex-col items-center justify-center gap-3 rounded-xl border border-[var(--line)] px-6 py-14 text-center">
            <BarChart3 size={40} className="text-text-faint" strokeWidth={1.5} />
            <p className="max-w-sm text-[13px] text-text-muted">{disabledMessage}</p>
          </div>
        )}

        {/* Data ready */}
        {enabled && (
          <div className="mt-5 space-y-6">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-[var(--line)] p-4">
                <p className="mono text-[11px] uppercase tracking-wide text-text-faint">
                  Total Requests
                </p>
                <p className="mt-1.5 text-xl font-semibold">{formatNumber(enabled.totalRequests)}</p>
              </div>
              <div className="rounded-xl border border-[var(--line)] p-4">
                <p className="mono text-[11px] uppercase tracking-wide text-text-faint">
                  Bandwidth
                </p>
                <p className="mt-1.5 text-xl font-semibold">{formatBandwidth(enabled.bandwidth)}</p>
              </div>
              <div className="rounded-xl border border-[var(--line)] p-4">
                <p className="mono text-[11px] uppercase tracking-wide text-text-faint">
                  Error Rate
                </p>
                <p
                  className={`mt-1.5 text-xl font-semibold ${
                    errorRate > 5 ? "text-red-400" : errorRate > 0 ? "text-amber-400" : ""
                  }`}
                >
                  {errorRate.toFixed(1)}%
                </p>
                <p className="mono text-[10.5px] text-text-faint mt-0.5">
                  {formatNumber(enabled.errors["4xx"])} 4xx • {formatNumber(enabled.errors["5xx"])} 5xx
                </p>
              </div>
            </div>

            {/* Simple timeseries chart — plain div bars, no chart library */}
            <div>
              <p className="mono text-[11px] uppercase tracking-wide text-text-faint mb-2.5 flex items-center gap-1.5">
                <Gauge size={12} /> Requests per hari
              </p>
              {timeseries.length === 0 ? (
                <p className="text-[12.5px] text-text-faint">Belum ada data timeseries.</p>
              ) : (
                <div className="space-y-1.5">
                  {timeseries.map((point) => {
                    const pct = Math.max(3, Math.round((point.requests / maxRequests) * 100));
                    return (
                      <div key={point.timestamp} className="flex items-center gap-2.5">
                        <span className="mono w-14 shrink-0 text-[11px] text-text-faint">
                          {formatDayLabel(point.timestamp)}
                        </span>
                        <div className="h-2 flex-1 overflow-hidden rounded-pill bg-[var(--pill-bg)]">
                          <div
                            className="h-full rounded-pill bg-gradient-to-r from-violet-500 to-cyan-400"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="mono w-14 shrink-0 text-right text-[11px] text-text-muted">
                          {formatNumber(point.requests)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Top paths table */}
            <div>
              <p className="mono text-[11px] uppercase tracking-wide text-text-faint mb-2.5">
                Top Paths
              </p>
              {enabled.topPaths.length === 0 ? (
                <p className="text-[12.5px] text-text-faint">Belum ada data path.</p>
              ) : (
                <div className="space-y-1.5">
                  {enabled.topPaths.map((p) => {
                    const pct = Math.max(3, Math.round((p.count / maxPathCount) * 100));
                    return (
                      <div key={p.path} className="flex items-center gap-2.5">
                        <span className="mono w-32 shrink-0 truncate text-[12px] text-text">
                          {p.path}
                        </span>
                        <div className="h-2 flex-1 overflow-hidden rounded-pill bg-[var(--pill-bg)]">
                          <div
                            className="h-full rounded-pill bg-gradient-to-r from-emerald-500 to-cyan-400"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="mono w-14 shrink-0 text-right text-[11px] text-text-muted">
                          {formatNumber(p.count)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-6 flex items-center justify-between gap-2 border-t border-[var(--line)] pt-4">
          <a
            href={
              enabled || disabledMessage
                ? `https://vercel.com/dashboard/analytics?projectName=${encodeURIComponent(projectName)}`
                : "https://vercel.com/dashboard"
            }
            target="_blank"
            rel="noopener noreferrer"
            className="pill inline-flex items-center gap-1.5 px-3.5 py-2 text-[12.5px] font-medium hover:brightness-110"
          >
            Open in Vercel Dashboard <ExternalLink size={12} />
          </a>
          <button
            type="button"
            onClick={onClose}
            className="btn-primary px-4 py-2 text-[13px]"
          >
            Tutup
          </button>
        </div>
      </Surface>
    </div>
  );
}
