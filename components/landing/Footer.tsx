import Image from "next/image";
import { DashboardLink } from "./DashboardLink";

export function Footer() {
  // Link ke halaman Saweria milik admin kalau SAWERIA_USERNAME diisi; kalau tidak, ke beranda Saweria.
  const saweria = process.env.SAWERIA_USERNAME?.trim().replace(/^@/, "");
  const saweriaUrl = saweria && /^[A-Za-z0-9_.-]{2,40}$/.test(saweria) ? `https://saweria.co/${saweria}` : "https://saweria.co";
  const link =
    "rounded-full px-3.5 py-2 transition-all duration-500 ease-bounce hover:scale-105 hover:bg-fill/15 hover:text-ink";
  return (
    <footer className="mx-auto mt-10 w-full max-w-6xl px-4 pb-10 sm:px-8">
      <div className="flex flex-col items-start justify-between gap-6 rounded-[32px] bg-card p-7 shadow-card md:flex-row md:items-center">
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="" width={28} height={28} className="h-7 w-7 rounded-lg shadow-sm" />
            <span className="text-[17px] font-semibold tracking-[-0.03em] text-ink">Depup</span>
          </div>
          <p className="max-w-sm text-[13.5px] leading-relaxed text-ink-2">
            Dashboard untuk deploy dan kelola project di Vercel, Cloudflare Pages, dan Railway.
          </p>
        </div>

        <nav aria-label="Footer" className="-mx-2 flex flex-wrap items-center gap-x-1 gap-y-1 text-[13.5px] font-medium text-ink-2">
          <DashboardLink href="/dashboard" className={link}>Panduan</DashboardLink>
          <a href="https://github.com" target="_blank" rel="noopener noreferrer" className={link}>GitHub</a>
          <a href={saweriaUrl} target="_blank" rel="noopener noreferrer" className={link}>Dukung lewat Saweria</a>
        </nav>
      </div>
      <p className="mt-5 px-3 text-[12.5px] text-ink-3">© {new Date().getFullYear()} Depup</p>
    </footer>
  );
}
