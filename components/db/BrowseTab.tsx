"use client";
import { useCallback, useEffect, useState } from "react";
import type { Cell, ColumnInfo, Schema } from "./types";
import { Btn, Modal, Notice, api, inputCls, renderCell, subtle, td, th } from "./ui";

type Page = { columns: string[]; colInfo: ColumnInfo[]; rows: Cell[][]; rids: Cell[]; total: number; page: number; pageSize: number; editable: boolean };

export default function BrowseTab({ id, schema, table, setTable, onChanged }: { id: string; schema: Schema; table: string; setTable: (t: string) => void; onChanged: () => void }) {
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<string | null>(null);
  const [dir, setDir] = useState<"asc" | "desc">("asc");
  const [data, setData] = useState<Page | null>(null);
  const [err, setErr] = useState("");
  const [form, setForm] = useState<{ rid?: Cell; values: Record<string, Cell> } | null>(null);

  const load = useCallback(async () => {
    if (!table) return;
    try {
      const qs = new URLSearchParams({ table, page: String(page), pageSize: "50", ...(sort ? { sort, dir } : {}) });
      setData(await api<Page>(`/api/databases/${id}/rows?${qs}`));
      setErr("");
    } catch (e) {
      setErr((e as Error).message);
      setData(null);
    }
  }, [id, table, page, sort, dir]);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => setPage(1), [table]);

  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  if (!schema.tables.length) return <p className="rounded-xl border border-dashed border-violet-200 px-4 py-8 text-center text-sm text-slate-500 dark:border-white/15 dark:text-slate-400">Belum ada tabel.</p>;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <select className={`${inputCls} !w-auto max-w-full`} value={table} onChange={(e) => setTable(e.target.value)} aria-label="Pilih tabel">
          {schema.tables.map((t) => (
            <option key={t.name}>{t.name}</option>
          ))}
        </select>
        {data && <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 dark:bg-white/10 dark:text-violet-200">{data.total} baris</span>}
        <div className="flex w-full gap-2 sm:ml-auto sm:w-auto [&>*]:flex-1 sm:[&>*]:flex-none">
          <Btn onClick={load}>Refresh</Btn>
          <Btn variant="primary" disabled={!data?.editable && !!data} onClick={() => setForm({ values: {} })}>
            + Tambah row
          </Btn>
        </div>
      </div>
      {err && <Notice kind="error">{err}</Notice>}
      {data && !data.editable && <Notice kind="info">View / tabel WITHOUT ROWID: hanya bisa dibaca di sini.</Notice>}
      {data && (
        <div className="max-h-[70vh] overflow-auto rounded-xl border border-violet-100 dark:border-white/10">
          <table className="w-full">
            <thead className="sticky top-0 bg-violet-50 dark:bg-[#271b57]">
              <tr>
                {data.editable && <th className={th} />}
                {data.columns.map((c) => (
                  <th key={c} className={th}>
                    <button
                      type="button"
                      className="font-semibold hover:text-slate-900 dark:hover:text-slate-100"
                      onClick={() => {
                        if (sort === c) setDir(dir === "asc" ? "desc" : "asc");
                        else {
                          setSort(c);
                          setDir("asc");
                        }
                      }}
                    >
                      {c} {sort === c ? (dir === "asc" ? "▲" : "▼") : ""}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-violet-50 dark:divide-white/5">
              {data.rows.length === 0 && (
                <tr>
                  <td className={td} colSpan={data.columns.length + 1}>
                    Tabel kosong.
                  </td>
                </tr>
              )}
              {data.rows.map((row, i) => (
                <tr key={i} className="transition-colors hover:bg-violet-50/50 dark:hover:bg-white/5">
                  {data.editable && (
                    <td className={`${td} whitespace-nowrap`}>
                      <Btn small onClick={() => setForm({ rid: data.rids[i], values: Object.fromEntries(data.columns.map((c, j) => [c, row[j]])) })}>
                        Edit
                      </Btn>{" "}
                      <Btn
                        small
                        variant="danger"
                        onClick={async () => {
                          if (!window.confirm("Hapus row ini?")) return;
                          try {
                            await api(`/api/databases/${id}/rows`, { method: "DELETE", json: { table, rid: data.rids[i] } });
                            load();
                            onChanged();
                          } catch (e) {
                            setErr((e as Error).message);
                          }
                        }}
                      >
                        Hapus
                      </Btn>
                    </td>
                  )}
                  {row.map((c, j) => (
                    <td key={j} className={`${td} max-w-[16rem] sm:max-w-xs`}>
                      {renderCell(c)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && (
        <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
          <span className={subtle}>
            Halaman {data.page} dari {pages}
          </span>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Btn disabled={page <= 1} onClick={() => setPage(page - 1)}>
              ‹ Sebelumnya
            </Btn>
            <Btn disabled={page >= pages} onClick={() => setPage(page + 1)}>
              Berikutnya ›
            </Btn>
          </div>
        </div>
      )}
      {form && data && (
        <RowForm
          id={id}
          table={table}
          cols={data.colInfo}
          initial={form}
          onClose={() => setForm(null)}
          onSaved={() => {
            setForm(null);
            load();
            onChanged();
          }}
        />
      )}
    </div>
  );
}

function RowForm({ id, table, cols, initial, onClose, onSaved }: { id: string; table: string; cols: ColumnInfo[]; initial: { rid?: Cell; values: Record<string, Cell> }; onClose: () => void; onSaved: () => void }) {
  const editing = initial.rid !== undefined;
  const [vals, setVals] = useState<Record<string, string>>(() => Object.fromEntries(cols.map((c) => [c.name, initial.values[c.name] == null || typeof initial.values[c.name] === "object" ? "" : String(initial.values[c.name])])));
  const [nulls, setNulls] = useState<Record<string, boolean>>(() => Object.fromEntries(cols.map((c) => [c.name, editing && initial.values[c.name] === null])));
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setErr("");
    const values: Record<string, string | null> = {};
    for (const c of cols) {
      const orig = initial.values[c.name];
      if (editing && typeof orig === "object" && orig !== null) continue; // BLOB tidak diedit
      if (nulls[c.name]) values[c.name] = null;
      else if (editing || vals[c.name] !== "") values[c.name] = vals[c.name]; // saat tambah, kosong = pakai default
    }
    try {
      await api(`/api/databases/${id}/rows`, { method: editing ? "PATCH" : "POST", json: { table, rid: initial.rid, values } });
      onSaved();
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <Modal title={editing ? "Edit row" : "Tambah row"} onClose={onClose} wide>
      <div className="space-y-3">
        {cols.map((c) => {
          const isBlob = editing && typeof initial.values[c.name] === "object" && initial.values[c.name] !== null;
          return (
            <div key={c.name} className="grid items-center gap-1.5 sm:grid-cols-[10rem_1fr_auto] sm:gap-2">
              <label htmlFor={`f-${c.name}`} className="text-sm font-medium text-slate-700 dark:text-slate-200">
                {c.name} <span className="text-xs font-normal text-slate-400">{c.type}{c.pk ? " · PK" : ""}</span>
              </label>
              <input id={`f-${c.name}`} className={inputCls} disabled={isBlob || nulls[c.name]} value={isBlob ? "[BLOB]" : vals[c.name]} placeholder={!editing ? "(kosong = default)" : ""} onChange={(e) => setVals({ ...vals, [c.name]: e.target.value })} />
              <label className="flex items-center gap-1 text-xs text-slate-500">
                <input type="checkbox" disabled={isBlob || (!!c.notnull && !editing)} checked={!!nulls[c.name]} onChange={(e) => setNulls({ ...nulls, [c.name]: e.target.checked })} /> NULL
              </label>
            </div>
          );
        })}
        {err && <Notice kind="error">{err}</Notice>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Btn onClick={onClose}>Batal</Btn>
          <Btn variant="primary" onClick={save} disabled={busy}>
            {busy ? "Menyimpan…" : "Simpan"}
          </Btn>
        </div>
      </div>
    </Modal>
  );
}
