/**
 * Beranda versi Inggris (SEO internasional). Isinya sama dengan "/", dirender dalam bahasa Inggris karena
 * middleware selalu memberi bahasa "en" untuk /en/*. Dipasangkan dengan "/" lewat hreflang (lihat lib/seo.ts).
 */
export { default, generateMetadata } from "../page";
