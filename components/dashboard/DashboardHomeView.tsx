"use client";

import * as React from "react";
import { Boxes, CheckCircle2, XCircle, Plus, Rocket, UploadCloud, AlertTriangle } from "@/components/ui/icons";
import { useDeploy } from "@/lib/deploy-context";
import { useAuth } from "@/lib/auth-context";
import { ViewFade } from "@/components/ui/ViewFade";
import { Btn, Card, Empty, KpiCard, PageHead, Skeleton } from "@/components/ui/primitives";
import { HistoryTable, HistoryTableSkeleton, type HistoryFilter } from "./HistoryTable";

export function DashboardHomeView() {
  const { stats, history, historyReady, setView, redeploy } = useDeploy();
  const { user } = useAuth();
  const [filter, setFilter] = React.useState<HistoryFilter>("all");
  const tableRef = React.useRef<HTMLDivElement>(null);

  const firstName = user?.name?.trim().split(/\s+/)[0] ?? "Developer";
  const latest = history[0];
  const latestFailed = latest?.status === "failed" ? latest : null;

  const pick = React.useCallback((f: HistoryFilter) => {
    setFilter(f);
    tableRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  }, []);

  const deployButton = (
    <button type="button" onClick={() => setView("deploy")} className="btn-lime inline-flex items-center gap-2 px-5 py-2.5 text-[13.5px]">
      <Plus size={16} /> Deploy baru
    </button>
  );

  // Memuat: kerangka yang meniru bentuk akhir, bukan angka 0 yang menyesatkan.
  if (!historyReady) {
    return (
      <ViewFade>
        <div className="space-y-5">
          <PageHead title={`Halo, ${firstName}`} desc="Memuat riwayat deploy kamu…" />
          <div className="grid gap-4 sm:grid-cols-3" aria-hidden>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-[148px] !rounded-[26px]" />
            ))}
          </div>
          <HistoryTableSkeleton />
        </div>
      </ViewFade>
    );
  }

  // Belum pernah deploy: ajak langsung bertindak, tanpa deretan angka nol.
  if (history.length === 0) {
    return (
      <ViewFade>
        <div className="space-y-5">
          <PageHead title={`Halo, ${firstName}`} desc="Mulai dari satu project. Riwayat dan statusnya akan muncul di sini." />
          <Card>
            <Empty
              icon={Rocket}
              title="Belum ada deploy"
              action={
                <>
                  <button type="button" onClick={() => setView("deploy")} className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-[13.5px]">
                    <Rocket size={16} /> Deploy project
                  </button>
                  <Btn onClick={() => setView("upload")}>
                    <UploadCloud size={14} /> Upload zip
                  </Btn>
                </>
              }
            >
              Deploy repo GitHub ke Vercel, Cloudflare, atau Railway. Atau upload zip project dan Depup yang mengurus sisanya.
            </Empty>
          </Card>
        </div>
      </ViewFade>
    );
  }

  const readyPct = stats.total ? Math.round((stats.ready / stats.total) * 100) : 0;

  return (
    <ViewFade>
      <div className="space-y-5">
        <PageHead title={`Halo, ${firstName}`} desc={`Ringkasan ${stats.total} deploy terakhir kamu. Depup menyimpan maksimal 10 riwayat.`} right={deployButton} />

        {/* Yang butuh tindakan didahulukan. Tidak ada banner bila semuanya sehat. */}
        {stats.failed > 0 && (
          <div className="notice notice-bad flex-wrap items-center !rounded-[28px] !p-5" role="alert">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[var(--tone-chip)]">
              <AlertTriangle size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[16px] font-bold tracking-tight">
                {latestFailed ? `Deploy terakhir gagal: ${latestFailed.name}` : `${stats.failed} deploy gagal di riwayat`}
              </p>
              <p className="mt-0.5 text-[13px]">
                {latestFailed ? "Coba deploy ulang, atau periksa log di Projects bila gagal lagi." : "Lihat daftarnya, lalu coba deploy ulang yang masih dibutuhkan."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {latestFailed && (
                <Btn variant="primary" onClick={() => redeploy(latestFailed.name)}>
                  Coba lagi
                </Btn>
              )}
              <Btn onClick={() => pick("failed")}>Lihat yang gagal</Btn>
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <KpiCard icon={Boxes} label="Deploy terakhir" value={stats.total} sub="Maksimal 10 riwayat disimpan" onClick={() => pick("all")} selected={filter === "all"} />
          <KpiCard icon={CheckCircle2} label="Berhasil" value={stats.ready} sub={`${readyPct}% dari riwayat`} onClick={() => pick("ready")} selected={filter === "ready"} />
          <KpiCard
            icon={XCircle}
            label="Gagal"
            value={stats.failed}
            sub={stats.failed > 0 ? "Perlu diperiksa" : "Tidak ada yang gagal"}
            tone={stats.failed > 0 ? "bad" : "neutral"}
            onClick={() => pick("failed")}
            selected={filter === "failed"}
          />
        </div>

        <div ref={tableRef} className="scroll-mt-4">
          <HistoryTable filter={filter} onFilterChange={setFilter} />
        </div>
      </div>
    </ViewFade>
  );
}
