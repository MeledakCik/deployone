import type * as React from "react";
import { CountUp } from "@/components/ui/CountUp";

export function StatCard({
  id,
  label,
  value,
  icon: Icon,
  tone,
}: {
  id: string;
  label: string;
  value: number | string;
  icon: React.ElementType;
  tone: "violet" | "emerald" | "red";
}) {
  // Kartu pastel datar seperti referensi. Di tema gelap warnanya jadi tint transparan.
  const toneClass = {
    violet: "bg-tone-lilac",
    emerald: "bg-tone-mint",
    red: "bg-tone-peach",
  }[tone];

  return (
    <div className={`stat-card-glass p-5 ${toneClass}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="pt-1 text-[13.5px] font-medium text-text-muted">{label}</p>
        <span className="stat-icon text-text">
          <Icon size={19} />
        </span>
      </div>
      <p id={id} className="mt-7 text-[40px] font-bold leading-none tracking-[-0.03em] tabular-nums">
        <CountUp value={value} />
      </p>
    </div>
  );
}
