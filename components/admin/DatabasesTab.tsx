"use client";

import * as React from "react";
import { Database, RefreshCw, Search, Sparkles, Users } from "@/components/ui/icons";
import { adminFetch, useAdminData } from "./api";
import { Badge, Btn, Card, Empty, ErrorBox, KpiCard, Loading, Pager, PageHead, UsageCard, fmtBytes, fmtDateTime, usePager } from "./ui";

interface DbRow {
  id: string;
  name: string;
  createdAt: number;
  usageBytes: number | null;
  activeKeys: number;
}
interface OwnerRow {
  email: string;
  databases: number;
  usedBytes: number;
  unknown: boolean;
  pct: number;
  dbs: DbRow[];
}
interface Finding {
  level: "problem" | "warn" | "info";
  text: string;
}
interface Overview {
  generatedAt: number;
  totals: {
    databases: number;
    owners: number;
    usedBytes: number;
    unknownCount: number;
    providerLimitBytes: number;
    providerLimitFromEnv: boolean;
    quotaBytes: number;
    maxPerUser: number;
  };
  buckets: { label: string; count: number; tone: "good" | "warn" | "bad" }[];
  owners: OwnerRow[];
  ownersTruncated: boolean;
  scanTruncated: boolean;
  findings: Finding[];
}
interface Analysis {
  at: string;
  usedAi: boolean;
  text: string;
}

const LEVEL_TONE = { problem: "bad", warn: "warn", info: "neutral" } as const;
const LEVEL_LABEL = { problem: "Masalah", warn: "Perhatian", info: "Info" } as const;

function pctTone(pct: number): "good" | "warn" | "bad" {
  return pct >= 100 ? "bad" : pct >= 80 ? "warn" : "good";
}

