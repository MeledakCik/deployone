"use client";

import { useUserData } from "@/lib/m-data";

const COLOR: Record<string, string> = {
  ready: "text-green-600",
  failed: "text-red-600",
  building: "text-amber-600",
  deleted: "opacity-50",
};

export default function MobileHistory() {
  const { history, loading } = useUserData();
  if (loading) return <p className="text-sm opacity-60">Memuat…</p>;
  if (history.length === 0) return <p className="text-sm opacity-60">Belum ada riwayat deploy.</p>;

  return (
    <ul className="divide-y divide-black/10 dark:divide-white/10">
      {history.slice(0, 50).map((h) => (
        <li key={h.id} className="flex items-center justify-between py-3">
          <div>
            <div className="font-medium">{h.name}</div>
            <div className="text-xs opacity-60">
              {h.platform} · {h.date}
            </div>
          </div>
          <span className={`text-sm ${COLOR[h.status] ?? ""}`}>{h.status}</span>
        </li>
      ))}
    </ul>
  );
}
