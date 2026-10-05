import Link from "next/link";
import { ArrowUpRight, ChevronRight, PlayCircle } from "lucide-react";
import { HeroMockup } from "./HeroMockup";

export function Hero() {
  return (
    <>
      <section className="relative mx-auto flex max-w-7xl flex-col items-center px-4 pb-14 pt-32 text-center sm:px-8 sm:pt-36">
        <a
          href="#support"
          className="group mb-8 inline-flex items-center gap-2.5 rounded-full bg-obs-elevated/80 py-1.5 pl-3 pr-2.5 shadow-[0_0_15px_rgba(139,92,246,0.15)] transition-colors hover:bg-obs-elevated"
        >
          <span className="h-2 w-2 animate-pulse rounded-full bg-obs-ok" aria-hidden="true" />
          <span className="f-mono text-[11px] font-semibold tracking-[0.04em] text-white/90">
            Mendukung Vercel, Cloudflare Pages, dan Railway
          </span>
          <ChevronRight size={14} className="text-obs-sec transition-transform group-hover:translate-x-0.5" />
        </a>

        <h1 className="f-display max-w-4xl text-[34px] font-bold leading-[1.1] tracking-[-0.035em] text-white min-[400px]:text-[38px] sm:text-[56px]">
          Deploy without the
          <br />
          <span className="obs-gradient-text drop-shadow-[0_0_35px_rgba(168,85,247,0.35)]">hassle.</span>
        </h1>

        <p className="mx-auto mb-10 mt-6 max-w-2xl text-[16px] leading-relaxed text-obs-sec sm:text-[18px]">
          Tempel link GitHub, Depup cek isi repo-nya, lalu deploy ke{" "}
          <b className="font-medium text-white">Vercel</b>, <b className="font-medium text-white">Cloudflare Pages</b>, atau{" "}
          <b className="font-medium text-white">Railway</b> dari satu dashboard. Kalau repo tidak cocok, kamu tahu alasannya
          sebelum membuang waktu.
        </p>

        <div className="flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row sm:gap-4">
          <Link
            href="/dashboard"
            className="obs-btn-primary inline-flex w-full items-center justify-center gap-2.5 rounded-xl px-7 py-3 text-[16px] font-semibold text-white sm:w-auto"
          >
            Deploy repo pertamamu
            <ArrowUpRight size={18} />
          </Link>
          <a
            href="#cara-kerja"
            className="obs-btn-glass inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-[15px] text-white sm:w-auto"
          >
            <PlayCircle size={18} className="text-obs-lilac" />
            Lihat cara kerja
          </a>
        </div>
      </section>

      <HeroMockup />
    </>
  );
}
