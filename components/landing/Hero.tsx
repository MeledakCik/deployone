"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, PlayCircle } from "lucide-react";
import { GlassPanel } from "@/components/ui/GlassPanel";

export function Hero() {
  return (
    <section className="relative pt-32 pb-16 md:pt-44 md:pb-24 px-4 sm:px-6 overflow-hidden mb-12">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-20 right-[10%] h-64 w-64 md:h-96 md:w-96 rounded-full bg-violet-500/15 blur-3xl" />
        <div className="absolute bottom-10 right-[20%] h-72 w-72 md:h-96 md:w-96 rounded-full bg-cyan-400/15 blur-3xl" />
        <div className="absolute top-[40%] left-[5%] h-56 w-56 md:h-80 md:w-80 rounded-full bg-fuchsia-500/10 blur-3xl" />
      </div>

      <div className="mx-auto max-w-6xl grid gap-12 lg:grid-cols-2 lg:items-center">
        <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs sm:text-sm font-medium text-slate-300 mb-6 backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Sekarang mendukung Cloudflare Pages
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl leading-[1.1] font-bold tracking-tight text-white">
            Deploy without <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              the hassle.
            </span>
          </h1>

          <p className="mt-5 max-w-md text-base sm:text-lg leading-relaxed text-slate-400">
            Kelola semua deployment Vercel dan Cloudflare dari satu dashboard glass yang cantik.
            No more tab switching.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-4 w-full sm:w-auto">
            <Link
              href="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white font-medium text-sm transition-all shadow-lg shadow-violet-500/20 active:scale-[0.98]"
            >
              Deploy Sekarang <ArrowRight size={16} />
            </Link>

            <a
              href="#how-it-works"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium text-sm backdrop-blur-md transition-all active:scale-[0.98]"
            >
              <PlayCircle size={16} /> Lihat Demo
            </a>
          </div>
        </div>

        <div className="relative w-full max-w-xl mx-auto lg:max-w-none">
          <div className="absolute -inset-4 sm:-inset-6 -z-10 bg-gradient-to-br from-violet-500/20 via-fuchsia-500/10 to-cyan-400/20 blur-2xl rounded-3xl" />

          <GlassPanel className="p-2 sm:p-4 overflow-hidden transform lg:rotate-[-2deg] hover:rotate-0 transition-transform duration-500 ease-out shadow-2xl shadow-black/60 border border-white/10">
            <svg
              viewBox="0 0 800 480"
              width="100%"
              height="100%"
              xmlns="http://www.w3.org/2000/svg"
              className="w-full h-auto drop-shadow-md"
            >
              <defs>
                <linearGradient id="progress-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="70%" stopColor="#06b6d4" />
                  <stop offset="100%" stopColor="#38ef7d" />
                </linearGradient>

                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>

                <radialGradient id="cosmic1" cx="50%" cy="50%">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                </radialGradient>
              </defs>
              <g opacity="0.6">
                <circle cx="60" cy="80" r="18" fill="url(#cosmic1)" opacity="0.15" />
                <circle cx="740" cy="60" r="2" fill="#22d3ee">
                  <animate attributeName="opacity" values="0.2;1;0.2" dur="3s" repeatCount="indefinite" />
                </circle>
                <circle cx="760" cy="120" r="1.5" fill="#a78bfa" opacity="0.6" />
                <circle cx="750" cy="200" r="2.5" fill="#22d3ee" opacity="0.5" />
                <circle cx="30" cy="320" r="1.8" fill="#a78bfa" opacity="0.5" />
                <circle cx="760" cy="340" r="1.5" fill="#f472b6" opacity="0.5" />
                <circle cx="770" cy="420" r="2" fill="#22d3ee" opacity="0.4" />
              </g>

              <g>
                <circle cx="28" cy="22" r="5" fill="#fb7185" opacity="0.8" />
                <circle cx="46" cy="22" r="5" fill="#fbbf24" opacity="0.8" />
                <circle cx="64" cy="22" r="5" fill="#34d399" opacity="0.8" />
                <text x="770" y="26" fill="#64748b" fontFamily="sans-serif" fontSize="11" textAnchor="end" fontWeight="500">
                  deployone.app/dashboard
                </text>
              </g>
              <g transform="translate(16, 44)">
                <rect x="0" y="0" width="372" height="132" rx="12" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.08)" />
                <text x="16" y="28" fill="#64748b" fontSize="10" fontFamily="sans-serif" fontWeight="700" letterSpacing="1">PROJECT</text>
                <text x="16" y="54" fill="white" fontSize="16" fontFamily="sans-serif" fontWeight="600">acme-storefront</text>
                <g transform="translate(16, 72)">
                  <rect width="82" height="26" rx="13" fill="rgba(16,185,129,0.12)" stroke="rgba(16,185,129,0.25)" />
                  <circle cx="14" cy="13" r="3.5" fill="#10b981">
                    <animate attributeName="opacity" values="1;0.4;1" dur="1.5s" repeatCount="indefinite" />
                  </circle>
                  <text x="25" y="17" fill="#34d399" fontSize="11" fontFamily="sans-serif" fontWeight="600">Ready</text>
                </g>
              </g>
              <g transform="translate(412, 44)">
                <rect x="0" y="0" width="372" height="132" rx="12" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.08)" />
                <text x="16" y="28" fill="#64748b" fontSize="10" fontFamily="sans-serif" fontWeight="700" letterSpacing="1">PROJECT</text>
                <text x="16" y="54" fill="white" fontSize="16" fontFamily="sans-serif" fontWeight="600">docs-portal</text>
                <g transform="translate(16, 72)">
                  <rect width="92" height="26" rx="13" fill="rgba(251,191,36,0.12)" stroke="rgba(251,191,36,0.25)" />
                  <circle cx="14" cy="13" r="3.5" fill="#f59e0b">
                    <animate attributeName="opacity" values="1;0.4;1" dur="1.2s" repeatCount="indefinite" />
                  </circle>
                  <text x="25" y="17" fill="#fbbf24" fontSize="11" fontFamily="sans-serif" fontWeight="600">Building</text>
                </g>
              </g>
              <g transform="translate(16, 192)">
                <rect width="768" height="220" rx="12" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.06)" />
                <text x="16" y="28" fill="#64748b" fontSize="10" fontFamily="sans-serif" fontWeight="700" letterSpacing="1">BUILD LOG</text>

                <g transform="translate(16, 52)">
                  <circle cx="6" cy="0" r="6" fill="none" stroke="#10b981" strokeWidth="1.5" />
                  <path d="M3 -1 L5 2 L9 -2" fill="none" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" />
                  <text x="22" y="4" fill="#34d399" fontSize="12" fontFamily="monospace">Cloning repository...</text>
                </g>

                <g transform="translate(16, 80)">
                  <circle cx="6" cy="0" r="6" fill="none" stroke="#10b981" strokeWidth="1.5" />
                  <path d="M3 -1 L5 2 L9 -2" fill="none" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" />
                  <text x="22" y="4" fill="#34d399" fontSize="12" fontFamily="monospace">Installing dependencies...</text>
                </g>

                <text x="38" y="112" fill="white" fontSize="12" fontFamily="monospace" fontWeight="500">
                  Building for production...
                </text>
                <text x="16" y="162" fill="#64748b" fontSize="11" fontFamily="sans-serif" fontWeight="500">Deploy progress</text>
                <text x="752" y="162" fill="#38ef7d" fontSize="11" fontFamily="monospace" fontWeight="700" textAnchor="end">72%</text>
                <rect x="16" y="174" width="736" height="6" rx="3" fill="rgba(255,255,255,0.06)" />
                <rect x="16" y="174" width="530" height="6" rx="3" fill="url(#progress-grad)" filter="url(#glow)">
                  <animate attributeName="width" from="0" to="530" dur="1.8s" fill="freeze" calcMode="spline" keySplines="0.4 0 0.2 1" />
                </rect>
              </g>
            </svg>
          </GlassPanel>
        </div>
      </div>
    </section>
  );
}