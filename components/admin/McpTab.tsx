"use client";

import * as React from "react";
import { RefreshCw, Network, Users, Terminal, Sparkles } from "@/components/ui/icons";
import { useAdminData } from "./api";
import { Badge, Btn, Card, Empty, ErrorBox, KpiCard, Loading, PageHead, Pager, fmtDateTime, usePager } from "./ui";

interface UserClient {
  key: string;
  label: string;
  via: "oauth" | "token" | null;
  software: string | null;
  calls: number;
  toolCalls: number;
  firstAt: number;
  lastAt: number;
}

interface McpUser {
  email: string;
  lastAt: number;
  calls: number;
  clients: UserClient[];
}

interface McpUsage {
  generatedAt: number;
  retentionDays: number;
  totals: { users: number; active24h: number; active7d: number; active30d: number; calls: number; toolCalls: number };
  byClient: { key: string; label: string; users: number; calls: number; lastAt: number }[];
  topTools: { name: string; count: number }[];
  users: McpUser[];
  truncated: boolean;
}

const nf = new Intl.NumberFormat("id-ID");

function ago(ms: number): string {
  const s = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (s < 60) return "baru saja";
  if (s < 3600) return `${Math.floor(s / 60)} mnt lalu`;
  if (s < 86400) return `${Math.floor(s / 3600)} jam lalu`;
  return `${Math.floor(s / 86400)} hari lalu`;
}

const VIA_LABEL = { oauth: "OAuth", token: "Token" } as const;

/** Satu baris "terhubung ke mana": nama aplikasi, cara masuk, perangkat lunak, jumlah request, terakhir aktif. */
function ClientLine({ c }: { c: UserClient }) {
  const detail = [c.via ? VIA_LABEL[c.via] : null, c.software, `${nf.format(c.calls)} request`, ago(c.lastAt)].filter(Boolean).join(" · ");
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
      <Badge tone="violet">{c.label}</Badge>
      <span className="min-w-0 break-words text-[12px] text-text-muted" title={`Pertama: ${fmtDateTime(c.firstAt)} · Terakhir: ${fmtDateTime(c.lastAt)}`}>
        {detail}
      </span>
    </div>
  );
}

