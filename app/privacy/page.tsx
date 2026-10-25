import type { Metadata } from "next";
import { PublicDoc } from "@/components/public/PublicDoc";

export const metadata: Metadata = {
  title: "Kebijakan Privasi",
  description: "Data apa yang dikumpulkan Depup, bagaimana disimpan dan dipakai, siapa saja pihak ketiganya, dan berapa lama disimpan — termasuk untuk konektor Claude (MCP).",
  alternates: { canonical: "/privacy" },
};

const CONTACT = "depupdev@gmail.com";

export default function PrivacyPage() {
  return (
    <PublicDoc title="Kebijakan Privasi Depup" updated="25 Oktober 2026">
      <p>
        Depup (<code>depup.cloud</code>) adalah dashboard deploy untuk Vercel, Cloudflare Pages, dan Railway, plus Link Instan untuk menayangkan file
        statis sementara. Halaman ini menjelaskan data apa yang kami kumpulkan, untuk apa, bagaimana disimpan, siapa yang menerimanya, dan berapa lama
        disimpan. Berlaku untuk dashboard web dan konektor Claude (MCP) Depup.
      </p>

      <h2>1. Data yang kami kumpulkan</h2>
      <ul>
        <li><strong>Akun:</strong> alamat email, nama, dan foto profil dari Google saat kamu masuk dengan Google.</li>
        <li><strong>Token platform yang kamu simpan di Settings:</strong> token Vercel, Cloudflare (dan ID akun), Railway, GitHub PAT, serta token Groq jika kamu memakai fitur AI. Semuanya opsional.</li>
        <li><strong>Data dashboard:</strong> riwayat deploy (nama project, platform, domain, tanggal, repo), daftar domain, dan environment variables yang kamu simpan.</li>
        <li><strong>Link Instan:</strong> file website yang kamu unggah (atau dikirim Claude atas permintaanmu) beserta nama, ukuran, dan waktu kedaluwarsa.</li>
        <li><strong>Konektor Claude (MCP):</strong> token akses OAuth yang diterbitkan Depup, dan catatan teknis seperti jumlah permintaan untuk pembatasan laju. Input dan hasil tool diproses untuk menjalankan permintaanmu; kami tidak membaca atau menyimpan isi percakapanmu dengan Claude.</li>
        <li><strong>Data teknis:</strong> alamat IP untuk pembatasan laju dan pencegahan penyalahgunaan, serta log error tanpa token atau isi rahasia.</li>
        <li><strong>Laporan:</strong> isi laporan penyalahgunaan atau bantuan yang kamu kirim sendiri.</li>
      </ul>

      <h2>2. Untuk apa data dipakai</h2>
      <ul>
        <li>Menjalankan fitur: masuk, deploy ke platform pilihanmu, mengelola domain dan environment variables, menayangkan Link Instan.</li>
        <li>Konektor Claude: saat kamu meminta Claude men-deploy, server Depup memakai token yang kamu simpan untuk memanggil API platform atas namamu.</li>
        <li>Keamanan: mencegah penyalahgunaan, membatasi laju, dan menindaklanjuti laporan phishing atau malware.</li>
        <li>Kami tidak menjual data, tidak memakainya untuk iklan, dan tidak melatih model dengan data kamu.</li>
      </ul>

      <h2>3. Bagaimana data disimpan dan dilindungi</h2>
      <ul>
        <li>Token platform, GitHub PAT, dan environment variables disimpan terenkripsi (AES-256-GCM) di database.</li>
        <li>Token platform dibaca hanya di server saat dibutuhkan. Token tidak pernah dikirim lewat chat Claude, tidak dikembalikan sebagai hasil tool, dan token Groq tidak dikirim balik ke browser.</li>
        <li>Claude hanya bisa memakai platform yang kamu izinkan sendiri di <em>Settings → Konektor Claude</em>. Perubahan ke repo GitHub (khusus Railway) hanya dilakukan setelah kamu menyetujuinya.</li>
        <li>Akses konektor memakai OAuth 2.0 dengan PKCE. Token akses berlaku 1 jam dan token penyegar 30 hari; kamu bisa mencabut semua akses kapan saja lewat tombol <em>Cabut semua akses Claude</em>.</li>
      </ul>

      <h2>4. Pihak ketiga yang menerima data</h2>
      <ul>
        <li><strong>Google</strong> — masuk dengan akun Google.</li>
        <li><strong>Vercel, Cloudflare, Railway, GitHub</strong> — menerima permintaan API (dengan tokenmu) hanya saat kamu atau Claude, atas permintaanmu, melakukan deploy atau membaca repo.</li>
        <li><strong>Supabase dan Vercel KV</strong> — penyimpanan data dan cache.</li>
        <li><strong>Resend</strong> — pengiriman email layanan.</li>
        <li><strong>Groq</strong> — hanya bila kamu memakai fitur AI Web Builder; prompt dikirim ke Groq dengan tokenmu atau jatah server.</li>
        <li><strong>Saweria</strong> — hanya bila kamu berdonasi.</li>
        <li><strong>Anthropic (Claude)</strong> — menerima hasil tool yang dikembalikan konektor sesuai kebijakan privasi Anthropic.</li>
      </ul>

      <h2>5. Berapa lama data disimpan</h2>
      <ul>
        <li>Link Instan: otomatis dihapus saat kedaluwarsa (1 jam sampai 7 hari, sesuai pilihanmu), atau saat kamu menghapusnya.</li>
        <li>Data akun dan dashboard: disimpan selama akunmu aktif. Kamu bisa menghapus token, environment variables, dan riwayat dari dashboard kapan saja.</li>
        <li>Token akses konektor: kedaluwarsa otomatis, dan semuanya langsung tidak berlaku saat kamu mencabut akses.</li>
        <li>Permintaan hapus akun dan data: kirim email ke {CONTACT}; kami tindak lanjuti dalam waktu wajar.</li>
      </ul>

      <h2>6. Hak kamu</h2>
      <p>
        Kamu bisa meminta salinan, koreksi, atau penghapusan data pribadimu, dan mencabut izin konektor kapan saja. Untuk token pihak ketiga,
        kamu juga bisa mencabutnya langsung di Vercel, Cloudflare, Railway, atau GitHub.
      </p>

      <h2>7. Anak-anak</h2>
      <p>Depup ditujukan untuk pengembang dan tidak ditujukan bagi anak di bawah 13 tahun.</p>

      <h2>8. Perubahan kebijakan</h2>
      <p>Jika ada perubahan penting, kami memperbarui tanggal di atas dan memberi tahu lewat dashboard atau email.</p>

      <h2>9. Kontak</h2>
      <p>Pertanyaan soal privasi: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.</p>
    </PublicDoc>
  );
}
