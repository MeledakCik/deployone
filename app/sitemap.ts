import type { MetadataRoute } from "next";
import { FEATURES } from "@/lib/site-content";
import { LANGS } from "@/lib/i18n/core";
import { absUrl, hreflangs } from "@/lib/seo";

// lastModified sengaja TETAP (bukan new Date()): tanggal yang berubah di setiap deploy membuat mesin
// pencari menganggap semua halaman selalu baru lalu mengabaikan sinyal ini. Ubah tanggalnya
// hanya saat isi halaman benar-benar berubah. Format: YYYY-MM-DD.
const UPDATED = {
  home: "2026-11-17",
  en: "2026-11-17",
  fitur: "2026-11-17",
  docs: "2026-11-17",
  mcp: "2026-11-17",
  privacy: "2026-11-17",
} as const;

// Hanya URL nyata yang boleh diindeks. URL dengan #fragment tidak dihitung mesin pencari
// (dianggap sama dengan beranda), jadi tidak dimasukkan. Halaman /fitur/<slug> dibuat otomatis
// dari lib/site-content.ts. Tambahkan halaman publik baru lainnya di sini.
//
// Setiap halaman muncul dua kali: versi Indonesia ("/fitur") dan Inggris ("/en/fitur"), masing-masing dengan
// daftar hreflang lengkap (id, en, x-default). Inilah sinyal utama Google untuk menampilkan versi Inggris
// di hasil pencarian luar Indonesia.
type Page = { path: string; updated: string; freq: "weekly" | "monthly" | "yearly"; priority: number };

const PAGES: Page[] = [
  { path: "/", updated: UPDATED.home, freq: "weekly", priority: 1 },
  { path: "/fitur", updated: UPDATED.fitur, freq: "weekly", priority: 0.9 },
  ...FEATURES.map((f) => ({ path: `/fitur/${f.slug}`, updated: UPDATED.fitur, freq: "monthly" as const, priority: 0.8 })),
  { path: "/docs", updated: UPDATED.docs, freq: "monthly", priority: 0.6 },
  { path: "/docs/mcp", updated: UPDATED.mcp, freq: "monthly", priority: 0.6 },
  { path: "/privacy", updated: UPDATED.privacy, freq: "yearly", priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.flatMap((p) =>
    LANGS.map((lang) => ({
      url: absUrl(lang, p.path),
      lastModified: lang === "en" && p.path === "/" ? UPDATED.en : p.updated,
      changeFrequency: p.freq,
      priority: p.priority,
      alternates: { languages: hreflangs(p.path) },
    })),
  );
}
