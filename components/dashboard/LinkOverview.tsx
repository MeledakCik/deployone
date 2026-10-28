"use client";

import * as React from "react";
import { Copy, ExternalLink, Trash2, Clock, FileText, Globe2, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SiteInfo, SiteStats } from "@/lib/site-upload";

/**
 * Tampilan "Link Instan" ala halaman Overview project di Vercel: pratinjau situs + detail link,
 * lalu kartu statistik (permintaan, tampilan halaman, error, bandwidth) dengan sparkline.
 */

const nf = new Intl.NumberFormat("id-ID");
const HOUR_MS = 3600_000;

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function ago(ts: number, now: number): string {
  const m = Math.floor((now - ts) / 60000);
  if (m < 1) return "baru saja";
  if (m < 60) return `${m} menit lalu`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h} jam lalu`;
  return `${Math.floor(h / 24)} hari lalu`;
}

function remaining(expiresAt: number, now: number): string {
  const ms = expiresAt - now;
  if (ms <= 0) return "kedaluwarsa";
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${Math.max(m, 1)} menit lagi`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h} jam lagi`;
  return `${Math.floor(h / 24)} hari lagi`;
}

const shortUrl = (u: string) => u.replace(/^https?:\/\//, "").replace(/\/$/, "");

/* ---------- pratinjau ---------- */

const PREVIEW_W = 1280;
const PREVIEW_H = 800;

/** Iframe situs yang diperkecil. `depup-preview=1` membuat kunjungan ini tidak masuk statistik. */
function SitePreview({ url, title }: { url: string; title: string }) {
  const boxRef = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = React.useState(0.3);
  const [loaded, setLoaded] = React.useState(false);

  React.useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / PREVIEW_W);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const src = url + (url.includes("?") ? "&" : "?") + "depup-preview=1";

  return (
    <div
      ref={boxRef}
      className="relative w-full overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--pill-bg)]"
      style={{ aspectRatio: `${PREVIEW_W} / ${PREVIEW_H}` }}
    >
      {!loaded && <div className="absolute inset-0 animate-pulse bg-[var(--row-hover)]" aria-hidden />}
      <iframe
        src={src}
        title={`Pratinjau ${title}`}
        loading="lazy"
        tabIndex={-1}
        aria-hidden
        sandbox="allow-scripts allow-same-origin"
        onLoad={() => setLoaded(true)}
        className={cn("pointer-events-none absolute left-0 top-0 border-0 bg-white transition-opacity duration-300", loaded ? "opacity-100" : "opacity-0")}
        style={{ width: PREVIEW_W, height: PREVIEW_H, transform: `scale(${scale})`, transformOrigin: "0 0" }}
      />
    </div>
  );
}

/* ---------- sparkline ---------- */

function Sparkline({ values, className }: { values: number[]; className?: string }) {
  const W = 200;
  const H = 44;
  const pts = values.length >= 2 ? values : [0, ...values, 0];
  const max = Math.max(1, ...pts);
  const step = W / (pts.length - 1);
  const y = (v: number) => H - 3 - (v / max) * (H - 8);
  const line = pts.map((v, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${line} L${W},${H} L0,${H} Z`;
  const empty = max <= 1 && pts.every((v) => v === 0);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className={cn("h-11 w-full", className)} aria-hidden>
      {!empty && <path d={area} fill="currentColor" opacity={0.12} />}
      <path
        d={line}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        opacity={empty ? 0.3 : 1}
      />
    </svg>
  );
}

/* ---------- kartu statistik ---------- */

type Range = "24h" | "all";

function sum(a: number[]) {
  return a.reduce((n, v) => n + v, 0);
}

function Metric({
  label,
  value,
  values,
  tone = "text-violet-500",
}: {
  label: string;
  value: string;
  values: number[];
  tone?: string;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] items-center gap-4 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="text-[13px] text-text-muted">{label}</p>
        <p className="mt-0.5 text-[22px] font-semibold leading-tight tracking-tight tabular-nums">{value}</p>
      </div>
      <Sparkline values={values} className={tone} />
    </div>
  );
}

