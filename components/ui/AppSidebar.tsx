"use client";

import * as React from "react";
import Image from "next/image";
import { Menu, X } from "@/components/ui/icons";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { lockBodyScroll } from "@/lib/scroll-lock";

export interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  /** Angka kecil di kanan menu (mis. jumlah yang perlu ditinjau). Disembunyikan bila 0/null. */
  badge?: number | null;
  /** Teks untuk pembaca layar, mis. "3 laporan terbuka". */
  badgeLabel?: string;
}

export interface NavGroup {
  /** Judul kelompok. Kosongkan untuk kelompok tanpa judul. */
  label?: string;
  items: NavItem[];
}

/** Ikon DepUp sesuai latar sidebar: Putih + Ungu di tema terang, Midnight + Lime di tema gelap. */
export function BrandMark({ size, className }: { size: number; className: string }) {
  return (
    <>
      <Image src="/logo-white.png" alt="Depup logo" width={size} height={size} className={`${className} dark:hidden`} priority />
      <Image src="/logo-lime.png" alt="Depup logo" width={size} height={size} className={`${className} hidden dark:block`} priority />
    </>
  );
}

/** Kelas untuk item menu sekunder di footer sidebar (Logout, Panel Admin, dst.). */
export const SIDEBAR_LINK_CLASS =
  "flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-[13.5px] font-medium text-[var(--sidebar-muted)] transition hover:bg-[var(--sidebar-hover)] hover:text-white";

/**
 * Sidebar bersama Dashboard dan Panel Admin: top bar + drawer di mobile, kolom melayang di desktop,
 * indikator pilihan yang meluncur, kelompok menu, dan badge. Footer (profil, logout, dst.) diisi
 * lewat `footer`.
 */
