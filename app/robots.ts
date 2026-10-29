import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-content";

const BASE = SITE_URL;

// Aturan per-bot TIDAK mewarisi aturan "*", jadi daftar disallow harus diulang untuk tiap bot.
// "/m$" memblokir persis "/m" (beranda app mobile) tanpa ikut memblokir "/manifest.webmanifest";
// "/m/" memblokir semua halaman di bawahnya. Halaman ini juga diberi header X-Robots-Tag: noindex
// di next.config.js sebagai lapis kedua.
const PRIVATE = ["/api/", "/dashboard", "/admin", "/laporkan", "/demo/", "/t/", "/connect/", "/m/", "/m$", "/db/"];

// Crawler pencarian & ringkasan AI yang kita inginkan membaca halaman publik
// (termasuk /fitur, /llms.txt, dan /llms-full.txt).
const BOTS = [
  "Googlebot", "Bingbot", "Applebot", "DuckDuckBot",
  "GPTBot", "OAI-SearchBot", "ChatGPT-User",
  "ClaudeBot", "Claude-SearchBot", "Claude-User", "anthropic-ai",
  "PerplexityBot", "Perplexity-User", "Google-Extended", "Applebot-Extended",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE },
      ...BOTS.map((userAgent) => ({ userAgent, allow: "/", disallow: PRIVATE })),
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
