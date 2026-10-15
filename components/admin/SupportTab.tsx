"use client";

import * as React from "react";
import { RefreshCw } from "lucide-react";
import { useAdminData } from "./api";
import { Badge, Btn, Card, Empty, ErrorBox, Loading, PageHead, fmtDateTime } from "./ui";

interface Check {
  label?: string;
  status?: string;
  detail?: string;
}
interface SupportReport {
  id: string;
  email: string;
  createdAt: string;
  source: "auto" | "user";
  view: string | null;
  summary: string;
  transcript: { role: "user" | "assistant"; content: string }[];
  diagnostics: { checks?: Check[] } | null;
}

export function SupportTab() {
  const { data, error, loading, reload } = useAdminData<{ reports: SupportReport[] }>("/api/admin/support");
  const [open, setOpen] = React.useState<string | null>(null);

  return (
    <div>
      <PageHead
        title="Laporan bantuan"
        desc="Masalah yang dikirim pengguna lewat chat bantuan (manual atau otomatis)."
        right={
          <Btn onClick={() => void reload()} busy={loading}>
            <RefreshCw size={13} /> Muat ulang
          </Btn>
        }
      />
      <Card>
        {error ? (
          <ErrorBox message={error} onRetry={reload} />
        ) : !data ? (
          <Loading />
        ) : data.reports.length === 0 ? (
          <Empty>Belum ada laporan bantuan.</Empty>
        ) : (
          <ul>
            {data.reports.map((r) => {
              const problems = (r.diagnostics?.checks ?? []).filter((c) => c.status === "problem" || c.status === "warn");
              const isOpen = open === r.id;
              return (
                <li key={r.id} className="border-b border-[var(--surface-line)] last:border-0">
                  <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : r.id)} className="w-full px-5 py-4 text-left transition hover:bg-[var(--row-hover)]">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="mono text-[12px] text-text-faint">{r.id}</span>
                      <Badge tone={r.source === "auto" ? "warn" : "violet"}>{r.source === "auto" ? "Otomatis" : "Dari pengguna"}</Badge>
                      {problems.length > 0 && <Badge tone="bad">{problems.length} temuan</Badge>}
                      <span className="ml-auto text-[12px] text-text-faint">{fmtDateTime(r.createdAt)}</span>
                    </div>
                    <p className="mt-1.5 text-[13.5px]">{r.summary}</p>
                    <p className="text-[12px] text-text-muted">
                      {r.email}
                      {r.view ? ` · halaman ${r.view}` : ""}
                    </p>
                  </button>
                  {isOpen && (
                    <div className="space-y-3 bg-[var(--row-hover)] px-5 py-4 text-[13px]">
                      {problems.length > 0 && (
                        <ul className="space-y-1">
                          {problems.map((c, i) => (
                            <li key={i}>
                              <span className="font-medium">{c.label}</span> <span className="text-text-muted">— {c.detail}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      <div className="space-y-2">
                        {r.transcript.map((m, i) => (
                          <p key={i} className="whitespace-pre-wrap break-words">
                            <span className={m.role === "user" ? "font-medium text-violet-400" : "font-medium text-text-muted"}>{m.role === "user" ? "Pengguna" : "Asisten"}: </span>
                            {m.content}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
