/** @type {import('next').NextConfig} */

// CSP dipisah jadi array biar gampang dibaca/di-maintain. Sudah dicek ke
// seluruh codebase: tidak ada inline <script>, dangerouslySetInnerHTML,
// atau eval — jadi script-src bisa 'self' saja tanpa 'unsafe-inline'.
// style-src butuh 'unsafe-inline' karena banyak komponen pakai inline
// style={{...}} (GoogleLoginModal, dll). connect-src di-whitelist ke domain
// yang memang dipanggil dari client/server: Vercel, GitHub, Google OAuth.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://api.github.com https://accounts.google.com https://oauth2.googleapis.com https://www.googleapis.com https://api.vercel.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self' https://accounts.google.com",
  "object-src 'none'",
].join("; ");

const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Content-Security-Policy", value: CSP },
];

const nextConfig = {
  reactStrictMode: true,
  // Jangan kasih tau ke luar kalau ini Next.js — informasi kecil, tapi
  // memperkecil "sidik jari" stack yang bisa dipakai buat rekon awal.
  poweredByHeader: false,
  async headers() {
    return [
      {
        // Semua route, termasuk /api/* — respons JSON tetap aman dikasih
        // header ini, browser cuma pakai yang relevan buat masing-masing.
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

module.exports = nextConfig;
