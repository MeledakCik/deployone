"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { PUBLIC_LINKS } from "./links";

/**
 * Header halaman publik (/fitur, /docs, /privacy, dst.): pil melayang dengan logo, tautan utama, dan satu aksi.
 * Bentuknya mengikuti navbar landing, tetapi warnanya mengikuti tema lewat token.
 * Di layar kecil tautan turun ke baris kedua yang bisa digeser, jadi semua tujuan tetap terlihat tanpa menu tersembunyi.
 *
 * `cta` boleh diisi komponen yang sadar-login (PublicAuthCta). Tanpa `cta`, header tidak memuat sesi sama sekali,
 * sehingga halaman dokumen hukum tetap bisa dibuka siapa saja (termasuk reviewer).
 */
export function PublicNav({ cta }: { cta?: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const isActive = (href: string) => (href === "/docs" ? pathname === "/docs" : pathname === href || pathname.startsWith(`${href}/`));

  return (
    <header className="sticky top-0 z-40 px-3 pb-2 sm:px-6" style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}>
      <div className="pub-nav mx-auto flex max-w-4xl flex-wrap items-center gap-x-3 gap-y-1 rounded-[28px] p-2 pl-3 md:flex-nowrap md:rounded-full">
        <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="Depup, beranda">
          <Image src="/logo.png" alt="" width={32} height={32} priority className="h-8 w-8" />
          <span className="text-[18px] font-bold tracking-tight text-text">Depup</span>
        </Link>

        <nav
          aria-label="Halaman publik"
          className="order-last -mx-1 flex w-full gap-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none] md:order-none md:mx-0 md:ml-2 md:w-auto md:flex-1 md:overflow-visible md:p-0 [&::-webkit-scrollbar]:hidden"
        >
          {PUBLIC_LINKS.map((l) => {
            const active = isActive(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex shrink-0 items-center rounded-full px-3.5 py-2 text-[13px] font-medium transition-colors max-md:min-h-[40px]",
                  active ? "bg-[var(--pill-bg)] text-text" : "text-text-muted hover:bg-[var(--pill-bg)] hover:text-text",
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto shrink-0">
          {cta ?? (
            <Link href="/dashboard" className="btn-primary btn-md">
              Buka dashboard <ArrowUpRight size={14} />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
