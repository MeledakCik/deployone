"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/Toast";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { GoogleLoginModal, GoogleMark } from "./GoogleLoginModal";

const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it Works" },
  { href: "#pricing", label: "Pricing" },
  { href: "#docs", label: "Docs" },
];

export function Navbar() {
  const { user, ready } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loginOpen, setLoginOpen] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const error = searchParams.get("login_error");
    if (error) {
      showToast(error);
      router.replace("/");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  React.useEffect(() => {
    // rAF-throttled + passive: scroll fires dozens of times/sec, this makes
    // sure we only ever touch state once per animation frame instead of once
    // per event, which is what was causing extra work/jank on weak devices.
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setScrolled(window.scrollY > 20);
        ticking = false;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header
        // backdrop-blur is only turned on once we're actually scrolled — a
        // sticky element blurring nothing (transparent bg) still forces the
        // GPU to resample every scroll frame, so this was costing frames for
        // zero visual benefit at the top of the page.
        className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? "backdrop-blur-md" : ""}`}
        style={{
          background: scrolled ? "var(--glass-bg)" : "transparent",
          borderBottom: scrolled ? "1px solid var(--line)" : "1px solid transparent",
          transition: "var(--theme-transition), background-color 300ms ease, border-color 300ms ease",
        }}
      >
        <div className="mx-auto max-w-[1200px] px-6 h-[72px] flex items-center justify-between">
          <div className="flex items-center gap-10">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center relative shadow-[0_0_0_1px_rgba(15,23,42,0.06)]">
                <div className="w-2.5 h-2.5 rounded-full bg-[#3B82F6] absolute left-[9px] top-[11px] group-hover:scale-110 transition" />
              </div>
              <span className="font-bold text-[18px] tracking-[-0.02em] text-[var(--text)]">Depush</span>
            </Link>

            <nav className="hidden md:flex items-center gap-8 text-[14px] text-[var(--text-muted)]">
              {NAV_LINKS.map((link) => (
                <a key={link.href} href={link.href} className="hover:text-[var(--text)] transition">
                  {link.label}
                </a>
              ))}
            </nav>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />
            {ready && user ? (
              <Link href="/dashboard" className="btn-primary h-9 px-5 text-[13.5px] flex items-center gap-2">
                Dashboard
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setLoginOpen(true)}
                className="btn-primary h-9 px-5 text-[13.5px] flex items-center gap-2"
              >
                <GoogleMark size={16} />
                Login with Google
              </button>
            )}
          </div>

          <div className="md:hidden flex items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              className="pill w-9 h-9 flex items-center justify-center text-[var(--text)]"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div
            className="md:hidden backdrop-blur-md px-6 py-6 flex flex-col gap-5 text-[15px]"
            style={{ borderTop: "1px solid var(--line)", background: "var(--glass-bg)" }}
          >
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="text-[var(--text-muted)]"
              >
                {link.label}
              </a>
            ))}
            {ready && user ? (
              <Link
                href="/dashboard"
                onClick={() => setMenuOpen(false)}
                className="btn-primary mt-2 h-11 flex items-center justify-center gap-2"
              >
                Dashboard
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setLoginOpen(true);
                }}
                className="btn-primary mt-2 h-11 flex items-center justify-center gap-2"
              >
                <GoogleMark size={16} />
                Login with Google
              </button>
            )}
          </div>
        )}
      </header>

      <GoogleLoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  );
}
