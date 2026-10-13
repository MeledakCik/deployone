
"use client";

import * as React from "react";

const DATA = [
  { day: "Mon", revenue: 42, users: 68, tasks: 34 },
  { day: "Tue", revenue: 48, users: 72, tasks: 40 },
  { day: "Wed", revenue: 45, users: 75, tasks: 43 },
  { day: "Thu", revenue: 58, users: 81, tasks: 52 },
  { day: "Fri", revenue: 64, users: 86, tasks: 58 },
  { day: "Sat", revenue: 61, users: 84, tasks: 55 },
  { day: "Sun", revenue: 69, users: 90, tasks: 62 },
];

export function ProfessionalKpiChart() {
  const [metric, setMetric] = React.useState<"revenue" | "users" | "tasks">("revenue");
  const values = DATA.map((d) => d[metric]);
  const max = Math.max(...values) * 1.1;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 100},${100 - (v / max) * 100}`).join(" ");

  return (
    <div className="glass-panel p-5 md:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Performance KPI</p>
          <p className="text-xs text-text-muted">Realtime chart dengan transisi halus</p>
        </div>
        <div className="flex rounded-2xl bg-black/5 p-1 text-xs">
          {(["revenue", "users", "tasks"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMetric(m)}
              className={`rounded-xl px-3 py-1.5 transition-all duration-300 ${metric === m ? "bg-black text-white shadow-sm" : "text-text-muted hover:text-black"}`}
            >
              {m[0].toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-5 h-72 rounded-3xl bg-gradient-to-b from-white to-slate-50 p-4">
        <svg viewBox="0 0 100 100" className="h-full w-full">
          <defs>
            <linearGradient id="fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="rgba(99,102,241,0.34)" />
              <stop offset="100%" stopColor="rgba(99,102,241,0)" />
            </linearGradient>
          </defs>
          {[0, 25, 50, 75, 100].map((g) => (
            <line key={g} x1="0" x2="100" y1={g} y2={g} stroke="rgba(15,23,42,0.08)" strokeWidth="0.5" />
          ))}
          <polyline fill="url(#fill)" points={`0,100 ${pts} 100,100`} />
          <polyline fill="none" points={pts} stroke="rgba(15,23,42,0.92)" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round" />
          {values.map((v, i) => {
            const x = (i / (values.length - 1)) * 100;
            const y = 100 - (v / max) * 100;
            return <circle key={i} cx={x} cy={y} r="1.5" fill="white" stroke="rgba(15,23,42,0.92)" strokeWidth="1" />;
          })}
        </svg>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
        {DATA.slice(-3).map((d) => (
          <div key={d.day} className="rounded-2xl bg-black/5 p-3">
            <div className="text-text-muted">{d.day}</div>
            <div className="mt-1 text-sm font-semibold">{d[metric]}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
