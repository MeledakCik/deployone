import type { Metadata } from "next";
import { SITE_NAME, SITE_URL } from "@/lib/site-content";

/** Gambar berbagi sosial bawaan (1200x630). Selalu URL absolut agar terbaca crawler. */
export const OG_IMAGE = {
  url: `${SITE_URL}/og-image.png`,
  width: 1200,
  height: 630,
  alt: "Depup: dashboard deploy Indonesia untuk Vercel, Cloudflare Pages & Railway",
  type: "image/png",
} as const;

/**
 * Metadata lengkap untuk satu halaman publik.
 *
 * Kenapa helper ini ada: di Next.js, `openGraph` dan `twitter` pada halaman MENGGANTI objek yang sama
 * dari layout (bukan digabung per kunci). Halaman yang hanya menulis `openGraph: { url }` kehilangan
 * og:title, og:description, dan og:image. Helper ini selalu mengisi semuanya.
 *
 * @param title  Tanpa nama situs; template di app/layout.tsx menambahkan " | Depup ...".
 * @param path   Path kanonik dimulai "/", misalnya "/fitur/link-instan".
 */
export function pageMeta({
  title,
  description,
  path,
  type = "website",
  absoluteTitle = false,
}: {
  title: string;
  description: string;
  path: string;
  type?: "website" | "article";
  /** true = judul dipakai apa adanya (tanpa template " | Depup ..."), dipakai beranda. */
  absoluteTitle?: boolean;
}): Metadata {
  const url = `${SITE_URL}${path === "/" ? "" : path}`;
  const shareTitle = absoluteTitle ? title : `${title} | ${SITE_NAME}`;
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path, languages: { "id-ID": path } },
    openGraph: {
      type,
      locale: "id_ID",
      siteName: SITE_NAME,
      url,
      title: shareTitle,
      description,
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: shareTitle,
      description,
      images: [OG_IMAGE.url],
    },
  };
}

/** Serialisasi JSON-LD yang aman untuk disisipkan ke <script>: "<" di-escape agar "</script>" tidak bisa lolos. */
export function jsonLdString(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function breadcrumbLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: `${SITE_URL}${it.path === "/" ? "" : it.path}`,
    })),
  };
}
