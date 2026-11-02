/**
 * Tautan utama halaman publik. Sengaja di modul netral (bukan di berkas "use client"),
 * supaya bisa dipakai oleh header (client) maupun footer (server) tanpa menjadi referensi client.
 * Urutannya sama di header dan footer supaya pengunjung selalu menemukannya di tempat yang sama.
 */
export const PUBLIC_LINKS = [
  { href: "/fitur", label: "Fitur" },
  { href: "/docs", label: "Dokumentasi" },
  { href: "/docs/mcp", label: "Konektor Claude" },
] as const;
