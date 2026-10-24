"use client";
import { useState } from "react";
import type { Cell } from "./types";
import { Btn, Notice, api, renderCell, td, th } from "./ui";

type R = { sql: string; columns: string[]; rows: Cell[][]; affected: number; lastInsertRowid: string | null; truncated: boolean; error?: string };

export default function SqlTab({ id, onChanged }: { id: string; onChanged: () => void }) {
  const [sql, setSql] = useState("SELECT name, type FROM sqlite_master WHERE name NOT LIKE 'sqlite_%';");
  const [res, setRes] = useState<{ results: R[]; ms: number } | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    setErr("");
    try {
      const r = await api<{ results: R[]; ms: number }>(`/api/databases/${id}/sql`, { method: "POST", json: { sql } });
      setRes(r);
      if (r.results.some((x) => x.columns.length === 0)) onChanged();
    } catch (e) {
      setRes(null);
      setErr((e as Error).message);
    }
    setBusy(false);
  }

  return (
    <div className="space-y-3">
      <label htmlFor="sql-editor" className="sr-only">
        Editor SQL
      </label>
      <textarea
        id="sql-editor"
        value={sql}
        onChange={(e) => setSql(e.target.value)}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
            e.preventDefault();
            run();
          }
        }}
        spellCheck={false}
        rows={8}
        className="w-full rounded-md border border-slate-300 bg-white p-3 font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
      />
      <div className="flex items-center gap-3">
        <Btn variant="primary" onClick={run} disabled={busy || !sql.trim()}>
          {busy ? "Menjalankan…" : "Jalankan (Ctrl+Enter)"}
        </Btn>
        <span className="text-xs text-slate-500">ATTACH, VACUUM, dan PRAGMA berbahaya diblokir. Maks 1.000 baris per hasil.</span>
      </div>
      {err && <Notice kind="error">{err}</Notice>}
      {res && (
        <div className="space-y-4">
          <p className="text-xs text-slate-500">Selesai dalam {res.ms} ms</p>
          {res.results.map((r, i) => (
            <div key={i} className="space-y-1">
              <code className="block truncate text-xs text-slate-500">{r.sql}</code>
              {r.error ? (
                <Notice kind="error">{r.error}</Notice>
              ) : r.columns.length ? (
                <>
                  <div className="overflow-x-auto rounded-md border border-slate-200 dark:border-slate-800">
                    <table className="w-full">
                      <thead className="bg-slate-50 dark:bg-slate-950">
                        <tr>
                          {r.columns.map((c, j) => (
                            <th key={j} className={th}>
                              {c}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {r.rows.map((row, k) => (
                          <tr key={k}>
                            {row.map((c, j) => (
                              <td key={j} className={`${td} max-w-xs`}>
                                {renderCell(c)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-slate-500">
                    {r.rows.length} baris{r.truncated ? " (dipotong, tambahkan LIMIT)" : ""}
                  </p>
                </>
              ) : (
                <Notice kind="ok">Berhasil. {r.affected} baris terpengaruh.{r.lastInsertRowid ? ` Last insert rowid: ${r.lastInsertRowid}.` : ""}</Notice>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
