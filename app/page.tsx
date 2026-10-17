import * as React from "react";
import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { SocialProof } from "@/components/landing/SocialProof";
import { FeaturesGrid } from "@/components/landing/FeaturesGrid";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { KuliSection } from "@/components/landing/KuliSection";
import { SupportMatrix } from "@/components/landing/SupportMatrix";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { Footer } from "@/components/landing/Footer";

export default function LandingPage() {
  return (
    // data-theme="light": landing selalu terang, tidak mengikuti tema dashboard.
    <main data-theme="light" className="lp relative min-h-[100dvh] overflow-x-hidden antialiased">
      <React.Suspense fallback={null}>
        <Navbar />
      </React.Suspense>
      <Hero />

      {/* Bagian isi: lembar putih membulat di atas kanvas lavender */}
      <div className="lp-sheet mx-2 mt-10 sm:mx-5 min-[1400px]:mx-auto min-[1400px]:max-w-[1360px]">
        <SocialProof />
        <FeaturesGrid />
        <HowItWorks />
        <KuliSection />
        <SupportMatrix />
      </div>

      <FinalCTA />
      <Footer />
    </main>
  );
}
