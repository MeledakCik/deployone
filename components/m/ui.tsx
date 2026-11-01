"use client";
/**
 * Komponen bersama untuk shell app Android (/m).
 * Bahasa visual mengikuti referensi Stitch "Vibrant App Utility": ungu #7b50ff → indigo #9876ff,
 * kanvas putih/lavender, kartu radius besar, bayangan ungu halus, chip status pill.
 */
import * as React from "react";
import Link from "next/link";
import { ArrowUpRight, Triangle, Cloud, TrainFront, Server } from "lucide-react";
import type { HistoryItem, Platform } from "@/types";

export const M = {
  primary: "#7b50ff",
  primaryDeep: "#5a39c0",
  indigo: "#9876ff",
  ink: "#120b2e",
  muted: "#59546d",
  line: "#ede8ff",
} as const;

export const CARD =
  "rounded-[20px] bg-white shadow-[0_4px_20px_-2px_rgba(123,80,255,0.08)]";

export const HERO_GRADIENT = "bg-gradient-to-br from-[#5a39c0] via-[#7b50ff] to-[#9876ff]";

/** Halaman tidak-terdaftar di tipe Platform (mis. render) tetap aman. */
export const PLATFORM_LABEL: Record<string, string> = {
  vercel: "Vercel",
  cloudflare: "Cloudflare",
  railway: "Railway",
  render: "Render",
};

export function PlatformIcon({ platform, className = "h-5 w-5" }: { platform: Platform | string; className?: string }) {
  if (platform === "vercel") return <Triangle className={className} fill="currentColor" />;
  if (platform === "cloudflare") return <Cloud className={className} />;
  if (platform === "railway") return <TrainFront className={className} />;
  return <Server className={className} />;
}

const PLATFORM_TILE: Record<string, string> = {
  vercel: "bg-[#120b2e] text-white",
  cloudflare: "bg-[#FFF1E6] text-[#EA580C]",
  railway: "bg-[#ede8ff] text-[#5a39c0]",
  render: "bg-[#e9f6ef] text-[#047857]",
};

export function PlatformTile({ platform, size = 44 }: { platform: Platform | string; size?: number }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-[14px] ${PLATFORM_TILE[platform] ?? "bg-[#f4f1ff] text-[#7b50ff]"}`}
      style={{ width: size, height: size }}
    >
      <PlatformIcon platform={platform} className={size >= 44 ? "h-[18px] w-[18px]" : "h-4 w-4"} />
    </span>
  );
}

const STATUS: Record<string, { label: string; wrap: string; dot: string }> = {
  ready: { label: "Aktif", wrap: "bg-[#e9f6ef] text-[#047857]", dot: "bg-[#1f9d63]" },
  building: { label: "Building", wrap: "bg-[#fef5e7] text-[#92400E]", dot: "bg-[#c98a12] animate-pulse" },
  failed: { label: "Gagal", wrap: "bg-[#fdecec] text-[#B91C1C]", dot: "bg-[#d6455d]" },
  deleted: { label: "Dihapus", wrap: "bg-[#ede8ff] text-[#59546d]", dot: "bg-[#67637a]" },
};

export function StatusPill({ status }: { status: string }) {
  const s = STATUS[status] ?? STATUS.deleted;
  return (
    <span className={`inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-bold ${s.wrap}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

export function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-9 shrink-0 rounded-full px-4 text-[13px] font-semibold transition active:scale-95 ${
        active ? "bg-[#7b50ff] text-white shadow-[0_6px_14px_-4px_rgba(123,80,255,0.5)]" : "bg-[#ede8ff] text-[#59546d]"
      }`}
    >
      {children}
    </button>
  );
}

export function SectionTitle({ children, action }: { children: React.ReactNode; action?: { href: string; label: string } }) {
  return (
    <div className="flex items-end justify-between px-1">
      <h2 className="min-w-0 text-[18px] font-extrabold tracking-[-0.02em] text-[#120b2e]">{children}</h2>
      {action && (
        <Link href={action.href} className="shrink-0 whitespace-nowrap pl-3 text-[13px] font-bold text-[#7b50ff]">
          {action.label}
        </Link>
      )}
    </div>
  );
}

export function EmptyState({ icon, title, hint, cta }: { icon: React.ReactNode; title: string; hint: string; cta?: { href: string; label: string } }) {
  return (
    <div className={`${CARD} flex flex-col items-center px-6 py-10 text-center`}>
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f4f1ff] text-[#7b50ff]">{icon}</span>
      <p className="mt-4 text-[16px] font-bold text-[#120b2e]">{title}</p>
      <p className="mt-1 text-[13px] leading-snug text-[#59546d]">{hint}</p>
      {cta && (
        <Link href={cta.href} className="mt-5 inline-flex h-11 items-center whitespace-nowrap rounded-full bg-[#7b50ff] px-6 text-[14px] font-bold text-white shadow-[0_8px_16px_-4px_rgba(123,80,255,0.4)] active:scale-95">
          {cta.label}
        </Link>
      )}
    </div>
  );
}

export function SkeletonList({ n = 3 }: { n?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className={`${CARD} h-[92px] animate-pulse`} />
      ))}
    </div>
  );
}

export function hostOf(domain: string) {
  return domain.replace(/^https?:\/\//, "").replace(/\/$/, "");
}
export function hrefOf(domain: string) {
  return domain.startsWith("http") ? domain : `https://${domain}`;
}

