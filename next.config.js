/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Jangan bocorkan versi framework lewat header X-Powered-By.
  poweredByHeader: false,

  async headers() {
    return [
      {
        // Berlaku ke semua route (halaman & API).
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          {
            // HTTPS dipaksa selama 2 tahun, termasuk subdomain — aman untuk
            // di-deploy karena Vercel selalu menyajikan lewat HTTPS.
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
      {
        // CSP dipisah untuk halaman (bukan API) supaya tidak mengganggu
        // response JSON di /api/*. connect-src dibuka ke domain OAuth
        // Google karena redirect login lewat sana.
        source: "/((?!api).*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://accounts.google.com https://oauth2.googleapis.com https://www.googleapis.com",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self' https://accounts.google.com",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
