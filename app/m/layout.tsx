"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

const TABS = [
  { href: "/m", label: "Projects" },
  { href: "/m/deploy", label: "Deploy" },
  { href: "/m/riwayat", label: "Riwayat" },
];

/** Cangkang mobile: login, tab bawah, area aman (notch). Server & API = web yang sama. */
export default function MobileLayout({ children }: { children: React.ReactNode }) {
  const { user, ready, login, loggingIn, loginError } = useAuth();
  const pathname = usePathname();

  if (!ready) {
    return <div className="flex min-h-[100dvh] items-center justify-center text-sm opacity-60">Memuat…</div>;
  }

  if (!user) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-2xl font-semibold">Depup</h1>
        <p className="text-sm opacity-70">Deploy tanpa ribet, dari HP.</p>
        <button
          onClick={login}
          disabled={loggingIn}
          className="w-full max-w-xs rounded-xl bg-violet-600 px-4 py-3 font-medium text-white disabled:opacity-60"
        >
          {loggingIn ? "Menunggu login Google…" : "Masuk dengan Google"}
        </button>
        {loginError && (
          <p role="alert" className="max-w-xs text-sm text-red-500">
            {loginError}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <main className="flex-1 p-4 pb-24">{children}</main>
      <nav
        className="fixed inset-x-0 bottom-0 grid grid-cols-3 border-t border-black/10 bg-white dark:border-white/10 dark:bg-neutral-950"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {TABS.map((t) => {
          const active = pathname === t.href;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`py-3 text-center text-sm ${active ? "font-semibold text-violet-600" : "opacity-60"}`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
