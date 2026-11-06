import { getT } from "@/lib/i18n/server";
import Link from "next/link";
import { PUBLIC_LINKS } from "./links";

/**
 * Footer halaman publik. Tautan dan labelnya sama dengan footer landing (Fitur, Dokumentasi, Konektor Claude,
 * Privasi, Laporkan penyalahgunaan, Dukung lewat Saweria). Tata letak bertumpuk (tautan, lalu hak cipta) supaya
 * rapi di semua lebar tanpa tautan yang terpecah di sisi kanan.
 */
export function PublicFooter() {
  const t = getT();
  const linkCls = "underline-offset-4 transition-colors hover:text-text hover:underline";
  return (
    <footer className="px-4 pt-4 sm:px-6 lg:px-8" style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}>
      <div className="mx-auto max-w-4xl border-t border-[var(--line-strong)] pt-6 text-[13px] text-text-muted">
        <nav aria-label={t("Footer")} className="flex flex-wrap gap-x-5 gap-y-2 font-medium">
          {PUBLIC_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={linkCls}>
              {t(l.label)}
            </Link>
          ))}
          <Link href="/privacy" className={linkCls}>
            {t("Privasi")}
          </Link>
          <Link href="/laporkan" className={linkCls}>
            {t("Laporkan penyalahgunaan")}
          </Link>
          <a href="/donate" target="_blank" rel="noopener noreferrer" className={linkCls}>
            {t("Dukung lewat Saweria")}
          </a>
        </nav>
        <p className="mt-4">{t("© {getFullYear} Depup. Dibuat supaya deploy jadi lebih mudah.", { getFullYear: new Date().getFullYear() })}</p>
      </div>
    </footer>
  );
}
