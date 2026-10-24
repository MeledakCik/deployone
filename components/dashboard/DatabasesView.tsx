"use client";

import * as React from "react";
import AdminPanel from "@/components/db/AdminPanel";
import DatabaseList from "@/components/db/DatabaseList";
import DbInfoCards from "@/components/db/DbInfoCards";
import type { PublicDb } from "@/components/db/types";
import { Btn, Notice, UsageBar, api } from "@/components/db/ui";

type Detail = { database: PublicDb; access: "owner" | "dbsession"; usageBytes: number | null; userUsedBytes: number; quotaBytes: number };

/** Simpan id database yang sedang dibuka di URL (?db=) supaya refresh / tombol Back tidak kehilangan posisi. */
function syncUrl(id: string | null) {
  const url = new URL(window.location.href);
  if (id) url.searchParams.set("db", id);
  else url.searchParams.delete("db");
  window.history.replaceState(null, "", url.toString());
}

/** Menu "Database" di dashboard: daftar database, lalu detail + panel admin di dalam layout dashboard. */
export function DatabasesView() {
  const [openId, setOpenId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("db");
    if (id && /^[a-z0-9]{16}$/.test(id)) setOpenId(id);
  }, []);

  const open = (id: string | null) => {
    setOpenId(id);
    syncUrl(id);
  };

  return openId ? <DatabaseDetail id={openId} onBack={() => open(null)} /> : <DatabaseList onOpen={open} />;
}

function DatabaseDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const [d, setD] = React.useState<Detail | null>(null);
  const [err, setErr] = React.useState("");

  React.useEffect(() => {
    setD(null);
    setErr("");
    api<Detail>(`/api/databases/${id}`)
      .then(setD)
      .catch((e) => setErr((e as Error).message));
  }, [id]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Btn onClick={onBack}>← Semua database</Btn>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{d?.database.displayName ?? "Database"}</h1>
        </div>
        <a
          href={`/db/${id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
        >
          Open in new tab
        </a>
      </div>
      {err && <Notice kind="error">{err}</Notice>}
      {d && (
        <>
          <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <p className="mb-2 text-sm font-medium text-slate-800 dark:text-slate-100">Kuota akun (semua database)</p>
            <UsageBar used={d.userUsedBytes} quota={d.quotaBytes} />
          </div>
          {d.access === "owner" && <DbInfoCards id={id} username={d.database.username} />}
          <AdminPanel id={id} />
        </>
      )}
    </div>
  );
}
