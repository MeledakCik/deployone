/**
 * Template editor = gabungan siap pakai dari bahan yang sudah ada: dasar Template (latar, huruf, kartu),
 * Gaya desain (bentuk, garis, bayangan), pasangan warna, dan hiasan latar. Satu klik memasang semuanya,
 * dan tiap bagian tetap bisa diubah sendiri lewat panel Desain/Warna sesudahnya.
 */

import type { DecorId, DesignStyleId, TemplateId } from "@/lib/ai-site-templates";

export interface SitePreset {
  id: string;
  name: string;
  desc: string;
  template: TemplateId;
  style?: DesignStyleId;
  palette: [string, string];
  bg?: string;
  decor?: DecorId;
}

export const SITE_PRESETS: SitePreset[] = [
  { id: "bersih-biru", name: "Bersih Biru", desc: "Terang, lega, rapi. Jasa & profil usaha", template: "bersih", style: "minimalist", palette: ["#2563eb", "#93c5fd"] },
  { id: "kuliner-hangat", name: "Kuliner Hangat", desc: "Krem & terakota, kartu membulat. Warung, katering", template: "bakso", palette: ["#c2410c", "#fbbf24"], decor: "dots" },
  { id: "neo-ceria", name: "Neo Ceria", desc: "Bayangan geser warna-warni, sudut membulat", template: "tegas", style: "neo-brutalism", palette: ["#7b50ff", "#c6f432"], bg: "#fffbf0" },
  { id: "poster-brutal", name: "Poster Brutal", desc: "Garis tebal, judul raksasa kapital. Event & distro", template: "tegas", style: "brutalism", palette: ["#e0261d", "#111111"], bg: "#efebe3" },
  { id: "kaca-malam", name: "Kaca Malam", desc: "Kartu kaca di atas cahaya warna. Startup & digital", template: "gelap", style: "glassmorphism", palette: ["#ec4899", "#8b5cf6"], decor: "blobs" },
  { id: "swiss-editorial", name: "Swiss Editorial", desc: "Grid tegas, tipografi jadi fokus. Blog & media", template: "majalah", style: "swiss", palette: ["#b91c1c", "#111827"] },
  { id: "bauhaus-primer", name: "Bauhaus Primer", desc: "Kotak & bulat, biru-kuning primer. Studio kreatif", template: "bersih", style: "bauhaus", palette: ["#1d4ed8", "#facc15"], bg: "#fafaf9", decor: "triangles" },
  { id: "futuristik-neon", name: "Futuristik Neon", desc: "Gelap bergaris, hijau menyala. Gaming & teknologi", template: "neon", style: "futurism", palette: ["#00e5a0", "#38bdf8"], decor: "grid" },
  { id: "lembut-timbul", name: "Lembut Timbul", desc: "Tanpa garis, elemen timbul dari latar. Klinik & jasa", template: "bersih", style: "neumorphism", palette: ["#6366f1", "#a5b4fc"], bg: "#eef0f5" },
  { id: "butik-emas", name: "Butik Emas", desc: "Serif tipis bernuansa emas, lapang. Butik & foto", template: "elegan", style: "minimalist", palette: ["#a16207", "#d6b98c"] },
  { id: "dessert-manis", name: "Dessert Manis", desc: "Persik & pink, huruf serif. Kue & minuman", template: "kue", palette: ["#be185d", "#f9a8d4"], decor: "rings" },
  { id: "pop-eksperimen", name: "Pop Eksperimen", desc: "Judul berani, gelembung warna. Kreator & event", template: "pastel", style: "experimental", palette: ["#c026d3", "#f59e0b"], decor: "blobs" },
  { id: "herbal-segar", name: "Herbal Segar", desc: "Hijau lembut menenangkan. Herbal, tani, kesehatan", template: "segar", palette: ["#16a34a", "#86efac"], decor: "dots" },
  { id: "barber-emas", name: "Barber Tegas", desc: "Hitam pekat & kuning, garis tegas. Barber & bengkel", template: "barber", style: "brutalism", palette: ["#eab308", "#f5f5f4"] },
  { id: "tech-navy", name: "Tech Navy", desc: "Navy tegas, grid teknis. Konsultan & SaaS", template: "tech", style: "swiss", palette: ["#0f172a", "#38bdf8"], decor: "plus" },
  { id: "jurnal-malam", name: "Jurnal Malam", desc: "Gelap nyaman dibaca, aksen amber. Esai & catatan", template: "jurnal", style: "minimalist", palette: ["#f59e0b", "#fde68a"] },
  { id: "kids-ceria", name: "Kids Ceria", desc: "Bentuk bulat, warna riang. Les anak & mainan", template: "pastel", style: "bauhaus", palette: ["#c026d3", "#22c55e"], decor: "triangles" },
  { id: "hangat-kopi", name: "Kopi Hangat", desc: "Ramah berhuruf serif, coklat kopi. Kafe & roastery", template: "hangat", style: "neo-brutalism", palette: ["#7c2d12", "#f59e0b"], bg: "#fff7ed" },
];

/** Preset yang cocok persis dengan pilihan sekarang (untuk menandai kartu terpilih), atau null. */
export function matchPreset(cur: {
  template: TemplateId | null;
  style: DesignStyleId | null;
  palette: string[] | null;
  bg: string | null;
  decor: DecorId | null;
}): SitePreset | null {
  return (
    SITE_PRESETS.find(
      (p) =>
        p.template === cur.template &&
        (p.style ?? null) === cur.style &&
        (p.bg ?? null) === cur.bg &&
        (p.decor ?? null) === cur.decor &&
        !!cur.palette &&
        cur.palette.length === 2 &&
        cur.palette[0].toLowerCase() === p.palette[0] &&
        cur.palette[1].toLowerCase() === p.palette[1],
    ) ?? null
  );
}
