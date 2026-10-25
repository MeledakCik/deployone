import type { MetadataRoute } from "next";

const BASE = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://depup.cloud").replace(/\/$/, "");

// Aturan per-bot TIDAK mewarisi aturan "*" — jadi daftar disallow harus diulang untuk tiap bot.
const PRIVATE = ["/api/", "/dashboard", "/admin", "/laporkan", "/demo/", "/t/", "/connect/"];

// Crawler pencarian & ringkasan AI yang kita inginkan membaca halaman publik.
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
