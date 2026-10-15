"use client";

import { RefreshCw } from "lucide-react";
import { useAdminData } from "./api";
import { Btn, Card, Empty, ErrorBox, Loading, PageHead, fmtDateTime } from "./ui";

interface Entry {
  at: number;
  by: string;
  action: string;
  detail: string;
}

export function AuditTab() {
  const { data, error, loading, reload } = useAdminData<{ entries: Entry[] }>("/api/admin/audit");
  return (
    <div>
      <PageHead
        title="Log aktivitas admin"
        desc="Catatan 100 tindakan admin terakhir: takedown, blokir, perubahan pengaturan."
        right={
          <Btn onClick={() => void reload()} busy={loading}>
            <RefreshCw size={13} /> Muat ulang
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
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-text-faint">
                  <th className="px-5 py-3 font-medium">Waktu</th>
                  <th className="px-3 py-3 font-medium">Admin</th>
                  <th className="px-3 py-3 font-medium">Aksi</th>
                  <th className="px-5 py-3 font-medium">Detail</th>
                </tr>
              </thead>
              <tbody>
                {data.entries.map((e, i) => (
                  <tr key={i} className="border-t border-[var(--surface-line)]">
                    <td className="whitespace-nowrap px-5 py-2.5 text-text-muted">{fmtDateTime(e.at)}</td>
                    <td className="px-3 py-2.5 text-text-muted">{e.by}</td>
                    <td className="mono px-3 py-2.5 text-[12px]">{e.action}</td>
                    <td className="break-words px-5 py-2.5">{e.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
