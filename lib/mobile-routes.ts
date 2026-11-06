import { tl } from "@/lib/i18n/core";
/**
 * Pemetaan halaman dashboard web (?view=...) ke halaman app mobile /m/*.
 * Dipakai di dua arah: app /m membuka sub-halaman yang setara, dan dashboard web
 * di layar HP dialihkan ke /m supaya pengguna HP selalu mendapat satu pengalaman yang sama.
 */
export const VIEW_ROUTE: Record<string, string> = {
  deploy: "/m/deploy",
  projects: "/m/kelola",
  domains: "/m/domain",
  env: "/m/env",
  docs: "/m/docs",
  settings: "/m/pengaturan",
  donate: "/m/donasi",
  community: "/m/komunitas",
  upload: "/m/upload",
  hosting: "/m/link-instan",
  ai: "/m/ai",
  convert: "/m/convert",
};

/** Pengguna yang sengaja memilih tampilan desktop di HP tidak dialihkan lagi. */
export const PREFER_DESKTOP_KEY = "depup-prefer-desktop";

export function greeting(date = new Date()): string {
  const h = date.getHours();
  if (h < 11) return tl("Selamat pagi");
  if (h < 15) return tl("Selamat siang");
  if (h < 19) return tl("Selamat sore");
  return tl("Selamat malam");
}
