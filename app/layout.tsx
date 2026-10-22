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
  "https://depup.cloud"
).replace(/\/$/, "");

const SITE_NAME = "Depup";
const SITE_TAGLINE = "Deploy Dashboard Indonesia untuk Vercel & Cloudflare";
const SITE_DESCRIPTION =
  "Depup (depup.cloud) adalah dashboard deploy buatan Indonesia untuk mengelola Vercel, Cloudflare Pages, dan Railway dalam satu tempat. Tempel link GitHub, deploy, atur domain dan environment variables, plus Link Instan untuk menjadikan file HTML sebagai link publik dalam hitungan detik.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `Depup — Deploy Dashboard Indonesia | Vercel, Cloudflare Pages & Railway`,
    template: `%s | Depup - Deploy Dashboard Indonesia`,
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
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/og-image.png?v=2",
        secureUrl: "/og-image.png",
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} — Dashboard Deploy Vercel, Cloudflare & Railway`,
        type: "image/png",
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
    google: "9309OOKq3o9sncxEEKygjhDjXETZ64oiJbyElumX6h8",
  },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
      offers: { "@type": "Offer", price: "0", priceCurrency: "IDR" },
      featureList: [
        "Deploy ke Vercel dalam satu klik",
        "Deploy ke Cloudflare Pages",
        "Deploy ke Railway",
        "Link Instan: upload HTML/CSS/JS jadi link publik sementara",
        "Link Gaib: bagikan localhost ke internet",
        "Kelola domain kustom",
        "Environment variables terpusat",
      ],
    },
    // FAQPage sengaja TIDAK di sini: sudah dirender dari isi FAQ yang tampil di halaman (components/landing/FAQ.tsx).
    // Dua FAQPage dengan jawaban berbeda = data terstruktur bentrok.
  ];
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
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