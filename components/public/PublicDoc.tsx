import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Kerangka halaman publik (tanpa login) untuk dokumen statis: privasi, dokumentasi konektor, dst.
 * Server component murni — tidak memakai AuthProvider/cookie, jadi bisa dibuka siapa saja (termasuk reviewer).
 */
export function PublicDoc({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <main className="app-canvas px-5 py-10 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <nav aria-label="Navigasi dokumen" className="mb-6 flex flex-wrap items-center gap-2 text-[12.5px]">
          <Link href="/" className="pill px-3 py-1.5 font-medium">Depup</Link>
          <Link href="/docs/mcp" className="pill px-3 py-1.5">Dokumentasi konektor Claude</Link>
          <Link href="/privacy" className="pill px-3 py-1.5">Kebijakan privasi</Link>
        </nav>
        <article className="surface-solid rounded-3xl p-5 sm:p-8">
          <h1 className="page-title">{title}</h1>
          <p className="mt-1 text-[12px] text-text-muted">Terakhir diperbarui: {updated}</p>
          <div className="mt-6 space-y-4 text-[13.5px] leading-relaxed [&_a]:underline [&_a]:underline-offset-4 [&_code]:rounded [&_code]:bg-[var(--pill-bg)] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[12.5px] [&_h2]:mt-8 [&_h2]:text-[16px] [&_h2]:font-semibold [&_h3]:mt-5 [&_h3]:text-[14px] [&_h3]:font-semibold [&_li]:mt-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-[var(--pill-bg)] [&_pre]:p-3 [&_pre]:font-mono [&_pre]:text-[12.5px] [&_ul]:list-disc [&_ul]:pl-5">
            {children}
          </div>
        </article>
      </div>
    </main>
  );
}
