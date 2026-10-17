"use client";

import * as React from "react";
import { RefreshCw, Users, Rocket, Link2, ShieldAlert, XCircle } from "@/components/ui/icons";
import { adminFetch } from "./api";
import { BarList, SERIES_COLORS, TimeChart, type Series } from "./charts";
import { useAdminCounts } from "./context";
import { Btn, Card, ErrorBox, KpiCard, Loading, PageHead, UsageCard, fmtBytes, fmtDateTime } from "./ui";

interface Stats {
  generatedAt: number;
  totals: {
    users: number;
    deploys: number;
    activeSites: number;
    activeTunnels: number;
    linkBytes: number;
    blocked: number;
    abuseOpen: number;
    abuseTotal: number;
    redisKeys: number | null;
    redisBytes?: number | null;
    supabaseBytes?: number | null;
    limits?: { redisMb: number; supabaseMb: number };
  };
  days: string[];
  daily: Record<"signups" | "logins" | "abuse" | "sites" | "tunnels" | "takedowns", number[]>;
  deploysPerDay: Record<string, number[]>;
  deployPlatforms: Record<string, number>;
  deployStatuses: Record<string, number>;
  usersTruncated: boolean;
}

const PLATFORM_LABEL: Record<string, string> = { vercel: "Vercel", cloudflare: "Cloudflare", railway: "Railway", render: "Render" };
const STATUS_LABEL: Record<string, string> = { ready: "Berhasil", failed: "Gagal", building: "Sedang build", deleted: "Project dihapus" };
const OTHER_COLOR = "#64748b";

