import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicHeader } from "@/components/public/PublicHeader";
import { JsonLd } from "@/components/seo/JsonLd";
import { DashboardLink } from "@/components/landing/DashboardLink";
import { breadcrumbLd, pageMeta } from "@/lib/seo";
import { FEATURES, SITE_NAME, SITE_URL, getFeature } from "@/lib/site-content";

// Hanya slug yang terdaftar yang valid; sisanya 404 (bukan di-render dinamis).
export const dynamicParams = false;

export function generateStaticParams() {
  return FEATURES.map((f) => ({ slug: f.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const f = getFeature(params.slug);
  if (!f) return {};
  return pageMeta({ title: f.seoTitle, description: f.seoDescription, path: `/fitur/${f.slug}` });
}

export default function FeaturePage({ params }: { params: { slug: string } }) {
  const f = getFeature(params.slug);
  if (!f) notFound();

  const url = `${SITE_URL}/fitur/${f.slug}`;
  const related = f.related.map((s) => getFeature(s)).filter((x): x is NonNullable<typeof x> => !!x);

  const ld: unknown[] = [
    breadcrumbLd([
      { name: SITE_NAME, path: "/" },
      { name: "Fitur", path: "/fitur" },
      { name: f.name, path: `/fitur/${f.slug}` },
    ]),
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": `${url}#page`,
      url,
      name: f.seoTitle,
      description: f.seoDescription,
      inLanguage: "id-ID",
      isPartOf: { "@id": `${SITE_URL}/#website` },
      about: { "@id": `${SITE_URL}/#app` },
    },
    {
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: `Cara memakai ${f.name} di Depup`,
      inLanguage: "id-ID",
      step: f.steps.map((text, i) => ({ "@type": "HowToStep", position: i + 1, text })),
    },
  ];
  if (f.faqs.length) {
    ld.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: f.faqs.map((q) => ({
        "@type": "Question",
        name: q.q,
        acceptedAnswer: { "@type": "Answer", text: q.a },
      })),
    });
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-zinc-950">
      <JsonLd data={ld} />
      <PublicHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <nav aria-label="Jejak halaman" className="mb-4 text-[12.5px] text-text-muted">
          <Link href="/" className="underline-offset-4 hover:underline">Depup</Link>
          <span aria-hidden="true"> / </span>
          <Link href="/fitur" className="underline-offset-4 hover:underline">Fitur</Link>
          <span aria-hidden="true"> / </span>
          <span>{f.name}</span>
        </nav>

        <article className="space-y-6">
          <header>
            <h1 className="page-title">{f.name}</h1>
            <p className="mt-2 text-[14.5px] leading-relaxed text-text-muted">{f.summary}</p>
          </header>

          <section aria-labelledby="tldr" className="surface-solid rounded-3xl p-5 sm:p-7">
            <h2 id="tldr" className="text-[15px] font-semibold">Ringkasan singkat</h2>
            <p className="mt-2 text-[14px] leading-relaxed">{f.tldr}</p>
            <p className="mt-3 text-[13px] text-text-muted">
              <strong className="font-semibold text-text">Cocok untuk:</strong> {f.audience}
            </p>
          </section>

          <section aria-labelledby="kemampuan" className="surface-solid rounded-3xl p-5 sm:p-7">
            <h2 id="kemampuan" className="text-[15px] font-semibold">Yang bisa kamu lakukan</h2>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[13.5px] leading-relaxed">
              {f.points.map((p) => <li key={p}>{p}</li>)}
            </ul>
          </section>

          <section aria-labelledby="langkah" className="surface-solid rounded-3xl p-5 sm:p-7">
            <h2 id="langkah" className="text-[15px] font-semibold">Cara memakainya</h2>
            <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-[13.5px] leading-relaxed">
              {f.steps.map((s) => <li key={s}>{s}</li>)}
            </ol>
          </section>

          <section aria-labelledby="batas" className="surface-solid rounded-3xl p-5 sm:p-7">
            <h2 id="batas" className="text-[15px] font-semibold">Batas dan hal yang perlu diketahui</h2>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[13.5px] leading-relaxed">
              {f.limits.map((l) => <li key={l}>{l}</li>)}
            </ul>
          </section>

          {f.faqs.length > 0 && (
            <section aria-labelledby="tanya" className="surface-solid rounded-3xl p-5 sm:p-7">
              <h2 id="tanya" className="text-[15px] font-semibold">Pertanyaan yang sering muncul</h2>
              <dl className="mt-3 space-y-4">
                {f.faqs.map((q) => (
                  <div key={q.q}>
                    <dt className="text-[14px] font-semibold">{q.q}</dt>
                    <dd className="mt-1 text-[13.5px] leading-relaxed text-text-muted">{q.a}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <DashboardLink
              href="/dashboard"
              className="btn-primary inline-flex items-center justify-center gap-2 px-6 py-3 text-[14px]"
            >
              Coba {f.name}
            </DashboardLink>
            {f.docsHref && (
              <Link href={f.docsHref} className="pill px-5 py-3 text-[13px] font-medium">
                Baca dokumentasi
              </Link>
            )}
          </div>

          {related.length > 0 && (
            <nav aria-label="Fitur terkait" className="border-t border-slate-200 pt-6 dark:border-zinc-800">
              <h2 className="text-[14px] font-semibold">Fitur terkait</h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {related.map((r) => (
                  <li key={r.slug}>
                    <Link href={`/fitur/${r.slug}`} className="pill inline-block px-4 py-2 text-[13px]">
                      {r.name}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link href="/fitur" className="pill inline-block px-4 py-2 text-[13px]">Semua fitur</Link>
                </li>
              </ul>
            </nav>
          )}
        </article>
      </main>
      <footer className="border-t border-slate-200 py-8 text-center text-[13px] text-slate-500 dark:border-zinc-800 dark:text-zinc-400">
        <p>&copy; {new Date().getFullYear()} Depup. Dibuat untuk memudahkan deploy.</p>
      </footer>
    </div>
  );
}
