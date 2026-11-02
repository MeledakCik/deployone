import type { ReactNode } from "react";
import { PublicShell } from "./PublicShell";

/**
 * Kerangka halaman dokumen statis (privasi, dokumentasi konektor, dst.).
 * Server component murni: tidak memakai AuthProvider/cookie, jadi bisa dibuka siapa saja (termasuk reviewer).
 * Header dan footer datang dari PublicShell, sama dengan halaman publik lain.
 */
export function PublicDoc({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <PublicShell width="3xl">
      <article className="surface-solid p-5 sm:p-10">
        <h1 className="page-title">{title}</h1>
        <p className="mt-2 text-[13px] text-text-muted">Terakhir diperbarui: {updated}</p>
        {/* Lebar baca dibatasi ±72 karakter; blok kode & tabel menggulir di dalamnya. */}
        <div className="mt-8 max-w-[72ch] space-y-4 text-[15px] leading-[1.7] [&_a]:font-medium [&_a]:text-lav-text [&_a]:underline [&_a]:underline-offset-4 [&_code]:rounded-md [&_code]:bg-[var(--pill-bg)] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[13px] [&_h2]:mt-10 [&_h2]:text-[18px] [&_h2]:font-bold [&_h2]:tracking-tight [&_h3]:mt-6 [&_h3]:text-[15px] [&_h3]:font-semibold [&_li]:mt-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_pre]:overflow-x-auto [&_pre]:rounded-2xl [&_pre]:bg-[var(--pill-bg)] [&_pre]:p-4 [&_pre]:font-mono [&_pre]:text-[13px] [&_pre]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-5">
          {children}
        </div>
      </article>
    </PublicShell>
  );
}
