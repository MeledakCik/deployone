import * as React from "react";
import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { SocialProof } from "@/components/landing/SocialProof";
import { FeaturesGrid } from "@/components/landing/FeaturesGrid";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { SupportMatrix } from "@/components/landing/SupportMatrix";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { Footer } from "@/components/landing/Footer";

export default function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-paper text-ink antialiased">
      <div className="pointer-events-none absolute inset-0 -z-0 overflow-hidden" aria-hidden="true">
        <div className="drift absolute -top-40 left-[6%] h-[520px] w-[520px] rounded-full bg-[#d9ccff] opacity-55 blur-[110px] dark:bg-[#5b3fd6] dark:opacity-28" />
        <div className="drift absolute top-20 right-[4%] h-[460px] w-[460px] rounded-full bg-[#ffd3e6] opacity-50 blur-[110px] dark:bg-[#c2347a] dark:opacity-20" style={{ animationDelay: "-6s" }} />
        <div className="drift absolute top-[340px] left-1/2 h-[380px] w-[380px] -translate-x-1/2 rounded-full bg-[#cfe8ff] opacity-45 blur-[110px] dark:bg-[#1f5fbf] dark:opacity-20" style={{ animationDelay: "-11s" }} />
      </div>

      <div className="relative z-10">
        <React.Suspense fallback={null}>
          <Navbar />
        </React.Suspense>
        <Hero />
        <section className="mx-auto max-w-7xl px-4 pb-6 sm:px-6 lg:px-8">
          <div className="grid gap-4 lg:grid-cols-12">
            <div className="rounded-[28px] border border-white/10 bg-white/70 p-5 shadow-[0_24px_80px_rgba(17,24,39,0.08)] backdrop-blur-xl lg:col-span-8 dark:bg-slate-950/50">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-text-muted">KPI Dashboard</p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em]">Ringkasan performa deployment</h2>
                </div>
                <div className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-600">Live</div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-slate-950/5 p-4 dark:bg-white/5"><p className="text-sm text-text-muted">Uptime</p><p className="mt-2 text-3xl font-semibold">99.98%</p></div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/5 p-4 dark:bg-white/5"><p className="text-sm text-text-muted">Latency</p><p className="mt-2 text-3xl font-semibold">124ms</p></div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/5 p-4 dark:bg-white/5"><p className="text-sm text-text-muted">Deploys</p><p className="mt-2 text-3xl font-semibold">1,284</p></div>
              </div>
            </div>
            <div className="rounded-[28px] border border-white/10 bg-gradient-to-br from-slate-950 to-slate-900 p-5 text-white shadow-[0_24px_80px_rgba(17,24,39,0.16)] lg:col-span-4">
              <p className="text-xs uppercase tracking-[0.24em] text-white/55">Ops Pulse</p>
              <div className="mt-4 h-40 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex h-full items-end gap-2">
                  {[44, 62, 50, 78, 66, 84, 92].map((h, i) => (
                    <div key={i} className="flex-1 rounded-t-xl bg-gradient-to-t from-cyan-400 to-violet-400 transition-transform duration-300 hover:scale-y-[1.04]" style={{ height: `${h}%` }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
        <SocialProof />
        <FeaturesGrid />
        <HowItWorks />
        <SupportMatrix />
        <FinalCTA />
        <Footer />
      </div>
    </main>
  );
}
