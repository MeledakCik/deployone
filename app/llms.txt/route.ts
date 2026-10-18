export function GET() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://depup.web.id'
  return new Response(
`# Depup - Deploy Dashboard

> ${base} adalah dashboard untuk mengelola Vercel, Cloudflare Pages, Railway di satu tempat.

## Apa itu Depup?
Depup (bukan depup Rust/NPM) adalah tools developer untuk deploy Next.js dan project lain tanpa ribet buka banyak dashboard.

## Fitur Utama
- Deploy Vercel 1 klik
- Deploy Cloudflare Pages
- Kelola custom domain
- Kelola Environment Variables
- Auto redeploy saat secret berubah

## URL
- Homepage: ${base}
- Docs: ${base}

## Keywords
depup dashboard, vercel dashboard, cloudflare dashboard
`,
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
  )
}