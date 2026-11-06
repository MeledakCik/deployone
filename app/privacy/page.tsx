import { getT } from "@/lib/i18n/server";
import type { Metadata } from "next";
import { PublicDoc } from "@/components/public/PublicDoc";
import { pageMeta } from "@/lib/seo";

export function generateMetadata(): Metadata {
  const t = getT();
  return pageMeta({
    title: t("Kebijakan Privasi"),
    description: t("Data apa yang dikumpulkan Depup, bagaimana disimpan dan dipakai, siapa saja pihak ketiganya, dan berapa lama disimpan, termasuk untuk konektor Claude (MCP)."),
    path: "/privacy",
  });
}

const CONTACT = "depupdev@gmail.com";

export default function PrivacyPage() {
  const t = getT();
  return (
    <PublicDoc title={t("Kebijakan Privasi Depup")} updated="25 Oktober 2026">
      <p>
        {t("Depup (")}<code>depup.cloud</code>{t(") adalah dashboard deploy untuk Vercel, Cloudflare Pages, dan Railway, plus Link Instan untuk menayangkan file statis sementara. Halaman ini menjelaskan data apa yang kami kumpulkan, untuk apa, bagaimana disimpan, siapa yang menerimanya, dan berapa lama disimpan. Berlaku untuk dashboard web dan konektor Claude (MCP) Depup.")}
      </p>

      <h2>{t("1. Data yang kami kumpulkan")}</h2>
      <ul>
        <li><strong>{t("Akun:")}</strong>{" "}{t("alamat email, nama, dan foto profil dari Google saat kamu masuk dengan Google.")}</li>
        <li><strong>{t("Token platform yang kamu simpan di Pengaturan:")}</strong>{" "}{t("token Vercel, Cloudflare (dan ID akun), Railway, GitHub PAT, serta token Groq bila kamu memasangnya untuk fitur lama. Semuanya opsional.")}</li>
        <li><strong>{t("Data dashboard:")}</strong>{" "}{t("riwayat deploy (nama project, platform, domain, tanggal, repo), daftar domain, dan environment variables yang kamu simpan.")}</li>
        <li><strong>{t("Link Instan:")}</strong>{" "}{t("file website yang kamu unggah (atau dikirim Claude atas permintaanmu) beserta nama, ukuran, dan waktu kedaluwarsa.")}</li>
        <li><strong>{t("Konektor Claude (MCP):")}</strong>{" "}{t("token akses OAuth yang diterbitkan Depup, dan catatan teknis seperti jumlah permintaan untuk pembatasan laju. Input dan hasil tool diproses untuk menjalankan permintaanmu; kami tidak membaca atau menyimpan isi percakapanmu dengan Claude.")}</li>
        <li><strong>{t("Data teknis:")}</strong>{" "}{t("alamat IP untuk pembatasan laju dan pencegahan penyalahgunaan, serta log error tanpa token atau isi rahasia.")}</li>
        <li><strong>{t("Laporan:")}</strong>{" "}{t("isi laporan penyalahgunaan atau bantuan yang kamu kirim sendiri.")}</li>
      </ul>

      <h2>{t("2. Untuk apa data dipakai")}</h2>
      <ul>
        <li>{t("Menjalankan fitur: masuk, deploy ke platform pilihanmu, mengelola domain dan environment variables, menayangkan Link Instan.")}</li>
        <li>{t("Konektor Claude: saat kamu meminta Claude men-deploy, server Depup memakai token yang kamu simpan untuk memanggil API platform atas namamu.")}</li>
        <li>{t("Keamanan: mencegah penyalahgunaan, membatasi laju, dan menindaklanjuti laporan phishing atau malware.")}</li>
        <li>{t("Kami tidak menjual data, tidak memakainya untuk iklan, dan tidak melatih model dengan data kamu.")}</li>
      </ul>

      <h2>{t("3. Bagaimana data disimpan dan dilindungi")}</h2>
      <ul>
        <li>{t("Token platform, GitHub PAT, dan environment variables disimpan terenkripsi (AES-256-GCM) di database.")}</li>
        <li>{t("Token platform dibaca hanya di server saat dibutuhkan. Token tidak pernah dikirim lewat chat Claude, tidak dikembalikan sebagai hasil tool, dan token Groq tidak dikirim balik ke browser.")}</li>
        <li>{t("Claude hanya bisa memakai platform yang kamu izinkan sendiri di")}{" "}<em>{t("Pengaturan → Konektor Claude")}</em>{t(". Perubahan ke repo GitHub (khusus Railway) hanya dilakukan setelah kamu menyetujuinya.")}</li>
        <li>{t("Akses konektor memakai OAuth 2.0 dengan PKCE. Token akses berlaku 1 jam dan token penyegar 30 hari; kamu bisa mencabut semua akses kapan saja lewat tombol")}{" "}<em>{t("Cabut semua akses Claude")}</em>.</li>
      </ul>

      <h2>{t("4. Pihak ketiga yang menerima data")}</h2>
      <ul>
        <li><strong>{t("Google")}</strong>{" "}{t("— masuk dengan akun Google.")}</li>
        <li><strong>{t("Vercel, Cloudflare, Railway, GitHub")}</strong>{" "}{t("— menerima permintaan API (dengan tokenmu) hanya saat kamu atau Claude, atas permintaanmu, melakukan deploy atau membaca repo.")}</li>
        <li><strong>{t("Supabase dan Vercel KV")}</strong>{" "}{t("— penyimpanan data dan cache.")}</li>
        <li><strong>{t("Resend")}</strong>{" "}{t("— pengiriman email layanan.")}</li>
        <li><strong>{t("AI Web Builder dan Konversi")}</strong>{" "}{t("memakai mesin milik Depup sendiri; deskripsi dan kode yang kamu kirim diproses di server Depup dan tidak diteruskan ke layanan AI lain. Website yang kamu terbitkan hanya dipakai sebagai contoh latih bila kamu mencentang izinnya, dan tanpa gambar maupun data kontak.")}</li>
        <li><strong>{t("Saweria")}</strong>{" "}{t("— hanya bila kamu berdonasi.")}</li>
        <li><strong>{t("Anthropic (Claude)")}</strong>{" "}{t("— menerima hasil tool yang dikembalikan konektor sesuai kebijakan privasi Anthropic.")}</li>
      </ul>

      <h2>{t("5. Berapa lama data disimpan")}</h2>
      <ul>
        <li>{t("Link Instan: otomatis dihapus saat kedaluwarsa (1 jam sampai 30 hari, sesuai pilihanmu), atau saat kamu menghapusnya.")}</li>
        <li>{t("Data akun dan dashboard: disimpan selama akunmu aktif. Kamu bisa menghapus token, environment variables, dan riwayat dari dashboard kapan saja.")}</li>
        <li>{t("Token akses konektor: kedaluwarsa otomatis, dan semuanya langsung tidak berlaku saat kamu mencabut akses.")}</li>
        <li>{t("Permintaan hapus akun dan data: kirim email ke {CONTACT}; kami tindak lanjuti dalam waktu wajar.", { CONTACT })}</li>
      </ul>

      <h2>{t("6. Hak kamu")}</h2>
      <p>
        {t("Kamu bisa meminta salinan, koreksi, atau penghapusan data pribadimu, dan mencabut izin konektor kapan saja. Untuk token pihak ketiga, kamu juga bisa mencabutnya langsung di Vercel, Cloudflare, Railway, atau GitHub.")}
      </p>

      <h2>{t("7. Anak-anak")}</h2>
      <p>{t("Depup ditujukan untuk pengembang dan tidak ditujukan bagi anak di bawah 13 tahun.")}</p>

      <h2>{t("8. Perubahan kebijakan")}</h2>
      <p>{t("Jika ada perubahan penting, kami memperbarui tanggal di atas dan memberi tahu lewat dashboard atau email.")}</p>

      <h2>{t("9. Kontak")}</h2>
      <p>{t("Pertanyaan soal privasi:")}{" "}<a href={`mailto:${CONTACT}`}>{CONTACT}</a>.</p>
    </PublicDoc>
  );
}
