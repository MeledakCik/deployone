"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, PlayCircle, GitBranch, CheckCircle2 } from "lucide-react";
import { GlassPanel } from "@/components/ui/GlassPanel";

export function Hero() {
  return (
    <section className="relative pt-40 pb-24 px-4 sm:pt-48">
      <div className="mx-auto max-w-6xl grid gap-14 lg:grid-cols-2 lg:items-center">
        <div className="animate-fade-up">
          <div className="pill inline-flex items-center gap-2 px-3 py-1 text-[12px] font-medium text-text-muted mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 glow-dot" />
            Sekarang mendukung Cloudflare Pages
          </div>
          <h1 className="text-[40px] sm:text-[56px] leading-[1.05] font-semibold tracking-tight">
            Deploy without
            <br />
            the hassle.
          </h1>
          <p className="mt-5 max-w-md text-[16px] leading-relaxed text-text-muted">
            Kelola semua deployment Vercel dan Cloudflare dari satu dashboard glass yang cantik.
            No more tab switching.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/dashboard" className="btn-primary inline-flex items-center gap-2 px-6 py-3 text-[14px]">
              Deploy Sekarang <ArrowRight size={16} />
            </Link>
            <a href="#how-it-works" className="pill inline-flex items-center gap-2 px-6 py-3 text-[14px] font-medium hover:bg-[var(--card-hover)]">
              <PlayCircle size={16} /> Lihat Demo
            </a>
          </div>
        </div>

        <div className="hero-mockup animate-fade-up [animation-delay:150ms]">
          <GlassPanel className="p-5 sm:p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
              </div>
              <span className="mono text-[11px] text-text-faint">deployone.app/dashboard</span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <GlassPanel flat className="p-4">
                <p className="text-[11px] text-text-faint mono mb-1">PROJECT</p>
                <p className="text-[14px] font-semibold">acme-storefront</p>
                <p className="mt-2 inline-flex items-center gap-1.5 rounded-pill border px-2 py-0.5 text-[11px] font-medium border-emerald-500/20 bg-emerald-500/10 text-emerald-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 glow-dot" /> Ready
                </p>
              </GlassPanel>
              <GlassPanel flat className="p-4">
                <p className="text-[11px] text-text-faint mono mb-1">PROJECT</p>
                <p className="text-[14px] font-semibold">docs-portal</p>
                <p className="mt-2 inline-flex items-center gap-1.5 rounded-pill border px-2 py-0.5 text-[11px] font-medium border-amber-500/20 bg-amber-500/10 text-amber-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 glow-dot" /> Building
                </p>
              </GlassPanel>
            </div>

            <GlassPanel flat className="p-4 mb-4">
              <div className="flex items-center gap-2 mb-2 text-[11px] text-text-faint mono">
                <GitBranch size={12} /> BUILD LOG
              </div>
              <div className="space-y-1.5 text-[12px] mono text-text-muted">
                <p className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-emerald-500" /> Cloning repository…</p>
                <p className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-emerald-500" /> Installing dependencies…</p>
                <p className="text-text">Building for production…</p>
              </div>
            </GlassPanel>

            <div>
              <div className="flex items-center justify-between text-[11px] text-text-faint mb-1.5">
                <span>Deploy progress</span>
                <span className="mono">72%</span>
              </div>
              <div className="h-1.5 w-full rounded-pill bg-[var(--pill-bg)] overflow-hidden">
                <div className="h-full w-[72%] rounded-pill bg-gradient-to-r from-violet-500 to-cyan-400" />
              </div>
            </div>
          </GlassPanel>
        </div>
      </div>
    </section>
  );
}
