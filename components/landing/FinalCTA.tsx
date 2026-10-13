import { DashboardLink } from "./DashboardLink";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";

export function FinalCTA() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-8">
      <Reveal>
        <div className="relative isolate overflow-hidden rounded-[40px] bg-[#111113] p-8 text-white shadow-pop sm:p-14">
          <div className="drift pointer-events-none absolute -bottom-40 -right-32 -z-10 h-[30rem] w-[30rem] rounded-full bg-[#7c58f5] opacity-45 blur-[100px]" aria-hidden="true" />
          <div
            className="drift pointer-events-none absolute -left-32 -top-40 -z-10 h-[26rem] w-[26rem] rounded-full bg-[#ff6b8f] opacity-30 blur-[100px]"
            style={{ animationDelay: "-8s" }}
            aria-hidden="true"
          />

          <div className="flex flex-col items-start justify-between gap-12 lg:flex-row lg:items-center">
            <div className="max-w-2xl">
              <h2 className="display text-[34px] leading-[1.06] sm:text-[52px]">
                Coba dengan repo yang sudah <span className="text-gradient">kamu punya.</span>
              </h2>
              <p className="mb-9 mt-5 text-[17px] leading-relaxed text-white/65 sm:text-[19px]">
                Masuk dengan Google, tempel link GitHub, dan lihat hasil pengecekannya dalam hitungan detik.
              </p>
              <DashboardLink
                href="/dashboard"
                className="inline-flex h-14 items-center gap-2.5 rounded-full bg-white px-8 text-[16px] font-semibold text-[#111113] transition-all duration-500 ease-bounce hover:scale-105 hover:shadow-[0_18px_40px_-10px_rgba(255,255,255,0.35)] active:scale-95"
              >
                Buka dashboard
                <ArrowRight size={18} />
              </DashboardLink>
            </div>

            <ul className="flex w-full min-w-[260px] flex-col gap-3 lg:w-auto">
              {[
                ["3", "platform dalam satu dashboard"],
                ["Private", "repo bisa dengan GitHub Token"],
                ["Google", "login tanpa buat akun baru"],
              ].map(([big, small]) => (
                <li
                  key={big}
                  className="flex items-center justify-between gap-6 rounded-[24px] bg-white/[0.08] p-5 backdrop-blur-xl transition-transform duration-500 ease-bounce hover:scale-[1.03]"
                >
                  <span className="text-[24px] font-semibold tracking-[-0.03em]">{big}</span>
                  <span className="text-right text-[13.5px] text-white/65">{small}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
