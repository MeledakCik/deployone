import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function FinalCTA() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-8">
      <div className="relative isolate overflow-hidden rounded-3xl bg-obs-low p-8 shadow-[0_20px_60px_rgba(0,0,0,0.6)] sm:p-14">
        <div className="pointer-events-none absolute -bottom-40 -right-40 h-[32rem] w-[32rem] bg-[radial-gradient(closest-side,rgba(139,92,246,0.32),transparent)]" aria-hidden="true" />
        <div className="pointer-events-none absolute -left-32 -top-32 h-[26rem] w-[26rem] bg-[radial-gradient(closest-side,rgba(236,72,153,0.24),transparent)]" aria-hidden="true" />

        <div className="relative z-10 flex flex-col items-start justify-between gap-12 lg:flex-row lg:items-center">
          <div className="max-w-2xl">
            <h2 className="f-display text-[30px] font-bold leading-tight tracking-[-0.03em] text-white sm:text-[40px] sm:leading-[48px]">
              Coba dengan repo yang sudah <span className="obs-gradient-text">kamu punya.</span>
            </h2>
            <p className="mb-8 mt-4 text-[17px] leading-relaxed text-obs-sec">
              Masuk dengan Google, tempel link GitHub, dan lihat hasil pengecekannya dalam hitungan detik.
            </p>
            <Link
              href="/dashboard"
              className="obs-btn-primary inline-flex items-center gap-2 rounded-xl px-8 py-3.5 text-[16px] font-semibold text-white"
            >
              Buka dashboard
              <ArrowRight size={18} />
            </Link>
          </div>

          <ul className="flex w-full min-w-[260px] flex-col gap-3 lg:w-auto">
            {[
              ["3", "platform dalam satu dashboard"],
              ["Private", "repo bisa dengan GitHub Token"],
              ["Google", "login tanpa buat akun baru"],
            ].map(([big, small]) => (
              <li key={big} className="flex items-center justify-between gap-6 rounded-xl bg-obs-base p-4 shadow-inner">
                <span className="f-display text-[22px] font-bold text-white">{big}</span>
                <span className="text-right text-[13px] text-obs-sec">{small}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
