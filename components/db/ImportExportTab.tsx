"use client";
import { useRef, useState } from "react";
import type { Schema } from "./types";
import { Btn, Field, Notice, api, heading, inputCls, linkBtn, subtle } from "./ui";

export default function ImportExportTab({ id, schema, onChanged }: { id: string; schema: Schema; onChanged: () => void }) {
  const [csvTable, setCsvTable] = useState(schema.tables[0]?.name ?? "");
  const [expTable, setExpTable] = useState(schema.tables[0]?.name ?? "");
  const [hasHeader, setHasHeader] = useState(true);
  const [createTable, setCreateTable] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  async function doImport() {
    const f = file.current?.files?.[0];
    if (!f) return setMsg({ kind: "error", text: "Pilih file .sql atau .csv dulu." });
    if (f.size > 2_000_000) return setMsg({ kind: "error", text: "File terlalu besar (maks 2MB)." });
    const kind = f.name.toLowerCase().endsWith(".csv") ? "csv" : f.name.toLowerCase().endsWith(".sql") ? "sql" : null;
    if (!kind) return setMsg({ kind: "error", text: "Format harus .sql atau .csv." });
    setBusy(true);
    setMsg(null);
    try {
      const content = await f.text();
      const r = await api<any>(`/api/databases/${id}/import`, { method: "POST", json: kind === "sql" ? { kind, content } : { kind, content, table: csvTable, hasHeader, createTable } });
      setMsg({ kind: "ok", text: kind === "sql" ? `${r.executed} statement berhasil dijalankan.` : `${r.inserted} baris diimpor${r.createdTable ? " (tabel baru dibuat)" : ""}.` });
      onChanged();
      if (file.current) file.current.value = "";
    } catch (e) {
      setMsg({ kind: "error", text: (e as Error).message });
    }
    setBusy(false);
  }

  const link = `${linkBtn} w-full sm:w-auto`;
  return (
    <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
      <section className="space-y-3 rounded-xl border border-violet-100 p-4 dark:border-white/10">
        <h3 className={heading}>Export</h3>
        <a className={link} href={`/api/databases/${id}/export?format=sql`}>
          Unduh seluruh database (.sql)
        </a>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select className={`${inputCls} sm:!w-auto`} value={expTable} onChange={(e) => setExpTable(e.target.value)} aria-label="Tabel untuk CSV">
            {schema.tables.map((t) => (
              <option key={t.name}>{t.name}</option>
            ))}
          </select>
          <a className={link} aria-disabled={!expTable} href={expTable ? `/api/databases/${id}/export?format=csv&table=${encodeURIComponent(expTable)}` : undefined}>
            Unduh CSV
          </a>
        </div>
        <p className={subtle}>Maksimal 50.000 baris per ekspor.</p>
      </section>

      <section className="space-y-3 rounded-xl border border-violet-100 p-4 dark:border-white/10">
        <h3 className={heading}>Import</h3>
        <input ref={file} type="file" accept=".sql,.csv" className="block w-full cursor-pointer rounded-xl border border-dashed border-violet-300 bg-violet-50/50 p-3 text-sm text-slate-700 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-violet-500 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:bg-violet-50 dark:border-white/20 dark:bg-white/5 dark:text-slate-200" aria-label="File import" />
        <div className="space-y-2 rounded-xl bg-violet-50/60 p-3 dark:bg-white/5">
          <p className="text-xs font-medium text-slate-600 dark:text-slate-300">Khusus CSV</p>
          <Field label="Tabel tujuan">
            <input className={inputCls} list="tbls" value={csvTable} onChange={(e) => setCsvTable(e.target.value)} />
            <datalist id="tbls">
              {schema.tables.map((t) => (
                <option key={t.name} value={t.name} />
              ))}
            </datalist>
          </Field>
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
            <input type="checkbox" checked={hasHeader} onChange={(e) => setHasHeader(e.target.checked)} /> Baris pertama adalah header
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
            <input type="checkbox" checked={createTable} onChange={(e) => setCreateTable(e.target.checked)} /> Buat tabel baru jika belum ada (semua kolom TEXT)
          </label>
        </div>
        {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
        <Btn variant="primary" onClick={doImport} disabled={busy} className="w-full sm:w-auto">
          {busy ? "Mengimpor…" : "Import"}
        </Btn>
        <p className={subtle}>Maks 2MB. Dijalankan dalam satu transaksi: jika ada yang gagal, tidak ada yang tersimpan.</p>
      </section>
    </div>
  );
}
