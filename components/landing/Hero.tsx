import { DashboardLink } from "./DashboardLink";
import { ArrowUpRight, ChevronRight, PlayCircle } from "@/components/ui/icons";
import { HeroMockup } from "./HeroMockup";

export function Hero() {
  return (
    <>
      <section className="relative mx-auto flex max-w-6xl flex-col items-center px-4 pb-14 pt-32 text-center sm:px-8 sm:pt-44">
        <a
          href="#support"
          className="press group mb-8 inline-flex max-w-full items-center gap-2.5 rounded-full bg-[var(--surface-solid)] py-1.5 pl-3.5 pr-2.5 text-text shadow-[0_10px_30px_-18px_rgba(54,28,120,0.6)] transition-colors hover:bg-[var(--surface-solid-2)]"
        >
          <span className="live-dot shrink-0" aria-hidden="true" />
          <span className="min-w-0 text-left text-[12.5px] font-semibold leading-snug">Mendukung Vercel, Cloudflare Pages, dan Railway</span>
          <ChevronRight size={14} className="shrink-0 text-text-faint transition-transform group-hover:translate-x-0.5" />
        </a>

        <h1 className="max-w-4xl text-[clamp(2rem,8.4vw,4.75rem)] font-bold leading-[1.04] tracking-[-0.03em] text-text">
          <span className="sr-only">Depup: dashboard deploy Indonesia. </span>
          Deploy without the
          <br />
          hassle.
        </h1>

        <p className="mx-auto mb-10 mt-6 max-w-2xl text-[16px] leading-relaxed text-text-muted sm:text-[18px]">
          <b className="font-semibold text-text">Depup</b> adalah dashboard deploy buatan Indonesia. Tempel link GitHub, biarkan Depup memeriksa isi repo-nya, lalu deploy ke{" "}
          <b className="font-semibold text-text">Vercel</b>, <b className="font-semibold text-text">Cloudflare Pages</b>, atau{" "}
          <b className="font-semibold text-text">Railway</b> dari satu dashboard. Kalau repo tidak cocok, kamu langsung tahu alasannya
          sebelum waktumu terbuang.
        </p>

        <div className="flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row sm:gap-4">
          <DashboardLink
            href="/dashboard"
            className="btn-primary inline-flex w-full items-center justify-center gap-2.5 px-7 py-4 text-[16px] sm:w-auto"
          >
            Deploy repo pertamamu
            <ArrowUpRight size={18} />
          </DashboardLink>
          <a
            href="#cara-kerja"
            className="pill inline-flex w-full items-center justify-center gap-2 bg-[var(--surface-solid)] px-6 py-4 text-[15px] font-medium sm:w-auto"
          >
            <PlayCircle size={18} className="text-lav-text" />
            Lihat cara kerja
          </a>
        </div>
      </section>

      <HeroMockup />
    </>
  );
}
