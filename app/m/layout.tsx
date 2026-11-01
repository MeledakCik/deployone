"use client";
import * as React from "react";
import Link from "next/link";
import "@fontsource-variable/plus-jakarta-sans";
import { Home, FolderOpen, Rocket, BookOpen, UserRound, ChevronLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { DeployProvider, useDeploy } from "@/lib/deploy-context";
import { ConfirmProvider } from "@/components/ui/confirm";
import { DeployModal } from "@/components/dashboard/DeployModal";
import { useAuth } from "@/lib/auth-context";
import type { AuthUser } from "@/types";
import { GoogleMark } from "@/components/landing/GoogleLoginModal";
const TABS = [
  { href: "/m", label: "Beranda", Icon: Home },
  { href: "/m/proyek", label: "Proyek", Icon: FolderOpen },
  { href: "/m/deploy", label: "Deploy", Icon: Rocket, fab: true },
  { href: "/m/panduan", label: "Panduan", Icon: BookOpen },
  { href: "/m/akun", label: "Akun", Icon: UserRound },
] as const;

const TITLES: Record<string, string> = {
  "/m": "Beranda",
  "/m/proyek": "Proyek",
  "/m/deploy": "Deploy",
  "/m/panduan": "Panduan",
  "/m/akun": "Akun",
  "/m/riwayat": "Riwayat Deploy",
  "/m/kelola": "Kelola Project",
  "/m/upload": "Upload Zip",
  "/m/link-instan": "Link Instan",
  "/m/ai": "AI Web Builder",
  "/m/convert": "Konversi",
  "/m/domain": "Domain",
  "/m/env": "Environment",
  "/m/pengaturan": "Pengaturan",
  "/m/donasi": "Donasi",
  "/m/komunitas": "Komunitas",
  "/m/docs": "Dokumentasi",
};

/** Halaman web dashboard yang di app ditampilkan sebagai sub-halaman /m/*. */
const VIEW_ROUTE: Record<string, string> = {
  deploy: "/m/deploy",
  projects: "/m/kelola",
  domains: "/m/domain",
  env: "/m/env",
  docs: "/m/docs",
  settings: "/m/pengaturan",
  donate: "/m/donasi",
  community: "/m/komunitas",
  upload: "/m/upload",
  hosting: "/m/link-instan",
  ai: "/m/ai",
  convert: "/m/convert",
};
export default function MobileLayout({ children }: { children: React.ReactNode }) {
  const { user, ready, login, loggingIn, loginError } = useAuth();
  const pathname = usePathname();
  if (!ready) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-[#7b50ff]">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
      </div>
    );
  }
  if (!user) {
    return (
      <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden overscroll-none bg-[#7b50ff] text-[#120b2e]">
        {/* BG */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-[#9876ff] via-[#7b50ff] to-[#5a39c0]" />
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
                className="mx-auto h-[clamp(56px,18vw,72px)] w-[clamp(56px,18vw,72px)] rounded-[clamp(18px,4.5vw,22px)] shadow-[0_12px_32px_-8px_rgba(73,46,160,0.5),0_0_0_1px_rgba(255,255,255,0.2)_inset]"
              />
              <h1 className="mt-[clamp(12px,3vh,20px)] text-center text-[clamp(26px,7vw,30px)] font-bold leading-none tracking-[-0.03em] text-white">
                Depup
              </h1>
              <p className="mt-2 text-center text-[clamp(13px,3.8vw,15px)] leading-[1.4] text-white/85">
                Deploy tanpa ribet, dari HP.
              </p>
              <div className="mt-[clamp(12px,2.5vh,20px)] flex flex-wrap items-center justify-center gap-2">
                {[
                  { label: "Vercel", dot: "bg-black" },
                  { label: "Cloudflare", dot: "bg-orange-400" },
                  { label: "Railway", dot: "bg-zinc-700" },
                ].map((b) => (
                  <div key={b.label} className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-white/65 px-3 py-1.5 text-[12px] font-medium text-[#120b2e]/80 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.1)] backdrop-blur-md ring-1 ring-white/30">
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
                <div className="mb-3 rounded-[14px] bg-white/90 px-3.5 py-2.5 text-left shadow-lg backdrop-blur animate-[fadeIn_0.3s_ease-out]">
                  <p className="text-[13px] font-semibold leading-none">Login gagal</p>
                  <p className="mt-1 text-[12px] leading-snug opacity-70 line-clamp-2">{loginError}</p>
                </div>
              )}
              <button
                type="button"
                onClick={login}
                disabled={loggingIn}
                className="flex h-[50px] w-full items-center justify-center gap-2.5 rounded-[16px] bg-white text-[14px] font-semibold text-[#120b2e] shadow-[0_8px_20px_-8px_rgba(56,35,129,0.4)] transition active:scale-[0.97] disabled:opacity-60"
              >
                {loggingIn ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#120b2e]/20 border-t-[#120b2e]" />
                    Menghubungkan...
                  </>
                ) : (
                  <>
                    <GoogleMark size={18} />
                    Lanjutkan dengan Google
                  </>
                )}
              </button>
              <p className="mx-auto mt-3 text-balance text-center text-[12px] leading-[1.4] text-white/75">
                Kamu akan diarahkan ke halaman masuk Google yang asli, lalu otomatis kembali ke Depup.
              </p>
            </div>
          </div>
        </div>
        <style>{`
          @keyframes fadeIn { from { opacity:0; transform: translateY(6px) } to { opacity:1; transform: translateY(0) } }
          html, body { overscroll-behavior: none; overflow: hidden; scrollbar-gutter: auto; }
          /* HP super pendek (iPhone SE) - kecilin lagi */
          @media (max-height: 600px) {
            .min-h-\[8px\] { min-height: 2px !important; }
          }
        `}</style>
      </div>
    );
  }
  return (
    <DeployProvider>
      <ConfirmProvider>
        <MobileShell user={user}>{children}</MobileShell>
        <DeployModal />
      </ConfirmProvider>
    </DeployProvider>
  );
}

function MobileShell({ user, children }: { user: AuthUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { view, setView } = useDeploy();

  // Komponen web memanggil setView("settings") dkk. Di app, itu diubah jadi pindah halaman /m/*.
  React.useEffect(() => {
    if (view === "dashboard") return;
    const to = VIEW_ROUTE[view];
    setView("dashboard");
    if (to) router.push(to);
  }, [view, setView, router]);

  const title = TITLES[pathname] ?? "Depup";
  const isSub = !TABS.some((t) => t.href === pathname) && pathname !== "/m/riwayat";
  const initial = (user.name || user.email || "D").trim().charAt(0).toUpperCase();
  return (
    <div data-theme="light" className="flex h-[100dvh] flex-col overflow-hidden bg-[#f4f1ff] font-sans text-[#120b2e]">
      <style>{`html, body { overflow: hidden; overscroll-behavior: none; scrollbar-gutter: auto; background: #f4f1ff; }`}</style>
      {/* Top bar */}
      <header
        className="z-40 shrink-0 bg-[#f4f1ff]/90 backdrop-blur-xl"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="flex h-16 items-center justify-between gap-3 px-4">
          <div className="flex min-w-0 items-center gap-2.5">
            {isSub ? (
              <button
                type="button"
                onClick={() => router.back()}
                aria-label="Kembali"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#ede8ff] text-[#5a39c0] active:scale-90"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            ) : (
              <img src="/logo.png" alt="" width={36} height={36} className="h-9 w-9 shrink-0 rounded-[11px] shadow-[0_6px_14px_-6px_rgba(123,80,255,0.6)]" />
            )}
            <div className="flex min-w-0 flex-col leading-none">
              <span className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#59546d]">Depup Cloud</span>
              <h1 className="mt-1 truncate text-[18px] font-extrabold tracking-[-0.02em]">{title}</h1>
            </div>
          </div>
          <Link
            href="/m/akun"
            aria-label="Akun"
            className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#7b50ff] to-[#9876ff] text-[14px] font-bold text-white ring-2 ring-white shadow-[0_4px_12px_-2px_rgba(123,80,255,0.5)] active:scale-90"
          >
            {user.picture ? <img src={user.picture} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" /> : initial}
          </Link>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto overscroll-contain px-4 pb-[120px] pt-1">
        <div className="mx-auto w-full max-w-[540px]">{children}</div>
      </main>

      {/* Bottom nav ala super-app: tombol Deploy menonjol di tengah */}
      <nav
        className="fixed inset-x-0 bottom-0 z-50 bg-white/95 shadow-[0_-10px_25px_-5px_rgba(18,11,46,0.08)] backdrop-blur-md"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Navigasi utama"
      >
        <div className="mx-auto grid h-[64px] max-w-[540px] grid-cols-5">
          {TABS.map((t) => {
            const active = t.href === "/m" ? pathname === "/m" || pathname === "/m/riwayat" : pathname.startsWith(t.href);
            if ("fab" in t) {
              return (
                <Link key={t.href} href={t.href} aria-current={active ? "page" : undefined} className="relative flex flex-col items-center justify-center gap-1 active:scale-95">
                  <span aria-hidden className="h-[22px] w-[22px]" />
                  <span
                    className={`absolute -top-8 flex h-[58px] w-[58px] items-center justify-center rounded-full bg-gradient-to-br from-[#7b50ff] to-[#9876ff] text-white ring-4 ring-[#f4f1ff] shadow-[0_8px_16px_-2px_rgba(123,80,255,0.5)] transition ${active ? "scale-105" : ""}`}
                  >
                    <t.Icon className="h-6 w-6" strokeWidth={2.2} />
                  </span>
                  <span className={`text-[12px] leading-4 ${active ? "font-extrabold text-[#7b50ff]" : "font-semibold text-[#59546d]"}`}>{t.label}</span>
                  <span aria-hidden className="h-1 w-1" />
                </Link>
              );
            }
            return (
              <Link key={t.href} href={t.href} aria-current={active ? "page" : undefined} className="flex flex-col items-center justify-center gap-1 active:scale-95">
                <t.Icon className={`h-[22px] w-[22px] transition ${active ? "text-[#7b50ff]" : "text-[#67637a]"}`} strokeWidth={active ? 2.4 : 2} />
                <span className={`text-[12px] leading-4 ${active ? "font-extrabold text-[#7b50ff]" : "font-semibold text-[#59546d]"}`}>{t.label}</span>
                <span className={`h-1 w-1 rounded-full transition ${active ? "bg-[#7b50ff] shadow-[0_0_6px_#7b50ff]" : "bg-transparent"}`} />
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
