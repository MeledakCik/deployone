"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import AdminPanel from "../../../../components/db/AdminPanel";
import DbInfoCards from "../../../../components/db/DbInfoCards";
import type { PublicDb } from "../../../../components/db/types";
import { Notice, UsageBar, api } from "../../../../components/db/ui";

type Detail = { database: PublicDb; access: "owner" | "dbsession"; usageBytes: number | null; userUsedBytes: number; quotaBytes: number };

export default function DatabaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [d, setD] = useState<Detail | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    api<Detail>(`/api/databases/${id}`)
      .then(setD)
      .catch((e) => setErr((e as Error).message));
  }, [id]);

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/dashboard/databases" className="text-sm text-indigo-600 hover:underline dark:text-indigo-400">
            ← Semua database
          </Link>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{d?.database.displayName ?? "Database"}</h1>
        </div>
        <a href={`/db/${id}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800">
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
