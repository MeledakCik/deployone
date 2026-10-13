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
      {/* Warna pastel lembut di belakang hero, bergerak pelan */}
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[900px] overflow-hidden" aria-hidden="true">
        <div className="drift absolute -top-40 left-[8%] h-[520px] w-[520px] rounded-full bg-[#d9ccff] opacity-60 blur-[110px] dark:bg-[#5b3fd6] dark:opacity-35" />
        <div
          className="drift absolute -top-24 right-[6%] h-[460px] w-[460px] rounded-full bg-[#ffd3e6] opacity-60 blur-[110px] dark:bg-[#c2347a] dark:opacity-25"
          style={{ animationDelay: "-6s" }}
        />
        <div
          className="drift absolute top-[260px] left-1/2 h-[380px] w-[380px] -translate-x-1/2 rounded-full bg-[#cfe8ff] opacity-50 blur-[110px] dark:bg-[#1f5fbf] dark:opacity-25"
          style={{ animationDelay: "-11s" }}
        />
      </div>

      <div className="relative z-10">
        <React.Suspense fallback={null}>
          <Navbar />
        </React.Suspense>
        <Hero />
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
