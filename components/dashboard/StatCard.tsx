import type * as React from "react";
import { GlassPanel } from "@/components/ui/GlassPanel";

export function StatCard({
  id,
  label,
  value,
  icon: Icon,
  tone,
}: {
  id: string;
  label: string;
  value: number;
  icon: React.ElementType;
  tone: "violet" | "emerald" | "red";
}) {
  const toneClass = {
    violet: "text-violet-400",
    emerald: "text-emerald-500",
    red: "text-red-400",
  }[tone];

  return (
    <GlassPanel className="p-5">
      <div className="flex items-center justify-between">
        <span className={`stat-icon ${toneClass}`}>
          <Icon size={18} />
        </span>
      </div>
      <p id={id} className="mt-4 text-[28px] font-semibold tracking-tight">
        {value}
      </p>
      <p className="text-[13px] text-text-muted">{label}</p>
    </GlassPanel>
  );
}
