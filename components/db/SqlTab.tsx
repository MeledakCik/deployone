"use client";
import { useState } from "react";
import type { Cell } from "./types";
import { Btn, Notice, api, renderCell, subtle, td, th } from "./ui";

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
        rows={7}
        className="w-full rounded-xl border border-violet-100 bg-[#1e1150] p-3.5 font-mono text-[13px] leading-relaxed text-violet-50 caret-lime-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 dark:border-white/10 dark:bg-[#150c3a]"
      />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <Btn variant="primary" onClick={run} disabled={busy || !sql.trim()}>
          {busy ? "Menjalankan…" : "Jalankan (Ctrl+Enter)"}
        </Btn>
        <span className={subtle}>ATTACH, VACUUM, dan PRAGMA berbahaya diblokir. Maks 1.000 baris per hasil.</span>
      </div>
      {err && <Notice kind="error">{err}</Notice>}
      {res && (
        <div className="space-y-4">
          <p className={subtle}>Selesai dalam {res.ms} ms</p>
          {res.results.map((r, i) => (
            <div key={i} className="space-y-1">
              <code className="block truncate font-mono text-xs text-slate-500 dark:text-slate-400">{r.sql}</code>
              {r.error ? (
                <Notice kind="error">{r.error}</Notice>
              ) : r.columns.length ? (
                <>
                  <div className="max-h-[60vh] overflow-auto rounded-xl border border-violet-100 dark:border-white/10">
                    <table className="w-full">
                      <thead className="bg-violet-50/70 dark:bg-white/5">
                        <tr>
                          {r.columns.map((c, j) => (
                            <th key={j} className={th}>
                              {c}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-violet-50 dark:divide-white/5">
                        {r.rows.map((row, k) => (
                          <tr key={k}>
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
                  <p className={subtle}>
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
