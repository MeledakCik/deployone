import Image from "next/image";
import { DashboardLink } from "./DashboardLink";

/** Footer berada di atas kanvas ungu, jadi teksnya putih (token sidebar), bukan Ink. */
export function Footer() {
  return (
    <footer style={{ color: "var(--sidebar-text)" }}>
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-5 py-10 sm:px-8 md:flex-row md:items-center">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2.5">
            <Image src="/logo-white.png" alt="" width={28} height={28} className="h-7 w-7" />
            <span className="text-[18px] font-bold tracking-tight">Depup</span>
          </div>
          <p className="max-w-sm text-[13px] leading-relaxed">
            Dashboard untuk deploy dan kelola project di Vercel, Cloudflare Pages, dan Railway.
          </p>
        </div>

        <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-7 gap-y-2 text-[13px] font-medium">
          <DashboardLink href="/dashboard" className="underline-offset-4 transition-colors hover:underline">Panduan</DashboardLink>
          <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="underline-offset-4 transition-colors hover:underline">GitHub</a>
          <a href="/donate" target="_blank" rel="noopener noreferrer" className="underline-offset-4 transition-colors hover:underline">Dukung lewat Saweria</a>
        </nav>
      </div>
      <div className="border-t" style={{ borderColor: "var(--sidebar-line)" }}>
        <div className="mx-auto max-w-6xl px-5 py-4 text-[12px] sm:px-8">© {new Date().getFullYear()} Depup</div>
      </div>
    </footer>
  );
}
