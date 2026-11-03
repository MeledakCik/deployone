"use client";

import * as React from "react";
import { RefreshCw, Bot, Download, Trash2, RotateCcw } from "@/components/ui/icons";
import { adminFetch, useAdminData } from "./api";
import { Badge, Btn, Card, Empty, ErrorBox, KpiCard, Loading, PageHead, fmtDateTime } from "./ui";

interface EngineStatus {
  active: { source: "admin" | "bawaan"; trainedAt: string; stats: { packs: number; feedback: number; vocab: number; prompts: number } };
  bundled: { trainedAt: string; stats: { packs: number; feedback: number; vocab: number; prompts: number } };
  feedbackCount: number;
  recent: { prompt: string; kind: string; brand: string; at: number | null }[];
  domains: { id: string; kind: string; label: string; prompts: number; items: number; generic: boolean }[];
}

/**
 * Panel "Mesin AI": status mesin AI Web Builder milik Depup, contoh dari pengguna, dan tombol latih ulang.
 * Melatih di sini menyimpan model ke KV (langsung dipakai). Untuk membuat model bawaan baru, ekspor contoh
 * lalu jalankan `npm run engine:train` di repo.
 */
export function EngineTab({ toast }: { toast: (m: string) => void }) {
  const { data, error, loading, reload } = useAdminData<EngineStatus>("/api/admin/engine");
  const [busy, setBusy] = React.useState<string | null>(null);

  async function run(action: "train" | "reset" | "export" | "clear") {
    if (action === "clear" && !window.confirm("Hapus semua contoh dari pengguna? Model yang sudah dilatih tidak berubah.")) return;
    setBusy(action);
    try {
      const r = await adminFetch<{ jsonl?: string; count?: number; stats?: { feedback: number } }>("/api/admin/engine", { method: "POST", body: { action } });
      if (action === "export") {
        const blob = new Blob([r.jsonl ?? ""], { type: "application/x-ndjson" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `site-engine-feedback-${new Date().toISOString().slice(0, 10)}.jsonl`;
        a.click();
        URL.revokeObjectURL(a.href);
        toast(`${r.count ?? 0} contoh diekspor.`);
      } else if (action === "train") toast(`Mesin dilatih ulang dengan ${r.stats?.feedback ?? 0} contoh pengguna.`);
      else if (action === "reset") toast("Kembali memakai model bawaan.");
      else toast("Contoh pengguna dihapus.");
      await reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gagal.");
    } finally {
      setBusy(null);
    }
  }

  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!data) return null;

  return (
    <div className="space-y-5">
      <PageHead
        title="Mesin AI"
        desc="AI Web Builder memakai mesin Depup sendiri, tanpa layanan AI luar. Mesin belajar dari paket domain bawaan dan dari website yang pengguna izinkan sebagai contoh."
        right={
          <Btn onClick={reload} busy={loading}>
            <RefreshCw size={13} /> Muat ulang
          </Btn>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Model aktif" value={data.active.source === "admin" ? "Dilatih admin" : "Bawaan"} sub={`Dilatih ${fmtDateTime(data.active.trainedAt)}`} icon={Bot} />
        <KpiCard label="Contoh pengguna" value={data.feedbackCount} sub={`${data.active.stats.feedback} sudah dipakai model aktif`} />
        <KpiCard label="Kosakata" value={data.active.stats.vocab} sub={`${data.active.stats.packs} domain · ${data.active.stats.prompts} contoh deskripsi`} />
      </div>

      <Card title="Latih mesin">
        <div className="space-y-3 px-6 py-5 text-[14px] leading-relaxed">
          <p className="text-text-muted">
            Latih ulang menggabungkan paket bawaan dengan contoh pengguna: deskripsinya menambah data klasifikasi, isinya memperkaya
            bank kalimat, produk, dan fitur. Model baru langsung dipakai semua pengguna.
          </p>
          <div className="flex flex-wrap gap-2">
            <Btn variant="primary" busy={busy === "train"} onClick={() => run("train")}>
              <Bot size={13} /> Latih ulang sekarang
            </Btn>
            <Btn busy={busy === "export"} onClick={() => run("export")} disabled={!data.feedbackCount}>
              <Download size={13} /> Ekspor contoh (.jsonl)
            </Btn>
            {data.active.source === "admin" && (
              <Btn busy={busy === "reset"} onClick={() => run("reset")}>
                <RotateCcw size={13} /> Pakai model bawaan
              </Btn>
            )}
            <Btn variant="danger" busy={busy === "clear"} onClick={() => run("clear")} disabled={!data.feedbackCount}>
              <Trash2 size={13} /> Hapus contoh
            </Btn>
          </div>
          <p className="text-[13px] text-text-muted">
            Untuk menambah jenis usaha baru atau memperbaiki kalimat bawaan, ubah file di <code>data/site-engine/packs/</code>, taruh hasil
            ekspor di <code>data/site-engine/feedback/</code>, lalu jalankan <code>npm run engine:train</code> dan deploy ulang.
          </p>
        </div>
      </Card>

      <Card title="Contoh terbaru dari pengguna" action={<Badge tone="neutral">{data.feedbackCount}</Badge>}>
        {data.recent.length === 0 ? (
          <Empty title="Belum ada contoh">Contoh masuk saat pengguna menerbitkan website dan mencentang izin “bantu latih mesin”.</Empty>
        ) : (
          <ul className="divide-y divide-[var(--surface-line)]">
            {data.recent.map((r, i) => (
              <li key={i} className="px-6 py-3 text-[14px]">
                <p className="font-medium">{r.brand}</p>
                <p className="text-[13px] text-text-muted">
                  {r.kind} · {r.at ? fmtDateTime(r.at) : "-"} · “{r.prompt.slice(0, 140)}”
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Domain yang dikenali">
        <ul className="grid gap-x-6 gap-y-2 px-6 py-5 text-[14px] sm:grid-cols-2">
          {data.domains.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-3">
              <span>
                {d.label} {d.generic && <Badge tone="neutral">umum</Badge>}
              </span>
              <span className="text-[13px] text-text-muted tabular-nums">
                {d.kind} · {d.prompts} contoh · {d.items} item
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
