"use client";

import * as React from "react";
import { ExternalLink, RefreshCw } from "lucide-react";
import { adminFetch, useAdminData } from "./api";
import { Badge, Btn, Card, Empty, ErrorBox, Loading, PageHead, fmtBytes, fmtDateTime, timeLeft } from "./ui";

interface Link {
  slug: string;
  kind: "site" | "tunnel";
  owner: string | null;
  name: string;
  status: "active" | "pending";
  createdAt: number;
  expiresAt: number;
  bytes: number;
  files: number;
  url: string;
}

export function LinksTab({ toast }: { toast: (m: string) => void }) {
  const { data, error, loading, reload } = useAdminData<{ links: Link[] }>("/api/admin/links");
  const [q, setQ] = React.useState("");
  const [kind, setKind] = React.useState<"all" | "site" | "tunnel">("all");
  const [busy, setBusy] = React.useState<string | null>(null);

  const rows = (data?.links ?? []).filter(
    (l) => (kind === "all" || l.kind === kind) && (!q || `${l.slug} ${l.owner ?? ""} ${l.name}`.toLowerCase().includes(q.toLowerCase()))
  );

  async function takedown(l: Link, ban: boolean) {
    if (!window.confirm(`Hapus link "${l.slug}"${ban ? ` dan larang ${l.owner} membuat Link Instan 30 hari` : ""}?`)) return;
    setBusy(l.slug);
    try {
      await adminFetch("/api/admin/takedown", { method: "POST", body: { slug: l.slug, ban } });
      toast("Link dihapus.");
      await reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gagal menghapus link.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <PageHead
        title="Link aktif"
        desc="Semua situs Link Instan dan tunnel Link Gaib yang sedang hidup. Hapus yang mencurigakan."
        right={
          <Btn onClick={() => void reload()} busy={loading}>
            <RefreshCw size={13} /> Muat ulang
          </Btn>
        }
      />
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari slug / pemilik…" aria-label="Cari link" className="input-solid min-w-[200px] flex-1 px-4 py-2 text-[13px]" />
        <select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} aria-label="Jenis link" className="input-solid px-3 py-2 text-[13px]">
          <option value="all">Semua jenis</option>
          <option value="site">Link Instan</option>
          <option value="tunnel">Link Gaib</option>
        </select>
      </div>
      <Card>
        {error ? (
          <ErrorBox message={error} onRetry={reload} />
        ) : !data ? (
          <Loading />
        ) : rows.length === 0 ? (
          <Empty>Tidak ada link yang cocok.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-text-faint">
                  <th className="px-5 py-3 font-medium">Link</th>
                  <th className="px-3 py-3 font-medium">Pemilik</th>
                  <th className="px-3 py-3 font-medium">Ukuran</th>
                  <th className="px-3 py-3 font-medium">Dibuat</th>
                  <th className="px-3 py-3 font-medium">Berakhir</th>
                  <th className="px-5 py-3 text-right font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((l) => (
                  <tr key={l.slug} className="surface-solid-row border-t border-[var(--surface-line)]">
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{l.slug}</span>
                        <Badge tone="violet">{l.kind === "site" ? "Instan" : "Gaib"}</Badge>
                        {l.status === "pending" && <Badge tone="warn">upload belum selesai</Badge>}
                      </div>
                      {l.name && <p className="text-[11.5px] text-text-faint">{l.name}</p>}
                    </td>
                    <td className="px-3 py-3 text-text-muted">{l.owner ?? "anonim"}</td>
                    <td className="px-3 py-3 text-text-muted">
                      {fmtBytes(l.bytes)}
                      {l.files ? ` · ${l.files} file` : ""}
                    </td>
                    <td className="px-3 py-3 text-text-muted">{fmtDateTime(l.createdAt)}</td>
                    <td className="px-3 py-3 text-text-muted">{timeLeft(l.expiresAt)}</td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-2">
                        <a
                          href={l.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Buka ${l.slug} di tab baru`}
                          className="inline-flex items-center rounded-full border border-[var(--line-strong)] px-2.5 py-1.5 hover:bg-[var(--card-hover)]"
                        >
                          <ExternalLink size={13} />
                        </a>
                        <Btn variant="danger" busy={busy === l.slug} onClick={() => void takedown(l, false)}>
                          Hapus
                        </Btn>
                        {l.owner && (
                          <Btn variant="danger" busy={busy === l.slug} onClick={() => void takedown(l, true)}>
                            Hapus + larang
                          </Btn>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
