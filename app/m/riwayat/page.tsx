"use client";

import * as React from "react";
import { Inbox } from "lucide-react";
import { useUserData } from "@/lib/m-data";
import { HistoryCard } from "@/components/m/HistoryCard";
import { Chip, EmptyState, SkeletonList } from "@/components/m/ui";

type Filter = "all" | "ready" | "failed" | "deleted";

export default function MobileHistory() {
  const { history, loading } = useUserData();
  const [filter, setFilter] = React.useState<Filter>("all");
  const n = (s: string) => history.filter((h) => h.status === s).length;
  const rows = history.filter((h) => filter === "all" || h.status === filter).slice(0, 100);

  return (
    <div className="space-y-4 pt-2">
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Chip active={filter === "all"} onClick={() => setFilter("all")}>Semua ({history.length})</Chip>
        <Chip active={filter === "ready"} onClick={() => setFilter("ready")}>Berhasil ({n("ready")})</Chip>
        <Chip active={filter === "failed"} onClick={() => setFilter("failed")}>Gagal ({n("failed")})</Chip>
        <Chip active={filter === "deleted"} onClick={() => setFilter("deleted")}>Dihapus ({n("deleted")})</Chip>
      </div>
      {loading ? (
        <SkeletonList n={4} />
      ) : rows.length === 0 ? (
        <EmptyState icon={<Inbox className="h-6 w-6" />} title="Belum ada riwayat" hint="Setiap deploy akan tercatat di sini sebagai bukti." cta={{ href: "/m/deploy", label: "Deploy sekarang" }} />
      ) : (
        <ul className="space-y-3">
          {rows.map((h) => (
            <HistoryCard key={h.id} item={h} />
          ))}
        </ul>
      )}
    </div>
  );
}
