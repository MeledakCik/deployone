import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/inter-tight";
import "@fontsource-variable/jetbrains-mono";
import "./globals.css";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { AuthProvider } from "@/lib/auth-context";
import { ToastProvider } from "@/components/ui/Toast";
import { COMMUNITY_LINKS } from "@/lib/community";
import { OG_IMAGE, jsonLdString } from "@/lib/seo";
import {
  CONTACT_EMAIL,
  FEATURE_LIST_SCHEMA,
  HOME_TITLE,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TAGLINE,
  SITE_URL,
} from "@/lib/site-content";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: HOME_TITLE,
    template: `%s | Depup`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "depup",
    "depup.cloud",
    "depup dashboard",
    "depup deploy",
    "depup indonesia",
    "deploy dashboard indonesia",
    "deploy vercel cloudflare railway",
    "link instan html",
    "hosting html gratis",
    "kelola deployment",
    "ai web builder indonesia",
    "database sqlite gratis",
    "mcp claude deploy",
    "bagikan localhost",
  ],
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "Developer Tools",
  // Canonical SENGAJA tidak diset di sini: nilai di layout diwariskan ke semua halaman anak,
  // sehingga tiap halaman dianggap duplikat beranda. Canonical diatur per halaman (lihat app/page.tsx).
  icons: {
    icon: [
      { url: "/logo.png", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: "/favicon.ico",
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    locale: "id_ID",
    alternateLocale: ["en_US"],
    siteName: SITE_NAME,
    url: SITE_URL,
    title: `${SITE_NAME}: ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME}: ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    images: [OG_IMAGE.url],
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
    google: "9309OOKq3o9sncxEEKygjhDjXETZ64oiJbyElumX6h8",
  },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#7B50FF" },
    { media: "(prefers-color-scheme: dark)", color: "#120B2E" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: SITE_NAME,
      alternateName: ["Depup Indonesia", "Depup Deploy Dashboard", "depup.cloud"],
      url: SITE_URL,
      inLanguage: "id-ID",
      description: SITE_DESCRIPTION,
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      alternateName: "Depup Indonesia",
      url: SITE_URL,
      logo: `${SITE_URL}/logo.png`,
      // Hanya profil sosial publik (tautan WhatsApp bukan profil, jadi dilewati).
      sameAs: COMMUNITY_LINKS.filter((l) => !l.key.startsWith("wa-")).map((l) => l.href),
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: CONTACT_EMAIL,
        availableLanguage: ["Indonesian"],
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "@id": `${SITE_URL}/#app`,
      name: SITE_NAME,
      alternateName: "Depup Deploy Dashboard",
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Web",
      inLanguage: "id-ID",
      description: SITE_DESCRIPTION,
      url: SITE_URL,
      image: `${SITE_URL}/og-image.png`,
      publisher: { "@id": `${SITE_URL}/#organization` },
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "IDR" },
      // Diambil dari lib/site-content.ts (sumber tunggal fitur), jadi selalu sama dengan halaman /fitur.
      featureList: FEATURE_LIST_SCHEMA,
    },
    // FAQPage sengaja TIDAK di sini: sudah dirender dari isi FAQ yang tampil di halaman (components/landing/FAQ.tsx).
    // Dua FAQPage dengan jawaban berbeda = data terstruktur bentrok.
  ];
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        {jsonLd.map((item) => (
          <script
            key={item["@id"] ?? item["@type"]}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: jsonLdString(item) }}
          />
        ))}
      </head>
      <body className="antialiased min-h-[100dvh] w-full overflow-x-clip">
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>{children}</ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}