function TrafficCard({ stats, range, onRange }: { stats: SiteStats; range: Range; onRange: (r: Range) => void }) {
  const cut = (a: number[]) => (range === "24h" ? a.slice(-24) : a);
  const requests = cut(stats.series.requests);
  const views = cut(stats.series.views);
  const bytes = cut(stats.series.bytes);
  const errors = cut(stats.series.errors);
  const r = sum(requests);
  const e = sum(errors);
  const rate = r > 0 ? (e / r) * 100 : 0;
  const errSeries = requests.map((q, i) => (q > 0 ? ((errors[i] ?? 0) / q) * 100 : 0));

  return (
    <section className="surface-solid flex flex-col rounded-3xl p-5 sm:p-6" aria-labelledby="traffic-title">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 id="traffic-title" className="text-[15px] font-semibold">
          Lalu lintas
        </h3>
        <div role="radiogroup" aria-label="Rentang waktu" className="inline-flex rounded-full bg-[var(--pill-bg)] p-0.5 text-[12px]">
          {(
            [
              ["24h", "24 jam"],
              ["all", "Semua"],
            ] as const
          ).map(([v, label]) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={range === v}
              onClick={() => onRange(v)}
              className={cn(
                "rounded-full px-3 py-1 font-medium transition-colors",
                range === v ? "bg-[var(--surface-solid)] text-text shadow-sm" : "text-text-muted hover:text-text"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="divide-y divide-[var(--surface-line)]">
        <Metric label="Permintaan" value={nf.format(r)} values={requests} />
        <Metric label="Tampilan halaman" value={nf.format(sum(views))} values={views} />
        <Metric
          label="Bandwidth"
          value={formatBytes(sum(bytes))}
          values={bytes}
        />
        <Metric
          label="Tingkat error"
          value={`${rate.toFixed(rate > 0 && rate < 10 ? 1 : 0)}%`}
          values={errSeries}
          tone={rate > 5 ? "text-bad-fg" : "text-text-muted"}
        />
      </div>
    </section>
  );
}

function VisitorsCard({ stats }: { stats: SiteStats }) {
  const top = stats.topPages;
  const max = Math.max(1, ...top.map((t) => t.views));
  return (
    <section className="surface-solid flex flex-col rounded-3xl p-5 sm:p-6" aria-labelledby="visitors-title">
      <h3 id="visitors-title" className="mb-4 text-[15px] font-semibold">
        Pengunjung
      </h3>
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-tone-lilac text-text">
          <Users size={18} />
        </span>
        <div>
          <p className="text-[22px] font-semibold leading-tight tracking-tight tabular-nums">{nf.format(stats.visitors)}</p>
          <p className="text-[12px] text-text-muted">pengunjung unik (perkiraan)</p>
        </div>
      </div>

      <h4 className="mb-2 mt-6 text-[13px] font-medium text-text-muted">Halaman teratas</h4>
      {top.length === 0 ? (
        <p className="rounded-2xl bg-[var(--pill-bg)] px-4 py-6 text-center text-[12.5px] text-text-muted">
          Belum ada kunjungan. Bagikan linknya, lalu angkanya muncul di sini.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {top.map((t) => (
            <li key={t.path} className="text-[12.5px]">
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate font-mono">{t.path}</span>
                <span className="shrink-0 tabular-nums text-text-muted">{nf.format(t.views)}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--pill-bg)]">
                <div className="h-full rounded-full bg-violet-500" style={{ width: `${Math.max(4, (t.views / max) * 100)}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-auto pt-5 text-[11.5px] leading-relaxed text-text-faint">
        Dihitung saat permintaan sampai ke server. Cache CDN (maks 2 menit) dan kunjungan dari bot bisa membuat angkanya sedikit berbeda.
      </p>
    </section>
  );
}

/* ---------- detail link ---------- */

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[12px] text-text-muted">{label}</dt>
      <dd className="mt-1 text-[13.5px]">{children}</dd>
    </div>
  );
}

function SiteOverview({
  site,
  now,
  onCopy,
  onDelete,
}: {
  site: SiteInfo;
  now: number;
  onCopy: (url: string) => void;
  onDelete: (id: string) => void;
}) {
  const [range, setRange] = React.useState<Range>("24h");
  const left = site.expiresAt - now;
  const soon = left < HOUR_MS;
  const life = Math.max(1, site.expiresAt - site.createdAt);
  const used = Math.min(100, Math.max(0, ((now - site.createdAt) / life) * 100));
  const stats = site.stats;

  return (
    <div className="space-y-4 sm:space-y-5">
      <section className="surface-solid rounded-3xl" aria-labelledby="active-link-title">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--surface-line)] px-5 py-4 sm:px-6">
          <h3 id="active-link-title" className="text-[15px] font-semibold">
            Link aktif
          </h3>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => onCopy(site.url)} className="pill inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px]">
              <Copy size={13} /> Salin
            </button>
            <a
              href={site.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[12px]"
            >
              Buka <ExternalLink size={13} />
            </a>
            <button
              type="button"
              onClick={() => onDelete(site.id)}
              aria-label="Hapus link"
              className="pill inline-flex items-center px-2.5 py-1.5 text-bad-fg"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-8">
          <SitePreview url={site.url} title={site.name || shortUrl(site.url)} />

          <dl className="grid content-start gap-x-6 gap-y-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Detail label="Alamat">
                <a
                  href={site.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all font-medium underline-offset-4 hover:underline"
                >
                  {shortUrl(site.url)}
                </a>
              </Detail>
            </div>
            <Detail label="Status">
              <span className="inline-flex items-center gap-2 font-medium">
                <span className={cn("h-2 w-2 rounded-full", soon ? "bg-[var(--warn-dot)]" : "bg-[var(--ok-dot)]")} />
                {soon ? "Segera berakhir" : "Aktif"}
              </span>
            </Detail>
            <Detail label="Dibuat">{ago(site.createdAt, now)}</Detail>
            <Detail label="Isi">
              <span className="inline-flex flex-wrap items-center gap-x-2">
                <FileText size={13} className="text-text-muted" />
                {nf.format(site.fileCount)} file · {formatBytes(site.totalBytes)}
                {site.spa && <span className="rounded-full bg-[var(--pill-bg)] px-2 py-0.5 text-[11px] text-text-muted">Mode SPA</span>}
              </span>
            </Detail>
            <Detail label="Kedaluwarsa">
              <span className="inline-flex items-center gap-1.5">
                <Clock size={13} className="text-text-muted" />
                {remaining(site.expiresAt, now)}
              </span>
              <div
                className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--pill-bg)]"
                role="progressbar"
                aria-label="Masa aktif terpakai"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(used)}
              >
                <div className={cn("h-full rounded-full", soon ? "bg-[var(--warn-dot)]" : "bg-violet-500")} style={{ width: `${used}%` }} />
              </div>
            </Detail>
          </dl>
        </div>

        <p className="flex items-start gap-2 border-t border-[var(--surface-line)] px-5 py-3.5 text-[12.5px] text-text-muted sm:px-6">
          <Globe2 size={14} className="mt-0.5 shrink-0" />
          Link ini sementara. Untuk memperbarui isinya, upload ulang file di atas lalu hapus link lama.
        </p>
      </section>

      {stats && (
        <div className="grid items-stretch gap-4 sm:gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <TrafficCard stats={stats} range={range} onRange={setRange} />
          <VisitorsCard stats={stats} />
        </div>
      )}
    </div>
  );
}

/* ---------- daftar + pemilih link ---------- */

export function LinkOverview({
  sites,
  maxSites,
  now,
  onCopy,
  onDelete,
}: {
  sites: SiteInfo[];
  maxSites: number;
  now: number;
  onCopy: (url: string) => void;
  onDelete: (id: string) => void;
}) {
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const site = sites.find((s) => s.id === selectedId) ?? sites[0];

  return (
    <div className="mt-8">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h3 className="mr-1 text-[15px] font-semibold">
          Link aktif ({sites.length}/{maxSites})
        </h3>
        {sites.length > 1 && (
          <div role="tablist" aria-label="Pilih link" className="flex flex-wrap gap-2">
            {sites.map((s) => {
              const active = s.id === site.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setSelectedId(s.id)}
                  className={cn(
                    "max-w-[14rem] truncate rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition-colors",
                    active ? "bg-[var(--ink-fill)] text-[var(--ink-fill-text)]" : "pill"
                  )}
                >
                  {s.id}
                </button>
              );
            })}
          </div>
        )}
      </div>
      <SiteOverview key={site.id} site={site} now={now} onCopy={onCopy} onDelete={onDelete} />
    </div>
  );
}