export function DatabasesTab({ toast }: { toast: (m: string) => void }) {
  const { data, error, loading, reload } = useAdminData<{ overview: Overview; aiReady: boolean }>("/api/admin/databases");
  const [local, setLocal] = React.useState<Overview | null>(null);
  const [analysis, setAnalysis] = React.useState<Analysis | null>(null);
  const [busy, setBusy] = React.useState<"check" | "analyze" | null>(null);
  const [q, setQ] = React.useState("");
  const [open, setOpen] = React.useState<string | null>(null);

  const ov = local ?? data?.overview ?? null;

  const rows = React.useMemo(() => {
    if (!ov) return [];
    const term = q.trim().toLowerCase();
    return term ? ov.owners.filter((o) => o.email.includes(term) || o.dbs.some((d) => d.name.includes(term))) : ov.owners;
  }, [ov, q]);
  const pager = usePager(rows, 15, q);

  async function check() {
    setBusy("check");
    try {
      const d = await adminFetch<{ overview: Overview }>("/api/admin/databases?refresh=1");
      setLocal(d.overview);
      setAnalysis(null); // analisis lama sudah tidak sesuai dengan data baru
      toast("Pengecekan selesai.");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gagal mengecek.");
    } finally {
      setBusy(null);
    }
  }

  async function analyze() {
    setBusy("analyze");
    try {
      const d = await adminFetch<{ analysis: Analysis }>("/api/admin/databases", { method: "POST", body: { action: "analyze" } });
      setAnalysis(d.analysis);
      toast("Analisis selesai.");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gagal menganalisis.");
    } finally {
      setBusy(null);
    }
  }

  const t = ov?.totals;
  const nearOrFull = ov ? ov.buckets.filter((b) => b.tone !== "good").reduce((n, b) => n + b.count, 0) : 0;

  return (
    <div className="space-y-5">
      <PageHead
        title="Database pengguna"
        desc="Cek pemakaian semua database (Turso) milik pengguna: seberapa dekat ke kuota dan ke batas penyimpanan total. Data dibaca saat halaman dibuka (cache 2 menit); analisis AI hanya berjalan saat tombolnya ditekan."
        right={
          <div className="flex flex-wrap items-center gap-2">
            <Btn variant="primary" busy={busy === "check"} disabled={busy !== null} onClick={() => void check()}>
              <RefreshCw size={13} /> Cek sekarang
            </Btn>
            <Btn busy={busy === "analyze"} disabled={busy !== null || !ov || !data?.aiReady} onClick={() => void analyze()}>
              <Sparkles size={13} /> {analysis ? "Analisis ulang" : "Analisis dengan AI"}
            </Btn>
          </div>
        }
      />

      {error && !ov ? (
        <Card>
          <ErrorBox message={error} onRetry={reload} />
        </Card>
      ) : loading && !ov ? (
        <Card>
          <Loading />
        </Card>
      ) : !ov || !t ? (
        <Card>
          <Empty>Belum ada data.</Empty>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <KpiCard icon={Database} label="Total database" value={t.databases} sub={`maks. ${t.maxPerUser} per pengguna`} />
            <KpiCard icon={Users} label="Pemilik database" value={t.owners} sub={`kuota ${fmtBytes(t.quotaBytes)} per pengguna`} />
            <KpiCard
              icon={Database}
              label="Mendekati / melewati kuota"
              value={nearOrFull}
              sub={nearOrFull > 0 ? "pengguna di atas 80% kuota" : "tidak ada"}
              tone={(ov?.buckets[3]?.count ?? 0) > 0 ? "bad" : "neutral"}
            />
          </div>

          <Card title="Penyimpanan total">
            <UsageCard
              label="Turso (semua database pengguna)"
              used={t.usedBytes}
              limitBytes={t.providerLimitBytes}
              note={
                (t.providerLimitFromEnv ? "Batas dari TURSO_LIMIT_MB." : "Batas bawaan 5120 MB — isi TURSO_LIMIT_MB sesuai paket Turso kamu.") +
                (t.unknownCount > 0 ? ` ${t.unknownCount} database tidak terbaca ukurannya, jadi angka ini bisa kurang.` : "")
              }
            />
            <p className="border-t border-[var(--surface-line)] px-6 py-3 text-[12px] text-text-muted">
              Diperiksa {fmtDateTime(ov.generatedAt)}. Meter Supabase dan Redis ada di tab Ringkasan.
            </p>
          </Card>

          <Card title="Temuan">
            <ul>
              {ov.findings.map((f, i) => (
                <li key={i} className="flex flex-wrap items-start gap-x-3 gap-y-1 border-b border-[var(--surface-line)] px-6 py-3 last:border-0">
                  <Badge tone={LEVEL_TONE[f.level]}>{LEVEL_LABEL[f.level]}</Badge>
                  <span className="min-w-0 flex-1 break-words text-[13.5px]">{f.text}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Analisis AI">
            {analysis ? (
              <div className="space-y-2 px-6 py-4">
                <p className="whitespace-pre-wrap break-words text-[13.5px]">{analysis.text}</p>
                <p className="text-[12px] text-text-muted">
                  {fmtDateTime(analysis.at)} · {analysis.usedAi ? "memakai 1 panggilan AI (email pengguna disamarkan)" : "tanpa AI"}
                </p>
              </div>
            ) : (
              <Empty>
                {data?.aiReady === false
                  ? "GROQ_API_KEY belum diisi, jadi analisis AI belum aktif. Temuan di atas tetap berjalan tanpa AI."
                  : "Belum dianalisis. Tombol “Analisis dengan AI” memakai 1 panggilan Groq, dan hanya berjalan saat ditekan."}
              </Empty>
            )}
          </Card>

          <Card title="Sebaran pengguna per kuota">
            <ul className="grid gap-px sm:grid-cols-4">
              {ov.buckets.map((b) => (
                <li key={b.label} className="px-6 py-4">
                  <p className="text-[12.5px] text-text-muted">{b.label}</p>
                  <p className="mt-1 flex items-center gap-2 text-[22px] font-bold tabular-nums">
                    {b.count} <Badge tone={b.tone}>{b.tone === "good" ? "aman" : b.tone === "warn" ? "waspada" : "penuh"}</Badge>
                  </p>
                </li>
              ))}
            </ul>
          </Card>

          <Card title={`Pemakaian per pengguna${ov.ownersTruncated ? " (150 terbesar)" : ""}`}>
            <div className="border-b border-[var(--surface-line)] px-6 py-3">
              <div className="relative">
                <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari email atau nama database…" aria-label="Cari pemilik database" className="input-solid h-10 w-full pl-10 pr-4 text-[13px]" />
              </div>
            </div>
            {rows.length === 0 ? (
              <Empty>{q ? "Tidak ada yang cocok." : "Belum ada database yang dibuat pengguna."}</Empty>
            ) : (
              <ul>
                {pager.slice.map((o) => {
                  const tone = pctTone(o.pct);
                  const isOpen = open === o.email;
                  return (
                    <li key={o.email} className="border-b border-[var(--surface-line)] last:border-0">
                      <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : o.email)} className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 px-6 py-3 text-left">
                        <span className="min-w-0 flex-1 basis-[200px]">
                          <span className="block truncate text-[13.5px] font-medium" title={o.email}>
                            {o.email}
                          </span>
                          <span className="block text-[12px] text-text-muted">
                            {o.databases} database{o.unknown ? " · ada ukuran tak terbaca" : ""}
                          </span>
                        </span>
                        <span className="w-full min-w-[140px] max-w-[260px] flex-1">
                          <span
                            role="progressbar"
                            aria-label={`Kuota ${o.email}`}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={Math.min(100, Math.round(o.pct))}
                            className="block h-1.5 overflow-hidden rounded-full bg-[var(--pill-bg)]"
                          >
                            <span className="block h-full rounded-full" style={{ width: `${Math.min(100, o.pct)}%`, background: { good: "var(--ok-dot)", warn: "var(--warn-dot)", bad: "var(--bad-dot)" }[tone] }} />
                          </span>
                        </span>
                        <span className="flex items-center gap-2 text-[12.5px] tabular-nums">
                          {fmtBytes(o.usedBytes)} / {fmtBytes(t.quotaBytes)}
                          <Badge tone={tone}>{o.pct < 1 ? "<1" : Math.round(o.pct)}%</Badge>
                        </span>
                      </button>
                      {isOpen && (
                        <ul className="space-y-1 bg-[var(--pill-bg)]/40 px-6 pb-3 pt-1">
                          {o.dbs.map((d) => (
                            <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 text-[12.5px]">
                              <span className="min-w-0 truncate">
                                <span className="mono">{d.name}</span>
                                <span className="text-text-muted"> · dibuat {fmtDateTime(d.createdAt)} · {d.activeKeys} API key aktif</span>
                              </span>
                              <span className="tabular-nums">{d.usageBytes === null ? "tidak terbaca" : fmtBytes(d.usageBytes)}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            <Pager pager={pager} />
          </Card>
        </>
      )}
    </div>
  );
}
