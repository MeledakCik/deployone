"use client";

import * as React from "react";
import AdminPanel from "@/components/db/AdminPanel";
import DatabaseList from "@/components/db/DatabaseList";
import DbInfoCards from "@/components/db/DbInfoCards";
import type { PublicDb } from "@/components/db/types";
import { Btn, Notice, UsageBar, api, heading, linkBtn, surface } from "@/components/db/ui";

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
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Btn onClick={onBack} aria-label="Kembali ke semua database" className="shrink-0">
            <span aria-hidden>←</span>
            <span className="hidden sm:inline">Semua database</span>
          </Btn>
          <h1 className="truncate text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-2xl">{d?.database.displayName ?? "Database"}</h1>
        </div>
        <a href={`/db/${id}`} target="_blank" rel="noopener noreferrer" className={`${linkBtn} w-full sm:w-auto`}>
          Open in new tab ↗
        </a>
      </div>
      {err && <Notice kind="error">{err}</Notice>}
      {d && (
        <>
          <div className={`${surface} p-4 sm:p-5`}>
            <p className={`${heading} mb-2`}>Kuota akun (semua database)</p>
            <UsageBar used={d.userUsedBytes} quota={d.quotaBytes} />
          </div>
          {d.access === "owner" && <DbInfoCards id={id} username={d.database.username} />}
          <AdminPanel id={id} />
        </>
      )}
      {!d && !err && (
        <div className="space-y-3" aria-busy="true">
          <div className="h-24 animate-pulse rounded-2xl bg-violet-100/70 dark:bg-white/10" />
          <div className="h-56 animate-pulse rounded-2xl bg-violet-100/70 dark:bg-white/10" />
        </div>
      )}
    </div>
  );
}
