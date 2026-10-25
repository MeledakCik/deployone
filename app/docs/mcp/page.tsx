import type { Metadata } from "next";
import { PublicDoc } from "@/components/public/PublicDoc";

export const metadata: Metadata = {
  title: "Konektor Claude (MCP)",
  description: "Hubungkan Depup ke Claude: publish website sebagai Link Instan atau deploy repo GitHub ke Vercel, Cloudflare Pages, dan Railway langsung dari chat.",
  alternates: { canonical: "/docs/mcp" },
};

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://depup.cloud").replace(/\/+$/, "");
const CONTACT = "depupdev@gmail.com";

export default function McpDocsPage() {
  return (
    <PublicDoc title="Konektor Claude (MCP) untuk Depup" updated="25 Oktober 2026">
      <p>
        Konektor ini membuat Claude bisa menayangkan website statis sebagai <strong>Link Instan</strong> dan men-deploy repo GitHub ke
        <strong> Vercel</strong>, <strong>Cloudflare Pages</strong>, dan <strong>Railway</strong>, semuanya dari chat. Halaman ini publik, tidak perlu login.
      </p>

      <h2>Apa yang bisa dilakukan</h2>
      <ul>
        <li><code>deploy_website</code> — menayangkan file HTML/CSS/JS sebagai link publik sementara (1 jam sampai 7 hari). Opsi <code>replace_site_id</code> mengganti situs lama.</li>
        <li><code>list_websites</code> — melihat Link Instan aktif milikmu.</li>
        <li><code>delete_website</code> — menghapus satu Link Instan.</li>
        <li><code>connector_status</code> — melihat platform deploy mana yang sudah siap dipakai Claude (tanpa menampilkan token).</li>
        <li><code>deploy_project</code> — men-deploy repo GitHub ke Vercel, Cloudflare Pages, atau Railway memakai token yang kamu simpan di Settings.</li>
      </ul>

      <h2>Persiapan</h2>
      <ol>
        <li>Punya akun Depup: masuk dengan Google di <a href={SITE}>{SITE}</a>.</li>
        <li>Untuk deploy ke platform: buka <strong>Settings</strong> di dashboard, isi token Vercel, Cloudflare, dan/atau Railway, lalu klik <strong>Simpan</strong>. Untuk repo private, isi juga GitHub PAT.</li>
        <li>Di bagian <strong>Konektor Claude</strong> pada Settings, nyalakan saklar untuk platform yang boleh dipakai Claude. Semua saklar mati secara default.</li>
      </ol>

      <h2>Memasang di Claude</h2>
      <ol>
        <li>Buka claude.ai, lalu <strong>Settings → Connectors</strong>, dan pilih konektor Depup (atau <strong>Add custom connector</strong>).</li>
        <li>Jika memakai custom connector, isi URL berikut:<pre>{`${SITE}/api/mcp`}</pre></li>
        <li>Klik <strong>Connect</strong>, masuk dengan Google di Depup, lalu tekan <strong>Izinkan</strong>.</li>
        <li>Di chat, aktifkan konektor Depup. Konektor yang sama otomatis muncul di app Claude di HP pada akun yang sama.</li>
      </ol>

      <h2>Contoh prompt</h2>
      <ol>
        <li><em>“Buatkan landing page warung kopi satu halaman, lalu publish ke Depup selama 24 jam.”</em> → memakai <code>deploy_website</code>.</li>
        <li><em>“Tampilkan semua website aktifku di Depup, lalu hapus yang paling lama.”</em> → memakai <code>list_websites</code> dan <code>delete_website</code>.</li>
        <li><em>“Cek platform deploy mana yang sudah siap di Depup.”</em> → memakai <code>connector_status</code>.</li>
        <li><em>“Deploy repo github.com/akun/toko ke Vercel dengan nama project toko-kopi.”</em> → memakai <code>deploy_project</code>.</li>
        <li><em>“Deploy repo yang sama ke Railway.”</em> → <code>deploy_project</code> dengan <code>platform: railway</code>. Jika repo kekurangan file (mis. start script), Depup menampilkan daftarnya dan meminta persetujuanmu sebelum meng-commit apa pun.</li>
      </ol>

      <h2>Keamanan dan izin</h2>
      <ul>
        <li>Masuk memakai OAuth 2.0 + PKCE. Token akses berlaku 1 jam; kamu bisa mencabut semua akses di <strong>Settings → Konektor Claude → Cabut semua akses Claude</strong>.</li>
        <li>Token Vercel, Cloudflare, Railway, dan GitHub disimpan terenkripsi dan dibaca hanya di server. Token tidak pernah dikirim lewat chat dan tidak dikembalikan ke Claude.</li>
        <li>Claude hanya bisa memakai platform yang kamu nyalakan. Tool <code>deploy_project</code> menandai dirinya sebagai tindakan yang mengubah data, jadi Claude akan meminta konfirmasi sebelum menjalankannya.</li>
        <li>Perubahan ke repo GitHub (khusus Railway) hanya terjadi setelah kamu menyetujuinya.</li>
        <li>Batas: maksimal 3 Link Instan aktif per akun (bisa berbeda sesuai konfigurasi), 15 deploy platform per jam, dan 120 permintaan MCP per menit.</li>
      </ul>

      <h2>Pemecahan masalah</h2>
      <ul>
        <li><strong>“Token … belum disimpan”</strong> — isi token platform di Settings, lalu klik Simpan.</li>
        <li><strong>“Kamu belum mengizinkan Claude deploy ke …”</strong> — nyalakan saklar platform itu di Settings → Konektor Claude.</li>
        <li><strong>“Token … ditolak”</strong> — token salah atau kedaluwarsa; buat token baru di platform dan simpan ulang.</li>
        <li><strong>Cloudflare minta hubungkan GitHub</strong> — izinkan GitHub App Cloudflare Pages di dashboard Cloudflare, lalu ulangi.</li>
        <li><strong>“Hubungkan ulang konektor”</strong> — akses sudah dicabut atau kedaluwarsa; sambungkan lagi dari Settings → Connectors di Claude.</li>
      </ul>

      <h2>Dukungan</h2>
      <p>
        Pertanyaan dan masalah: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>. Penyalahgunaan Link Instan bisa dilaporkan di <a href="/laporkan">/laporkan</a>.
        Lihat juga <a href="/privacy">Kebijakan Privasi</a>.
      </p>
    </PublicDoc>
  );
}
