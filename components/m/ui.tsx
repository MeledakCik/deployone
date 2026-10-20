"use client";
/**
 * Komponen bersama untuk shell app Android (/m).
 * Bahasa visual mengikuti referensi Stitch "Vibrant App Utility": ungu #7C3AED → indigo #6366F1,
 * kanvas putih/lavender, kartu radius besar, bayangan ungu halus, chip status pill.
 */
import * as React from "react";
import Link from "next/link";
import { ArrowUpRight, Triangle, Cloud, TrainFront, Server } from "lucide-react";
import type { HistoryItem, Platform } from "@/types";

export const M = {
  primary: "#7C3AED",
  primaryDeep: "#6D28D9",
  indigo: "#6366F1",
  ink: "#141B2B",
  muted: "#64748B",
  line: "#EDE9FE",
} as const;

export const CARD =
  "rounded-[20px] bg-white ring-1 ring-[#EDE9FE] shadow-[0_4px_20px_-2px_rgba(124,58,237,0.08)]";

export const HERO_GRADIENT = "bg-gradient-to-br from-[#6D28D9] via-[#7C3AED] to-[#6366F1]";

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
  vercel: "bg-[#141B2B] text-white",
  cloudflare: "bg-[#FFF1E6] text-[#EA580C]",
  railway: "bg-[#EEF2FF] text-[#4F46E5]",
  render: "bg-[#ECFDF5] text-[#047857]",
};

export function PlatformTile({ platform, size = 44 }: { platform: Platform | string; size?: number }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-[14px] ${PLATFORM_TILE[platform] ?? "bg-[#F5F3FF] text-[#7C3AED]"}`}
      style={{ width: size, height: size }}
    >
      <PlatformIcon platform={platform} className={size >= 44 ? "h-[18px] w-[18px]" : "h-4 w-4"} />
    </span>
  );
}

const STATUS: Record<string, { label: string; wrap: string; dot: string }> = {
  ready: { label: "Aktif", wrap: "bg-[#ECFDF5] text-[#065F46]", dot: "bg-[#10B981]" },
  building: { label: "Building", wrap: "bg-[#FFFBEB] text-[#92400E]", dot: "bg-[#F59E0B] animate-pulse" },
  failed: { label: "Gagal", wrap: "bg-[#FEF2F2] text-[#B91C1C]", dot: "bg-[#EF4444]" },
  deleted: { label: "Dihapus", wrap: "bg-[#F1F5F9] text-[#64748B]", dot: "bg-[#94A3B8]" },
};

export function StatusPill({ status }: { status: string }) {
  const s = STATUS[status] ?? STATUS.deleted;
  return (
    <span className={`inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-bold ${s.wrap}`}>
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
        active ? "bg-[#7C3AED] text-white shadow-[0_6px_14px_-4px_rgba(124,58,237,0.5)]" : "bg-[#F1EEFF] text-[#4A4455]"
      }`}
    >
      {children}
    </button>
  );
}

export function SectionTitle({ children, action }: { children: React.ReactNode; action?: { href: string; label: string } }) {
  return (
    <div className="flex items-end justify-between px-1">
      <h2 className="text-[17px] font-extrabold tracking-[-0.02em] text-[#141B2B]">{children}</h2>
      {action && (
        <Link href={action.href} className="text-[13px] font-bold text-[#7C3AED]">
          {action.label}
        </Link>
      )}
    </div>
  );
}

export function EmptyState({ icon, title, hint, cta }: { icon: React.ReactNode; title: string; hint: string; cta?: { href: string; label: string } }) {
  return (
    <div className={`${CARD} flex flex-col items-center px-6 py-10 text-center`}>
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F5F3FF] text-[#7C3AED]">{icon}</span>
      <p className="mt-4 text-[16px] font-bold text-[#141B2B]">{title}</p>
      <p className="mt-1 text-[13px] leading-snug text-[#64748B]">{hint}</p>
      {cta && (
        <Link href={cta.href} className="mt-5 inline-flex h-11 items-center rounded-full bg-[#7C3AED] px-6 text-[14px] font-bold text-white shadow-[0_8px_16px_-4px_rgba(124,58,237,0.4)] active:scale-95">
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
}: {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  primary?: boolean;
}) {
  const cls = `inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[12.5px] font-bold transition active:scale-95 ${
    primary ? "bg-[#7C3AED] text-white" : "bg-[#F5F3FF] text-[#6D28D9] ring-1 ring-[#DDD6FE]"
  }`;
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
      className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F5F3FF] text-[#7C3AED] active:scale-90"
    >
      <ArrowUpRight className="h-4 w-4" />
    </a>
  );
}
