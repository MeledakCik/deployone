import type * as React from "react";

const TONES = {
  violet: { tint: "tint-lav", icon: "text-accent" },
  emerald: { tint: "tint-mint", icon: "text-ok" },
  red: { tint: "tint-rose", icon: "text-bad" },
} as const;

export function StatCard({
  id,
  label,
  value,
  icon: Icon,
  tone,
  index = 0,
}: {
  id: string;
  label: string;
  value: number | string;
  icon: React.ElementType;
  tone: "violet" | "emerald" | "red";
  index?: number;
}) {
  const t = TONES[tone];

  return (
    <div
      className={`stat-card-glass rise ${t.tint} p-6`}
      style={{ "--i": index + 1 } as React.CSSProperties}
    >
      <div className="flex items-center justify-between">
        <span className={`stat-icon ${t.icon}`}>
          <Icon size={20} />
        </span>
      </div>
      <p id={id} className="mt-6 text-[40px] font-semibold leading-none tracking-[-0.04em]">
        {value}
      </p>
      <p className="mt-2 text-[14px] text-text-muted">{label}</p>
    </div>
  );
}
