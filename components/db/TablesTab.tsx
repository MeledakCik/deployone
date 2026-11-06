"use client";
import { useT } from "@/lib/i18n";
import "@/lib/i18n/dict/app";
import type { Schema } from "./types";
import { Btn, heading, subtle, td, th } from "./ui";

export default function TablesTab({ schema, onOpen, onReload }: { schema: Schema; onOpen: (table: string, tab: "browse" | "structure") => void; onReload: () => void }) {
  const tr = useT();
  const empty = tr("Belum ada tabel. Buat lewat tab Structure atau jalankan CREATE TABLE di tab SQL.");
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className={heading}>{tr("{length} tabel/view", { length: schema.tables.length })}</h2>
        <Btn small onClick={onReload}>
          {tr("Refresh")}
        </Btn>
      </div>

      {schema.tables.length === 0 && <p className="rounded-[14px] bg-[var(--pill-bg)] px-4 py-8 text-center text-sm text-text-muted">{empty}</p>}

      {schema.tables.length > 0 && (
        <>
          {/* Mobile: kartu */}
          <ul className="space-y-2 md:hidden">
            {schema.tables.map((t) => (
              <li key={t.name} className="rounded-[14px] p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 break-all font-medium text-text">{t.name}</p>
                  <span className="shrink-0 rounded-full bg-[var(--pill-bg)] px-2 py-0.5 text-[12px] font-medium text-lav-text">{t.type}</span>
                </div>
                <p className={`${subtle} mt-0.5`}>
                  {String(t.rowCount ?? "—")}{" "}{tr("baris · {length} kolom", { length: t.columns.length })}
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Btn small onClick={() => onOpen(t.name, "browse")}>
                    {tr("Browse")}
                  </Btn>
                  <Btn small onClick={() => onOpen(t.name, "structure")}>
                    {tr("Structure")}
                  </Btn>
                </div>
              </li>
            ))}
          </ul>

          {/* Desktop: tabel */}
          <div className="hidden overflow-x-auto rounded-[14px] md:block">
            <table className="w-full">
              <thead className="bg-[var(--pill-bg)]">
                <tr>
                  <th className={th}>{tr("Nama")}</th>
                  <th className={th}>{tr("Tipe")}</th>
                  <th className={th}>{tr("Baris")}</th>
                  <th className={th}>{tr("Kolom")}</th>
                  <th className={th} />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {schema.tables.map((t) => (
                  <tr key={t.name} className="transition-colors hover:bg-[var(--card-hover)]">
                    <td className={`${td} font-medium`}>{t.name}</td>
                    <td className={td}>{t.type}</td>
                    <td className={td}>{String(t.rowCount ?? "—")}</td>
                    <td className={td}>{t.columns.length}</td>
                    <td className={`${td} text-right`}>
                      <div className="flex justify-end gap-1.5">
                        <Btn small onClick={() => onOpen(t.name, "browse")}>
                          {tr("Browse")}
                        </Btn>
                        <Btn small onClick={() => onOpen(t.name, "structure")}>
                          {tr("Structure")}
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
      {schema.triggers.length > 0 && <p className={subtle}>{tr("Trigger:")}{" "}{schema.triggers.map((t) => t.name).join(", ")}</p>}
    </div>
  );
}
