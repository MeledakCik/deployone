import { tDeep } from "@/lib/i18n/core";
import { getT } from "@/lib/i18n/server";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicShell } from "@/components/public/PublicShell";
import { PublicAuthCta } from "@/components/public/PublicAuthCta";
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
  const fRaw0 = getFeature(params.slug);
  const f = fRaw0 ? tDeep(fRaw0, getT()) : fRaw0;
  if (!f) return {};
  return pageMeta({ title: f.seoTitle, description: f.seoDescription, path: `/fitur/${f.slug}` });
}

export default function FeaturePage({ params }: { params: { slug: string } }) {
  const t = getT();
  const fRaw = getFeature(params.slug);
  const f = fRaw ? tDeep(fRaw, t) : fRaw;
  if (!f) notFound();

  const url = `${SITE_URL}/fitur/${f.slug}`;
  const related = f.related.map((s) => getFeature(s)).filter((x): x is NonNullable<typeof x> => !!x).map((x) => tDeep(x, t));

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
    <PublicShell cta={<PublicAuthCta />}>
      <JsonLd data={ld} />
      <div>
        <nav aria-label={t("Jejak halaman")} className="mb-4 text-[13px] text-text-muted">
          <Link href="/" className="underline-offset-4 hover:underline">{t("Depup")}</Link>
          <span aria-hidden="true"> / </span>
          <Link href="/fitur" className="underline-offset-4 hover:underline">{t("Fitur")}</Link>
          <span aria-hidden="true"> / </span>
          <span>{f.name}</span>
        </nav>

        <article className="space-y-6">
          <header>
            <h1 className="page-title">{f.name}</h1>
            <p className="mt-2 text-[14px] leading-relaxed text-text-muted">{f.summary}</p>
          </header>

          <section aria-labelledby="tldr" className="surface-solid p-5 sm:p-7">
            <h2 id="tldr" className="text-[16px] font-bold tracking-tight">{t("Ringkasan singkat")}</h2>
            <p className="mt-2 text-[14px] leading-relaxed">{f.tldr}</p>
            <p className="mt-3 text-[13px] text-text-muted">
              <strong className="font-semibold text-text">{t("Cocok untuk:")}</strong> {f.audience}
            </p>
          </section>

          <section aria-labelledby="kemampuan" className="surface-solid p-5 sm:p-7">
            <h2 id="kemampuan" className="text-[16px] font-bold tracking-tight">{t("Yang bisa kamu lakukan")}</h2>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[14px] leading-relaxed">
              {f.points.map((p) => <li key={p}>{p}</li>)}
            </ul>
          </section>

          <section aria-labelledby="langkah" className="surface-solid p-5 sm:p-7">
            <h2 id="langkah" className="text-[16px] font-bold tracking-tight">{t("Cara memakainya")}</h2>
            <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-[14px] leading-relaxed">
              {f.steps.map((s) => <li key={s}>{s}</li>)}
            </ol>
          </section>

          <section aria-labelledby="batas" className="surface-solid p-5 sm:p-7">
            <h2 id="batas" className="text-[16px] font-bold tracking-tight">{t("Batas dan hal yang perlu diketahui")}</h2>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[14px] leading-relaxed">
              {f.limits.map((l) => <li key={l}>{l}</li>)}
            </ul>
          </section>

          {f.faqs.length > 0 && (
            <section aria-labelledby="tanya" className="surface-solid p-5 sm:p-7">
              <h2 id="tanya" className="text-[16px] font-bold tracking-tight">{t("Pertanyaan yang sering muncul")}</h2>
              <dl className="mt-3 space-y-4">
                {f.faqs.map((q) => (
                  <div key={q.q}>
                    <dt className="text-[14px] font-semibold">{q.q}</dt>
                    <dd className="mt-1 text-[14px] leading-relaxed text-text-muted">{q.a}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <DashboardLink
              href="/dashboard"
              className="btn-primary btn-lg"
            >
              {t("Coba {name}", { name: f.name })}
            </DashboardLink>
            {f.docsHref && (
              <Link href={f.docsHref} className="pill btn-lg font-medium">
                {t("Baca dokumentasi")}
              </Link>
            )}
          </div>

          {related.length > 0 && (
            <nav aria-label={t("Fitur terkait")} className="border-t border-[var(--line-strong)] pt-6">
              <h2 className="text-[14px] font-semibold">{t("Fitur terkait")}</h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {related.map((r) => (
                  <li key={r.slug}>
                    <Link href={`/fitur/${r.slug}`} className="pill inline-block px-4 py-2 text-[13px]">
                      {r.name}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link href="/fitur" className="pill inline-block px-4 py-2 text-[13px]">{t("Semua fitur")}</Link>
                </li>
              </ul>
            </nav>
          )}
        </article>
      </div>
    </PublicShell>
  );
}
