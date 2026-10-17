"use client";

import { RefreshCw } from "@/components/ui/icons";
import { useAdminData } from "./api";
import { Btn, Card, Empty, ErrorBox, Loading, PageHead, Pager, fmtDateTime, usePager } from "./ui";

interface Entry {
  at: number;
  by: string;
  action: string;
  detail: string;
}

export function AuditTab() {
  const { data, error, loading, reload } = useAdminData<{ entries: Entry[] }>("/api/admin/audit");
  const pager = usePager(data?.entries ?? [], 25);
  return (
    <div className="space-y-5">
      <PageHead
        title="Log aktivitas admin"
        desc="Catatan 100 tindakan admin terakhir: takedown, blokir, perubahan pengaturan."
        right={
          <Btn onClick={() => void reload()} busy={loading}>
            <RefreshCw size={13} /> Segarkan
          </Btn>
        }
      />
      <Card>
        {error ? (
          <ErrorBox message={error} onRetry={reload} />
        ) : !data ? (
          <Loading />
        ) : data.entries.length === 0 ? (
          <Empty>Belum ada aktivitas tercatat.</Empty>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="text-[12px] uppercase tracking-wide text-text-muted">
                    <th className="px-6 py-3 font-medium">Waktu</th>
                    <th className="px-4 py-3 font-medium">Admin</th>
                    <th className="px-4 py-3 font-medium">Aksi</th>
                    <th className="px-6 py-3 font-medium">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {pager.slice.map((e, i) => (
                    <tr key={`${e.at}-${i}`} className="surface-solid-row border-t border-[var(--surface-line)]">
                      <td className="whitespace-nowrap px-6 py-2.5 text-text-muted">{fmtDateTime(e.at)}</td>
                      <td className="px-4 py-2.5 text-text-muted">{e.by}</td>
                      <td className="mono px-4 py-2.5 text-[12px]">{e.action}</td>
                      <td className="break-words px-6 py-2.5">{e.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="md:hidden">
              {pager.slice.map((e, i) => (
                <li key={`${e.at}-${i}`} className="border-b border-[var(--surface-line)] px-5 py-3.5 last:border-0">
                  <div className="flex items-center justify-between gap-2 text-[12px] text-text-muted">
                    <span className="mono text-text">{e.action}</span>
                    <span>{fmtDateTime(e.at)}</span>
                  </div>
                  <p className="mt-1 break-words text-[13px]">{e.detail}</p>
                  <p className="mt-0.5 text-[12px] text-text-muted">{e.by}</p>
                </li>
              ))}
            </ul>
            <Pager pager={pager} />
          </>
        )}
      </Card>
    </div>
  );
}
