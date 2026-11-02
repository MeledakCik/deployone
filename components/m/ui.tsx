"use client";
/**
 * Komponen bersama untuk shell app Android (/m).
 * Memakai token (globals.css), ikon (components/ui/icons) dan logo platform (PlatformIcon) yang sama dengan
 * dashboard web, jadi halaman native /m dan halaman web yang ditanam lewat <WebPage> tampil seragam.
 * Shell /m dikunci data-theme="light", sehingga token di sini selalu resolve ke tema terang.
 */
import * as React from "react";
import Link from "next/link";
import { ArrowUpRight } from "@/components/ui/icons";
import { CloudflareIcon, RailwayIcon, VercelIcon } from "@/components/ui/PlatformIcon";
import { cn } from "@/lib/utils";
import type { HistoryItem, Platform } from "@/types";

/** Kartu standar: permukaan yang sama dengan kartu di dashboard web (28px, bayangan ungu halus). */
export const CARD = "surface-solid";

/** Latar kartu hero (ungu → indigo). */
export const HERO_GRADIENT = "bg-gradient-to-br from-violet-700 via-violet-500 to-violet-400";

/** Platform yang tidak ada di tipe Platform (mis. render) tetap aman. */
export const PLATFORM_LABEL: Record<string, string> = {
  vercel: "Vercel",
  cloudflare: "Cloudflare",
  railway: "Railway",
  render: "Render",
};

/**
 * Logo platform yang sama dengan di web (bukan glyph generik). `size` dalam px; logo asli mengatur ukurannya lewat
 * style inline, jadi ukuran lewat className tidak akan berlaku. Render belum punya logo → huruf awal.
 */
export function PlatformIcon({ platform, size = 20 }: { platform: Platform | string; size?: number }) {
  if (platform === "vercel") return <VercelIcon size={size} />;
  if (platform === "cloudflare") return <CloudflareIcon size={size} />;
  if (platform === "railway") return <RailwayIcon size={size} />;
  return (
    <span aria-hidden className="grid place-items-center font-bold leading-none" style={{ width: size, height: size, fontSize: Math.round(size * 0.7) }}>
      {(PLATFORM_LABEL[platform] ?? String(platform)).charAt(0).toUpperCase()}
    </span>
  );
}

/** Kotak ikon platform. Satu warna (ungu di atas Mist), seperti di web; logonya sendiri yang membedakan platform. */
export function PlatformTile({ platform, size = 44 }: { platform: Platform | string; size?: number }) {
  return (
    <span className="flex shrink-0 items-center justify-center rounded-[14px] bg-tone-lilac text-lav-text" style={{ width: size, height: size }}>
      <PlatformIcon platform={platform} size={size >= 44 ? 20 : 18} />
    </span>
  );
}

const STATUS: Record<string, { label: string; wrap: string; dot: string }> = {
  ready: { label: "Aktif", wrap: "bg-ok-bg text-ok-fg", dot: "bg-ok" },
  building: { label: "Building", wrap: "bg-warn-bg text-warn-fg", dot: "bg-warn animate-pulse" },
  failed: { label: "Gagal", wrap: "bg-bad-bg text-bad-fg", dot: "bg-bad" },
  deleted: { label: "Dihapus", wrap: "bg-[var(--pill-bg)] text-text-muted", dot: "bg-[var(--text-faint)]" },
};

export function StatusPill({ status }: { status: string }) {
  const s = STATUS[status] ?? STATUS.deleted;
  return (
    <span className={`inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-semibold ${s.wrap}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

/** Filter berbentuk pil. Aktif = isian ungu (sama dengan .chip-on di web). */
export function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn("h-10 shrink-0 rounded-full px-4 text-[13px] font-semibold transition active:scale-95", active ? "chip-on" : "pill text-text-muted")}
    >
      {children}
    </button>
  );
}

export function SectionTitle({ children, action }: { children: React.ReactNode; action?: { href: string; label: string } }) {
  return (
    <div className="flex items-end justify-between px-1">
      <h2 className="min-w-0 text-[18px] font-bold tracking-tight text-text">{children}</h2>
      {action && (
        <Link href={action.href} className="shrink-0 whitespace-nowrap py-1 pl-3 text-[13px] font-semibold text-lav-text">
          {action.label}
        </Link>
      )}
    </div>
  );
}

export function EmptyState({ icon, title, hint, cta }: { icon: React.ReactNode; title: string; hint: string; cta?: { href: string; label: string } }) {
  return (
    <div className={`${CARD} flex flex-col items-center px-6 py-10 text-center`}>
      <span className="flex h-14 w-14 items-center justify-center rounded-[14px] bg-tone-lilac text-lav-text">{icon}</span>
      <p className="mt-4 text-[16px] font-bold tracking-tight text-text">{title}</p>
      <p className="mt-1 text-[13px] leading-snug text-text-muted">{hint}</p>
      {cta && (
        <Link href={cta.href} className="btn-primary btn-md mt-5">
          {cta.label}
        </Link>
      )}
    </div>
  );
}

export function SkeletonList({ n = 3 }: { n?: number }) {
  return (
    <div className="space-y-3" role="status" aria-label="Memuat">
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

/** Tombol kecil di dalam kartu (40px supaya mudah ditekan di layar sentuh). */
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
  const cls = cn(
    "inline-flex h-10 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-4 text-[13px] font-semibold transition active:scale-95",
    full && "w-full",
    primary ? "btn-primary" : "pill",
  );
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
      className="pill flex h-10 w-10 shrink-0 items-center justify-center text-lav-text active:scale-90"
    >
      <ArrowUpRight size={16} />
    </a>
  );
}
