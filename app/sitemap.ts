import type { MetadataRoute } from "next";
import { FEATURES, SITE_URL } from "@/lib/site-content";

// lastModified sengaja TETAP (bukan new Date()): tanggal yang berubah di setiap deploy membuat mesin
// pencari menganggap semua halaman selalu baru lalu mengabaikan sinyal ini. Ubah tanggalnya
// hanya saat isi halaman benar-benar berubah. Format: YYYY-MM-DD.
const UPDATED = {
  home: "2026-10-29",
  fitur: "2026-10-29",
  docs: "2026-10-28",
  mcp: "2026-10-28",
  privacy: "2026-10-25",
} as const;

// Hanya URL nyata yang boleh diindeks. URL dengan #fragment tidak dihitung mesin pencari
// (dianggap sama dengan beranda), jadi tidak dimasukkan. Halaman /fitur/<slug> dibuat otomatis
// dari lib/site-content.ts. Tambahkan halaman publik baru lainnya di sini.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, lastModified: UPDATED.home, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/fitur`, lastModified: UPDATED.fitur, changeFrequency: "weekly", priority: 0.9 },
    ...FEATURES.map((f) => ({
      url: `${SITE_URL}/fitur/${f.slug}`,
      lastModified: UPDATED.fitur,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    { url: `${SITE_URL}/docs`, lastModified: UPDATED.docs, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/docs/mcp`, lastModified: UPDATED.mcp, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/privacy`, lastModified: UPDATED.privacy, changeFrequency: "yearly", priority: 0.3 },
  ];
}
