"use client";

import * as React from "react";
import { ExternalLink, RefreshCw } from "@/components/ui/icons";
import { adminFetch, useAdminData } from "./api";
import { useConfirm } from "./confirm";
import { Badge, Btn, Card, Empty, ErrorBox, Loading, PageHead, Pager, SelectField, fmtBytes, fmtDateTime, timeLeft, usePager } from "./ui";

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
  const confirm = useConfirm();
  const [q, setQ] = React.useState("");
  const [kind, setKind] = React.useState<"all" | "site" | "tunnel">("all");
  const [busy, setBusy] = React.useState<string | null>(null);

  const rows = (data?.links ?? []).filter(
    (l) => (kind === "all" || l.kind === kind) && (!q || `${l.slug} ${l.owner ?? ""} ${l.name}`.toLowerCase().includes(q.toLowerCase()))
  );
  const pager = usePager(rows, 25, `${q}|${kind}`);

  async function takedown(l: Link) {
    const r = await confirm({
      title: `Hapus link "${l.slug}"?`,
      description: "Link akan langsung mati dan tidak bisa dipulihkan.",
      impact: [`Jenis: ${l.kind === "site" ? "Link Instan" : "Link Gaib"} · ${fmtBytes(l.bytes)}${l.files ? ` · ${l.files} file` : ""}`, `Pemilik: ${l.owner ?? "anonim"}`],
      confirmLabel: "Hapus link",
      option: l.owner ? { label: `Larang ${l.owner} membuat Link Instan selama 30 hari` } : undefined,
    });
    if (!r.ok) return;
    setBusy(l.slug);
    try {
      await adminFetch("/api/admin/takedown", { method: "POST", body: { slug: l.slug, ban: r.option } });
      toast(r.option ? "Link dihapus, pemilik dilarang 30 hari." : "Link dihapus.");
      await reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gagal menghapus link.");
    } finally {
      setBusy(null);
    }
  }

  const openLink = (l: Link) => (
    <a
      href={l.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Buka ${l.slug} di tab baru`}
      className="pill press inline-flex items-center justify-center px-2.5 py-1.5 max-md:min-h-[38px] max-md:px-3"
    >
      <ExternalLink size={13} />
    </a>
  );

  return (
    <div className="space-y-5">
      <PageHead
        title="Link aktif"
        desc="Semua situs Link Instan dan tunnel Link Gaib yang sedang hidup. Hapus yang mencurigakan."
        right={
          <Btn onClick={() => void reload()} busy={loading}>
            <RefreshCw size={13} /> Segarkan
          </Btn>
        }
      />
      <div className="flex flex-wrap items-center gap-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari slug / pemilik…" aria-label="Cari link" className="input-solid h-10 min-w-[200px] flex-1 px-4 text-[13px]" />
        <SelectField
          value={kind}
          onValueChange={(v) => setKind(v as typeof kind)}
          label="Jenis link"
          options={[
            { value: "all", label: "Semua jenis" },
            { value: "site", label: "Link Instan" },
            { value: "tunnel", label: "Link Gaib" },
          ]}
        />
      </div>
      <Card>
        {error ? (
          <ErrorBox message={error} onRetry={reload} />
        ) : !data ? (
          <Loading />
        ) : rows.length === 0 ? (
          <Empty>Tidak ada link yang cocok.</Empty>
        ) : (
          <>
            {/* Desktop: tabel padat */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="text-[12px] uppercase tracking-wide text-text-muted">
                    <th className="px-6 py-3 font-medium">Link</th>
                    <th className="px-4 py-3 font-medium">Pemilik</th>
                    <th className="px-4 py-3 font-medium">Ukuran</th>
                    <th className="px-4 py-3 font-medium">Dibuat</th>
                    <th className="px-4 py-3 font-medium">Berakhir</th>
                    <th className="px-6 py-3 text-right font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {pager.slice.map((l) => (
                    <tr key={l.slug} className="surface-solid-row border-t border-[var(--surface-line)]">
                      <td className="px-6 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{l.slug}</span>
                          <Badge tone="violet">{l.kind === "site" ? "Instan" : "Gaib"}</Badge>
                          {l.status === "pending" && <Badge tone="warn">upload belum selesai</Badge>}
                        </div>
                        {l.name && <p className="text-[12px] text-text-muted">{l.name}</p>}
                      </td>
                      <td className="px-4 py-3 text-text-muted">{l.owner ?? "anonim"}</td>
                      <td className="px-4 py-3 text-text-muted">
                        {fmtBytes(l.bytes)}
                        {l.files ? ` · ${l.files} file` : ""}
                      </td>
                      <td className="px-4 py-3 text-text-muted">{fmtDateTime(l.createdAt)}</td>
                      <td className="px-4 py-3 text-text-muted">{timeLeft(l.expiresAt)}</td>
                      <td className="px-6 py-3">
                        <div className="flex justify-end gap-2">
                          {openLink(l)}
                          <Btn variant="danger" busy={busy === l.slug} onClick={() => void takedown(l)}>
                            Takedown
                          </Btn>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile: kartu bertumpuk */}
            <ul className="md:hidden">
              {pager.slice.map((l) => (
                <li key={l.slug} className="border-b border-[var(--surface-line)] px-5 py-4 last:border-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="break-all font-medium">{l.slug}</span>
                    <Badge tone="violet">{l.kind === "site" ? "Instan" : "Gaib"}</Badge>
                    {l.status === "pending" && <Badge tone="warn">upload belum selesai</Badge>}
                  </div>
                  {l.name && <p className="text-[12px] text-text-muted">{l.name}</p>}
                  <p className="mt-1.5 text-[12.5px] text-text-muted">
                    {l.owner ?? "anonim"} · {fmtBytes(l.bytes)}
                    {l.files ? ` · ${l.files} file` : ""} · {timeLeft(l.expiresAt)}
                  </p>
                  <div className="mt-3 flex gap-2">
                    {openLink(l)}
                    <Btn variant="danger" className="flex-1" busy={busy === l.slug} onClick={() => void takedown(l)}>
                      Takedown
                    </Btn>
                  </div>
                </li>
              ))}
            </ul>
            <Pager pager={pager} />
          </>
        )}
      </Card>
    </div>
  );
}