export function McpTab() {
  const { data, error, loading, reload } = useAdminData<McpUsage>("/api/admin/mcp");
  const [q, setQ] = React.useState("");

  const rows = (data?.users ?? []).filter(
    (u) => !q || `${u.email} ${u.clients.map((c) => `${c.label} ${c.software ?? ""}`).join(" ")}`.toLowerCase().includes(q.toLowerCase()),
  );
  const pager = usePager(rows, 20, q);
  const maxUsers = Math.max(1, ...(data?.byClient ?? []).map((c) => c.users));
  const maxTool = Math.max(1, ...(data?.topTools ?? []).map((t) => t.count));

  return (
    <div className="space-y-5">
      <PageHead
        title="Konektor MCP"
        desc="Berapa orang yang memakai konektor AI dan lewat aplikasi apa mereka terhubung."
        right={
          <Btn onClick={() => void reload()} busy={loading}>
            <RefreshCw size={13} /> Segarkan
          </Btn>
        }
      />

      {error ? (
        <Card>
          <ErrorBox message={error} onRetry={reload} />
        </Card>
      ) : !data ? (
        <Card>
          <Loading />
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard icon={Users} label="Pengguna MCP" value={nf.format(data.totals.users)} sub={`tercatat ${data.retentionDays} hari terakhir`} />
            <KpiCard
              icon={Sparkles}
              label="Aktif 24 jam"
              value={nf.format(data.totals.active24h)}
              sub={`${nf.format(data.totals.active7d)} dalam 7 hari · ${nf.format(data.totals.active30d)} dalam 30 hari`}
            />
            <KpiCard icon={Terminal} label="Total request" value={nf.format(data.totals.calls)} sub={`${nf.format(data.totals.toolCalls)} pemanggilan tool`} />
            <KpiCard
              icon={Network}
              label="Aplikasi AI"
              value={data.byClient.length}
              sub={data.byClient[0] ? `terbanyak: ${data.byClient[0].label}` : "belum ada"}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Terhubung ke mana">
              {data.byClient.length === 0 ? (
                <Empty>Belum ada pemakaian tercatat.</Empty>
              ) : (
                <ul className="divide-y divide-[var(--surface-line)]">
                  {data.byClient.map((c) => (
                    <li key={c.key} className="px-6 py-3.5">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-[13.5px] font-semibold">{c.label}</span>
                        <span className="shrink-0 text-[12.5px] tabular-nums text-text-muted">{nf.format(c.users)} pengguna</span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--pill-bg)]" aria-hidden>
                        <div className="h-full rounded-full" style={{ width: `${(c.users / maxUsers) * 100}%`, background: "var(--ring)" }} />
                      </div>
                      <p className="mt-1.5 text-[12px] text-text-muted">
                        {nf.format(c.calls)} request · terakhir {ago(c.lastAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card title="Tool paling sering dipakai">
              {data.topTools.length === 0 ? (
                <Empty>Belum ada tool yang dipanggil.</Empty>
              ) : (
                <ul className="divide-y divide-[var(--surface-line)]">
                  {data.topTools.map((t) => (
                    <li key={t.name} className="px-6 py-3.5">
                      <div className="flex items-baseline justify-between gap-3">
                        <code className="mono min-w-0 truncate text-[12.5px]">{t.name}</code>
                        <span className="shrink-0 text-[12.5px] tabular-nums text-text-muted">{nf.format(t.count)}×</span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--pill-bg)]" aria-hidden>
                        <div className="h-full rounded-full" style={{ width: `${(t.count / maxTool) * 100}%`, background: "var(--ring)" }} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <Card
            title={`Pengguna (${nf.format(rows.length)})`}
            action={
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari email atau aplikasi"
                aria-label="Cari pengguna MCP"
                className="input-solid h-10 w-full min-w-0 px-3.5 text-[13px] sm:w-64"
              />
            }
          >
            {rows.length === 0 ? (
              <Empty>{q ? "Tidak ada yang cocok." : "Belum ada pengguna yang memakai konektor MCP."}</Empty>
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full text-left text-[13px]">
                    <thead>
                      <tr className="text-[12px] uppercase tracking-wide text-text-muted">
                        <th className="px-6 py-3 font-medium">Pengguna</th>
                        <th className="px-4 py-3 font-medium">Terhubung ke</th>
                        <th className="px-4 py-3 text-right font-medium">Request</th>
                        <th className="px-6 py-3 font-medium">Terakhir aktif</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pager.slice.map((u) => (
                        <tr key={u.email} className="surface-solid-row border-t border-[var(--surface-line)] align-top">
                          <td className="break-all px-6 py-3 font-medium">{u.email}</td>
                          <td className="space-y-1.5 px-4 py-3">
                            {u.clients.map((c) => (
                              <ClientLine key={c.key} c={c} />
                            ))}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">{nf.format(u.calls)}</td>
                          <td className="whitespace-nowrap px-6 py-3 text-text-muted">
                            <span className="block">{fmtDateTime(u.lastAt)}</span>
                            {Date.now() - u.lastAt < 86400000 && <Badge tone="good" dot>Aktif</Badge>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <ul className="md:hidden">
                  {pager.slice.map((u) => (
                    <li key={u.email} className="space-y-2 border-b border-[var(--surface-line)] px-5 py-4 last:border-0">
                      <div className="flex items-start justify-between gap-2">
                        <span className="min-w-0 break-all text-[13.5px] font-semibold">{u.email}</span>
                        {Date.now() - u.lastAt < 86400000 && <Badge tone="good" dot>Aktif</Badge>}
                      </div>
                      <div className="space-y-1.5">
                        {u.clients.map((c) => (
                          <ClientLine key={c.key} c={c} />
                        ))}
                      </div>
                      <p className="text-[12px] text-text-muted">
                        {nf.format(u.calls)} request · terakhir {fmtDateTime(u.lastAt)}
                      </p>
                    </li>
                  ))}
                </ul>
                <Pager pager={pager} />
              </>
            )}
          </Card>

          <p className="px-1 text-[12px] leading-relaxed text-text-muted">
            Data mulai tercatat sejak fitur ini aktif dan disimpan {data.retentionDays} hari. Pengguna yang sudah menghubungkan konektor tapi belum memakainya
            lagi akan muncul setelah request berikutnya.
            {data.truncated && " Daftar dibatasi 300 pengguna terbaru."}
          </p>
        </>
      )}
    </div>
  );
}
