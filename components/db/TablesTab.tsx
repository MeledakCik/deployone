"use client";
import type { Schema } from "./types";
import { Btn, td, th } from "./ui";

export default function TablesTab({ schema, onOpen, onReload }: { schema: Schema; onOpen: (table: string, tab: "browse" | "structure") => void; onReload: () => void }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{schema.tables.length} tabel/view</h2>
        <Btn small onClick={onReload}>
          Refresh
        </Btn>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px]">
          <thead className="border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className={th}>Nama</th>
              <th className={th}>Tipe</th>
              <th className={th}>Baris</th>
              <th className={th}>Kolom</th>
              <th className={th} />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {schema.tables.length === 0 && (
              <tr>
                <td className={td} colSpan={5}>
                  Belum ada tabel. Buat lewat tab Structure atau jalankan CREATE TABLE di tab SQL.
                </td>
              </tr>
            )}
            {schema.tables.map((t) => (
              <tr key={t.name}>
                <td className={`${td} font-medium`}>{t.name}</td>
                <td className={td}>{t.type}</td>
                <td className={td}>{String(t.rowCount ?? "—")}</td>
                <td className={td}>{t.columns.length}</td>
                <td className={`${td} text-right`}>
                  <div className="flex justify-end gap-1.5">
                    <Btn small onClick={() => onOpen(t.name, "browse")}>
                      Browse
                    </Btn>
                    <Btn small onClick={() => onOpen(t.name, "structure")}>
                      Structure
                    </Btn>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {schema.triggers.length > 0 && <p className="text-xs text-slate-500">Trigger: {schema.triggers.map((t) => t.name).join(", ")}</p>}
    </div>
  );
}
