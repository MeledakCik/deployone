/**
 * Gambar unggahan untuk AI Web Builder. Semua diproses di browser (tanpa server):
 * gambar dikecilkan lewat canvas lalu disimpan sebagai data URL (WebP bila didukung, selain itu JPEG/PNG).
 * Hasilnya ditanam langsung di index.html (publish) atau ditulis jadi berkas di assets/img (ZIP).
 */

export type ImageSlot = "logo" | "hero" | "item" | "article";

/** Sisi terpanjang (px) per jenis gambar. */
export const SLOT_MAX_PX: Record<ImageSlot, number> = { logo: 320, hero: 1600, item: 1000, article: 1400 };

/** Batas file sumber yang dibaca. */
export const MAX_INPUT_BYTES = 12 * 1024 * 1024;

/** Total gambar yang boleh tertanam. Batas upload situs default 10 MB, sisanya untuk HTML. */
export const IMAGE_BUDGET_BYTES = 6 * 1024 * 1024;

const ACCEPT = /^image\/(png|jpe?g|webp|gif)$/i;
export const IMAGE_ACCEPT = "image/png,image/jpeg,image/webp,image/gif";

export function dataUrlBytes(u: string): number {
  const i = u.indexOf(",");
  return i < 0 ? 0 : Math.floor(((u.length - i - 1) * 3) / 4);
}

export function totalImageBytes(images: Record<string, string>): number {
  let n = 0;
  for (const k of Object.keys(images)) n += dataUrlBytes(images[k]);
  return n;
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

async function decode(file: File): Promise<{ src: CanvasImageSource; w: number; h: number; close: () => void }> {
  if (typeof createImageBitmap === "function") {
    try {
      const bmp = await createImageBitmap(file);
      return { src: bmp, w: bmp.width, h: bmp.height, close: () => bmp.close() };
    } catch {
      /* jatuh ke <img> */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const el = new Image();
      el.onload = () => res(el);
      el.onerror = () => rej(new Error("decode"));
      el.src = url;
    });
    return { src: img, w: img.naturalWidth, h: img.naturalHeight, close: () => URL.revokeObjectURL(url) };
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
}

/**
 * Baca file gambar → data URL yang sudah dikecilkan. Melempar Error berbahasa Indonesia bila gagal.
 * `maxBytes` = target ukuran hasil; kualitas/dimensi diturunkan bertahap sampai muat.
 */
export async function fileToDataUrl(file: File, slot: ImageSlot, maxBytes = 900 * 1024): Promise<string> {
  if (!ACCEPT.test(file.type)) throw new Error("Format belum didukung. Pakai PNG, JPG, WebP, atau GIF.");
  if (file.size > MAX_INPUT_BYTES) throw new Error(`File terlalu besar (maks ${formatBytes(MAX_INPUT_BYTES)}).`);

  let dec: Awaited<ReturnType<typeof decode>>;
  try {
    dec = await decode(file);
  } catch {
    throw new Error("Gambar tidak bisa dibuka. Coba file lain.");
  }
  try {
    if (!dec.w || !dec.h) throw new Error("Gambar tidak bisa dibuka. Coba file lain.");
    const keepAlpha = slot === "logo";
    let scale = Math.min(1, SLOT_MAX_PX[slot] / Math.max(dec.w, dec.h));
    let quality = 0.84;
    let best = "";
    for (let attempt = 0; attempt < 4; attempt++) {
      const w = Math.max(1, Math.round(dec.w * scale));
      const h = Math.max(1, Math.round(dec.h * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Browser tidak mendukung pengolahan gambar.");
      ctx.imageSmoothingQuality = "high";
      let url = "";
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(dec.src, 0, 0, w, h);
      url = canvas.toDataURL("image/webp", quality);
      if (!url.startsWith("data:image/webp")) {
        // Browser lama tanpa WebP: logo tetap PNG (transparan), lainnya JPEG di atas latar putih.
        if (keepAlpha) {
          url = canvas.toDataURL("image/png");
        } else {
          ctx.globalCompositeOperation = "destination-over";
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, w, h);
          url = canvas.toDataURL("image/jpeg", quality);
        }
      }
      best = url;
      if (dataUrlBytes(url) <= maxBytes) break;
      quality = Math.max(0.55, quality - 0.1);
      scale *= 0.82;
    }
    if (!/^data:image\/(png|jpeg|webp);base64,/.test(best)) throw new Error("Gagal memproses gambar.");
    return best;
  } finally {
    dec.close();
  }
}
