"use client";
import type { Schema } from "./types";
import { Btn, heading, subtle, td, th } from "./ui";

export default function TablesTab({ schema, onOpen, onReload }: { schema: Schema; onOpen: (table: string, tab: "browse" | "structure") => void; onReload: () => void }) {
  const empty = "Belum ada tabel. Buat lewat tab Structure atau jalankan CREATE TABLE di tab SQL.";
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className={heading}>{schema.tables.length} tabel/view</h2>
        <Btn small onClick={onReload}>
          Refresh
        </Btn>
      </div>

      {schema.tables.length === 0 && <p className="rounded-xl border border-dashed border-violet-200 px-4 py-8 text-center text-sm text-slate-500 dark:border-white/15 dark:text-slate-400">{empty}</p>}

      {schema.tables.length > 0 && (
        <>
          {/* Mobile: kartu */}
          <ul className="space-y-2 md:hidden">
            {schema.tables.map((t) => (
              <li key={t.name} className="rounded-xl border border-violet-100 p-3 dark:border-white/10">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 break-all font-medium text-slate-900 dark:text-slate-100">{t.name}</p>
                  <span className="shrink-0 rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700 dark:bg-white/10 dark:text-violet-200">{t.type}</span>
                </div>
                <p className={`${subtle} mt-0.5`}>
                  {String(t.rowCount ?? "—")} baris · {t.columns.length} kolom
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Btn small onClick={() => onOpen(t.name, "browse")}>
                    Browse
                  </Btn>
                  <Btn small onClick={() => onOpen(t.name, "structure")}>
                    Structure
                  </Btn>
                </div>
              </li>
            ))}
          </ul>

          {/* Desktop: tabel */}
          <div className="hidden overflow-x-auto rounded-xl border border-violet-100 dark:border-white/10 md:block">
            <table className="w-full">
              <thead className="bg-violet-50/70 dark:bg-white/5">
                <tr>
                  <th className={th}>Nama</th>
                  <th className={th}>Tipe</th>
                  <th className={th}>Baris</th>
                  <th className={th}>Kolom</th>
                  <th className={th} />
                </tr>
              </thead>
              <tbody className="divide-y divide-violet-50 dark:divide-white/5">
                {schema.tables.map((t) => (
                  <tr key={t.name} className="transition-colors hover:bg-violet-50/50 dark:hover:bg-white/5">
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
        </>
      )}
      {schema.triggers.length > 0 && <p className={subtle}>Trigger: {schema.triggers.map((t) => t.name).join(", ")}</p>}
    </div>
  );
}
