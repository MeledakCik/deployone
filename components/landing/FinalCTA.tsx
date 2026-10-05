import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export function FinalCTA() {
  return (
    <section className="mx-auto max-w-[1200px] px-6 pt-10 pb-24">
      <div
        className="rounded-[28px] px-7 md:px-14 py-14 md:py-20 flex flex-col md:flex-row md:items-end md:justify-between gap-8"
        style={{ background: "var(--text)", color: "var(--bg-base)" }}
      >
        <h2 className="font-display text-[34px] md:text-[52px] leading-[1.02] tracking-[-0.035em] font-bold max-w-[640px]">
          Coba dengan repo yang sudah kamu punya.
        </h2>
        <Link
          href="/dashboard"
          className="group h-12 px-6 rounded-full text-[15px] font-semibold inline-flex items-center gap-2 self-start md:self-auto shrink-0 bg-blue-600 text-white hover:bg-blue-500 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
        >
          Buka dashboard
          <ArrowUpRight size={16} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      </div>
    </section>
  );
}
