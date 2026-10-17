"use client";

import * as React from "react";
import { ExternalLink, Trash2, CheckCircle2 } from "@/components/ui/icons";
import { adminFetch, useAdminData } from "./api";
import { useAdminCounts } from "./context";
import { useConfirm } from "./confirm";
import { Badge, Btn, Card, Checkbox, Empty, ErrorBox, Loading, PageHead, fmtDateTime } from "./ui";

interface Report {
  id: string;
  slug: string;
  kind: "site" | "tunnel";
  owner: string | null;
  reason: string;
  contact: string | null;
  createdAt: string;
  status: "open" | "actioned" | "dismissed";
  resolvedAt?: number;
  resolvedBy?: string;
  note?: string;
  live: boolean;
  url: string | null;
}
interface Data {
  counts: { open: number; actioned: number; dismissed: number };
  reports: Report[];
}

const FILTERS = [
  { id: "open", label: "Terbuka" },
  { id: "actioned", label: "Sudah ditindak" },
  { id: "dismissed", label: "Diabaikan" },
  { id: "all", label: "Semua" },
] as const;

export function AbuseTab({ toast }: { toast: (m: string) => void }) {
  const [filter, setFilter] = React.useState<string>("open");
  const { data, error, loading, reload } = useAdminData<Data>(`/api/admin/abuse?status=${filter}`);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [slug, setSlug] = React.useState("");
  const [ban, setBan] = React.useState(false);
  const [manualBusy, setManualBusy] = React.useState(false);
  const confirm = useConfirm();
  const { setAbuseOpen } = useAdminCounts();

  // Badge menu ikut angka terbaru setiap data dimuat ulang
  React.useEffect(() => {
    if (data) setAbuseOpen(data.counts.open);
  }, [data, setAbuseOpen]);

  async function act(r: Report, requested: "takedown" | "dismiss" | "reopen") {
    let action: "takedown" | "takedown_ban" | "dismiss" | "reopen" = requested;
    if (requested === "takedown") {
      const res = await confirm({
        title: `Takedown link "${r.slug}"?`,
        description: "Link akan langsung mati. Laporan ini ditandai sudah ditindak.",
        impact: [`Jenis: ${r.kind === "site" ? "Link Instan" : "Link Gaib"}`, `Pemilik: ${r.owner ?? "anonim (tunnel CLI)"}`],
        confirmLabel: "Takedown",
        option: r.owner ? { label: `Larang ${r.owner} membuat Link Instan selama 30 hari` } : undefined,
      });
      if (!res.ok) return;
      if (res.option) action = "takedown_ban";
    }
    setBusyId(r.id);
    try {
      await adminFetch("/api/admin/abuse", { method: "POST", body: { id: r.id, action } });
      toast(action.startsWith("takedown") ? "Link dihapus." : action === "dismiss" ? "Laporan diabaikan." : "Laporan dibuka kembali.");
      await reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Aksi gagal.");
    } finally {
      setBusyId(null);
    }
  }

  async function manual(e: React.FormEvent) {
    e.preventDefault();
    if (!slug.trim()) return;
    const res = await confirm({
      title: `Hapus link "${slug.trim()}"?`,
      description: "Takedown manual langsung mematikan link, tanpa melalui laporan.",
      impact: ban ? ["Pemilik link juga dilarang membuat Link Instan selama 30 hari."] : undefined,
      confirmLabel: "Hapus link",
    });
    if (!res.ok) return;
    setManualBusy(true);
    try {
      const r = await adminFetch<{ slug: string; removedSite: boolean; banned: boolean }>("/api/admin/takedown", { method: "POST", body: { slug: slug.trim(), ban } });
      toast(`Takedown ${r.slug} dijalankan${r.removedSite ? "" : " (hanya tunnel / tidak ditemukan sebagai situs)"}${r.banned ? ", pemilik dilarang." : "."}`);
      setSlug("");
      await reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Takedown gagal.");
    } finally {
      setManualBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <PageHead title="Abuse & Takedown" desc="Laporan phishing/penipuan/malware dari halaman /laporkan. Periksa dulu, lalu hapus link atau abaikan." />

      <Card title="Takedown manual">
        <form onSubmit={manual} className="flex flex-wrap items-center gap-3 p-5">
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="slug atau URL link, mis. cantik-kopi-x7k2m"
            aria-label="Slug atau URL link yang akan dihapus"
            className="input-solid min-w-[220px] flex-1 px-4 py-2 text-[13px]"
            maxLength={300}
          />
          <Checkbox checked={ban} onChange={setBan}>
            Larang pemilik 30 hari
          </Checkbox>
          <Btn variant="danger" type="submit" busy={manualBusy} disabled={!slug.trim()}>
            <Trash2 size={13} /> Hapus link
          </Btn>
        </form>
      </Card>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter status laporan">
        {FILTERS.map((f) => {
          const count = data ? (f.id === "all" ? data.counts.open + data.counts.actioned + data.counts.dismissed : data.counts[f.id as "open"]) : null;
          return (
            <button
              key={f.id}
              role="tab"
              aria-selected={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition ${filter === f.id ? "chip-on" : "pill"}`}
            >
              {f.label}
              {count !== null && <span className="ml-1.5 opacity-70">{count}</span>}
            </button>
          );
        })}
      </div>

      <Card>
        {error ? (
          <ErrorBox message={error} onRetry={reload} />
        ) : !data ? (
          <Loading />
        ) : data.reports.length === 0 ? (
          <Empty icon={filter === "open" ? CheckCircle2 : undefined}>{filter === "open" ? "Tidak ada laporan yang menunggu." : "Tidak ada laporan di kategori ini."}</Empty>
        ) : (
          <ul className={loading ? "opacity-60" : undefined}>
            {data.reports.map((r) => (
              <li key={r.id} className="surface-solid-row border-b border-[var(--surface-line)] px-6 py-5 last:border-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="mono text-[12px] text-text-muted">{r.id}</span>
                  <span className="font-medium">{r.slug}</span>
                  <Badge tone="violet">{r.kind === "site" ? "Link Instan" : "Link Gaib"}</Badge>
                  <Badge dot={r.status === "open"} tone={r.status === "open" ? "bad" : r.status === "actioned" ? "good" : "neutral"}>
                    {r.status === "open" ? "Terbuka" : r.status === "actioned" ? "Ditindak" : "Diabaikan"}
                  </Badge>
                  <Badge dot={r.live} tone={r.live ? "warn" : "neutral"}>{r.live ? "Masih aktif" : "Sudah tidak ada"}</Badge>
                  <span className="ml-auto text-[12px] text-text-muted">{fmtDateTime(r.createdAt)}</span>
                </div>
                <p className="mt-2 whitespace-pre-wrap break-words text-[13.5px]">{r.reason}</p>
                <p className="mt-1 text-[12px] text-text-muted">
                  Pemilik: {r.owner ?? "anonim (tunnel CLI)"} · Kontak pelapor: {r.contact ?? "—"}
                  {r.status !== "open" && r.resolvedAt ? ` · Diselesaikan ${fmtDateTime(r.resolvedAt)} oleh ${r.resolvedBy ?? "—"}` : ""}
                  {r.note ? ` · Catatan: ${r.note}` : ""}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {r.url && (
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="pill inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[12.5px] font-medium"
                      title="Hati-hati: ini mungkin halaman phishing. Jangan isi data apa pun."
                    >
                      <ExternalLink size={13} /> Periksa link
                    </a>
                  )}
                  {r.status === "open" ? (
                    <>
                      {r.live && (
                        <Btn variant="danger" busy={busyId === r.id} onClick={() => void act(r, "takedown")}>
                          <Trash2 size={13} /> Takedown
                        </Btn>
                      )}
                      <Btn busy={busyId === r.id} onClick={() => void act(r, "dismiss")}>
                        {r.live ? "Abaikan (bukan penyalahgunaan)" : "Tandai selesai"}
                      </Btn>
                    </>
                  ) : (
                    <Btn busy={busyId === r.id} onClick={() => void act(r, "reopen")}>
                      Buka kembali
                    </Btn>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
