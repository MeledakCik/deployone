"use client";

import * as React from "react";
import { RefreshCw, Search } from "lucide-react";
import { adminFetch, useAdminData } from "./api";
import { Avatar, Badge, Btn, Card, Empty, ErrorBox, Loading, PageHead, fmtDateTime } from "./ui";

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

export function UsersTab({ toast }: { toast: (m: string) => void }) {
  const [input, setInput] = React.useState("");
  const [q, setQ] = React.useState("");
  const { data, error, loading, reload } = useAdminData<{ total: number; users: User[]; truncated: boolean }>(`/api/admin/users?q=${encodeURIComponent(q)}`);
  const [busy, setBusy] = React.useState<string | null>(null);

  async function act(u: User, action: "block" | "unblock" | "ban_links" | "unban_links") {
    const text: Record<string, string> = {
      block: `Blokir akun ${u.email}? Pengguna ini langsung tidak bisa memakai Depup dan tidak bisa login.`,
      ban_links: `Larang ${u.email} membuat Link Instan selama 30 hari?`,
    };
    if (text[action] && !window.confirm(text[action])) return;
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

  return (
    <div>
      <PageHead
        title="Pengguna"
        desc="Semua akun Google yang pernah memakai dashboard. Blokir akun yang menyalahgunakan layanan."
        right={
          <Btn onClick={() => void reload()} busy={loading}>
            <RefreshCw size={13} /> Muat ulang
          </Btn>
        }
      />
      <form
        className="mb-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setQ(input.trim());
        }}
      >
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Cari nama atau email…" aria-label="Cari pengguna" className="input-solid min-w-0 flex-1 px-4 py-2 text-[13px]" />
        <Btn type="submit">
          <Search size={13} /> Cari
        </Btn>
      </form>
      <Card title={data ? `${data.users.length} dari ${data.total} akun` : "Akun"}>
        {error ? (
          <ErrorBox message={error} onRetry={reload} />
        ) : !data ? (
          <Loading />
        ) : data.users.length === 0 ? (
          <Empty>Tidak ada akun yang cocok.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-text-faint">
                  <th className="px-5 py-3 font-medium">Akun</th>
                  <th className="px-3 py-3 font-medium">Login terakhir</th>
                  <th className="px-3 py-3 font-medium">Deploy</th>
                  <th className="px-3 py-3 font-medium">Link</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {data.users.map((u) => (
                  <tr key={u.email} className="surface-solid-row border-t border-[var(--surface-line)]">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar src={u.picture} name={u.name || u.email} />
                        <div className="min-w-0">
                          <p className="truncate font-medium">{u.name || u.email.split("@")[0]}</p>
                          <p className="truncate text-[11.5px] text-text-faint">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-text-muted">
                      {u.lastSeen ? fmtDateTime(u.lastSeen) : "—"}
                      {u.logins ? <span className="text-text-faint"> · {u.logins}×</span> : null}
                    </td>
                    <td className="px-3 py-3 text-text-muted">{u.deploys}</td>
                    <td className="px-3 py-3 text-text-muted">{u.sites}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1">
                        {u.isAdmin && <Badge tone="violet">Admin</Badge>}
                        {u.blocked && <Badge tone="bad">Diblokir</Badge>}
                        {u.linkBanned && <Badge tone="warn">Dilarang buat link</Badge>}
                        {!u.isAdmin && !u.blocked && !u.linkBanned && <Badge tone="good">Normal</Badge>}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      {!u.isAdmin && (
                        <div className="flex justify-end gap-2">
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
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {data?.truncated && <p className="mt-3 text-[12px] text-text-faint">Daftar dibatasi 1.500 akun pertama yang ditemukan.</p>}
    </div>
  );
}
