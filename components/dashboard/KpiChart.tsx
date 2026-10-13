"use client";

import * as React from "react";

export function KpiChart() {
  const data = [22, 28, 25, 34, 31, 39, 47, 45, 52, 58, 55, 63];
  const max = Math.max(...data);
  const width = 560;
  const height = 220;
  const padding = 24;
  const step = (width - padding * 2) / (data.length - 1);

  const points = data
    .map((v, i) => {
      const x = padding + i * step;
      const y = height - padding - (v / max) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="rounded-3xl border border-black/10 bg-white p-4 shadow-[0_10px_40px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-slate-950">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Revenue trend</p>
          <h3 className="text-xl font-semibold tracking-tight text-slate-950 dark:text-white">Kinerja 12 bulan terakhir</h3>
        </div>
        <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">+18.4%</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[220px] w-full">
        <defs>
          <linearGradient id="lineGrad" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
        </defs>
        {[0.25,0.5,0.75].map((t)=> (
          <line key={t} x1={padding} x2={width-padding} y1={padding + (height-padding*2)*t} y2={padding + (height-padding*2)*t} stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeDasharray="4 6" />
        ))}
        <polyline points={points} fill="none" stroke="url(#lineGrad)" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />
        {data.map((v, i) => {
          const x = padding + i * step;
          const y = height - padding - (v / max) * (height - padding * 2);
          return <circle key={i} cx={x} cy={y} r="4.5" fill="#2563eb" />;
        })}
      </svg>
      <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>Jan</span><span>Jun</span><span>Dec</span>
      </div>
    </div>
  );
}
