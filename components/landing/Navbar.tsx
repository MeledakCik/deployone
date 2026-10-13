"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/Toast";
import { GoogleLoginModal, GoogleMark } from "./GoogleLoginModal";
import { DashboardLink } from "./DashboardLink";

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
      <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-6 sm:pt-4">
        <div className="nav-float rise mx-auto max-w-5xl rounded-[28px]">
          <div className="flex h-14 items-center justify-between gap-3 pl-4 pr-2 sm:pl-5">
            <Link href="/" className="flex items-center gap-2.5" aria-label="Depup, beranda">
              <Image src="/logo.png" alt="" width={32} height={32} priority className="h-8 w-8 rounded-[10px] shadow-sm" />
              <span className="text-[18px] font-semibold tracking-[-0.03em] text-ink">Depup</span>
            </Link>

            <nav className="hidden items-center gap-1 md:flex" aria-label="Utama">
              {NAV_LINKS.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  className="rounded-full px-3.5 py-2 text-[13px] font-medium text-ink-2 transition-all duration-500 ease-bounce hover:scale-105 hover:bg-fill/15 hover:text-ink"
                >
                  {l.label}
                </a>
              ))}
            </nav>

            <div className="hidden items-center gap-2 md:flex">
              {loggedIn ? (
                <DashboardLink
                  href="/dashboard"
                  className="btn-ink inline-flex h-10 items-center gap-1.5 rounded-full px-5 text-[13px] font-semibold"
                >
                  Buka dashboard <ArrowUpRight size={15} />
                </DashboardLink>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setLoginOpen(true)}
                    className="btn-soft inline-flex h-10 items-center gap-2 rounded-full px-4 text-[13px] font-medium"
                  >
                    <GoogleMark size={14} />
                    Masuk
                  </button>
                  <DashboardLink
                    href="/dashboard"
                    className="btn-ink inline-flex h-10 items-center gap-1.5 rounded-full px-5 text-[13px] font-semibold"
                  >
                    Deploy sekarang <ArrowUpRight size={15} />
                  </DashboardLink>
                </>
              )}
            </div>

            <button
              type="button"
              className="btn-soft grid h-10 w-10 place-items-center rounded-full md:hidden"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? "Tutup menu" : "Buka menu"}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>

          {/* Menu mobile: turun dengan gerakan spring */}
          <div
            className="grid transition-[grid-template-rows,opacity] duration-[700ms] ease-soft md:hidden"
            style={{ gridTemplateRows: menuOpen ? "1fr" : "0fr", opacity: menuOpen ? 1 : 0 }}
            aria-hidden={!menuOpen}
          >
            <div className="overflow-hidden">
              <div className="flex flex-col gap-1 px-3 pb-3 pt-1">
                {NAV_LINKS.map((l) => (
                  <a
                    key={l.href}
                    href={l.href}
                    tabIndex={menuOpen ? 0 : -1}
                    onClick={() => setMenuOpen(false)}
                    className="rounded-2xl px-4 py-3 text-[15px] font-medium text-ink-2 transition-colors hover:bg-fill/15 hover:text-ink"
                  >
                    {l.label}
                  </a>
                ))}
                <div className="mt-2 flex flex-col gap-2">
                  {loggedIn ? (
                    <DashboardLink
                      href="/dashboard"
                      onClick={() => setMenuOpen(false)}
                      className="btn-ink flex h-12 items-center justify-center gap-1.5 rounded-full text-[14px] font-semibold"
                    >
                      Buka dashboard <ArrowUpRight size={16} />
                    </DashboardLink>
                  ) : (
                    <>
                      <button
                        type="button"
                        tabIndex={menuOpen ? 0 : -1}
                        onClick={() => {
                          setMenuOpen(false);
                          setLoginOpen(true);
                        }}
                        className="btn-soft flex h-12 items-center justify-center gap-2 rounded-full text-[14px] font-medium"
                      >
                        <GoogleMark size={16} />
                        Masuk dengan Google
                      </button>
                      <DashboardLink
                        href="/dashboard"
                        onClick={() => setMenuOpen(false)}
                        className="btn-ink flex h-12 items-center justify-center gap-1.5 rounded-full text-[14px] font-semibold"
                      >
                        Deploy sekarang <ArrowUpRight size={16} />
                      </DashboardLink>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <GoogleLoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  );
}
