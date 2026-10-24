"use client";
import { useState } from "react";
import type { Schema } from "./types";
import { Btn, Field, Modal, Notice, api, heading, inputCls, subtle, td, th } from "./ui";

type NewCol = { name: string; type: string; pk: boolean; notNull: boolean; autoincrement: boolean; default: string };
const emptyCol = (): NewCol => ({ name: "", type: "TEXT", pk: false, notNull: false, autoincrement: false, default: "" });
const TYPES = ["INTEGER", "TEXT", "REAL", "BLOB", "NUMERIC"];

export default function StructureTab({ id, schema, table, setTable, onChanged }: { id: string; schema: Schema; table: string; setTable: (t: string) => void; onChanged: () => void }) {
  const t = schema.tables.find((x) => x.name === table);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [creating, setCreating] = useState(false);
  const [addCol, setAddCol] = useState<NewCol>(emptyCol());
  const [idx, setIdx] = useState({ name: "", columns: [] as string[], unique: false });

  async function act(body: Record<string, unknown>, okMsg: string, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return false;
    try {
      await api(`/api/databases/${id}/schema`, { method: "POST", json: body });
      setErr("");
      setMsg(okMsg);
      onChanged();
      return true;
    } catch (e) {
      setMsg("");
      setErr((e as Error).message);
      return false;
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <select className={`${inputCls} !w-auto max-w-full`} value={table} onChange={(e) => setTable(e.target.value)} aria-label="Pilih tabel">
          {schema.tables.length === 0 && <option value="">(belum ada tabel)</option>}
          {schema.tables.map((x) => (
            <option key={x.name}>{x.name}</option>
          ))}
        </select>
        <div className="flex w-full gap-2 sm:ml-auto sm:w-auto [&>*]:flex-1 sm:[&>*]:flex-none">
          <Btn variant="primary" onClick={() => setCreating(true)}>
            + Buat tabel
          </Btn>
          {t && t.type === "table" && (
            <Btn variant="danger" onClick={() => act({ action: "dropTable", table: t.name }, `Tabel ${t.name} dihapus.`, `Hapus tabel “${t.name}” beserta seluruh datanya?`)}>
              Drop tabel
            </Btn>
          )}
        </div>
      </div>
      {err && <Notice kind="error">{err}</Notice>}
      {msg && <Notice kind="ok">{msg}</Notice>}

      {t && (
        <>
          <section className="space-y-2">
            <h3 className={heading}>Kolom</h3>
            <div className="overflow-x-auto rounded-xl border border-violet-100 dark:border-white/10">
              <table className="w-full min-w-[520px]">
                <thead className="bg-violet-50/70 dark:bg-white/5">
                  <tr>
                    {["#", "Nama", "Tipe", "Null", "Default", "PK", ""].map((h) => (
                      <th key={h} className={th}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-violet-50 dark:divide-white/5">
                  {t.columns.map((c) => (
                    <tr key={c.name}>
                      <td className={td}>{c.cid}</td>
                      <td className={`${td} font-medium`}>{c.name}</td>
                      <td className={td}>{c.type || "—"}</td>
                      <td className={td}>{c.notnull ? "NOT NULL" : "NULL"}</td>
                      <td className={td}>{c.dflt === null ? "—" : String(c.dflt)}</td>
                      <td className={td}>{c.pk ? "✓" : ""}</td>
                      <td className={`${td} text-right`}>
                        {t.type === "table" && (
                          <Btn small variant="danger" onClick={() => act({ action: "dropColumn", table: t.name, column: c.name }, `Kolom ${c.name} dihapus.`, `Hapus kolom “${c.name}”?`)}>
                            Hapus
                          </Btn>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {t.type === "table" && (
            <>
              <section className="space-y-2">
                <h3 className={heading}>Tambah kolom</h3>
                <div className="grid gap-2 sm:grid-cols-[1fr_8rem_1fr_auto_auto]">
                  <input className={inputCls} placeholder="nama_kolom" value={addCol.name} onChange={(e) => setAddCol({ ...addCol, name: e.target.value })} aria-label="Nama kolom" />
                  <select className={inputCls} value={addCol.type} onChange={(e) => setAddCol({ ...addCol, type: e.target.value })} aria-label="Tipe">
                    {TYPES.map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                  <input className={inputCls} placeholder="default (opsional)" value={addCol.default} onChange={(e) => setAddCol({ ...addCol, default: e.target.value })} aria-label="Default" />
                  <label className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-300">
                    <input type="checkbox" checked={addCol.notNull} onChange={(e) => setAddCol({ ...addCol, notNull: e.target.checked })} /> NOT NULL
                  </label>
                  <Btn
                    variant="primary"
                    className="w-full sm:w-auto"
                    onClick={async () => {
                      if (await act({ action: "addColumn", table: t.name, column: addCol }, `Kolom ${addCol.name} ditambahkan.`)) setAddCol(emptyCol());
                    }}
                  >
                    Tambah
                  </Btn>
                </div>
              </section>

              <section className="space-y-2">
                <h3 className={heading}>Index</h3>
                {t.indexes.length === 0 && <p className={subtle}>Belum ada index.</p>}
                <ul className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
                  {t.indexes.map((i) => (
                    <li key={i.name} className="flex items-center justify-between gap-2 py-2">
                      <div className="min-w-0">
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          {i.name} {i.unique && <span className="ml-1 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700 dark:bg-white/10 dark:text-violet-200">unique</span>}
                        </div>
                        <code className="block truncate font-mono text-xs text-slate-500 dark:text-slate-400">{i.sql ?? `auto (${i.origin})`}</code>
                      </div>
                      {i.sql && (
                        <Btn small variant="danger" onClick={() => act({ action: "dropIndex", name: i.name }, `Index ${i.name} dihapus.`, `Hapus index “${i.name}”?`)}>
                          Hapus
                        </Btn>
                      )}
                    </li>
                  ))}
                </ul>
                <div className="grid gap-2 sm:grid-cols-[1fr_2fr_auto_auto]">
                  <input className={inputCls} placeholder="nama_index" value={idx.name} onChange={(e) => setIdx({ ...idx, name: e.target.value })} aria-label="Nama index" />
                  <select multiple className={`${inputCls} h-20`} value={idx.columns} onChange={(e) => setIdx({ ...idx, columns: Array.from(e.target.selectedOptions).map((o) => o.value) })} aria-label="Kolom index (tahan Ctrl/Cmd untuk pilih banyak)">
                    {t.columns.map((c) => (
                      <option key={c.name}>{c.name}</option>
                    ))}
                  </select>
                  <label className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-300">
                    <input type="checkbox" checked={idx.unique} onChange={(e) => setIdx({ ...idx, unique: e.target.checked })} /> Unique
                  </label>
                  <Btn
                    variant="primary"
                    className="w-full sm:w-auto"
                    onClick={async () => {
                      if (await act({ action: "createIndex", table: t.name, ...idx }, `Index ${idx.name} dibuat.`)) setIdx({ name: "", columns: [], unique: false });
                    }}
                  >
                    Buat index
                  </Btn>
                </div>
              </section>
            </>
          )}
        </>
      )}

      {creating && (
        <CreateTable
          onClose={() => setCreating(false)}
          onSubmit={async (name, columns) => {
            const ok = await act({ action: "createTable", name, columns }, `Tabel ${name} dibuat.`);
            if (ok) {
              setCreating(false);
              setTable(name);
            }
            return ok;
          }}
        />
      )}
    </div>
  );
}

function CreateTable({ onClose, onSubmit }: { onClose: () => void; onSubmit: (name: string, cols: NewCol[]) => Promise<boolean> }) {
  const [name, setName] = useState("");
  const [cols, setCols] = useState<NewCol[]>([{ ...emptyCol(), name: "id", type: "INTEGER", pk: true, autoincrement: true }, emptyCol()]);
  const set = (i: number, p: Partial<NewCol>) => setCols(cols.map((c, j) => (j === i ? { ...c, ...p } : c)));
  return (
    <Modal title="Buat tabel" onClose={onClose} wide>
      <div className="space-y-3">
        <Field label="Nama tabel">
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
        <div className="space-y-2">
          {cols.map((c, i) => (
            <div key={i} className="grid items-center gap-2 rounded-xl border border-violet-100 p-2.5 dark:border-white/10 sm:grid-cols-[1fr_7rem_1fr_auto] sm:border-0 sm:p-0">
              <input className={inputCls} placeholder="nama_kolom" value={c.name} onChange={(e) => set(i, { name: e.target.value })} aria-label={`Nama kolom ${i + 1}`} />
              <select className={inputCls} value={c.type} onChange={(e) => set(i, { type: e.target.value })} aria-label="Tipe">
                {TYPES.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
              <input className={inputCls} placeholder="default" value={c.default} onChange={(e) => set(i, { default: e.target.value })} aria-label="Default" />
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
                <label><input type="checkbox" checked={c.pk} onChange={(e) => set(i, { pk: e.target.checked })} /> PK</label>
                <label><input type="checkbox" checked={c.autoincrement} onChange={(e) => set(i, { autoincrement: e.target.checked })} /> AI</label>
                <label><input type="checkbox" checked={c.notNull} onChange={(e) => set(i, { notNull: e.target.checked })} /> NN</label>
                <button type="button" aria-label="Hapus kolom" className="text-red-500" onClick={() => setCols(cols.filter((_, j) => j !== i))}>✕</button>
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
          <Btn onClick={() => setCols([...cols, emptyCol()])}>+ Kolom</Btn>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Btn onClick={onClose}>Batal</Btn>
            <Btn variant="primary" onClick={() => onSubmit(name, cols.filter((c) => c.name.trim()))}>
              Buat
            </Btn>
          </div>
        </div>
      </div>
    </Modal>
  );
}
