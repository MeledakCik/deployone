import * as React from "react";
import "@fontsource-variable/geist";
import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
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
    <main className="obsidian relative min-h-screen overflow-x-hidden antialiased selection:bg-obs-violet/30">
      {/* Cahaya ambient di belakang konten */}
      <div className="pointer-events-none absolute inset-0 -z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-56 left-1/2 h-[700px] w-[1100px] -translate-x-1/2 bg-[radial-gradient(closest-side,rgba(139,92,246,0.22),rgba(236,72,153,0.08)_55%,transparent)]" />
        <div className="absolute -left-64 top-[800px] h-[800px] w-[800px] bg-[radial-gradient(closest-side,rgba(139,92,246,0.12),transparent)]" />
        <div className="absolute -right-64 top-[1800px] h-[900px] w-[900px] bg-[radial-gradient(closest-side,rgba(236,72,153,0.11),transparent)]" />
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
