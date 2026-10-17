"use client";

import * as React from "react";
import { PlayCircle, Sparkles } from "@/components/ui/icons";
import { adminFetch, useAdminData } from "./api";
import { Badge, Btn, Card, Empty, ErrorBox, Loading, PageHead, fmtDateTime } from "./ui";

type Status = "ok" | "warn" | "problem" | "unknown";
interface Check {
  id: string;
  group: string;
  label: string;
  status: Status;
  detail: string;
}
interface ErrorEntry {
  at: number;
  method: string;
  path: string;
  message: string;
}
interface AuditResult {
  ranAt: string;
  durationMs: number;
  checks: Check[];
  errors: ErrorEntry[];
  counts: Record<Status, number>;
  analysis?: { at: string; text: string; usedAi: boolean };
}

const TONE: Record<Status, "good" | "warn" | "bad" | "neutral"> = { ok: "good", warn: "warn", problem: "bad", unknown: "neutral" };
const LABEL: Record<Status, string> = { ok: "OK", warn: "Perhatian", problem: "Masalah", unknown: "?" };
const GROUPS = ["Infrastruktur", "Konfigurasi", "Aplikasi", "Platform"];

export function HealthTab({ toast }: { toast: (m: string) => void }) {
  const { data, error, loading, reload } = useAdminData<{ result: AuditResult | null; aiReady: boolean }>("/api/admin/health");
  const [local, setLocal] = React.useState<AuditResult | null>(null);
  const [busy, setBusy] = React.useState<"run" | "analyze" | null>(null);

  const result = local ?? data?.result ?? null;

  async function call(action: "run" | "analyze", force?: boolean) {
    setBusy(action);
    try {
      const d = await adminFetch<{ result: AuditResult }>("/api/admin/health", { method: "POST", body: { action, force } });
      setLocal(d.result);
      toast(action === "run" ? "Audit selesai." : "Analisis AI selesai.");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gagal.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      <PageHead
        title="Audit sistem"
        desc="Cek kesehatan web dari sisi developer: database, konfigurasi, halaman, error server, dan status platform. Hanya berjalan saat tombol ditekan; tidak ada AI atau pemeriksaan otomatis di latar belakang."
        right={
          <div className="flex flex-wrap items-center gap-2">
            <Btn variant="primary" busy={busy === "run"} disabled={busy !== null} onClick={() => void call("run")}>
              <PlayCircle size={13} /> Jalankan audit
            </Btn>
            <Btn busy={busy === "analyze"} disabled={busy !== null || !result || !data?.aiReady} onClick={() => void call("analyze", !!result?.analysis)}>
              <Sparkles size={13} /> {result?.analysis ? "Analisis ulang" : "Analisis dengan AI"}
            </Btn>
          </div>
        }
      />

      {error ? (
        <Card>
          <ErrorBox message={error} onRetry={reload} />
        </Card>
      ) : loading && !result ? (
        <Card>
          <Loading />
        </Card>
      ) : !result ? (
        <Card>
          <Empty>Belum ada hasil audit. Tekan “Jalankan audit” untuk memeriksa sekarang.</Empty>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 text-[13px]">
            <Badge tone="good">{result.counts.ok} OK</Badge>
            {result.counts.warn > 0 && <Badge tone="warn">{result.counts.warn} perhatian</Badge>}
            {result.counts.problem > 0 && <Badge tone="bad">{result.counts.problem} masalah</Badge>}
            {result.counts.unknown > 0 && <Badge tone="neutral">{result.counts.unknown} tidak diketahui</Badge>}
            <span className="text-text-muted">
              Dijalankan {fmtDateTime(result.ranAt)} · {(result.durationMs / 1000).toFixed(1)} dtk
            </span>
          </div>

          <Card title="Hasil pemeriksaan">
            {GROUPS.map((g) => {
              const rows = result.checks.filter((c) => c.group === g);
              if (rows.length === 0) return null;
              return (
                <div key={g} className="border-b border-[var(--surface-line)] last:border-0">
                  <p className="px-6 pt-4 text-[11.5px] font-semibold uppercase tracking-wide text-text-muted">{g}</p>
                  <ul>
                    {rows.map((c) => (
                      <li key={c.id} className="flex flex-wrap items-start gap-x-3 gap-y-1 px-6 py-3">
                        <Badge tone={TONE[c.status]}>{LABEL[c.status]}</Badge>
                        <span className="min-w-[160px] text-[13.5px] font-medium">{c.label}</span>
                        <span className="min-w-0 flex-1 break-words text-[13px] text-text-muted">{c.detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </Card>

          <Card title="Error server terbaru">
            {result.errors.length === 0 ? (
              <Empty>Tidak ada error server yang tercatat.</Empty>
            ) : (
              <ul>
                {result.errors.map((e, i) => (
                  <li key={i} className="border-b border-[var(--surface-line)] px-6 py-3 last:border-0">
                    <p className="text-[12px] text-text-muted">{fmtDateTime(e.at)}</p>
                    <p className="mono text-[12.5px]">
                      {e.method} {e.path}
                    </p>
                    <p className="break-words text-[13px] text-text-muted">{e.message}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Analisis AI">
            {result.analysis ? (
              <div className="space-y-2 px-6 py-4">
                <p className="whitespace-pre-wrap break-words text-[13.5px]">{result.analysis.text}</p>
                <p className="text-[12px] text-text-muted">
                  {fmtDateTime(result.analysis.at)} · {result.analysis.usedAi ? "memakai 1 panggilan AI" : "tanpa AI"}
                </p>
              </div>
            ) : (
              <Empty>
                {data?.aiReady === false
                  ? "GROQ_API_KEY belum diisi, jadi analisis AI belum aktif."
                  : "Belum dianalisis. Tombol “Analisis dengan AI” memakai 1 panggilan Groq, dan hanya berjalan saat ditekan."}
              </Empty>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
