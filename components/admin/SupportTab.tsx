"use client";

import * as React from "react";
import { CheckCircle2, RefreshCw, ChevronDown, SendHorizonal } from "@/components/ui/icons";
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

  const shown = data ? data.reports.filter((r) => filter === "all" || r.status !== "resolved") : [];

  return (
    <div className="space-y-5">
      <PageHead
        title="Laporan bantuan"
        desc="Masalah yang dikirim pengguna lewat chat bantuan (manual atau otomatis). Balasan dikirim ke email pengguna."
        right={
          <div className="flex items-center gap-2">
            <Btn onClick={() => setFilter(filter === "open" ? "all" : "open")}>{filter === "open" ? "Tampilkan semua" : "Hanya yang terbuka"}</Btn>
            <Btn onClick={() => void reload()} busy={loading}>
              <RefreshCw size={13} /> Segarkan
            </Btn>
          </div>
        }
      />
      <Card>
        {error ? (
          <ErrorBox message={error} onRetry={reload} />
        ) : !data ? (
          <Loading />
        ) : shown.length === 0 ? (
          <Empty>{filter === "open" ? "Tidak ada laporan yang terbuka." : "Belum ada laporan bantuan."}</Empty>
        ) : (
          <ul>
            {shown.map((r) => {
              const problems = (r.diagnostics?.checks ?? []).filter((c) => c.status === "problem" || c.status === "warn");
              const isOpen = open === r.id;
              const text = draft[r.id] ?? "";
              const cannotReply = !data.emailReady || text.trim().length < 3;
              return (
                <li key={r.id} className="border-b border-[var(--surface-line)] last:border-0">
                  <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : r.id)} className="w-full px-6 py-4 text-left transition hover:bg-[var(--row-hover)]">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="mono text-[12px] text-text-muted">{r.id}</span>
                      <Badge tone={r.source === "auto" ? "warn" : "violet"}>{r.source === "auto" ? "Otomatis" : "Dari pengguna"}</Badge>
                      {problems.length > 0 && <Badge tone="bad">{problems.length} temuan</Badge>}
                      {r.status === "resolved" ? <Badge tone="good">Selesai</Badge> : <Badge tone="warn">Terbuka</Badge>}
                      {(r.replies?.length ?? 0) > 0 && <Badge tone="neutral">{r.replies!.length} balasan</Badge>}
                      <span className="ml-auto flex items-center gap-2 text-[12px] text-text-muted">
                        {fmtDateTime(r.createdAt)}
                        <ChevronDown size={14} className="chev" data-open={isOpen} />
                      </span>
                    </div>
                    <p className="mt-1.5 text-[13.5px]">{r.summary}</p>
                    <p className="text-[12px] text-text-muted">
                      {r.email}
                      {r.view ? ` · halaman ${r.view}` : ""}
                    </p>
                  </button>
                  <div className="acc" data-open={isOpen}>
                    <div className="acc-inner">
                      <div className="space-y-3 bg-[var(--row-hover)] px-6 py-4 text-[13px]">
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
                              <span className={m.role === "user" ? "font-medium text-violet-600 dark:text-violet-300" : "font-medium text-text-muted"}>{m.role === "user" ? "Pengguna" : "Asisten"}: </span>
                              {m.content}
                            </p>
                          ))}
                        </div>

                        {(r.replies ?? []).map((rep, i) => (
                          <p key={i} className="whitespace-pre-wrap break-words rounded-xl bg-[var(--surface-solid)] px-3.5 py-2.5">
                            <span className="font-medium text-ok-fg">Balasan admin ({fmtDateTime(rep.at)}): </span>
                            {rep.text}
                          </p>
                        ))}

                        <div className="space-y-2 border-t border-[var(--surface-line)] pt-3">
                          <textarea
                            value={text}
                            onChange={(e) => setDraft((d) => ({ ...d, [r.id]: e.target.value.slice(0, 3000) }))}
                            rows={3}
                            aria-label={`Balasan untuk ${r.id}`}
                            placeholder={`Balasan akan dikirim lewat email ke ${r.email}`}
                            className="input-solid w-full resize-y px-4 py-2.5 text-[13px]"
                          />
                          <div className="flex flex-wrap items-center gap-2">
                            <Btn variant="primary" busy={busy === r.id} disabled={cannotReply} onClick={() => void act(r.id, { action: "reply", text, resolve: true }, "Balasan terkirim & laporan ditandai selesai.")}>
                              <SendHorizonal size={13} /> Kirim & tandai selesai
                            </Btn>
                            <Btn busy={busy === r.id} disabled={cannotReply} onClick={() => void act(r.id, { action: "reply", text }, "Balasan terkirim.")}>
                              Kirim saja
                            </Btn>
                            {r.status === "resolved" ? (
                              <Btn busy={busy === r.id} onClick={() => void act(r.id, { action: "reopen" }, "Laporan dibuka lagi.")}>
                                Buka lagi
                              </Btn>
                            ) : (
                              <Btn busy={busy === r.id} onClick={() => void act(r.id, { action: "resolve" }, "Laporan ditandai selesai.")}>
                                <CheckCircle2 size={13} /> Tandai selesai
                              </Btn>
                            )}
                            {!data.emailReady && <span className="text-[12px] text-warn-fg">RESEND_API_KEY belum diisi — balas lewat email belum aktif.</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
