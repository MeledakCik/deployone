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
    <main className="relative min-h-screen text-[var(--text)] font-[Inter] antialiased overflow-x-hidden selection:bg-violet-500/30">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0" style={{ background: "var(--bg-base)" }} />
        <div className="absolute -top-[300px] left-1/2 -translate-x-1/2 w-[1200px] h-[700px] bg-[radial-gradient(ellipse_at_center,_rgba(124,58,237,0.18),_transparent_60%)] blur-[20px]" />
        <div className="absolute top-[200px] -right-[200px] w-[600px] h-[600px] bg-[radial-gradient(circle,_rgba(99,102,241,0.15),_transparent_70%)] blur-[40px]" />
        <div className="absolute top-[600px] -left-[200px] w-[500px] h-[500px] bg-[radial-gradient(circle,_rgba(168,85,247,0.12),_transparent_70%)] blur-[30px]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(var(--text) 1px, transparent 1px), linear-gradient(90deg, var(--text) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

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
