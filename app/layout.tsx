import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { AuthProvider } from "@/lib/auth-context";
import { ToastProvider } from "@/components/ui/Toast";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  "https://depup.app";

const SITE_NAME = "Depup";
const SITE_TAGLINE = "Deploy without the hassle.";

const SITE_DESCRIPTION =
  "Depup adalah dashboard modern untuk mengelola deployment Vercel, Cloudflare, Railway, Render Pages dalam satu tempat. Import repo, deploy, atur domain & environment variables, semua dari satu dashboard glass yang cantik — tanpa perlu buka banyak tab.";

const SITE_KEYWORDS = [
  "depup",
  "deploy dashboard",
  "vercel dashboard",
  "cloudflare pages",
  "deploy vercel",
  "deploy cloudflare",
  "vercel alternative dashboard",
  "cloudflare alternative dashboard",
  "deployment management",
  "one click deploy",
  "dashboard deploy",
  "kelola deployment",
  "deploy otomatis",
  "next.js deploy",
  "vercel + cloudflare",
];

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  applicationName: SITE_NAME,
  generator: "Next.js",
  authors: [{ name: "depup", url: SITE_URL }],
  creator: "depup",
  publisher: "Depup",
  category: "Developer Tools",
  referrer: "origin-when-cross-origin",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },

  alternates: {
    canonical: "/",
    languages: {
      "id-ID": "/",
      "en-US": "/",
    },
  },

  icons: {
    icon: [
      { url: "/logo.png", type: "image/png", sizes: "any" },
      { url: "/logo.png", type: "image/png", sizes: "32x32" },
      { url: "/logo.png", type: "image/png", sizes: "16x16" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    shortcut: ["/logo.png"],
    apple: [
      { url: "/logo.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      {
        rel: "mask-icon",
        url: "/logo.png",
      },
    ],
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
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} — Deploy dashboard untuk Vercel, Cloudflare, Railway, Render`,
        type: "image/svg+xml",
      },
      {
        url: "/logo.png",
        width: 512,
        height: 512,
        alt: `${SITE_NAME} logo`,
        type: "image/png",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    site: "@depup",
    creator: "@depup",
    images: ["/logo.png"],
  },

  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  verification: {
    // google: "xxxxxx",
    // yandex: "xxxxxx",
    // other: { "msvalidate.01": "xxxxxx" },
  },


  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: "black-translucent",
  },
  other: {
    "msapplication-TileColor": "#0a0a0f",
    "theme-color": "#0a0a0f",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0f" },
  ],
  colorScheme: "dark light",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Web",
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    image: `${SITE_URL}/logo.png`,
    logo: `${SITE_URL}/logo.png`,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    author: {
      "@type": "Person",
      name: "depup",
      url: SITE_URL,
    },
    featureList: [
      "Deploy ke Vercel dalam satu klik",
      "Deploy ke Cloudflare Pages",
      "Kelola domain custom",
      "Environment variables",
      "Auto-redeploy saat secret berubah",
      "Import project yang sudah ada",
    ],
  };

  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="antialiased selection:bg-violet-500/30 min-h-screen w-full">
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>{children}</ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}