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
        <div className="absolute -top-40 left-1/2 h-[600px] w-[1000px] -translate-x-1/2 bg-gradient-to-b from-obs-violet/20 via-obs-pink/10 to-transparent opacity-50 blur-3xl" />
        <div className="absolute -left-48 top-[900px] h-[600px] w-[600px] rounded-full bg-obs-violet/10 blur-[120px]" />
        <div className="absolute -right-48 top-[1900px] h-[700px] w-[700px] rounded-full bg-obs-pink/10 blur-[140px]" />
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
