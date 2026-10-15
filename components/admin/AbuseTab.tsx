"use client";

import * as React from "react";
import { ExternalLink, Gavel, ShieldBan } from "lucide-react";
import { adminFetch, useAdminData } from "./api";
import { Badge, Btn, Card, Empty, ErrorBox, Loading, PageHead, fmtDateTime } from "./ui";

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

  async function act(r: Report, action: "takedown" | "takedown_ban" | "dismiss" | "reopen") {
    const msg =
      action === "takedown"
        ? `Hapus link "${r.slug}" sekarang?`
        : action === "takedown_ban"
          ? `Hapus link "${r.slug}" DAN larang ${r.owner} membuat Link Instan selama 30 hari?`
          : null;
    if (msg && !window.confirm(msg)) return;
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
    if (!window.confirm(`Hapus link "${slug.trim()}"${ban ? " dan larang pemiliknya selama 30 hari" : ""}?`)) return;
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
    <div>
      <PageHead title="Abuse & Takedown" desc="Laporan phishing/penipuan/malware dari halaman /laporkan. Periksa dulu, lalu hapus link atau abaikan." />

      <Card title="Takedown manual" className="mb-4">
        <form onSubmit={manual} className="flex flex-wrap items-center gap-3 p-4">
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="slug atau URL link, mis. cantik-kopi-x7k2m"
            aria-label="Slug atau URL link yang akan dihapus"
            className="input-solid min-w-[220px] flex-1 px-4 py-2 text-[13px]"
            maxLength={300}
          />
          <label className="flex items-center gap-2 text-[12.5px] text-text-muted">
            <input type="checkbox" checked={ban} onChange={(e) => setBan(e.target.checked)} /> Larang pemilik 30 hari
          </label>
          <Btn variant="danger" type="submit" busy={manualBusy} disabled={!slug.trim()}>
            <Gavel size={13} /> Hapus link
          </Btn>
        </form>
      </Card>

      <div className="mb-3 flex flex-wrap gap-2" role="tablist" aria-label="Filter status laporan">
        {FILTERS.map((f) => {
          const count = data ? (f.id === "all" ? data.counts.open + data.counts.actioned + data.counts.dismissed : data.counts[f.id as "open"]) : null;
          return (
            <button
              key={f.id}
              role="tab"
              aria-selected={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={`rounded-full border px-3.5 py-1.5 text-[12.5px] transition ${filter === f.id ? "border-violet-500/50 bg-violet-500/15 text-text" : "border-[var(--line-strong)] text-text-muted hover:bg-[var(--card-hover)]"}`}
            >
              {f.label}
              {count !== null && <span className="ml-1.5 text-text-faint">{count}</span>}
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
          <Empty>{filter === "open" ? "Tidak ada laporan yang menunggu. 🎉" : "Tidak ada laporan di kategori ini."}</Empty>
        ) : (
          <ul className={loading ? "opacity-60" : undefined}>
            {data.reports.map((r) => (
              <li key={r.id} className="border-b border-[var(--surface-line)] px-5 py-4 last:border-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="mono text-[12px] text-text-faint">{r.id}</span>
                  <span className="font-medium">{r.slug}</span>
                  <Badge tone="violet">{r.kind === "site" ? "Link Instan" : "Link Gaib"}</Badge>
                  <Badge tone={r.status === "open" ? "bad" : r.status === "actioned" ? "good" : "neutral"}>
                    {r.status === "open" ? "Terbuka" : r.status === "actioned" ? "Ditindak" : "Diabaikan"}
                  </Badge>
                  <Badge tone={r.live ? "warn" : "neutral"}>{r.live ? "Masih aktif" : "Sudah tidak ada"}</Badge>
                  <span className="ml-auto text-[12px] text-text-faint">{fmtDateTime(r.createdAt)}</span>
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
                      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line-strong)] px-3.5 py-1.5 text-[12.5px] font-medium hover:bg-[var(--card-hover)]"
                      title="Hati-hati: ini mungkin halaman phishing. Jangan isi data apa pun."
                    >
                      <ExternalLink size={13} /> Periksa link
                    </a>
                  )}
                  {r.status === "open" ? (
                    <>
                      {r.live && (
                        <Btn variant="danger" busy={busyId === r.id} onClick={() => void act(r, "takedown")}>
                          <Gavel size={13} /> Takedown
                        </Btn>
                      )}
                      {r.live && r.owner && (
                        <Btn variant="danger" busy={busyId === r.id} onClick={() => void act(r, "takedown_ban")}>
                          <ShieldBan size={13} /> Takedown + larang pemilik
                        </Btn>
                      )}
                      <Btn busy={busyId === r.id} onClick={() => void act(r, "dismiss")}>
                        {r.live ? "Abaikan (bukan abuse)" : "Tandai selesai"}
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
