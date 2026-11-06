import { tDeep } from "@/lib/i18n/core";
import { getT } from "@/lib/i18n/server";
import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/public/PublicShell";
import { PublicAuthCta } from "@/components/public/PublicAuthCta";
import { JsonLd } from "@/components/seo/JsonLd";
import { DashboardLink } from "@/components/landing/DashboardLink";
import { breadcrumbLd, pageMeta } from "@/lib/seo";
import { FEATURES as FEATURES_RAW, PLATFORMS as PLATFORMS_RAW, SITE_DEFINITION, SITE_NAME, SITE_URL } from "@/lib/site-content";

export function generateMetadata(): Metadata {
  const t = getT();
  return pageMeta({
    title: t("Semua Fitur Depup: Deploy, Link Instan, AI & Database"),
    description: t("Daftar lengkap fitur Depup: deploy ke Vercel, Cloudflare Pages, dan Railway, upload ZIP, Link Instan, AI Web Builder, Database, Link Gaib, dan konektor MCP."),
    path: "/fitur",
  });
}

export default function FiturPage() {
  const t = getT();
  const FEATURES = tDeep(FEATURES_RAW, t);
  const PLATFORMS = tDeep(PLATFORMS_RAW, t);
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
    <PublicShell cta={<PublicAuthCta />}>
      <JsonLd data={ld} />
      <div>
        <nav aria-label={t("Jejak halaman")} className="mb-4 text-[13px] text-text-muted">
          <Link href="/" className="underline-offset-4 hover:underline">{t("Depup")}</Link>
          <span aria-hidden="true"> / </span>
          <span>{t("Fitur")}</span>
        </nav>

        <h1 className="page-title">{t("Semua fitur Depup")}</h1>

        <section aria-labelledby="ringkasan" className="surface-solid mt-5 p-5 sm:p-7">
          <h2 id="ringkasan" className="text-[16px] font-bold tracking-tight">{t("Ringkasan singkat")}</h2>
          <p className="mt-2 text-[14px] leading-relaxed">{t(SITE_DEFINITION)}</p>
          <p className="mt-2 text-[14px] leading-relaxed text-text-muted">
            {t("Masuk dengan akun Google, tempel link GitHub atau upload ZIP, dan Depup memeriksa isi repo sebelum deploy. Selain deploy, ada hosting statis sementara (Link Instan), pembuat website dengan AI, database SQLite, berbagi localhost, dan konektor untuk asisten AI seperti Claude. Depup gratis dipakai.")}
          </p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-3">
            {PLATFORMS.map((p) => (
              <li key={p.name} className="rounded-[14px] bg-[var(--pill-bg)] px-4 py-3 text-[13px]">
                <span className="block font-semibold">{t(p.name)}</span>
                <span className="text-text-muted">{t(p.fit)}</span>
              </li>
            ))}
          </ul>
        </section>

        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <li key={f.slug} className="surface-solid flex flex-col p-5 sm:p-6">
              <h2 className="text-[18px] font-bold tracking-tight">
                <Link href={`/fitur/${f.slug}`} className="underline-offset-4 hover:underline">
                  {t(f.name)}
                </Link>
              </h2>
              <p className="mt-2 flex-1 text-[14px] leading-relaxed text-text-muted">{t(f.summary)}</p>
              <Link
                href={`/fitur/${f.slug}`}
                className="mt-4 text-[13px] font-semibold text-lav-text underline underline-offset-4"
                aria-label={t("Selengkapnya tentang {name}", { name: t(f.name) })}
              >
                {t("Selengkapnya")}
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-10 flex flex-col items-center gap-3 text-center">
          <DashboardLink
            href="/dashboard"
            className="btn-primary btn-lg"
          >
            {t("Coba Depup gratis")}
          </DashboardLink>
          <p className="text-[13px] text-text-muted">
            {t("Butuh panduan? Lihat")}{" "}<Link href="/docs" className="font-medium text-lav-text underline underline-offset-4">{t("dokumentasi")}</Link>{" "}{t("atau")}{" "}
            <Link href="/#faq" className="font-medium text-lav-text underline underline-offset-4">FAQ</Link>.
          </p>
        </div>
      </div>
    </PublicShell>
  );
}
