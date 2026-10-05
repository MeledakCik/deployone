"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/Toast";
import { GoogleLoginModal, GoogleMark } from "./GoogleLoginModal";

const NAV_LINKS = [
  { href: "#fitur", label: "Fitur" },
  { href: "#cara-kerja", label: "Cara kerja" },
  { href: "#support", label: "Repo yang didukung" },
];

export function Navbar() {
  const { user, ready } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loginOpen, setLoginOpen] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);

  React.useEffect(() => {
    const error = searchParams.get("login_error");
    if (error) {
      showToast(error);
      router.replace("/");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const loggedIn = ready && !!user;

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.06] bg-obs-subtle/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-8">
          <div className="flex items-center gap-10">
            <Link href="/" className="flex items-center gap-2.5" aria-label="Depup, beranda">
              <Image src="/logo.png" alt="" width={32} height={32} priority className="h-8 w-8 rounded-lg" />
              <span className="f-display text-[20px] font-bold tracking-tight text-white">Depup</span>
            </Link>
            <nav className="hidden items-center gap-7 md:flex" aria-label="Utama">
              {NAV_LINKS.map((l) => (
                <a key={l.href} href={l.href} className="text-[13px] text-obs-sec transition-colors hover:text-white">
                  {l.label}
                </a>
              ))}
            </nav>
          </div>

          <div className="hidden items-center gap-2.5 md:flex">
            {loggedIn ? (
              <Link
                href="/dashboard"
                className="obs-btn-primary inline-flex h-9 items-center gap-1.5 rounded-lg px-4 text-[13px] font-semibold text-white"
              >
                Buka dashboard <ArrowUpRight size={14} />
              </Link>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setLoginOpen(true)}
                  className="obs-btn-glass inline-flex h-9 items-center gap-2 rounded-lg px-4 text-[13px] font-medium text-white"
                >
                  <GoogleMark size={14} />
                  Masuk
                </button>
                <Link
                  href="/dashboard"
                  className="obs-btn-primary inline-flex h-9 items-center gap-1.5 rounded-lg px-4 text-[13px] font-semibold text-white"
                >
                  Deploy sekarang <ArrowUpRight size={14} />
                </Link>
              </>
            )}
          </div>

          <button
            type="button"
            className="obs-btn-glass grid h-9 w-9 place-items-center rounded-lg text-white md:hidden"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Tutup menu" : "Buka menu"}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {menuOpen && (
          <div className="flex flex-col gap-1 border-t border-white/[0.06] bg-obs-subtle/95 px-4 py-4 backdrop-blur-xl md:hidden">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                className="rounded-lg px-3 py-3 text-[15px] text-obs-sec hover:bg-white/5 hover:text-white"
              >
                {l.label}
              </a>
            ))}
            <div className="mt-3 flex flex-col gap-2">
              {loggedIn ? (
                <Link
                  href="/dashboard"
                  onClick={() => setMenuOpen(false)}
                  className="obs-btn-primary flex h-11 items-center justify-center gap-1.5 rounded-lg text-[14px] font-semibold text-white"
                >
                  Buka dashboard <ArrowUpRight size={15} />
                </Link>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setLoginOpen(true);
                    }}
                    className="obs-btn-glass flex h-11 items-center justify-center gap-2 rounded-lg text-[14px] font-medium text-white"
                  >
                    <GoogleMark size={16} />
                    Masuk dengan Google
                  </button>
                  <Link
                    href="/dashboard"
                    onClick={() => setMenuOpen(false)}
                    className="obs-btn-primary flex h-11 items-center justify-center gap-1.5 rounded-lg text-[14px] font-semibold text-white"
                  >
                    Deploy sekarang <ArrowUpRight size={15} />
                  </Link>
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