export function OverviewTab({ goto }: { goto: (tab: string) => void }) {
  const { setAbuseOpen } = useAdminCounts();
  const [stats, setStats] = React.useState<Stats | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(true);

  const load = React.useCallback(async (refresh: boolean) => {
    setBusy(true);
    try {
      setStats(await adminFetch<Stats>(`/api/admin/stats${refresh ? "?refresh=1" : ""}`));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat statistik.");
    } finally {
      setBusy(false);
    }
  }, []);

  React.useEffect(() => {
    void load(false);
  }, [load]);

  React.useEffect(() => {
    if (stats) setAbuseOpen(stats.totals.abuseOpen);
  }, [stats, setAbuseOpen]);

  const platformSeries = React.useMemo<Series[]>(() => {
    if (!stats) return [];
    const names = Object.keys(stats.deploysPerDay).sort((a, b) => (stats.deployPlatforms[b] ?? 0) - (stats.deployPlatforms[a] ?? 0));
    const top = names.slice(0, 3);
    const rest = names.slice(3);
    const out: Series[] = top.map((p, i) => ({ name: PLATFORM_LABEL[p] ?? p, values: stats.deploysPerDay[p], color: SERIES_COLORS[i] }));
    if (rest.length) {
      out.push({ name: "Lainnya", color: OTHER_COLOR, values: stats.days.map((_, i) => rest.reduce((s, p) => s + (stats.deploysPerDay[p][i] ?? 0), 0)) });
    }
    return out.length ? out : [{ name: "Deploy", values: stats.days.map(() => 0), color: SERIES_COLORS[0] }];
  }, [stats]);

  if (!stats)
    return <Card>{error ? <ErrorBox message={error} onRetry={() => void load(true)} /> : <Loading label="Menghitung statistik…" />}</Card>;
  const t = stats.totals;

  return (
    <div className="space-y-5">
      <PageHead
        title="Ringkasan"
        desc={`Data per ${fmtDateTime(stats.generatedAt)} · diperbarui otomatis tiap 5 menit.`}
        right={
          <Btn onClick={() => void load(true)} busy={busy}>
            <RefreshCw size={13} /> Segarkan
          </Btn>
        }
      />
      {error && (
        <Card>
          <ErrorBox message={error} />
        </Card>
      )}

      {/* Yang butuh tindakan didahulukan: warna hanya muncul di sini saat ada sesuatu yang harus dikerjakan */}
      {t.abuseOpen > 0 && (
        <div className="notice notice-bad flex-wrap items-center !rounded-[28px] !p-5 sm:!p-6" role="alert">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[var(--tone-chip)]">
            <ShieldAlert size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-[18px] font-bold tracking-tight">
              <span className="live-dot live-dot-pulse" aria-hidden />
              {t.abuseOpen} laporan abuse menunggu ditinjau
            </p>
            <p className="mt-0.5 text-[13px]">
              Laporan phishing/penipuan/malware dari halaman /laporkan. Periksa dulu, lalu takedown atau abaikan.
            </p>
          </div>
          <button type="button" onClick={() => goto("abuse")} className="btn-primary press inline-flex items-center gap-2 px-5 py-2.5 text-[13px]">
            Tinjau laporan
          </button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={Users} label="Pengguna" value={t.users} sub={stats.usersTruncated ? "dihitung maks. 1.500 akun" : "akun dengan data dashboard"} onClick={() => goto("users")} />
        <KpiCard icon={Rocket} label="Total deploy tercatat" value={t.deploys} sub="dari riwayat dashboard pengguna" />
        <KpiCard icon={Link2} label="Link aktif" value={t.activeSites + t.activeTunnels} sub={`${t.activeSites} Link Instan · ${t.activeTunnels} Link Gaib`} onClick={() => goto("links")} />
        <KpiCard icon={XCircle} label="Akun diblokir" value={t.blocked} sub={t.blocked > 0 ? "Kelola di tab Pengguna" : "Tidak ada"} tone={t.blocked > 0 ? "bad" : "neutral"} onClick={() => goto("users")} />
      </div>

      <Card title="Infrastruktur">
        <dl className="grid divide-[var(--surface-line)] sm:grid-cols-2 sm:divide-x max-sm:divide-y">
          <InfraStat label="Data link di Redis" value={fmtBytes(t.linkBytes)} sub="situs statis + trafik tunnel" />
          <InfraStat label="Jumlah key Redis" value={t.redisKeys === null ? "—" : t.redisKeys.toLocaleString("id-ID")} sub="termasuk potongan file situs" />
        </dl>
        <div className="grid divide-[var(--surface-line)] border-t border-[var(--surface-line)] sm:grid-cols-2 sm:divide-x max-sm:divide-y">
          <UsageCard
            label="Database Supabase"
            used={t.supabaseBytes ?? null}
            limitBytes={(t.limits?.supabaseMb ?? 500) * 1024 * 1024}
            note={t.supabaseBytes == null ? "Belum terbaca — jalankan ulang supabase/schema.sql di SQL Editor." : "Ukuran total database. Batas paket Free ±500 MB."}
          />
          <UsageCard
            label="Memori Redis"
            used={t.redisBytes ?? null}
            limitBytes={(t.limits?.redisMb ?? 256) * 1024 * 1024}
            note={t.redisBytes == null ? "Tidak terbaca dari penyedia Redis. Periksa di console Upstash/Vercel Storage." : "Kuota jumlah perintah/bulan tidak bisa dibaca dari sini — lihat console Redis."}
          />
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="cv-auto lg:col-span-2" title="Login & pendaftar baru · 30 hari">
          <div className="p-5">
            <TimeChart
              height={240}
              kind="line"
              label="Grafik garis login dan pendaftar baru per hari selama 30 hari"
              days={stats.days}
              series={[
                { name: "Login", values: stats.daily.logins, color: SERIES_COLORS[0] },
                { name: "Pendaftar baru", values: stats.daily.signups, color: SERIES_COLORS[1] },
              ]}
            />
          </div>
        </Card>
        <Card className="cv-auto" title="Deploy per hari · 30 hari">
          <div className="p-5">
            <TimeChart kind="bar" label="Grafik batang jumlah deploy per hari menurut platform" days={stats.days} series={platformSeries} />
          </div>
        </Card>
        <Card className="cv-auto" title="Link dibuat per hari · 30 hari">
          <div className="p-5">
            <TimeChart
              kind="bar"
              label="Grafik batang Link Instan dan Link Gaib yang dibuat per hari"
              days={stats.days}
              series={[
                { name: "Link Instan", values: stats.daily.sites, color: SERIES_COLORS[0] },
                { name: "Link Gaib", values: stats.daily.tunnels, color: SERIES_COLORS[1] },
              ]}
            />
          </div>
        </Card>
        <Card className="cv-auto" title="Laporan abuse & takedown · 30 hari">
          <div className="p-5">
            <TimeChart
              kind="line"
              label="Grafik garis laporan abuse dan takedown per hari"
              days={stats.days}
              series={[
                { name: "Laporan abuse", values: stats.daily.abuse, color: SERIES_COLORS[2] },
                { name: "Takedown", values: stats.daily.takedowns, color: SERIES_COLORS[0] },
              ]}
            />
          </div>
        </Card>
        <Card className="cv-auto" title="Deploy menurut platform">
          <div className="p-6">
            <BarList items={Object.entries(stats.deployPlatforms).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ label: PLATFORM_LABEL[k] ?? k, value: v }))} />
          </div>
        </Card>
        <Card className="cv-auto" title="Deploy menurut status">
          <div className="p-6">
            <BarList
              items={Object.entries(stats.deployStatuses)
                .sort((a, b) => b[1] - a[1])
                .map(([k, v]) => ({ label: STATUS_LABEL[k] ?? k, value: v, color: k === "failed" ? "var(--bad-dot)" : k === "ready" ? "var(--ok-dot)" : "var(--text-faint)" }))}
            />
          </div>
        </Card>
      </div>

      <p className="text-[12px] text-text-muted">
        Catatan: grafik login, pendaftar, link, dan abuse dihitung sejak panel admin ini aktif. Grafik deploy dibaca dari riwayat yang disimpan dashboard tiap pengguna, jadi sudah memuat data lama.
      </p>
    </div>
  );
}

function InfraStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="px-6 py-4">
      <dt className="text-[12.5px] text-text-muted">{label}</dt>
      <dd className="mt-1 text-[22px] font-bold tracking-tight tabular-nums">{value}</dd>
      {sub && <p className="text-[12px] text-text-muted">{sub}</p>}
    </div>
  );
}
