import { GlassPanel } from "@/components/ui/GlassPanel";
import { Sparkles } from "lucide-react";

export function PlaceholderView({ title }: { title: string }) {
  return (
    <GlassPanel className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
      <span className="stat-icon text-violet-400">
        <Sparkles size={18} />
      </span>
      <h2 className="text-[16px] font-semibold">{title}</h2>
      <p className="max-w-xs text-[13px] text-text-muted">
        Halaman ini sedang dalam pengembangan. Fitur inti deploy sudah bisa kamu coba dari tab Dashboard dan Deploy.
      </p>
    </GlassPanel>
  );
}
