/**
 * Ekspor hasil AI Web Builder ke file di komputer pengguna (semua di browser, tanpa server).
 *  - ZIP proyek: index.html + assets/style.css (+ assets/app.js bila ada katalog) + content.json + README.txt
 *  - HTML tunggal: satu file mandiri
 *  - content.json: isi mentah dari AI, bisa dipakai ulang
 */
import { buildSite, hasShop, type RenderOpts, type SiteContent, type TemplateId } from "@/lib/ai-site-templates";

/** Isi content.json: teks + pilihan tampilan (tanpa data gambar supaya file tetap kecil). */
function contentJson(c: SiteContent, template: TemplateId, accent: string | undefined, opts?: RenderOpts): string {
  return JSON.stringify({ ...c, template, accent: accent ?? c.accent, ...(opts?.palette?.length ? { palette: opts.palette } : {}) }, null, 2);
}

export function slugify(s: string): string {
  const base = s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return base || "website";
}

function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function readme(c: SiteContent, shop: boolean, hasImages: boolean): string {
  const lines = [
    `${c.brand}`,
    "=".repeat(Math.max(8, c.brand.length)),
    "",
    "Website ini dibuat dengan Depup AI Web Builder.",
    "",
    "ISI PAKET",
    "- index.html          halaman utama",
    "- assets/style.css    tampilan",
    shop ? "- assets/app.js       katalog, keranjang, dan mode kelola produk" : "",
    hasImages ? "- assets/img/         gambar yang kamu unggah" : "",
    "- content.json        isi teks mentah (bisa dipakai ulang)",
    "",
    "CARA PAKAI",
    "1. Ekstrak ZIP ini, lalu buka index.html di browser. Tidak perlu install apa pun.",
    "2. Untuk online: upload seluruh isi folder ke hosting statis apa saja (Depup Link Instan,",
    "   Vercel, Netlify, Cloudflare Pages, GitHub Pages) atau tarik-lepas foldernya ke menu Upload Depup.",
    "3. Edit teks langsung di index.html dengan editor teks biasa.",
  ];
  if (shop) {
    lines.push(
      "",
      "KATALOG & KELOLA PRODUK (CRUD)",
      "- Buka situs dengan tambahan #kelola di akhir alamat (mis. index.html#kelola) untuk menambah, mengubah, dan menghapus produk.",
      "- Perubahan disimpan di browser pemilik (localStorage), bukan di server. Pengunjung lain tetap melihat produk yang tertulis di file.",
      "- Setelah selesai mengubah, tekan \"Unduh situs\" di bilah kelola untuk mendapatkan index.html terbaru, lalu upload ulang.",
      "- \"Ekspor JSON\" / \"Impor JSON\" dipakai untuk cadangan daftar produk.",
      "- Pesanan dikirim lewat WhatsApp (bila nomor WhatsApp diisi) atau disalin sebagai teks.",
    );
  }
  return lines.filter((l, i, arr) => !(l === "" && arr[i - 1] === "")).join("\n") + "\n";
}

export async function downloadZip(c: SiteContent, template: TemplateId, accent: string | undefined, opts: RenderOpts): Promise<void> {
  const { default: JSZip } = await import("jszip");
  const b = buildSite(c, template, accent, { ...opts, imageMode: "files" });
  const shop = hasShop(c) && opts.shop !== false;
  const zip = new JSZip();
  const root = slugify(c.brand);
  const dir = zip.folder(root)!;
  dir.file("index.html", b.index);
  dir.file("assets/style.css", b.css + "\n");
  if (b.hasJs) dir.file("assets/app.js", b.js + "\n");
  for (const a of b.assets) dir.file(a.path, a.data);
  dir.file("content.json", contentJson(c, template, accent, opts) + "\n");
  dir.file("README.txt", readme(c, shop, b.assets.length > 0));
  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 9 } });
  saveBlob(blob, `${root}.zip`);
}

export function downloadHtml(c: SiteContent, template: TemplateId, accent: string | undefined, opts: RenderOpts): void {
  const html = buildSite(c, template, accent, opts).single;
  saveBlob(new Blob([html], { type: "text/html;charset=utf-8" }), `${slugify(c.brand)}.html`);
}

export function downloadJson(c: SiteContent, template: TemplateId, accent: string | undefined, opts?: RenderOpts): void {
  const json = contentJson(c, template, accent, opts);
  saveBlob(new Blob([json], { type: "application/json" }), `${slugify(c.brand)}-content.json`);
}

export async function copyHtml(c: SiteContent, template: TemplateId, accent: string | undefined, opts: RenderOpts): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(buildSite(c, template, accent, opts).single);
    return true;
  } catch {
    return false;
  }
}
