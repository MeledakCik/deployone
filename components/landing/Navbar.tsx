"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUpRight, Menu, X } from "@/components/ui/icons";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/Toast";
import { lockBodyScroll } from "@/lib/scroll-lock";
import { GoogleLoginModal, GoogleMark } from "./GoogleLoginModal";
import { DashboardLink } from "./DashboardLink";

const NAV_LINKS = [
  { href: "#fitur", label: "Fitur" },
  { href: "#cara-kerja", label: "Cara kerja" },
  { href: "#demo", label: "Demo" },
  { href: "#support", label: "Repo yang didukung" },
  { href: "#faq", label: "FAQ" },
  { href: "/docs", label: "Docs" },
];

export function Navbar() {
  const { user, ready } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loginOpen, setLoginOpen] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const headerRef = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    const error = searchParams.get("login_error");
    if (error) {
      showToast(error);
      router.replace("/");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const loggedIn = ready && !!user;

  // Menu mobile: tutup dengan Esc, klik/sentuh di luar header, dan otomatis saat layar melebar ke desktop.
  // Scroll halaman dikunci selama menu terbuka supaya latar tidak ikut bergeser di belakang menu.
  React.useEffect(() => {
    if (!menuOpen) return;
    const unlock = lockBodyScroll();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    const onPointer = (e: PointerEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const mq = window.matchMedia("(min-width: 1024px)");
    const onMq = () => mq.matches && setMenuOpen(false);
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    mq.addEventListener("change", onMq);
    return () => {
      unlock();
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
      mq.removeEventListener("change", onMq);
    };
  }, [menuOpen]);

  return (
    <>
      <header ref={headerRef} className="lp-header fixed inset-x-0 z-50">
        <div className="lp-nav mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 rounded-full pl-2.5 pr-2 sm:h-16 sm:pl-3">
          <Link href="/" className="flex items-center gap-2.5" aria-label="Depup, beranda">
            <Image src="/logo.png" alt="" width={36} height={36} priority className="h-9 w-9" />
            <span className="text-[19px] font-bold tracking-tight text-text">Depup</span>
          </Link>

          <nav
            className="hidden items-center gap-1 rounded-full bg-[var(--pill-bg)] p-1 lg:flex"
            aria-label="Utama"
          >
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="rounded-full px-4 py-2 text-[13px] font-medium text-text-muted transition-colors hover:bg-[var(--surface-solid)] hover:text-text"
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            {loggedIn ? (
              <DashboardLink
                href="/dashboard"
                className="btn-primary inline-flex h-10 items-center gap-1.5 px-5 text-[13px]"
              >
                Buka dashboard <ArrowUpRight size={14} />
              </DashboardLink>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setLoginOpen(true)}
                  className="pill inline-flex h-10 items-center gap-2 px-4 text-[13px] font-medium"
                >
                  <GoogleMark size={14} />
                  Masuk
                </button>
                <DashboardLink
                  href="/dashboard"
                  className="btn-primary inline-flex h-10 items-center gap-1.5 px-5 text-[13px]"
                >
                  Deploy sekarang <ArrowUpRight size={14} />
                </DashboardLink>
              </>
            )}
          </div>

          <button
            type="button"
            className="pill grid h-10 w-10 place-items-center lg:hidden"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Tutup menu" : "Buka menu"}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {menuOpen && (
          <div className="lp-nav mx-auto mt-2 flex max-h-[calc(100dvh-5.5rem)] max-w-6xl flex-col gap-1 overflow-y-auto overscroll-contain rounded-[28px] p-3 lg:hidden">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                className="rounded-2xl px-4 py-3 text-[15px] font-medium text-text-muted hover:bg-[var(--pill-bg)] hover:text-text"
              >
                {l.label}
              </a>
            ))}
            <div className="mt-2 flex flex-col gap-2">
              {loggedIn ? (
                <DashboardLink
                  href="/dashboard"
                  onClick={() => setMenuOpen(false)}
                  className="btn-primary flex h-12 items-center justify-center gap-1.5 text-[14px]"
                >
                  Buka dashboard <ArrowUpRight size={15} />
                </DashboardLink>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setLoginOpen(true);
                    }}
                    className="pill flex h-12 items-center justify-center gap-2 text-[14px] font-medium"
                  >
                    <GoogleMark size={16} />
                    Masuk dengan Google
                  </button>
                  <DashboardLink
                    href="/dashboard"
                    onClick={() => setMenuOpen(false)}
                    className="btn-primary flex h-12 items-center justify-center gap-1.5 text-[14px]"
                  >
                    Deploy sekarang <ArrowUpRight size={15} />
                  </DashboardLink>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      <GoogleLoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  );
}
