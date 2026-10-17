"use client";

import * as React from "react";
import { CheckCircle2, RefreshCw, Send } from "lucide-react";
import { adminFetch, useAdminData } from "./api";
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
  status?: "open" | "resolved";
  replies?: { at: number; by: string; text: string; emailed: boolean }[];
}

export function SupportTab({ toast }: { toast: (m: string) => void }) {
  const { data, error, loading, reload } = useAdminData<{ reports: SupportReport[]; emailReady: boolean }>("/api/admin/support");
  const [open, setOpen] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState<"open" | "all">("open");
  const [draft, setDraft] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState<string | null>(null);

  async function act(id: string, body: Record<string, unknown>, okMsg: string) {
    setBusy(id);
    try {
      await adminFetch("/api/admin/support", { method: "POST", body: { id, ...body } });
      toast(okMsg);
      if (body.action === "reply") setDraft((d) => ({ ...d, [id]: "" }));
      await reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gagal.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <PageHead
        title="Laporan bantuan"
        desc="Masalah yang dikirim pengguna lewat chat bantuan (manual atau otomatis)."
        right={
          <div className="flex items-center gap-2">
            <Btn onClick={() => setFilter(filter === "open" ? "all" : "open")}>{filter === "open" ? "Tampilkan semua" : "Hanya yang terbuka"}</Btn>
            <Btn onClick={() => void reload()} busy={loading}>
              <RefreshCw size={13} /> Muat ulang
            </Btn>
          </div>
        }
      />
      <Card>
        {error ? (
          <ErrorBox message={error} onRetry={reload} />
        ) : !data ? (
          <Loading />
        ) : data.reports.filter((r) => filter === "all" || r.status !== "resolved").length === 0 ? (
          <Empty>{filter === "open" ? "Tidak ada laporan yang terbuka." : "Belum ada laporan bantuan."}</Empty>
        ) : (
          <ul>
            {data.reports.filter((r) => filter === "all" || r.status !== "resolved").map((r) => {
              const problems = (r.diagnostics?.checks ?? []).filter((c) => c.status === "problem" || c.status === "warn");
              const isOpen = open === r.id;
              return (
                <li key={r.id} className="border-b border-[var(--surface-line)] last:border-0">
                  <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : r.id)} className="w-full px-5 py-4 text-left transition hover:bg-[var(--row-hover)]">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="mono text-[12px] text-text-faint">{r.id}</span>
                      <Badge tone={r.source === "auto" ? "warn" : "violet"}>{r.source === "auto" ? "Otomatis" : "Dari pengguna"}</Badge>
                      {problems.length > 0 && <Badge tone="bad">{problems.length} temuan</Badge>}
                      {r.status === "resolved" ? <Badge tone="good">Selesai</Badge> : <Badge tone="warn">Terbuka</Badge>}
                      {(r.replies?.length ?? 0) > 0 && <Badge tone="neutral">{r.replies!.length} balasan</Badge>}
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

                      {(r.replies ?? []).map((rep, i) => (
                        <p key={i} className="whitespace-pre-wrap break-words rounded-lg border border-[var(--surface-line)] px-3 py-2">
                          <span className="font-medium text-emerald-500">Balasan admin ({fmtDateTime(rep.at)}): </span>
                          {rep.text}
                        </p>
                      ))}

                      <div className="space-y-2 border-t border-[var(--surface-line)] pt-3">
                        <textarea
                          value={draft[r.id] ?? ""}
                          onChange={(e) => setDraft((d) => ({ ...d, [r.id]: e.target.value.slice(0, 3000) }))}
                          rows={3}
                          aria-label={`Balasan untuk ${r.id}`}
                          placeholder={`Balasan akan dikirim lewat email ke ${r.email}`}
                          className="input-solid w-full resize-y px-3 py-2 text-[13px]"
                        />
                        <div className="flex flex-wrap items-center gap-2">
                          <Btn variant="primary" busy={busy === r.id} disabled={!data.emailReady || (draft[r.id] ?? "").trim().length < 3} onClick={() => void act(r.id, { action: "reply", text: draft[r.id], resolve: true }, "Balasan terkirim & laporan ditandai selesai.")}>
                            <Send size={13} /> Kirim & tandai selesai
                          </Btn>
                          <Btn busy={busy === r.id} disabled={!data.emailReady || (draft[r.id] ?? "").trim().length < 3} onClick={() => void act(r.id, { action: "reply", text: draft[r.id] }, "Balasan terkirim.")}>
                            Kirim saja
                          </Btn>
                          {r.status === "resolved" ? (
                            <Btn busy={busy === r.id} onClick={() => void act(r.id, { action: "reopen" }, "Laporan dibuka lagi.")}>Buka lagi</Btn>
                          ) : (
                            <Btn busy={busy === r.id} onClick={() => void act(r.id, { action: "resolve" }, "Laporan ditandai selesai.")}>
                              <CheckCircle2 size={13} /> Tandai selesai
                            </Btn>
                          )}
                          {!data.emailReady && <span className="text-[11.5px] text-amber-500">RESEND_API_KEY belum diisi — balas lewat email belum aktif.</span>}
                        </div>
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
