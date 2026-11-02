import Link from "next/link";
import { PUBLIC_LINKS } from "./links";

/**
 * Footer halaman publik. Tautan dan labelnya sama dengan footer landing (Fitur, Dokumentasi, Konektor Claude,
 * Privasi, Laporkan penyalahgunaan, Dukung lewat Saweria). Tata letak bertumpuk (tautan, lalu hak cipta) supaya
 * rapi di semua lebar tanpa tautan yang terpecah di sisi kanan.
 */
export function PublicFooter() {
  const linkCls = "underline-offset-4 transition-colors hover:text-text hover:underline";
  return (
    <footer className="px-4 pt-4 sm:px-6 lg:px-8" style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}>
      <div className="mx-auto max-w-4xl border-t border-[var(--line-strong)] pt-6 text-[13px] text-text-muted">
        <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2 font-medium">
          {PUBLIC_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={linkCls}>
              {l.label}
            </Link>
          ))}
          <Link href="/privacy" className={linkCls}>
            Privasi
          </Link>
          <Link href="/laporkan" className={linkCls}>
            Laporkan penyalahgunaan
          </Link>
          <a href="/donate" target="_blank" rel="noopener noreferrer" className={linkCls}>
            Dukung lewat Saweria
          </a>
        </nav>
        <p className="mt-4">&copy; {new Date().getFullYear()} Depup. Dibuat untuk memudahkan deploy.</p>
      </div>
    </footer>
  );
}
