"use client";

import * as React from "react";
import { RefreshCw, Search } from "@/components/ui/icons";
import { adminFetch, useAdminData } from "./api";
import { useConfirm } from "./confirm";
import { Avatar, Badge, Btn, Card, Empty, ErrorBox, Loading, PageHead, Pager, fmtDateTime, usePager } from "./ui";

interface User {
  email: string;
  name: string;
  picture: string | null;
  firstSeen: number;
  lastSeen: number;
  logins: number;
  deploys: number;
  lastDeploy: number;
  sites: number;
  blocked: boolean;
  linkBanned: boolean;
  isAdmin: boolean;
}
type Action = "block" | "unblock" | "ban_links" | "unban_links";

export function UsersTab({ toast }: { toast: (m: string) => void }) {
  const [input, setInput] = React.useState("");
  const [q, setQ] = React.useState("");
  const { data, error, loading, reload } = useAdminData<{ total: number; users: User[]; truncated: boolean }>(`/api/admin/users?q=${encodeURIComponent(q)}`);
  const confirm = useConfirm();
  const [busy, setBusy] = React.useState<string | null>(null);
  const pager = usePager(data?.users ?? [], 25, q);

  // Cari langsung saat mengetik (jeda 300 ms), sama seperti tab Link aktif.
  React.useEffect(() => {
    const id = window.setTimeout(() => setQ(input.trim()), 300);
    return () => window.clearTimeout(id);
  }, [input]);

  async function act(u: User, action: Action) {
    if (action === "block") {
      const r = await confirm({
        title: `Blokir akun ${u.email}?`,
        impact: ["Pengguna langsung tidak bisa login dan memakai Depup.", "Link yang sudah dibuat tidak otomatis dihapus.", "Bisa dibuka kembali kapan saja dari halaman ini."],
        confirmLabel: "Blokir akun",
      });
      if (!r.ok) return;
    } else if (action === "ban_links") {
      const r = await confirm({
        title: `Larang ${u.email} membuat Link Instan?`,
        description: "Larangan berlaku 30 hari dan bisa dicabut lebih awal.",
        confirmLabel: "Larang 30 hari",
      });
      if (!r.ok) return;
    }
    setBusy(u.email + action);
    try {
      await adminFetch("/api/admin/users", { method: "POST", body: { email: u.email, action } });
      toast("Tersimpan.");
      await reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Aksi gagal.");
    } finally {
      setBusy(null);
    }
  }

  const statusBadges = (u: User) => (
    <div className="flex flex-wrap gap-1">
      {u.isAdmin && <Badge tone="violet">Admin</Badge>}
      {u.blocked && <Badge tone="bad">Diblokir</Badge>}
      {u.linkBanned && <Badge tone="warn">Dilarang buat link</Badge>}
      {!u.isAdmin && !u.blocked && !u.linkBanned && <Badge tone="good">Normal</Badge>}
    </div>
  );

  const actions = (u: User, className?: string) =>
    !u.isAdmin && (
      <div className={className ?? "flex justify-end gap-2"}>
        {u.linkBanned ? (
          <Btn busy={busy === u.email + "unban_links"} onClick={() => void act(u, "unban_links")}>
            Cabut larangan link
          </Btn>
        ) : (
          <Btn busy={busy === u.email + "ban_links"} onClick={() => void act(u, "ban_links")}>
            Larang link
          </Btn>
        )}
        {u.blocked ? (
          <Btn busy={busy === u.email + "unblock"} onClick={() => void act(u, "unblock")}>
            Buka blokir
          </Btn>
        ) : (
          <Btn variant="danger" busy={busy === u.email + "block"} onClick={() => void act(u, "block")}>
            Blokir akun
          </Btn>
        )}
      </div>
    );

  return (
    <div className="space-y-5">
      <PageHead
        title="Pengguna"
        desc="Semua akun Google yang pernah memakai dashboard. Blokir akun yang menyalahgunakan layanan."
        right={
          <Btn onClick={() => void reload()} busy={loading}>
            <RefreshCw size={13} /> Segarkan
          </Btn>
        }
      />
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setQ(input.trim());
        }}
      >
        <div className="relative min-w-0 flex-1">
          <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Cari nama atau email…" aria-label="Cari pengguna" className="input-solid h-10 w-full pl-10 pr-4 text-[13px]" />
        </div>
      </form>
      <Card title={data ? `${data.users.length} dari ${data.total} akun` : "Akun"}>
        {error ? (
          <ErrorBox message={error} onRetry={reload} />
        ) : !data ? (
          <Loading />
        ) : data.users.length === 0 ? (
          <Empty>Tidak ada akun yang cocok.</Empty>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="text-[12px] uppercase tracking-wide text-text-muted">
                    <th className="px-6 py-3 font-medium">Akun</th>
                    <th className="px-4 py-3 font-medium">Login terakhir</th>
                    <th className="px-4 py-3 font-medium">Deploy</th>
                    <th className="px-4 py-3 font-medium">Link</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 text-right font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {pager.slice.map((u) => (
                    <tr key={u.email} className="surface-solid-row border-t border-[var(--surface-line)]">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar src={u.picture} name={u.name || u.email} />
                          <div className="min-w-0">
                            <p className="truncate font-medium">{u.name || u.email.split("@")[0]}</p>
                            <p className="truncate text-[12px] text-text-muted">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-text-muted">
                        {u.lastSeen ? fmtDateTime(u.lastSeen) : "—"}
                        {u.logins ? <span> · {u.logins}×</span> : null}
                      </td>
                      <td className="px-4 py-3 text-text-muted">{u.deploys}</td>
                      <td className="px-4 py-3 text-text-muted">{u.sites}</td>
                      <td className="px-4 py-3">{statusBadges(u)}</td>
                      <td className="px-6 py-3">{actions(u)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="md:hidden">
              {pager.slice.map((u) => (
                <li key={u.email} className="border-b border-[var(--surface-line)] px-5 py-4 last:border-0">
                  <div className="flex items-center gap-3">
                    <Avatar src={u.picture} name={u.name || u.email} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{u.name || u.email.split("@")[0]}</p>
                      <p className="truncate text-[12px] text-text-muted">{u.email}</p>
                    </div>
                  </div>
                  <div className="mt-2.5">{statusBadges(u)}</div>
                  <p className="mt-2 text-[12.5px] text-text-muted">
                    {u.deploys} deploy · {u.sites} link · login {u.lastSeen ? fmtDateTime(u.lastSeen) : "—"}
                  </p>
                  {actions(u, "mt-3 grid grid-cols-2 gap-2")}
                </li>
              ))}
            </ul>
            <Pager pager={pager} />
          </>
        )}
      </Card>
      {data?.truncated && <p className="text-[12px] text-text-muted">Daftar dibatasi 1.500 akun pertama yang ditemukan.</p>}
    </div>
  );
}
