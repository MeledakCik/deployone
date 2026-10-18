import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/inter-tight";
import "@fontsource-variable/jetbrains-mono";
import "./globals.css";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { AuthProvider } from "@/lib/auth-context";
import { ToastProvider } from "@/components/ui/Toast";

// OTOMATIS GANTI DOMAIN - sekarang web.id, nanti app
const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "https://depup.web.id"
).replace(/\/$/, "");

const SITE_NAME = "Depup";
const SITE_TAGLINE = "Deploy Dashboard Indonesia untuk Vercel & Cloudflare";
const SITE_DESCRIPTION =
  "Deploy Dashboard Indonesia untuk developer. Depup adalah dashboard untuk mengelola deployment Vercel, Cloudflare Pages, dan Railway dalam satu tempat. Impor repo, deploy, atur domain dan environment variables, semua dari satu dashboard buatan Indonesia.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `Depup — Deploy Dashboard Indonesia | Kelola Vercel & Cloudflare`,
    template: `%s | Depup - Deploy Dashboard Indonesia`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "depup",
    "depup dashboard",
    "vercel dashboard",
    "cloudflare pages dashboard",
    "kelola deployment",
    "deploy dashboard indonesia",
  ],
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "Developer Tools",
  alternates: {
    canonical: "/",
    languages: {
      "id-ID": "/",
      "en-US": "/en",
    },
  },
  icons: {
    icon: [{ url: "/logo.png", type: "image/png" }],
    apple: [{ url: "/logo.png", sizes: "180x180" }],
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    locale: "id_ID",
    alternateLocale: ["en_US"],
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/og-image.png", // WAJIB BIKIN FILE INI 1200x630
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} — Dashboard Deploy Vercel & Cloudflare`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "bF_v2fLxUc8QiMHG5G_XeS0dyamaz5QReZDpXahcYhU",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#7B50FF" },
    { media: "(prefers-color-scheme: dark)", color: "#120B2E" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: SITE_NAME,
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Web",
      description: SITE_DESCRIPTION,
      url: SITE_URL,
      image: `${SITE_URL}/og-image.png`,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      featureList: [
        "Deploy ke Vercel dalam satu klik",
        "Deploy ke Cloudflare Pages",
        "Kelola domain kustom",
        "Environment variables terpusat",
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Depup",
      url: SITE_URL,
      logo: `${SITE_URL}/logo.png`,
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Apa itu Depup?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Depup adalah dashboard deploy untuk mengelola project Vercel, Cloudflare Pages, dan Railway dalam satu tempat, tanpa perlu membuka banyak tab.",
          },
        },
        {
          "@type": "Question",
          name: "Apakah Depup sama dengan depup di Rust / NPM?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Tidak. Depup di crates.io atau @depup/axios adalah tools auto-update dependency. Depup.app / Depup.web.id adalah dashboard untuk deployment.",
          },
        },
        {
          "@type": "Question",
          name: "Apakah Depup gratis?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Ya, Depup gratis untuk mengelola deployment dan domain kamu.",
          },
        },
                {
          "@type": "Question",
          name: "Apa itu deploy dashboard indonesia?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Deploy Dashboard Indonesia adalah dashboard seperti Depup yang dibuat untuk developer Indonesia untuk mengelola deployment Vercel, Cloudflare Pages, dan Railway dalam satu tempat. Dengan Depup, kamu bisa impor repo, deploy, atur domain dan environment variables tanpa ribet.",
          },
        },
      ],
    },
  ];

  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="antialiased min-h-[100vh] w-full overflow-x-clip">
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>{children}</ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}