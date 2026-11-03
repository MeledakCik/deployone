import type { Platform } from "@/types";

/**
 * Satu sumber nama, urutan, dan deskripsi platform untuk seluruh UI
 * (landing, dashboard web, dan /m). Urutan ini dipakai di mana pun platform
 * ditampilkan berdampingan supaya pengguna tidak bingung.
 */
export const PLATFORM_ORDER: Platform[] = ["vercel", "cloudflare", "railway"];

export const PLATFORM_META: Record<Platform, { name: string; desc: string; bestFor: string }> = {
  vercel: {
    name: "Vercel",
    desc: "Cocok untuk Next.js dan situs frontend lain.",
    bestFor: "Next.js & frontend",
  },
  cloudflare: {
    name: "Cloudflare Pages",
    desc: "Situs statis dan SPA, disajikan dari jaringan edge global.",
    bestFor: "Situs statis & SPA",
  },
  railway: {
    name: "Railway",
    desc: "Server Node.js, Docker, Python, Go, dan bahasa lain, plus database.",
    bestFor: "Server & bahasa lain",
  },
};

/** Tebak nama project dari link repo GitHub (nama repo, huruf kecil, aman untuk subdomain). */
export function suggestRepoName(url: string): string {
  const m = /github\.com\/[^/\s]+\/([^/\s#?]+)/i.exec(url);
  return m ? m[1].replace(/\.git$/, "").toLowerCase().replace(/[^a-z0-9-]/g, "-") : "";
}
