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
      <div className="flex h-[100dvh] items-center justify-center bg-[#9E8CFF]">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
      </div>
    );
  }
  if (!user) {
    return (
      <div className="relative flex h-[100dvh] w-screen flex-col overflow-hidden overscroll-none bg-[#A78BFA] text-[#1E143F]">
        {/* BG */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-[#C9BBFF] via-[#A78BFA] to-[#8B78E6]" />
          <div className="absolute -top-24 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-white/20 blur-[80px]" />
        </div>
        {/* WRAPPER - ini kunci no scroll */}
        <div className="relative z-10 flex h-full flex-col px-5"
          style={{
            paddingTop: "max(env(safe-area-inset-top), 16px)",
            paddingBottom: "max(env(safe-area-inset-bottom), 16px)",
          }}
        >
          {/* SPACER ATAS - fleksibel biar center beneran */}
          <div className="flex-1 min-h-[8px]" />
          {/* CENTER CONTENT - gak pake pb-20 lagi */}
          <div className="flex flex-col items-center justify-center">
            <div className="animate-[fadeIn_0.6s_ease-out]">
              <img
                src="/logo.png"
                alt="Depup"
                width={72}
                height={72}
                className="mx-auto h-[clamp(56px,18vw,72px)] w-[clamp(56px,18vw,72px)] rounded-[clamp(18px,4.5vw,22px)] shadow-[0_12px_32px_-8px_rgba(76,40,184,0.5),0_0_0_1px_rgba(255,255,255,0.2)_inset]"
              />
              <h1 className="mt-[clamp(12px,3vh,20px)] text-center text-[clamp(26px,7vw,30px)] font-bold leading-none tracking-[-0.03em] text-[#1A1033]">
                Depup
              </h1>
              <p className="mt-2 text-center text-[clamp(13px,3.8vw,15px)] leading-[1.4] text-[#1A1033]/70">
                Deploy tanpa ribet, dari HP.
              </p>
              <div className="mt-[clamp(12px,2.5vh,20px)] flex items-center justify-center gap-2">
                {[
                  { label: "Vercel", dot: "bg-black" },
                  { label: "Cloudflare", dot: "bg-orange-400" },
                  { label: "Railway", dot: "bg-zinc-700" },
                ].map((b) => (
                  <div key={b.label} className="flex items-center gap-1.5 rounded-full bg-white/65 px-3 py-1.5 text-[11px] font-medium text-[#1A1033]/80 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.1)] backdrop-blur-md ring-1 ring-white/30">
                    <span className={`h-1.5 w-1.5 rounded-full ${b.dot}`} />
                    {b.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* SPACER BAWAH - sama gede kayak atas */}
          <div className="flex-1 min-h-[8px]" />
          {/* BOTTOM - fixed height, gak akan bikin scroll */}
          <div className="w-full shrink-0">
            <div className="mx-auto w-full max-w-[340px]">
              {loginError && (
                <div className="mb-3 rounded-[14px] bg-white/90 px-3.5 py-2.5 text-left shadow-lg ring-1 ring-black/5 backdrop-blur animate-[fadeIn_0.3s_ease-out]">
                  <p className="text-[12.5px] font-semibold leading-none">Login gagal</p>
                  <p className="mt-1 text-[11px] leading-snug opacity-70 line-clamp-2">{loginError}</p>
                </div>
              )}
              <button
                type="button"
                onClick={login}
                disabled={loggingIn}
                className="flex h-[50px] w-full items-center justify-center gap-2.5 rounded-[16px] bg-white text-[14px] font-semibold text-[#1A1033] shadow-[0_8px_20px_-8px_rgba(44,19,126,0.4)] transition active:scale-[0.97] disabled:opacity-60"
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
              <p className="mx-auto mt-3 text-balance text-center text-[10.5px] leading-[1.4] text-[#1A1033]/55">
                Kamu akan diarahkan ke halaman masuk Google yang asli, lalu otomatis kembali ke Depup.
              </p>
            </div>
          </div>
        </div>
        <style>{`
          @keyframes fadeIn { from { opacity:0; transform: translateY(6px) } to { opacity:1; transform: translateY(0) } }
          html, body { overscroll-behavior: none; overflow: hidden; }
          /* HP super pendek (iPhone SE) - kecilin lagi */
          @media (max-height: 600px) {
            .min-h-\[8px\] { min-height: 2px !important; }
          }
        `}</style>
      </div>
    );
  }
  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-[#F8F7FF]">
      <main className="flex-1 overflow-y-auto p-4 pb-[88px] overscroll-contain">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-50 shrink-0 border-t border-black/[0.06] bg-white/80 backdrop-blur-xl" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
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