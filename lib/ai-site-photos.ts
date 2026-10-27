/**
 * Foto yang disiapkan pengguna SEBELUM website dibuat. Berkas asli disimpan di memori browser,
 * lalu setelah AI selesai dipasang berurutan ke sampul artikel / foto produk, sisanya ke gambar utama.
 * Semua diproses di browser; tidak ada yang dikirim ke server.
 */

import type { SiteContent, SiteImages } from "@/lib/ai-site-templates";
import { fileToDataUrl, totalImageBytes, IMAGE_BUDGET_BYTES, type ImageSlot } from "@/lib/ai-site-images";

export interface PhotoDraft {
  id: string;
  file: File;
  /** Object URL untuk thumbnail; wajib di-revoke saat foto dihapus. */
  preview: string;
}

interface Target {
  key: string;
  slot: ImageSlot;
}

/** Urutan tujuan foto: artikel, lalu produk, lalu gambar utama (hanya sisa foto, atau satu-satunya tujuan). */
export function photoTargets(content: SiteContent): Target[] {
  const out: Target[] = [];
  (content.articles ?? []).forEach((a) => out.push({ key: `article:${a.id}`, slot: "article" }));
  content.items.forEach((i) => out.push({ key: `item:${i.id}`, slot: "item" }));
  out.push({ key: "hero", slot: "hero" });
  return out;
}

export interface PhotoAssignResult {
  images: SiteImages;
  /** Foto yang berhasil terpasang. */
  used: number;
  /** Foto yang gagal diproses atau tidak muat di batas ukuran gambar. */
  failed: number;
  /** Foto yang tidak punya tempat (lebih banyak dari artikel/produk). */
  unused: number;
}

/**
 * Pasang foto berurutan ke tujuan. `keep` = gambar yang dipertahankan (mis. logo).
 * Ukuran tiap foto dikecilkan sesuai jatah supaya total tetap di bawah IMAGE_BUDGET_BYTES.
 */
export async function assignPhotos(content: SiteContent, photos: PhotoDraft[], keep: SiteImages = {}): Promise<PhotoAssignResult> {
  const targets = photoTargets(content);
  const pairs = photos.slice(0, targets.length).map((p, i) => ({ photo: p, target: targets[i] }));
  const unused = Math.max(0, photos.length - targets.length);
  const images: SiteImages = { ...keep };
  if (!pairs.length) return { images, used: 0, failed: 0, unused };

  // Sampul artikel tertanam dua kali di HTML (kartu + halaman baca), jadi jatahnya dibagi dua agar publish tidak melewati batas ukuran.
  const budget = (content.articles?.length ?? 0) > 0 ? Math.floor(IMAGE_BUDGET_BYTES / 2) : IMAGE_BUDGET_BYTES;
  const room = Math.max(120 * 1024, budget - totalImageBytes(keep));
  const perImage = Math.max(90 * 1024, Math.min(900 * 1024, Math.floor((room * 0.92) / pairs.length)));

  let failed = 0;
  // Beberapa gambar sekaligus; cukup cepat tanpa membuat tab macet.
  const CHUNK = 4;
  for (let i = 0; i < pairs.length; i += CHUNK) {
    const part = pairs.slice(i, i + CHUNK);
    const done = await Promise.all(
      part.map(async ({ photo, target }) => {
        try {
          return { key: target.key, url: await fileToDataUrl(photo.file, target.slot, perImage) };
        } catch {
          return null;
        }
      }),
    );
    for (const d of done) {
      if (!d) failed++;
      else images[d.key] = d.url;
    }
  }

  // Jaga-jaga bila tetap melewati jatah: buang dari belakang sampai muat.
  let total = totalImageBytes(images);
  if (total > budget) {
    for (let i = pairs.length - 1; i >= 0 && total > budget; i--) {
      const k = pairs[i].target.key;
      if (images[k]) {
        delete images[k];
        failed++;
        total = totalImageBytes(images);
      }
    }
  }
  const used = pairs.filter((p) => images[p.target.key]).length;
  return { images, used, failed, unused };
}
