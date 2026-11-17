// Versi Inggris (SEO internasional): middleware memberi bahasa "en" untuk semua /en/*, canonical & hreflang diatur pageMeta.
export { default, generateMetadata, generateStaticParams } from "../../../fitur/[slug]/page";

// Konfigurasi segmen harus ditulis langsung di berkas ini (Next membacanya secara statis, bukan lewat re-export).
export const dynamicParams = false;
