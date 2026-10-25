"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight } from "@/components/ui/icons";
import { useAuth } from "@/lib/auth-context";
import { GoogleLoginModal, GoogleMark } from "@/components/landing/GoogleLoginModal"; // Sesuaikan path ini dengan lokasi asli GoogleLoginModal
import { DashboardLink } from "@/components/landing/DashboardLink"; // Sesuaikan path ini

export function PublicHeader() {
  const { user, ready } = useAuth();
  const [loginOpen, setLoginOpen] = React.useState(false);
  const loggedIn = ready && !!user;

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-[var(--line-strong)] bg-[var(--surface-solid)]/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 w-full max-w-4xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="text-[17px] font-bold tracking-tight transition-opacity hover:opacity-80"
          >
            Depup.
          </Link>

          <div className="flex items-center gap-2">
            {loggedIn ? (
              <DashboardLink
                href="/dashboard"
                className="btn-primary inline-flex h-9 items-center gap-1.5 px-4 text-[13px]"
              >
                Buka dashboard <ArrowUpRight size={14} />
              </DashboardLink>
            ) : (
              <button
                type="button"
                onClick={() => setLoginOpen(true)}
                className="pill inline-flex h-9 items-center gap-2 px-4 text-[13px] font-medium transition-colors hover:brightness-95"
              >
                <GoogleMark size={14} />
                Masuk
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Render Modal di sini agar bisa dipanggil dari Header */}
      <GoogleLoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  );
}