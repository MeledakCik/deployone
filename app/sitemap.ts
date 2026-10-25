import type { MetadataRoute } from "next";

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "https://depup.cloud"
).replace(/\/$/, "");

// Hanya URL nyata yang boleh diindeks. URL dengan #fragment tidak dihitung mesin pencari
// (dianggap sama dengan beranda), jadi tidak dimasukkan. Tambahkan halaman publik baru di sini.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/docs/mcp`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/docs`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/privacy`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
  ];
}
