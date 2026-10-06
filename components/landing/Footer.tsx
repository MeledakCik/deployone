import Image from "next/image";
import Link from "next/link";

export function Footer() {
  // Link ke halaman Saweria milik admin kalau SAWERIA_USERNAME diisi; kalau tidak, ke beranda Saweria.
  const saweria = process.env.SAWERIA_USERNAME?.trim().replace(/^@/, "");
  const saweriaUrl = saweria && /^[A-Za-z0-9_.-]{2,40}$/.test(saweria) ? `https://saweria.co/${saweria}` : "https://saweria.co";
  return (
    <footer className="border-t border-white/[0.06] bg-obs-subtle/60">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-4 py-10 sm:px-8 md:flex-row md:items-center">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="" width={24} height={24} className="h-6 w-6 rounded-md" />
            <span className="f-display text-[17px] font-bold text-white">Depup</span>
          </div>
          <p className="max-w-sm text-[13px] leading-relaxed text-obs-sec">
            Dashboard untuk deploy dan kelola project di Vercel, Cloudflare Pages, dan Railway.
          </p>
        </div>

        <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-7 gap-y-2 text-[13px] text-obs-sec">
          <Link href="/dashboard" className="transition-colors hover:text-white">Panduan</Link>
          <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-white">GitHub</a>
          <a href={saweriaUrl} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-white">Dukung lewat Saweria</a>
        </nav>
      </div>
      <div className="border-t border-white/[0.06]">
        <div className="mx-auto max-w-7xl px-4 py-4 text-[12px] text-obs-mute sm:px-8">© {new Date().getFullYear()} Depup</div>
      </div>
    </footer>
  );
}
