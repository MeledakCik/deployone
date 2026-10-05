import * as React from "react";
import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { SupportMatrix } from "@/components/landing/SupportMatrix";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { FeaturesGrid } from "@/components/landing/FeaturesGrid";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { Footer } from "@/components/landing/Footer";

export default function LandingPage() {
  return (
    <main className="relative min-h-screen text-[var(--text)] antialiased overflow-x-hidden selection:bg-blue-500/30">
      {/* Latar: satu warna dasar + grid tipis yang memudar ke bawah. Tanpa blob gradien. */}
      <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden="true">
        <div className="absolute inset-0" style={{ background: "var(--bg-base)" }} />
        <div
          className="absolute inset-x-0 top-0 h-[640px] opacity-[0.05]"
          style={{
            backgroundImage:
              "linear-gradient(var(--text) 1px, transparent 1px), linear-gradient(90deg, var(--text) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage: "linear-gradient(to bottom, #000 30%, transparent)",
            WebkitMaskImage: "linear-gradient(to bottom, #000 30%, transparent)",
          }}
        />
      </div>

      <React.Suspense fallback={null}>
        <Navbar />
      </React.Suspense>
      <Hero />
      <SupportMatrix />
      <HowItWorks />
      <FeaturesGrid />
      <FinalCTA />
      <Footer />
    </main>
  );
}
