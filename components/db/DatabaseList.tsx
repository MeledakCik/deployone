"use client";
import { useCallback, useEffect, useState } from "react";
import type { KeyInfo, PublicDb } from "./types";
import { Btn, CopyBtn, Field, Modal, Notice, PageHeader, SecretRow, UsageBar, api, fmtBytes, fmtDate, heading, inputCls, linkBtn, subtle, surface, td, th } from "./ui";

type Row = PublicDb & { usageBytes: number | null };
type ListData = { databases: Row[]; usedBytes: number; quotaBytes: number; maxDatabases: number; usageUnknown: boolean };
type Created = {
  database: PublicDb;
  credentials: { username: string; password: string };
  apiKeys: (KeyInfo & { plain: string })[];
};

export default function DatabaseList({ onOpen }: { onOpen: (id: string) => void }) {
  const [data, setData] = useState<ListData | null>(null);
  const [err, setErr] = useState("");
  const [creating, setCreating] = useState(false);
  const [rename, setRename] = useState<Row | null>(null);
  const [del, setDel] = useState<Row | null>(null);
  const [created, setCreated] = useState<Created | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await api<ListData>("/api/databases"));
      setErr("");
    } catch (e) {
      setErr((e as Error).message);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const full = !!data && data.usedBytes >= data.quotaBytes;
  const maxed = !!data && data.databases.length >= data.maxDatabases;

  return (
    <div className="space-y-5">
      <PageHeader title="Database" subtitle="Database Turso (SQLite) pribadi dengan panel admin ala phpMyAdmin.">
        <Btn variant="primary" onClick={() => setCreating(true)} disabled={!data || maxed || full} title={maxed ? "Batas database tercapai" : full ? "Kuota penuh" : undefined}>
          + Create Database
        </Btn>
      </PageHeader>

      {err && <Notice kind="error">{err}</Notice>}
      {!data && !err && (
        <div className="space-y-3" aria-busy="true">
          <div className="h-24 animate-pulse rounded-2xl bg-violet-100/70 dark:bg-white/10" />
          <div className="h-40 animate-pulse rounded-2xl bg-violet-100/70 dark:bg-white/10" />
        </div>
      )}

      {data && (
        <>
          <section className={`${surface} space-y-3 p-4 sm:p-5`}>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className={heading}>Kuota penyimpanan</span>
              <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 dark:bg-white/10 dark:text-violet-200">
                {data.databases.length}/{data.maxDatabases} database
              </span>
            </div>
            <UsageBar used={data.usedBytes} quota={data.quotaBytes} />
            {data.usageUnknown && <p className={subtle}>Sebagian ukuran belum bisa dibaca dari Turso; angka di atas mungkin lebih rendah dari aslinya.</p>}
          </section>

          {data.databases.length === 0 && (
            <section className={`${surface} px-5 py-10 text-center`}>
              <p className={heading}>Belum ada database</p>
              <p className={`${subtle} mt-1`}>Klik “Create Database” untuk memulai.</p>
            </section>
          )}

          {data.databases.length > 0 && (
            <>
              {/* Mobile: kartu */}
              <ul className="space-y-3 md:hidden">
                {data.databases.map((d) => (
                  <li key={d.id} className={`${surface} space-y-3 p-4`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold text-slate-900 dark:text-slate-100">{d.displayName}</p>
                        <p className={subtle}>Dibuat {fmtDate(d.createdAt)}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 dark:bg-white/10 dark:text-violet-200">{fmtBytes(d.usageBytes)}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Btn variant="primary" onClick={() => onOpen(d.id)}>
                        Buka
                      </Btn>
                      <a href={`/db/${d.id}`} target="_blank" rel="noopener noreferrer" className={linkBtn}>
                        Tab baru
                      </a>
                      <Btn onClick={() => setRename(d)}>Rename</Btn>
                      <Btn variant="danger" onClick={() => setDel(d)}>
                        Hapus
                      </Btn>
                    </div>
                  </li>
                ))}
              </ul>

              {/* Desktop: tabel */}
              <section className={`${surface} hidden overflow-hidden md:block`}>
                <table className="w-full">
                  <thead className="border-b border-violet-100 bg-violet-50/60 dark:border-white/10 dark:bg-white/5">
                    <tr>
                      <th className={th}>Nama</th>
                      <th className={th}>Ukuran</th>
                      <th className={th}>Dibuat</th>
                      <th className={th} />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-violet-50 dark:divide-white/5">
                    {data.databases.map((d) => (
                      <tr key={d.id} className="transition-colors hover:bg-violet-50/50 dark:hover:bg-white/5">
                        <td className={`${td} font-medium`}>{d.displayName}</td>
                        <td className={td}>{fmtBytes(d.usageBytes)}</td>
                        <td className={td}>{fmtDate(d.createdAt)}</td>
                        <td className={`${td} text-right`}>
                          <div className="flex flex-wrap justify-end gap-1.5">
                            <Btn small variant="primary" onClick={() => onOpen(d.id)}>
                              Buka
                            </Btn>
                            <a href={`/db/${d.id}`} target="_blank" rel="noopener noreferrer" className={`${linkBtn} !rounded-lg !px-2.5 !py-1.5 text-xs`}>
                              Tab baru
                            </a>
                            <Btn small onClick={() => setRename(d)}>
                              Rename
                            </Btn>
                            <Btn small variant="danger" onClick={() => setDel(d)}>
                              Hapus
                            </Btn>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            </>
          )}
        </>
      )}

      {creating && (
        <CreateModal
          onClose={() => setCreating(false)}
          onDone={(c) => {
            setCreating(false);
            setCreated(c);
            load();
          }}
        />
      )}
      {created && (
        <CreatedCard
          c={created}
          onOpen={() => {
            const id = created.database.id;
            setCreated(null);
            onOpen(id);
          }}
          onClose={() => setCreated(null)}
        />
      )}
      {rename && (
        <RenameModal
          row={rename}
          onClose={() => setRename(null)}
          onDone={() => {
            setRename(null);
            load();
          }}
        />
      )}
      {del && (
        <DeleteModal
          row={del}
          onClose={() => setDel(null)}
          onDone={() => {
            setDel(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function CreateModal({ onClose, onDone }: { onClose: () => void; onDone: (c: Created) => void }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  return (
    <Modal title="Create Database" onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setErr("");
          try {
            onDone(await api<Created>("/api/databases", { method: "POST", json: { name } }));
          } catch (x) {
            setErr((x as Error).message);
            setBusy(false);
          }
        }}
      >
        <Field label="Nama database" hint="Huruf kecil, angka, dan strip. 3–32 karakter. Contoh: toko-online">
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value.toLowerCase())} autoFocus required minLength={3} maxLength={32} pattern="[a-z0-9]+(-[a-z0-9]+)*" />
        </Field>
        {err && <Notice kind="error">{err}</Notice>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Btn onClick={onClose}>Batal</Btn>
          <Btn variant="primary" type="submit" disabled={busy}>
            {busy ? "Membuat…" : "Buat"}
          </Btn>
        </div>
      </form>
    </Modal>
  );
}

function CreatedCard({ c, onOpen, onClose }: { c: Created; onOpen: () => void; onClose: () => void }) {
  const endpoint = typeof window !== "undefined" ? `${window.location.origin}/api/v1/db/${c.database.id}/query` : `/api/v1/db/${c.database.id}/query`;
  return (
    <Modal title={`Database “${c.database.displayName}” berhasil dibuat`} onClose={onClose} wide>
      <div className="space-y-4">
        <Notice kind="warn">Password dan API key di bawah hanya tampil sekali. Simpan sekarang; nanti hanya bisa di-reset atau dibuat ulang.</Notice>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Btn variant="primary" onClick={onOpen}>
            Open
          </Btn>
          <a href={`/db/${c.database.id}`} target="_blank" rel="noopener noreferrer" className={linkBtn}>
            Open in new tab
          </a>
        </div>
        <section className="space-y-2">
          <h3 className={heading}>Credentials panel admin</h3>
          <SecretRow label="Username" value={c.credentials.username} />
          <SecretRow label="Password" value={c.credentials.password} />
        </section>
        <section className="space-y-2">
          <h3 className={heading}>REST API</h3>
          <SecretRow label="Endpoint (POST)" value={endpoint} />
          {c.apiKeys.map((k) => (
            <SecretRow key={k.id} label={`API key ${k.mode === "ro" ? "read-only" : "read-write"}`} value={k.plain} />
          ))}
          <p className={subtle}>Kirim ke Environment project dan kelola/cabut key tersedia di halaman detail database.</p>
        </section>
        <div className="flex sm:justify-end">
          <Btn onClick={onClose} className="w-full sm:w-auto">Saya sudah menyimpannya</Btn>
        </div>
      </div>
    </Modal>
  );
}

function RenameModal({ row, onClose, onDone }: { row: Row; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState(row.displayName);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  return (
    <Modal title="Rename database" onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setErr("");
          try {
            await api(`/api/databases/${row.id}`, { method: "PATCH", json: { name } });
            onDone();
          } catch (x) {
            setErr((x as Error).message);
            setBusy(false);
          }
        }}
      >
        <Field label="Nama baru">
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value.toLowerCase())} autoFocus required minLength={3} maxLength={32} pattern="[a-z0-9]+(-[a-z0-9]+)*" />
        </Field>
        {err && <Notice kind="error">{err}</Notice>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Btn onClick={onClose}>Batal</Btn>
          <Btn variant="primary" type="submit" disabled={busy}>
            Simpan
          </Btn>
        </div>
      </form>
    </Modal>
  );
}

function DeleteModal({ row, onClose, onDone }: { row: Row; onClose: () => void; onDone: () => void }) {
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  return (
    <Modal title="Hapus database" onClose={onClose}>
      <div className="space-y-4">
        <Notice kind="error">Semua tabel dan data di “{row.displayName}” akan dihapus permanen. Aksi ini tidak bisa dibatalkan.</Notice>
        <Field label={`Ketik “${row.displayName}” untuk konfirmasi`}>
          <input className={inputCls} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoFocus />
        </Field>
        {err && <Notice kind="error">{err}</Notice>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Btn onClick={onClose}>Batal</Btn>
          <Btn
            variant="danger"
            disabled={busy || confirm !== row.displayName}
            onClick={async () => {
              setBusy(true);
              try {
                await api(`/api/databases/${row.id}`, { method: "DELETE", json: { confirm } });
                onDone();
              } catch (x) {
                setErr((x as Error).message);
                setBusy(false);
              }
            }}
          >
            {busy ? "Menghapus…" : "Hapus permanen"}
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

void CopyBtn;