const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const BULAN_EN: Record<string, string> = { may: "Mei", aug: "Agu", oct: "Okt", dec: "Des" };
/** Menerima "2026-10-13" (ISO) maupun "13 Oct 2026" (format riwayat web). */
export function prettyDate(raw: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (m) return `${Number(m[3])} ${BULAN[Number(m[2]) - 1]} ${m[1]}`;
  return raw.replace(/[A-Za-z]{3,}/g, (w) => BULAN_EN[w.slice(0, 3).toLowerCase()] ?? w.slice(0, 3));
}

/** Satu project = satu nama+platform (entri terbaru). Entri "deleted" disembunyikan. */
export function uniqueProjects(history: HistoryItem[]) {
  const seen = new Set<string>();
  return history.filter((h) => {
    const key = `${h.platform}:${h.name}`;
    if (seen.has(key) || h.status === "deleted") return false;
    seen.add(key);
    return true;
  });
}

export function useCopy() {
  const [copied, setCopied] = React.useState<string | null>(null);
  const copy = React.useCallback(async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied((c) => (c === id ? null : c)), 1600);
    } catch {
      /* clipboard tidak tersedia — abaikan */
    }
  }, []);
  return { copied, copy };
}

/** Tombol kecil di dalam kartu. */
export function MiniButton({
  children,
  onClick,
  href,
  primary,
  full,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  primary?: boolean;
  /** Lebar penuh sel induknya (dipakai di grid tombol agar simetris). */
  full?: boolean;
}) {
  const cls = `inline-flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[13px] font-bold transition active:scale-95 ${
    full ? "w-full" : ""
  } ${primary ? "bg-[#7b50ff] text-white" : "bg-[#f4f1ff] text-[#5a39c0]"}`;
  if (href)
    return (
      <a href={href} target="_blank" rel="noreferrer" className={cls}>
        {children}
      </a>
    );
  return (
    <button type="button" onClick={onClick} className={cls}>
      {children}
    </button>
  );
}

export function OpenLink({ domain }: { domain: string }) {
  return (
    <a
      href={hrefOf(domain)}
      target="_blank"
      rel="noreferrer"
      aria-label={`Buka ${hostOf(domain)}`}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f4f1ff] text-[#7b50ff] active:scale-90"
    >
      <ArrowUpRight className="h-4 w-4" />
    </a>
  );
}