export function AppSidebar({
  groups,
  active,
  onSelect,
  navLabel,
  tag,
  tagShort,
  mobileDot,
  mobileDotLabel,
  footer,
  onCloseDrawerRef,
}: {
  groups: NavGroup[];
  active: string;
  onSelect: (id: string) => void;
  navLabel: string;
  /** Label di bawah nama brand pada sidebar desktop, mis. "Mode Admin". */
  tag?: string;
  /** Label pendek di top bar mobile, mis. "Admin". */
  tagShort?: string;
  /** Titik merah di tombol menu mobile (mis. ada laporan terbuka). */
  mobileDot?: boolean;
  mobileDotLabel?: string;
  footer: React.ReactNode;
  /** Beri akses ke fungsi penutup drawer, untuk aksi di footer yang harus menutupnya (mis. logout). */
  onCloseDrawerRef?: React.MutableRefObject<(() => void) | null>;
}) {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (onCloseDrawerRef) onCloseDrawerRef.current = () => setOpen(false);
  }, [onCloseDrawerRef]);

  // Indikator seleksi: satu "pil" yang meluncur ke item aktif.
  const navRef = React.useRef<HTMLElement>(null);
  const itemRefs = React.useRef<Record<string, HTMLButtonElement | null>>({});
  const [indicator, setIndicator] = React.useState<{ y: number; h: number } | null>(null);
  const [indicatorReady, setIndicatorReady] = React.useState(false);

  const measure = React.useCallback(() => {
    const el = itemRefs.current[active];
    if (!el) return setIndicator(null);
    const y = el.offsetTop;
    const h = el.offsetHeight;
    // Jangan set state bila posisi sama: ResizeObserver sering memicu ukur ulang tanpa perubahan nyata.
    setIndicator((cur) => (cur && cur.y === y && cur.h === h ? cur : { y, h }));
  }, [active]);

  React.useLayoutEffect(() => {
    measure();
  }, [measure]);

  React.useEffect(() => {
    // Aktifkan transisi setelah posisi awal terpasang, supaya tidak meluncur dari atas saat load.
    const id = requestAnimationFrame(() => setIndicatorReady(true));
    const ro = new ResizeObserver(measure);
    if (navRef.current) ro.observe(navRef.current);
    return () => {
      cancelAnimationFrame(id);
      ro.disconnect();
    };
  }, [measure]);

  // Drawer mobile menutup otomatis saat pindah halaman, dan mengunci scroll halaman saat terbuka.
  React.useEffect(() => {
    setOpen(false);
  }, [active]);
  React.useEffect(() => {
    if (!open) return;
    return lockBodyScroll();
  }, [open]);

  // Escape menutup drawer.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {/* Top bar mobile */}
      <div className="sidebar sidebar-topbar sticky top-2 z-30 mb-3 flex items-center justify-between px-3 py-2.5 md:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Buka menu"
          className="relative grid h-10 w-10 place-items-center rounded-xl text-[var(--sidebar-muted)] transition hover:bg-[var(--sidebar-hover)] hover:text-white"
        >
          <Menu size={19} />
          {mobileDot && <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-bad ring-2 ring-[var(--sidebar-bg)]" role="img" aria-label={mobileDotLabel} />}
        </button>
        <div className="flex items-center gap-2">
          <BrandMark size={28} className="h-7 w-7 rounded-lg" />
          <span className="text-[15px] font-bold tracking-tight">Depup</span>
          {tagShort && <span className="rounded-full bg-[var(--lime)] px-2 py-0.5 text-[12px] font-bold text-[var(--lime-text)]">{tagShort}</span>}
        </div>
        <ThemeToggle />
      </div>

      {open && <div className="anim-fade fixed inset-0 z-40 bg-midnight/60 md:hidden" onClick={() => setOpen(false)} aria-hidden />}

      <aside
        className={`sidebar fixed inset-y-0 left-0 z-50 flex h-[100dvh] w-72 max-w-[82%] shrink-0 flex-col overscroll-contain p-4 transition-transform duration-300 ease-out max-md:rounded-l-none md:sticky md:top-[var(--edge)] md:z-auto md:h-[calc(100dvh-var(--edge)*2)] md:w-64 md:max-w-none md:translate-x-0 max-md:transition-[transform,visibility] ${
          open ? "translate-x-0" : "-translate-x-full max-md:invisible"
        }`}
      >
        <div className="mb-4 flex items-center justify-between px-1.5 py-2">
          <div className="flex items-center gap-2.5">
            <BrandMark size={36} className="h-9 w-9 rounded-xl" />
            <span className="leading-tight">
              <span className="block text-[18px] font-bold tracking-tight">Depup</span>
              {tag && <span className="mt-1 inline-block rounded-full bg-[var(--lime)] px-2 py-0.5 text-[12px] font-bold text-[var(--lime-text)]">{tag}</span>}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Tutup menu"
            className="grid h-10 w-10 place-items-center rounded-full text-[var(--sidebar-muted)] transition hover:bg-[var(--sidebar-hover)] hover:text-white md:hidden"
          >
            <X size={16} />
          </button>
        </div>

        <nav ref={navRef} className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain pr-0.5" aria-label={navLabel}>
          {groups.map((g, gi) => (
            <div key={g.label ?? gi} className={gi === 0 ? "space-y-1" : "mt-4 space-y-1"}>
              {g.label && <p className="px-3.5 pb-1 text-[12px] font-semibold text-[var(--sidebar-muted)] opacity-80">{g.label}</p>}
              {g.items.map((item) => {
                const isActive = active === item.id;
                return (
                  <button
                    key={item.id}
                    ref={(el) => {
                      itemRefs.current[item.id] = el;
                    }}
                    type="button"
                    data-view={item.id}
                    aria-current={isActive ? "page" : undefined}
                    className={`nav relative z-10 flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-[13.5px] font-medium transition ${
                      isActive ? "text-[var(--sidebar-active-text)]" : "text-[var(--sidebar-muted)] hover:bg-[var(--sidebar-hover)] hover:text-white"
                    }`}
                    onClick={() => onSelect(item.id)}
                  >
                    <item.icon size={18} strokeWidth={isActive ? 2.3 : 1.9} />
                    {item.label}
                    {!!item.badge && (
                      <span
                        className="ml-auto min-w-[22px] rounded-full bg-[var(--bad-solid)] px-1.5 py-0.5 text-center text-[12px] font-bold leading-none text-white tabular-nums"
                        aria-label={item.badgeLabel ?? `${item.badge}`}
                      >
                        {item.badge > 99 ? "99+" : item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
          {indicator && (
            <span
              aria-hidden
              className={`nav-indicator ${indicatorReady ? "nav-indicator-anim" : ""}`}
              style={{ transform: `translateY(${indicator.y}px)`, height: indicator.h }}
            />
          )}
        </nav>

        <div className="space-y-2 border-t border-[var(--sidebar-line)] pt-3">
          <div className="mb-1 hidden justify-end md:flex">
            <ThemeToggle />
          </div>
          {footer}
        </div>
      </aside>
    </>
  );
}
