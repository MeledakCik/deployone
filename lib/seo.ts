import type { Metadata } from "next";
import { SITE_NAME, SITE_URL } from "@/lib/site-content";
import { isLocalizedPath, localePath, type Lang } from "@/lib/i18n/core";

/** Gambar berbagi sosial bawaan (1200x630). Selalu URL absolut agar terbaca crawler. */
export const OG_IMAGE = {
  url: `${SITE_URL}/og-image.png`,
  width: 1200,
  height: 630,
  alt: "Depup: deploy dashboard for Vercel, Cloudflare Pages & Railway",
  type: "image/png",
} as const;

/** Kode bahasa untuk schema.org inLanguage & og:locale. */
export const LD_LANG: Record<Lang, string> = { id: "id-ID", en: "en" };
const OG_LOCALE: Record<Lang, string> = { id: "id_ID", en: "en_US" };

/** URL absolut halaman dalam bahasa tertentu: absUrl("en", "/fitur") -> "https://depup.cloud/en/fitur". */
export function absUrl(lang: Lang, path: string): string {
  const p = localePath(lang, path);
  return `${SITE_URL}${p === "/" ? "" : p}`;
}

/**
 * Peta hreflang untuk satu halaman Indonesia beserta pasangan Inggrisnya. x-default = Inggris: pengunjung dari
 * negara yang bahasanya tidak kita dukung (Jepang, Jerman, Brasil, dst.) lebih paham versi Inggris.
 */
export function hreflangs(path: string): Record<string, string> {
  return { id: absUrl("id", path), en: absUrl("en", path), "x-default": absUrl("en", path) };
}

/**
 * Metadata lengkap untuk satu halaman publik.
 *
 * Kenapa helper ini ada: di Next.js, `openGraph` dan `twitter` pada halaman MENGGANTI objek yang sama
 * dari layout (bukan digabung per kunci). Halaman yang hanya menulis `openGraph: { url }` kehilangan
 * og:title, og:description, dan og:image. Helper ini selalu mengisi semuanya.
 *
 * Satu URL = satu bahasa: halaman Indonesia di "/fitur", versi Inggrisnya di "/en/fitur". Canonical selalu menunjuk
 * ke URL bahasa itu sendiri (bukan ke versi Indonesia), dan keduanya saling menunjuk lewat hreflang. Ini syarat
 * agar Google meranking versi Inggris di hasil pencarian internasional.
 *
 * @param title  Tanpa nama situs; template di app/layout.tsx menambahkan " | Depup ...".
 * @param path   Path Indonesia dimulai "/", misalnya "/fitur/link-instan". Untuk lang "en" otomatis jadi "/en/...".
 */
export function pageMeta({
  title,
  description,
  path,
  type = "website",
  absoluteTitle = false,
  lang = "id",
  keywords,
}: {
  title: string;
  description: string;
  path: string;
  type?: "website" | "article";
  /** true = judul dipakai apa adanya (tanpa template " | Depup ..."), dipakai beranda. */
  absoluteTitle?: boolean;
  /** Bahasa halaman ini (dari getLang(): "/en/..." selalu "en"). */
  lang?: Lang;
  keywords?: string[];
}): Metadata {
  const localized = isLocalizedPath(path);
  const url = localized ? absUrl(lang, path) : `${SITE_URL}${path === "/" ? "" : path}`;
  const shareTitle = absoluteTitle ? title : `${title} | ${SITE_NAME}`;
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    ...(keywords ? { keywords } : {}),
    alternates: {
      canonical: url,
      ...(localized ? { languages: hreflangs(path) } : {}),
    },
    openGraph: {
      type,
      locale: OG_LOCALE[lang],
      ...(localized ? { alternateLocale: [OG_LOCALE[lang === "en" ? "id" : "en"]] } : {}),
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

/** BreadcrumbList; path ditulis versi Indonesia, otomatis jadi /en/... bila lang "en". */
export function breadcrumbLd(items: { name: string; path: string }[], lang: Lang = "id") {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: absUrl(lang, it.path),
    })),
  };
}
