import type * as React from "react";
import { DashboardLink } from "./DashboardLink";
import { ArrowUpRight, ChevronRight, PlayCircle } from "lucide-react";
import { HeroMockup } from "./HeroMockup";

export function Hero() {
  return (
    <>
      <section className="relative mx-auto flex max-w-6xl flex-col items-center px-4 pb-16 pt-36 text-center sm:px-8 sm:pt-44">
        <a
          href="#support"
          style={{ "--i": 0 } as React.CSSProperties}
          className="rise group mb-8 inline-flex items-center gap-2.5 rounded-full bg-card/80 py-2 pl-3.5 pr-3 shadow-card backdrop-blur transition-transform duration-500 ease-bounce hover:scale-[1.04]"
        >
          <span className="h-2 w-2 animate-pulse rounded-full bg-ok" aria-hidden="true" />
          <span className="text-[12.5px] font-medium text-ink">Mendukung Vercel, Cloudflare Pages, dan Railway</span>
          <ChevronRight size={14} className="text-ink-3 transition-transform duration-500 ease-bounce group-hover:translate-x-1" />
        </a>

        <h1
          style={{ "--i": 1 } as React.CSSProperties}
          className="rise display max-w-4xl text-[38px] leading-[1.04] text-ink min-[400px]:text-[48px] sm:text-[76px]"
        >
          Deploy without the
          <br />
          <span className="text-gradient">hassle.</span>
        </h1>

        <p
          style={{ "--i": 2 } as React.CSSProperties}
          className="rise mx-auto mb-10 mt-7 max-w-2xl text-[17px] leading-[1.55] text-ink-2 sm:text-[20px]"
        >
          Tempel link GitHub, Depup cek isi repo-nya, lalu deploy ke <b className="font-semibold text-ink">Vercel</b>,{" "}
          <b className="font-semibold text-ink">Cloudflare Pages</b>, atau <b className="font-semibold text-ink">Railway</b> dari
          satu dashboard. Kalau repo tidak cocok, kamu tahu alasannya sebelum membuang waktu.
        </p>

        <div
          style={{ "--i": 3 } as React.CSSProperties}
          className="rise flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row sm:gap-4"
        >
          <DashboardLink
            href="/dashboard"
            className="btn-ink inline-flex h-14 w-full items-center justify-center gap-2.5 rounded-full px-8 text-[16px] font-semibold sm:w-auto"
          >
            Deploy repo pertamamu
            <ArrowUpRight size={18} />
          </DashboardLink>
          <a
            href="#cara-kerja"
            className="btn-soft inline-flex h-14 w-full items-center justify-center gap-2 rounded-full px-7 text-[16px] font-medium sm:w-auto"
          >
            <PlayCircle size={19} className="text-accent" />
            Lihat cara kerja
          </a>
        </div>
      </section>

      <HeroMockup />
    </>
  );
}
