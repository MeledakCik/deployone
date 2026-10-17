"use client";

import * as React from "react";

/** Palet kategorikal tervalidasi (dark & light): violet brand #7b50ff, teal, magenta. Urutan tetap, tidak diputar. */
export const SERIES_COLORS = ["#7b50ff", "#0891b2", "#db2777"];

export interface Series {
  name: string;
  values: number[];
  color: string;
}

/** Animasi intro grafik hanya diputar sekali per sesi (bukan tiap pindah tab / filter). */
let introPlayed = false;
function useIntro(): boolean {
  const play = React.useRef(!introPlayed).current;
  React.useEffect(() => {
    introPlayed = true;
  }, []);
  return play;
}

const DEFAULT_H = 180;
const PAD = { l: 38, r: 8, t: 10, b: 24 };

function niceMax(v: number): number {
  if (v <= 4) return 4;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

function shortDay(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", timeZone: "UTC" });
}

/**
 * Grafik waktu: `bar` = batang bertumpuk, `line` = garis. Hover/fokus menampilkan crosshair + tooltip
 * semua seri pada hari itu. Legenda selalu ada untuk ≥ 2 seri; tabel ringkas tersedia untuk pembaca layar.
 */
export function TimeChart({ days, series, kind, label, height = DEFAULT_H }: { days: string[]; series: Series[]; kind: "bar" | "line"; label: string; height?: number }) {
  const H = height;
  const [w, setW] = React.useState(640);
  const [hover, setHover] = React.useState<number | null>(null);
  const intro = useIntro();
  const wrap = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    // Ukur sekali per frame & hanya set state bila lebar berubah (hindari re-render beruntun saat resize di Chrome)
    let raf = 0;
    const measure = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const next = Math.max(280, el.clientWidth);
        setW((cur) => (cur === next ? cur : next));
      });
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    setW(Math.max(280, el.clientWidth));
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  const n = days.length;
  const totals = days.map((_, i) => series.reduce((s, x) => s + (x.values[i] ?? 0), 0));
  const maxVal = niceMax(Math.max(0, ...(kind === "bar" ? totals : series.flatMap((s) => s.values))));
  const iw = w - PAD.l - PAD.r;
  const ih = H - PAD.t - PAD.b;
  const step = iw / n;
  const y = (v: number) => PAD.t + ih - (v / maxVal) * ih;
  const xc = (i: number) => PAD.l + step * i + step / 2;
  const ticks = [0, 0.5, 1].map((f) => Math.round(maxVal * f));
  const empty = totals.every((t) => t === 0) && series.every((s) => s.values.every((v) => v === 0));

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const i = Math.floor(((e.clientX - r.left - PAD.l) / iw) * n);
    setHover(i >= 0 && i < n ? i : null);
  }

  const tipLeft = hover === null ? 0 : Math.min(Math.max(xc(hover) - 80, 0), w - 168);

  return (
    <div>
      {series.length > 1 && (
        <ul className="mb-2 flex flex-wrap gap-x-4 gap-y-1 px-1 text-[12px] text-text-muted">
          {series.map((s) => (
            <li key={s.name} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} /> {s.name}
            </li>
          ))}
        </ul>
      )}
      <div ref={wrap} className="relative">
        <svg
          width={w}
          height={H}
          role="img"
          aria-label={label}
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
          className="block touch-pan-y"
          style={{ contain: "layout paint" }}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.l} x2={w - PAD.r} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth={1} />
              <text x={PAD.l - 6} y={y(t) + 3.5} textAnchor="end" fontSize={12} fill="var(--text-faint)">
                {t}
              </text>
            </g>
          ))}
          {[0, Math.floor((n - 1) / 2), n - 1].map((i) => (
            <text key={i} x={xc(i)} y={H - 6} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"} fontSize={12} fill="var(--text-faint)">
              {shortDay(days[i])}
            </text>
          ))}

          {kind === "bar" &&
            days.map((_, i) => {
              let acc = 0;
              const bw = Math.max(2, Math.min(18, step - 4));
              return (
                <g key={i} opacity={hover === null || hover === i ? 1 : 0.45} style={{ transition: "opacity 140ms ease" }}>
                  {series.map((s, si) => {
                    const v = s.values[i] ?? 0;
                    if (!v) return null;
                    const y0 = y(acc);
                    acc += v;
                    const y1 = y(acc);
                    const top = si === series.length - 1 || series.slice(si + 1).every((x) => !(x.values[i] ?? 0));
                    return (
                      <rect key={s.name} className={intro ? "bar-grow" : undefined} style={{ "--i": i } as React.CSSProperties} x={xc(i) - bw / 2} y={y1} width={bw} height={Math.max(1, y0 - y1 - 1.5)} rx={top ? 3 : 0} fill={s.color} />
                    );
                  })}
                </g>
              );
            })}

          {kind === "line" &&
            series.map((s) => (
              <g key={s.name}>
                <polyline
                  className={intro ? "line-draw" : undefined}
                  pathLength={intro ? 1 : undefined}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  points={s.values.map((v, i) => `${xc(i)},${y(v)}`).join(" ")}
                />
                {hover !== null && <circle cx={xc(hover)} cy={y(s.values[hover] ?? 0)} r={4} fill={s.color} stroke="var(--surface-solid)" strokeWidth={2} />}
              </g>
            ))}

          {hover !== null && <line x1={xc(hover)} x2={xc(hover)} y1={PAD.t} y2={PAD.t + ih} stroke="var(--line-strong)" strokeWidth={1} />}
        </svg>

        {hover !== null && (
          <div
            className="pointer-events-none absolute top-1 z-10 w-[168px] rounded-xl border border-[var(--line-strong)] bg-[var(--surface-solid-2)] px-3 py-2 text-[12px] shadow-lg"
            style={{ left: tipLeft }}
          >
            <p className="mb-1 font-medium">{shortDay(days[hover])}</p>
            {series.map((s) => (
              <p key={s.name} className="flex items-center justify-between gap-2 text-text-muted">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-sm" style={{ background: s.color }} />
                  {s.name}
                </span>
                <span className="font-medium text-text">{s.values[hover] ?? 0}</span>
              </p>
            ))}
          </div>
        )}
        {empty && <p className="pointer-events-none absolute inset-0 grid place-items-center text-[12.5px] text-text-muted">Belum ada data pada periode ini</p>}
      </div>

      <details className="mt-1 text-[12px] text-text-muted">
        <summary className="cursor-pointer select-none">Lihat sebagai tabel</summary>
        <div className="mt-2 max-h-48 overflow-auto">
          <table className="w-full text-left">
            <thead>
              <tr>
                <th className="py-1 pr-3 font-medium">Tanggal</th>
                {series.map((s) => (
                  <th key={s.name} className="py-1 pr-3 font-medium">
                    {s.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.map((d, i) => (
                <tr key={d}>
                  <td className="py-0.5 pr-3">{shortDay(d)}</td>
                  {series.map((s) => (
                    <td key={s.name} className="py-0.5 pr-3">
                      {s.values[i] ?? 0}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

/** Daftar batang horizontal untuk komposisi (platform, status). Nilai selalu tertulis sebagai teks. */
export function BarList({ items }: { items: { label: string; value: number; color?: string }[] }) {
  const intro = useIntro();
  const total = items.reduce((s, i) => s + i.value, 0);
  const max = Math.max(1, ...items.map((i) => i.value));
  if (items.length === 0 || total === 0) return <p className="py-6 text-center text-[12.5px] text-text-muted">Belum ada data</p>;
  return (
    <ul className="space-y-3">
      {items.map((it, idx) => (
        <li key={it.label}>
          <div className="mb-1 flex items-baseline justify-between text-[12.5px]">
            <span className="text-text-muted">{it.label}</span>
            <span className="font-medium">
              {it.value} <span className="text-text-muted">({Math.round((it.value / total) * 100)}%)</span>
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--pill-bg)]">
            <div className={`${intro ? "bar-fill " : ""}h-2 rounded-full`} style={{ "--i": idx, width: `${(it.value / max) * 100}%`, background: it.color ?? SERIES_COLORS[idx % SERIES_COLORS.length] } as React.CSSProperties} />
          </div>
        </li>
      ))}
    </ul>
  );
}
