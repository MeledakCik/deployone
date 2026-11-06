import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import LandingPage from "../page";

/**
 * Beranda versi Inggris (SEO internasional). Isinya sama dengan "/", dirender dalam bahasa Inggris karena
 * middleware selalu memberi bahasa "en" untuk /en. Dipasangkan dengan "/" lewat hreflang.
 */
const TITLE = "Depup: One Dashboard to Deploy to Vercel, Cloudflare Pages & Railway";
const DESCRIPTION =
  "Depup is a deploy dashboard made in Indonesia. Paste a GitHub link or upload a zip; Depup checks the repo and deploys it to Vercel, Cloudflare Pages, or Railway. Includes Instant Links, an AI Web Builder, databases, and an MCP connector for Claude.";

export const metadata: Metadata = pageMeta({ title: TITLE, description: DESCRIPTION, path: "/en", absoluteTitle: true, lang: "en", en: "/" });

export default function EnglishLandingPage() {
  return <LandingPage />;
}
