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
export default function MobileLayout({ children }: { children: React.ReactNode }) {
  const { user, ready, login, loggingIn, loginError } = useAuth();
  const pathname = usePathname();
  if (!ready) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#9E8CFF]">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
      </div>
    );
  }
  if (!user) {
    return (
      <div className="relative flex min-h-[100dvh] flex-col bg-[#A78BFA] px-5 text-[#1E143F]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-[#C9BBFF] via-[#A78BFA] to-[#8B78E6]" />
          <div className="absolute -top-24 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-white/20 blur-[80px]" />
        </div>
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center pb-20">
          <div className="animate-[fadeIn_0.6s_ease-out]">
            <img
              src="/logo.png"
              alt="Depup"
              width={72}
              height={72}
              className="mx-auto h-[72px] w-[72px] rounded-[22px] shadow-[0_12px_32px_-8px_rgba(76,40,184,0.5),0_0_0_1px_rgba(255,255,255,0.2)_inset]"
            />
            <h1 className="mt-5 text-center text-[30px] font-bold leading-none tracking-[-0.03em] text-[#1A1033]">Depup</h1>
            <p className="mt-2.5 text-center text-[15px] leading-[1.4] text-[#1A1033]/70">
              Deploy tanpa ribet, dari HP.
            </p>
            <div className="mt-5 flex items-center justify-center gap-2">
              {[
                { label: "Vercel", dot: "bg-black" },
                { label: "Cloudflare", dot: "bg-orange-400" },
                { label: "Railway", dot: "bg-zinc-700" },
              ].map((b) => (
                <div key={b.label} className="flex items-center gap-1.5 rounded-full bg-white/65 px-3 py-1.5 text-[11px] font-medium tracking-wide text-[#1A1033]/80 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.1)] backdrop-blur-md ring-1 ring-white/30">
                  <span className={`h-1.5 w-1.5 rounded-full ${b.dot}`} />
                  {b.label}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="relative z-10 w-full pb-[max(env(safe-area-inset-bottom),16px)]">
          <div className="mx-auto w-full max-w-[340px] animate-[fadeIn_0.6s_ease-out_0.15s_both]">
            {loginError && (
              <div className="mb-3 rounded-[16px] bg-white/90 px-4 py-3 text-left shadow-lg ring-1 ring-black/5 backdrop-blur">
                <p className="text-[13px] font-semibold">Login gagal</p>
                <p className="mt-0.5 text-[12px] leading-snug opacity-70">{loginError}</p>
              </div>
            )}
            <button
              type="button"
              onClick={login}
              disabled={loggingIn}
              className="flex h-[52px] w-full items-center justify-center gap-2.5 rounded-[16px] bg-white text-[14.5px] font-semibold text-[#1A1033] shadow-[0_8px_20px_-8px_rgba(44,19,126,0.4),0_0_0_1px_rgba(0,0,0,0.04)] transition-all active:scale-[0.98] active:shadow-none disabled:opacity-60"
            >
              {loggingIn ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#1A1033]/20 border-t-[#1A1033]" />
                  Menghubungkan...
                </>
              ) : (
                <>
                  <GoogleMark size={18} />
                  Lanjutkan dengan Google
                </>
              )}
            </button>
            <p className="mx-auto mt-3.5 max-w-[300px] text-center text-[11.5px] leading-[1.5] text-[#1A1033]/60">
              Kamu akan diarahkan ke halaman masuk Google yang asli, lalu otomatis kembali ke Depup.
            </p>
          </div>
        </div>
        <style>{`@keyframes fadeIn { from { opacity:0; transform: translateY(8px) } to { opacity:1; transform: translateY(0) } }`}</style>
      </div>
    );
  }
  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#F8F7FF]">
      <main className="flex-1 p-4 pb-[88px]">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-black/[0.06] bg-white/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/70" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="mx-auto grid max-w-md grid-cols-3">
          {TABS.map((t) => {
            const active = pathname === t.href;
            return (
              <Link key={t.href} href={t.href} className={`relative flex flex-col items-center justify-center gap-1 py-3.5 text-[11px] font-medium transition ${active ? "text-[#6D28D9]" : "text-black/40"}`}>
                {active && <span className="absolute top-0 h-[2.5px] w-8 rounded-full bg-[#6D28D9]" />}
                <span className={`${active ? "font-semibold" : ""}`}>{t.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}