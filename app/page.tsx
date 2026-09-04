import * as React from "react";
import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { SocialProof } from "@/components/landing/SocialProof";
import { FeaturesGrid } from "@/components/landing/FeaturesGrid";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { Footer } from "@/components/landing/Footer";

export default function LandingPage() {
  return (
    <main>
      <React.Suspense fallback={null}>
        <Navbar />
      </React.Suspense>
      <Hero />
      <SocialProof />
      <FeaturesGrid />
      <HowItWorks />
      <FinalCTA />
      <Footer />
    </main>
  );
}
