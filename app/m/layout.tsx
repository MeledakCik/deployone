"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { GoogleMark } from "@/components/landing/GoogleLoginModal";

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
      <div
        className="relative flex min-h-[100dvh] flex-col overflow-hidden px-6"
        style={{
          paddingTop: "max(env(safe-area-inset-top), 24px)",
          paddingBottom: "max(env(safe-area-inset-bottom), 24px)",
        }}
      >
        {/* Hiasan latar: dua lingkaran lembut, murni dekoratif */}
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/30 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-28 -left-24 h-72 w-72 rounded-full bg-[#c6f432]/25 blur-3xl" />

        <div className="anim-fade relative flex flex-1 flex-col items-center justify-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Depup"
            width={88}
            height={88}
            className="h-[88px] w-[88px] rounded-[26px] shadow-[0_24px_50px_-18px_rgba(56,35,129,0.65)]"
          />
          <h1 className="mt-6 text-[34px] font-bold leading-none tracking-[-0.04em] text-[var(--text)]">Depup</h1>
          <p className="mt-3 max-w-[18rem] text-[15px] leading-relaxed text-[var(--text-muted)]">
            Deploy tanpa ribet, dari HP.
          </p>

          <ul className="mt-7 flex flex-wrap items-center justify-center gap-2 text-[12.5px] font-medium text-[var(--text)]">
            {["Vercel", "Cloudflare", "Railway"].map((n) => (
              <li key={n} className="rounded-full bg-white/60 px-3 py-1.5 backdrop-blur">
                {n}
              </li>
            ))}
          </ul>
        </div>

        <div className="anim-fade relative mx-auto w-full max-w-sm pb-2">
          {loginError && (
            <div
              role="alert"
              className="mb-4 flex items-start gap-3 rounded-2xl bg-white p-4 text-left shadow-[0_16px_34px_-20px_rgba(90,57,192,0.45)]"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden className="mt-0.5 shrink-0 text-red-500">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                <path d="M12 7v6m0 3.5v.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <div className="min-w-0">
                <p className="text-[13.5px] font-semibold text-[#120b2e]">Login belum berhasil</p>
                <p className="mt-0.5 break-words text-[12.5px] leading-snug text-[#120b2e]/70">{loginError}</p>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={login}
            disabled={loggingIn}
            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-5 py-4 text-[15px] font-semibold text-[#120b2e] shadow-[0_18px_36px_-18px_rgba(56,35,129,0.7)] transition active:scale-[0.98] disabled:opacity-70"
          >
            {loggingIn ? (
              <>
                <svg className="h-5 w-5 animate-spin text-[#7b50ff]" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                  <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
                <span>Menunggu login Google…</span>
              </>
            ) : (
              <>
                <GoogleMark size={20} />
                <span>Lanjutkan dengan Google</span>
              </>
            )}
          </button>

          <p className="mt-4 text-center text-[12px] leading-relaxed text-[var(--text-muted)]">
            Kamu akan diarahkan ke halaman masuk Google yang asli, lalu otomatis kembali ke Depup.
          </p>
        </div>
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
