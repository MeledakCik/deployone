"use client";
import { useT } from "@/lib/i18n";
import "@/lib/i18n/dict/app";
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
  const t = useT();
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
      <PageHeader title={t("Database")} subtitle={t("Database Turso (SQLite) pribadi dengan panel admin ala phpMyAdmin.")}>
        <Btn variant="primary" onClick={() => setCreating(true)} disabled={!data || maxed || full} title={maxed ? t("Batas database tercapai") : full ? t("Kuota penuh") : undefined}>
          {t("+ Create Database")}
        </Btn>
      </PageHeader>

      {err && <Notice kind="error">{err}</Notice>}
      {!data && !err && (
        <div className="space-y-3" aria-busy="true">
          <div className="h-24 animate-pulse rounded-[14px] bg-tone-lilac" />
          <div className="h-40 animate-pulse rounded-[14px] bg-tone-lilac" />
        </div>
      )}

      {data && (
        <>
          <section className={`${surface} space-y-3 p-4 sm:p-5`}>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className={heading}>{t("Kuota penyimpanan")}</span>
              <span className="rounded-full bg-[var(--pill-bg)] px-2.5 py-1 text-xs font-medium text-lav-text">
                {t("{length}/{maxDatabases} database", { length: data.databases.length, maxDatabases: data.maxDatabases })}
              </span>
            </div>
            <UsageBar used={data.usedBytes} quota={data.quotaBytes} />
            {data.usageUnknown && <p className={subtle}>{t("Sebagian ukuran belum bisa dibaca dari Turso; angka di atas mungkin lebih rendah dari aslinya.")}</p>}
          </section>

          {data.databases.length === 0 && (
            <section className={`${surface} px-5 py-10 text-center`}>
              <p className={heading}>{t("Belum ada database")}</p>
              <p className={`${subtle} mt-1`}>{t("Klik “Create Database” untuk memulai.")}</p>
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
                        <p className="truncate text-base font-semibold text-text">{d.displayName}</p>
                        <p className={subtle}>{t("Dibuat {fmtDate}", { fmtDate: fmtDate(d.createdAt) })}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-[var(--pill-bg)] px-2.5 py-1 text-xs font-medium text-lav-text">{fmtBytes(d.usageBytes)}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Btn variant="primary" onClick={() => onOpen(d.id)}>
                        {t("Buka")}
                      </Btn>
                      <a href={`/db/${d.id}`} target="_blank" rel="noopener noreferrer" className={linkBtn}>
                        {t("Tab baru")}
                      </a>
                      <Btn onClick={() => setRename(d)}>{t("Rename")}</Btn>
                      <Btn variant="danger" onClick={() => setDel(d)}>
                        {t("Hapus")}
                      </Btn>
                    </div>
                  </li>
                ))}
              </ul>

              {/* Desktop: tabel */}
              <section className={`${surface} hidden overflow-hidden md:block`}>
                <table className="w-full">
                  <thead className="bg-[var(--pill-bg)]">
                    <tr>
                      <th className={th}>{t("Nama")}</th>
                      <th className={th}>{t("Ukuran")}</th>
                      <th className={th}>{t("Dibuat")}</th>
                      <th className={th} />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--line)]">
                    {data.databases.map((d) => (
                      <tr key={d.id} className="transition-colors hover:bg-[var(--card-hover)]">
                        <td className={`${td} font-medium`}>{d.displayName}</td>
                        <td className={td}>{fmtBytes(d.usageBytes)}</td>
                        <td className={td}>{fmtDate(d.createdAt)}</td>
                        <td className={`${td} text-right`}>
                          <div className="flex flex-wrap justify-end gap-1.5">
                            <Btn small variant="primary" onClick={() => onOpen(d.id)}>
                              {t("Buka")}
                            </Btn>
                            <a href={`/db/${d.id}`} target="_blank" rel="noopener noreferrer" className={`${linkBtn} !rounded-lg !px-2.5 !py-1.5 text-xs`}>
                              {t("Tab baru")}
                            </a>
                            <Btn small onClick={() => setRename(d)}>
                              {t("Rename")}
                            </Btn>
                            <Btn small variant="danger" onClick={() => setDel(d)}>
                              {t("Hapus")}
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
  const t = useT();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  return (
    <Modal title={t("Create Database")} onClose={onClose}>
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
        <Field label={t("Nama database")} hint={t("Huruf kecil, angka, dan strip. 3–32 karakter. Contoh: toko-online")}>
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value.toLowerCase())} autoFocus required minLength={3} maxLength={32} pattern="[a-z0-9]+(-[a-z0-9]+)*" />
        </Field>
        {err && <Notice kind="error">{err}</Notice>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Btn onClick={onClose}>{t("Batal")}</Btn>
          <Btn variant="primary" type="submit" disabled={busy}>
            {busy ? t("Membuat…") : t("Buat")}
          </Btn>
        </div>
      </form>
    </Modal>
  );
}

function CreatedCard({ c, onOpen, onClose }: { c: Created; onOpen: () => void; onClose: () => void }) {
  const t = useT();
  const endpoint = typeof window !== "undefined" ? `${window.location.origin}/api/v1/db/${c.database.id}/query` : `/api/v1/db/${c.database.id}/query`;
  return (
    <Modal title={t("Database “{displayName}” berhasil dibuat", { displayName: c.database.displayName })} onClose={onClose} wide>
      <div className="space-y-4">
        <Notice kind="warn">{t("Password dan API key di bawah hanya tampil sekali. Simpan sekarang; nanti hanya bisa di-reset atau dibuat ulang.")}</Notice>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Btn variant="primary" onClick={onOpen}>
            {t("Open")}
          </Btn>
          <a href={`/db/${c.database.id}`} target="_blank" rel="noopener noreferrer" className={linkBtn}>
            {t("Open in new tab")}
          </a>
        </div>
        <section className="space-y-2">
          <h3 className={heading}>{t("Credentials panel admin")}</h3>
          <SecretRow label={t("Username")} value={c.credentials.username} />
          <SecretRow label={t("Password")} value={c.credentials.password} />
        </section>
        <section className="space-y-2">
          <h3 className={heading}>{t("REST API")}</h3>
          <SecretRow label={t("Endpoint (POST)")} value={endpoint} />
          {c.apiKeys.map((k) => (
            <SecretRow key={k.id} label={`API key ${k.mode === "ro" ? "read-only" : "read-write"}`} value={k.plain} />
          ))}
          <p className={subtle}>{t("Kirim ke Environment project dan kelola/cabut key tersedia di halaman detail database.")}</p>
        </section>
        <div className="flex sm:justify-end">
          <Btn onClick={onClose} className="w-full sm:w-auto">{t("Saya sudah menyimpannya")}</Btn>
        </div>
      </div>
    </Modal>
  );
}

function RenameModal({ row, onClose, onDone }: { row: Row; onClose: () => void; onDone: () => void }) {
  const t = useT();
  const [name, setName] = useState(row.displayName);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  return (
    <Modal title={t("Rename database")} onClose={onClose}>
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
        <Field label={t("Nama baru")}>
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value.toLowerCase())} autoFocus required minLength={3} maxLength={32} pattern="[a-z0-9]+(-[a-z0-9]+)*" />
        </Field>
        {err && <Notice kind="error">{err}</Notice>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Btn onClick={onClose}>{t("Batal")}</Btn>
          <Btn variant="primary" type="submit" disabled={busy}>
            {t("Simpan")}
          </Btn>
        </div>
      </form>
    </Modal>
  );
}

function DeleteModal({ row, onClose, onDone }: { row: Row; onClose: () => void; onDone: () => void }) {
  const t = useT();
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  return (
    <Modal title={t("Hapus database")} onClose={onClose}>
      <div className="space-y-4">
        <Notice kind="error">{t("Semua tabel dan data di “{displayName}” akan dihapus permanen. Aksi ini tidak bisa dibatalkan.", { displayName: row.displayName })}</Notice>
        <Field label={t("Ketik “{displayName}” untuk konfirmasi", { displayName: row.displayName })}>
          <input className={inputCls} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoFocus />
        </Field>
        {err && <Notice kind="error">{err}</Notice>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Btn onClick={onClose}>{t("Batal")}</Btn>
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
            {busy ? t("Menghapus…") : t("Hapus permanen")}
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

void CopyBtn;
