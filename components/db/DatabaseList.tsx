"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { KeyInfo, PublicDb } from "./types";
import { Btn, CopyBtn, Field, Modal, Notice, SecretRow, UsageBar, api, fmtBytes, fmtDate, inputCls, surface, td, th } from "./ui";

type Row = PublicDb & { usageBytes: number | null };
type ListData = { databases: Row[]; usedBytes: number; quotaBytes: number; maxDatabases: number; usageUnknown: boolean };
type Created = {
  database: PublicDb;
  credentials: { username: string; password: string };
  apiKeys: (KeyInfo & { plain: string })[];
};

export default function DatabaseList() {
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
    <div className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Database</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Database Turso (SQLite) pribadi dengan panel admin ala phpMyAdmin.</p>
        </div>
        <Btn variant="primary" onClick={() => setCreating(true)} disabled={!data || maxed || full} title={maxed ? "Batas database tercapai" : full ? "Kuota penuh" : undefined}>
          + Create Database
        </Btn>
      </div>

      {err && <Notice kind="error">{err}</Notice>}
      {!data && !err && <p className="text-sm text-slate-500">Memuat…</p>}

      {data && (
        <>
          <section className={`${surface} space-y-2 p-4`}>
            <div className="flex justify-between text-sm">
              <span className="font-medium text-slate-800 dark:text-slate-100">Kuota penyimpanan</span>
              <span className="text-slate-500 dark:text-slate-400">
                {data.databases.length}/{data.maxDatabases} database
              </span>
            </div>
            <UsageBar used={data.usedBytes} quota={data.quotaBytes} />
            {data.usageUnknown && <p className="text-xs text-slate-500">Sebagian ukuran belum bisa dibaca dari Turso; angka di atas mungkin lebih rendah dari aslinya.</p>}
          </section>

          <section className={`${surface} overflow-x-auto`}>
            <table className="w-full min-w-[560px]">
              <thead className="border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className={th}>Nama</th>
                  <th className={th}>Ukuran</th>
                  <th className={th}>Dibuat</th>
                  <th className={th} />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.databases.length === 0 && (
                  <tr>
                    <td className={td} colSpan={4}>
                      Belum ada database. Klik “Create Database” untuk memulai.
                    </td>
                  </tr>
                )}
                {data.databases.map((d) => (
                  <tr key={d.id}>
                    <td className={`${td} font-medium`}>{d.displayName}</td>
                    <td className={td}>{fmtBytes(d.usageBytes)}</td>
                    <td className={td}>{fmtDate(d.createdAt)}</td>
                    <td className={`${td} text-right`}>
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <Link href={`/dashboard/databases/${d.id}`} className="inline-flex items-center rounded-md bg-indigo-600 px-2 py-1 text-xs font-medium text-white hover:bg-indigo-500">
                          Buka
                        </Link>
                        <a href={`/db/${d.id}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
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
      {created && <CreatedCard c={created} onClose={() => setCreated(null)} />}
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
        <div className="flex justify-end gap-2">
          <Btn onClick={onClose}>Batal</Btn>
          <Btn variant="primary" type="submit" disabled={busy}>
            {busy ? "Membuat…" : "Buat"}
          </Btn>
        </div>
      </form>
    </Modal>
  );
}

function CreatedCard({ c, onClose }: { c: Created; onClose: () => void }) {
  const endpoint = typeof window !== "undefined" ? `${window.location.origin}/api/v1/db/${c.database.id}/query` : `/api/v1/db/${c.database.id}/query`;
  return (
    <Modal title={`Database “${c.database.displayName}” berhasil dibuat`} onClose={onClose} wide>
      <div className="space-y-4">
        <Notice kind="warn">Password dan API key di bawah hanya tampil sekali. Simpan sekarang; nanti hanya bisa di-reset atau dibuat ulang.</Notice>
        <div className="flex flex-wrap gap-2">
          <Link href={`/dashboard/databases/${c.database.id}`} className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500">
            Open
          </Link>
          <a href={`/db/${c.database.id}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800">
            Open in new tab
          </a>
        </div>
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Credentials panel admin</h3>
          <SecretRow label="Username" value={c.credentials.username} />
          <SecretRow label="Password" value={c.credentials.password} />
        </section>
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">REST API</h3>
          <SecretRow label="Endpoint (POST)" value={endpoint} />
          {c.apiKeys.map((k) => (
            <SecretRow key={k.id} label={`API key ${k.mode === "ro" ? "read-only" : "read-write"}`} value={k.plain} />
          ))}
          <p className="text-xs text-slate-500 dark:text-slate-400">Kirim ke Environment project dan kelola/cabut key tersedia di halaman detail database.</p>
        </section>
        <div className="flex justify-end">
          <Btn onClick={onClose}>Saya sudah menyimpannya</Btn>
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
        <div className="flex justify-end gap-2">
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
        <div className="flex justify-end gap-2">
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
