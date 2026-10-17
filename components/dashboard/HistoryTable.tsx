"use client";

import { normalizeDeployDomain, deployDomainToUrl } from "@/lib/utils";
import { CheckCircle2, XCircle, Trash2, ExternalLink, Rocket } from "@/components/ui/icons";
import { Badge, Btn, Card, Empty, Skeleton } from "@/components/ui/primitives";
import { useDeploy } from "@/lib/deploy-context";
import type { HistoryItem } from "@/types";

export type HistoryFilter = "all" | "ready" | "failed";

const FILTERS: { id: HistoryFilter; label: string }[] = [
  { id: "all", label: "Semua" },
  { id: "ready", label: "Berhasil" },
  { id: "failed", label: "Gagal" },
];

function statusMeta(item: HistoryItem) {
  if (item.status === "deleted") return { label: "Dihapus", tone: "neutral" as const, Icon: Trash2, iconClass: "bg-[var(--pill-bg)] text-text-muted" };
  if (item.status === "ready") return { label: "Berhasil", tone: "good" as const, Icon: CheckCircle2, iconClass: "bg-tone-mint text-ok-fg" };
  return { label: "Gagal", tone: "bad" as const, Icon: XCircle, iconClass: "bg-tone-pink text-bad-fg" };
}

/** Deretan titik status dari yang terlama ke terbaru: sekilas terlihat apakah deploy belakangan sehat. */
function StatusStrip({ history }: { history: HistoryItem[] }) {
  if (history.length < 2) return null;
  const items = [...history].reverse();
  const summary = `Status ${items.length} deploy terakhir, dari yang terlama: ${items.map((h) => statusMeta(h).label).join(", ")}`;
  return (
    <span className="flex items-center gap-1" role="img" aria-label={summary} title={summary}>
      {items.map((h) => (
        <span key={h.id} className={`h-2.5 w-2.5 rounded-full ${h.status === "ready" ? "bg-ok" : h.status === "failed" ? "bg-bad" : "bg-[var(--line-strong)]"}`} />
      ))}
    </span>
  );
}

function DomainCell({ item }: { item: HistoryItem }) {
  const host = normalizeDeployDomain(item.domain, item.platform);
  if (!host || host === "-") return <span className="text-text-muted">—</span>;
  if (item.status !== "ready") return <span className="mono text-[12px] text-text-muted">{host}</span>;
  return (
    <a
      href={deployDomainToUrl(item.domain, item.platform)}
      target="_blank"
      rel="noopener noreferrer"
      className="mono inline-flex max-w-full items-center gap-1.5 text-[12px] text-lav-text underline-offset-4 hover:underline"
      aria-label={`Buka ${host} di tab baru`}
    >
      <span className="truncate">{host}</span>
      <ExternalLink size={12} className="shrink-0" />
    </a>
  );
}

/** Satu aksi utama per baris: "Coba lagi" menonjol untuk yang gagal, sisanya tenang. */
function RowAction({ item, onRedeploy }: { item: HistoryItem; onRedeploy: (name: string) => void }) {
  if (item.status === "failed") {
    return (
      <Btn variant="primary" onClick={() => onRedeploy(item.name)} aria-label={`Coba deploy ulang ${item.name}`}>
        Coba lagi
      </Btn>
    );
  }
  return (
    <Btn onClick={() => onRedeploy(item.name)} aria-label={`${item.status === "deleted" ? "Deploy ulang" : "Redeploy"} ${item.name}`}>
      {item.status === "deleted" ? "Deploy ulang" : "Redeploy"}
    </Btn>
  );
}

export function HistoryTableSkeleton() {
  return (
    <Card title="Riwayat deploy">
      <div className="space-y-3 p-6" role="status" aria-label="Memuat riwayat deploy">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-1/3" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="hidden h-8 w-24 rounded-full sm:block" />
          </div>
        ))}
      </div>
    </Card>
  );
}

export function HistoryTable({ filter, onFilterChange }: { filter: HistoryFilter; onFilterChange: (f: HistoryFilter) => void }) {
  const { history, redeploy, stats } = useDeploy();
  const rows = filter === "all" ? history : history.filter((h) => h.status === filter);
  const counts: Record<HistoryFilter, number> = { all: stats.total, ready: stats.ready, failed: stats.failed };

  return (
    <Card
      title="Riwayat deploy"
      action={
        <div className="flex flex-wrap items-center gap-3">
          <StatusStrip history={history} />
          <div className="flex gap-1.5" role="group" aria-label="Filter status deploy">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                aria-pressed={filter === f.id}
                onClick={() => onFilterChange(f.id)}
                className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition-colors max-md:min-h-[40px] ${
                  filter === f.id ? "chip-on" : "bg-[var(--surface-solid-2)] text-text-muted hover:text-text"
                }`}
              >
                {f.label} <span className="tabular-nums opacity-80">{counts[f.id]}</span>
              </button>
            ))}
          </div>
        </div>
      }
    >
      {rows.length === 0 ? (
        <Empty
          icon={Rocket}
          action={
            filter !== "all" ? (
              <Btn onClick={() => onFilterChange("all")}>Tampilkan semua</Btn>
            ) : undefined
          }
        >
          {filter === "failed" ? "Tidak ada deploy yang gagal. Semua aman." : "Tidak ada deploy dengan status ini."}
        </Empty>
      ) : (
        <>
          {/* Desktop: tabel */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="text-[12px] text-text-muted">
                  <th className="px-6 py-3 font-medium">Project</th>
                  <th className="px-4 py-3 font-medium">Platform</th>
                  <th className="px-4 py-3 font-medium">Domain</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 text-right font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody id="history">
                {rows.map((item) => {
                  const m = statusMeta(item);
                  return (
                    <tr key={item.id} className="surface-solid-row border-t border-[var(--surface-line)]">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${m.iconClass}`}>
                            <m.Icon size={16} />
                          </span>
                          <div className="min-w-0">
                            <div className={`truncate font-semibold ${item.status === "deleted" ? "text-text-muted" : ""}`}>{item.name}</div>
                            <div className="text-[12px] text-text-muted">{item.date}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 capitalize">{item.platform}</td>
                      <td className="max-w-[260px] px-4 py-4">
                        <DomainCell item={item} />
                      </td>
                      <td className="px-4 py-4">
                        <Badge tone={m.tone} dot>
                          {m.label}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <RowAction item={item} onRedeploy={redeploy} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile: daftar kartu */}
          <ul className="md:hidden">
            {rows.map((item) => {
              const m = statusMeta(item);
              return (
                <li key={item.id} className="border-t border-[var(--surface-line)] px-5 py-4 first:border-0">
                  <div className="flex items-start gap-3">
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${m.iconClass}`}>
                      <m.Icon size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`truncate font-semibold ${item.status === "deleted" ? "text-text-muted" : ""}`}>{item.name}</p>
                        <Badge tone={m.tone} dot>
                          {m.label}
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-[12px] capitalize text-text-muted">
                        {item.platform} · {item.date}
                      </p>
                      <div className="mt-1.5 min-w-0">
                        <DomainCell item={item} />
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 grid">
                    <RowAction item={item} onRedeploy={redeploy} />
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Card>
  );
}
