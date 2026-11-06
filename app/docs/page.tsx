import { getT } from "@/lib/i18n/server";
import { DocsView } from "@/components/dashboard/DocsView";
import type { Metadata } from "next";
import { pageMeta, breadcrumbLd } from "@/lib/seo";
import { JsonLd } from "@/components/seo/JsonLd";
import { PublicShell } from "@/components/public/PublicShell";
import { PublicAuthCta } from "@/components/public/PublicAuthCta";

export function generateMetadata(): Metadata {
  const t = getT();
  return pageMeta({
    title: t("Dokumentasi: Panduan Deploy, Token & Link Instan"),
    description: t("Panduan Depup: cara mendapatkan token Vercel, Cloudflare, dan Railway, men-deploy repo GitHub, memakai Link Instan, dan memecahkan deploy yang gagal."),
    path: "/docs",
  });
}

export default function DocsPage() {
  return (
    <PublicShell cta={<PublicAuthCta />}>
      <JsonLd data={breadcrumbLd([{ name: "Depup", path: "/" }, { name: "Dokumentasi", path: "/docs" }])} />
      <DocsView />
    </PublicShell>
  );
}