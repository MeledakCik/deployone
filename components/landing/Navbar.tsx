"use client";

import * as React from "react";
import Link from "next/link";
import { Rocket } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useAuth } from "@/lib/auth-context";
import { GoogleLoginModal } from "./GoogleLoginModal";

const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it Works" },
  { href: "#pricing", label: "Pricing" },
  { href: "#docs", label: "Docs" },
];

export function Navbar() {
  const { user, ready } = useAuth();
  const [loginOpen, setLoginOpen] = React.useState(false);

  return (
    <>
      <div className="fixed top-4 left-0 right-0 z-50 flex justify-center px-4">
        <nav className="glass-flat flex w-full max-w-4xl items-center justify-between gap-4 rounded-pill px-4 py-2.5 sm:px-6">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 text-white">
              <Rocket size={16} />
            </span>
            <span className="text-[15px] font-semibold tracking-tight">Depush</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-pill px-3 py-1.5 text-[13px] font-medium text-text-muted transition hover:text-text hover:bg-[var(--card-hover)]"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <ThemeToggle />
            {ready && user ? (
              <Link href="/dashboard" className="pill px-4 py-2 text-[13px] font-medium hover:brightness-110">
                Dashboard
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setLoginOpen(true)}
                className="btn-primary px-4 py-2 text-[13px]"
              >
                Login with Google
              </button>
            )}
          </div>
        </nav>
      </div>

      <GoogleLoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  );
}
