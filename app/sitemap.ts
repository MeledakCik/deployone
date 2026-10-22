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
  ];
}
