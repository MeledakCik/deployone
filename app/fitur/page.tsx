import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/public/PublicHeader";
import { JsonLd } from "@/components/seo/JsonLd";
import { DashboardLink } from "@/components/landing/DashboardLink";
import { breadcrumbLd, pageMeta } from "@/lib/seo";
import { FEATURES, PLATFORMS, SITE_DEFINITION, SITE_NAME, SITE_URL } from "@/lib/site-content";

export const metadata: Metadata = pageMeta({
  title: "Semua Fitur Depup: Deploy, Link Instan, AI & Database",
  description:
    "Daftar lengkap fitur Depup: deploy ke Vercel, Cloudflare Pages, dan Railway, upload ZIP, Link Instan, AI Web Builder, Database, Link Gaib, dan konektor MCP.",
  path: "/fitur",
});

export default function FiturPage() {
  const ld = [
    breadcrumbLd([
      { name: SITE_NAME, path: "/" },
      { name: "Fitur", path: "/fitur" },
    ]),
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "@id": `${SITE_URL}/fitur#page`,
      url: `${SITE_URL}/fitur`,
      name: "Semua fitur Depup",
      inLanguage: "id-ID",
      isPartOf: { "@id": `${SITE_URL}/#website` },
      about: { "@id": `${SITE_URL}/#app` },
      mainEntity: {
        "@type": "ItemList",
        itemListElement: FEATURES.map((f, i) => ({
          "@type": "ListItem",
          position: i + 1,
          url: `${SITE_URL}/fitur/${f.slug}`,
          name: f.name,
        })),
      },
    },
  ];

  return (
    <div className="flex min-h-[100dvh] flex-col bg-slate-50 dark:bg-zinc-950">
      <JsonLd data={ld} />
      <PublicHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <nav aria-label="Jejak halaman" className="mb-4 text-[12.5px] text-text-muted">
          <Link href="/" className="underline-offset-4 hover:underline">Depup</Link>
          <span aria-hidden="true"> / </span>
          <span>Fitur</span>
        </nav>

        <h1 className="page-title">Semua fitur Depup</h1>

        <section aria-labelledby="ringkasan" className="surface-solid mt-5 rounded-3xl p-5 sm:p-7">
          <h2 id="ringkasan" className="text-[15px] font-semibold">Ringkasan singkat</h2>
          <p className="mt-2 text-[14px] leading-relaxed">{SITE_DEFINITION}</p>
          <p className="mt-2 text-[14px] leading-relaxed text-text-muted">
            Masuk dengan akun Google, tempel link GitHub atau upload ZIP, dan Depup memeriksa isi repo sebelum deploy.
            Selain deploy, ada hosting statis sementara (Link Instan), pembuat website dengan AI, database SQLite,
            berbagi localhost, dan konektor untuk asisten AI seperti Claude. Depup gratis dipakai.
          </p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-3">
            {PLATFORMS.map((p) => (
              <li key={p.name} className="rounded-2xl bg-[var(--pill-bg)] px-4 py-3 text-[13px]">
                <span className="block font-semibold">{p.name}</span>
                <span className="text-text-muted">{p.fit}</span>
              </li>
            ))}
          </ul>
        </section>

        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <li key={f.slug} className="surface-solid flex flex-col rounded-3xl p-5 sm:p-6">
              <h2 className="text-[17px] font-bold tracking-tight">
                <Link href={`/fitur/${f.slug}`} className="underline-offset-4 hover:underline">
                  {f.name}
                </Link>
              </h2>
              <p className="mt-2 flex-1 text-[13.5px] leading-relaxed text-text-muted">{f.summary}</p>
              <Link
                href={`/fitur/${f.slug}`}
                className="mt-4 text-[13px] font-semibold underline underline-offset-4"
                aria-label={`Selengkapnya tentang ${f.name}`}
              >
                Selengkapnya
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-10 flex flex-col items-center gap-3 text-center">
          <DashboardLink
            href="/dashboard"
            className="btn-primary inline-flex items-center justify-center gap-2 px-6 py-3 text-[14px]"
          >
            Coba Depup gratis
          </DashboardLink>
          <p className="text-[12.5px] text-text-muted">
            Butuh panduan? Lihat <Link href="/docs" className="underline underline-offset-4">dokumentasi</Link> atau{" "}
            <Link href="/#faq" className="underline underline-offset-4">FAQ</Link>.
          </p>
        </div>
      </main>
      <footer className="border-t border-slate-200 py-8 text-center text-[13px] text-slate-500 dark:border-zinc-800 dark:text-zinc-400">
        <p>&copy; {new Date().getFullYear()} Depup. Dibuat untuk memudahkan deploy.</p>
      </footer>
    </div>
  );
}
