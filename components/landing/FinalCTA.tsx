import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { GlassPanel } from "@/components/ui/GlassPanel";

export function FinalCTA() {
  return (
    <section id="pricing" className="px-4 py-24">
      <div className="mx-auto max-w-4xl">
        <GlassPanel className="px-8 py-16 text-center sm:px-16">
          <h2 className="text-[28px] sm:text-[36px] font-semibold tracking-tight leading-[1.15] mb-4">
            Buat developer yang benci ribet.
          </h2>
          <p className="max-w-md mx-auto text-[14px] text-text-muted mb-8">
            Gratis untuk project personal. Tidak perlu kartu kredit, tidak perlu setup rumit.
          </p>
          <Link href="/dashboard" className="btn-primary inline-flex items-center gap-2 px-7 py-3.5 text-[14px]">
            Mulai Gratis <ArrowRight size={16} />
          </Link>
        </GlassPanel>
      </div>
    </section>
  );
}
