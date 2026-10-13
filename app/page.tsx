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
        <div className="drift absolute -top-48 left-[7%] h-[560px] w-[560px] rounded-full bg-[#d9ccff] opacity-60 blur-[120px] dark:bg-[#5b3fd6] dark:opacity-30" />
        <div className="drift absolute -top-24 right-[6%] h-[460px] w-[460px] rounded-full bg-[#ffd3e6] opacity-55 blur-[120px] dark:bg-[#c2347a] dark:opacity-22" style={{ animationDelay: "-6s" }} />
        <div className="drift absolute top-[260px] left-1/2 h-[380px] w-[380px] -translate-x-1/2 rounded-full bg-[#cfe8ff] opacity-45 blur-[120px] dark:bg-[#1f5fbf] dark:opacity-22" style={{ animationDelay: "-11s" }} />
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
