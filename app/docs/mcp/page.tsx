import type { Metadata } from "next";
import { PublicDoc } from "@/components/public/PublicDoc";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbLd, pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Konektor MCP untuk Claude, Cursor, Codex & Gemini",
  description:
    "Hubungkan Depup ke Claude, OpenCode, Cursor, Codex, dan Gemini lewat MCP: publish website sebagai Link Instan, edit tanpa ganti link, atau deploy repo GitHub.",
  path: "/docs/mcp",
  type: "article",
});

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://depup.cloud").replace(/\/+$/, "");
const CONTACT = "depupdev@gmail.com";

export default function McpDocsPage() {
  return (
    <PublicDoc title="Konektor MCP (Claude, OpenCode, Cursor, Codex & Gemini Web/CLI) untuk Depup" updated="28 Oktober 2026">
      <JsonLd
        data={[
          breadcrumbLd([
            { name: "Depup", path: "/" },
            { name: "Dokumentasi", path: "/docs" },
            { name: "Konektor MCP", path: "/docs/mcp" },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "TechArticle",
            headline: "Konektor MCP untuk Claude, Cursor, Codex & Gemini",
            inLanguage: "id-ID",
            dateModified: "2026-10-28",
            mainEntityOfPage: `${SITE}/docs/mcp`,
            author: { "@type": "Organization", name: "Depup", url: SITE },
            publisher: { "@type": "Organization", name: "Depup", url: SITE },
          },
        ]}
      />
      <p>
        Konektor MCP Depup mendukung <strong>Claude</strong>, <strong>OpenCode</strong>, <strong>Cursor</strong>, <strong>Codex</strong>, serta <strong>Gemini (Web &amp; CLI)</strong>. AI pilihanmu bisa menayangkan website statis sebagai <strong>Link Instan</strong> (termasuk website dengan file <code>index.html</code> yang besar atau banyak halaman secara bertahap), mengedit halaman secara instan tanpa mengubah URL, serta men-deploy repo GitHub ke
        <strong> Vercel</strong>, <strong>Cloudflare Pages</strong>, dan <strong>Railway</strong>.
      </p>

      <h2>Apa yang bisa dilakukan (Tools Interaktif)</h2>
      <ul>
        <li><code>deploy_website</code> — menayangkan file HTML/CSS/JS sebagai link publik sementara (1 jam sampai 7 hari). Mendukung kompresi <code>gzip+base64</code>, <code>auto_strip_prefix</code>, dan <code>keep_existing_files</code>.</li>
        <li><code>update_website</code> — memperbarui website aktif secara langsung (<em>in-place</em>) <strong>tanpa mengubah URL publiknya</strong>: menyambung potongan file <code>index.html</code> besar (<code>append_files</code>), menambah halaman/file secara bertahap (<code>files</code>), atau melakukan edit cari-dan-ganti instan (<code>patches</code>).</li>
        <li><code>inspect_website</code> — melihat rincian interaktif website aktif: daftar semua file &amp; ukurannya, statistik kunjungan real-time, diagnostik link HTML yang rusak/terpotong, serta membaca isi file per rentang baris (<code>start_line</code>–<code>end_line</code>).</li>
        <li><code>list_websites</code> — melihat semua Link Instan aktif beserta jumlah tayangan (views) dan daftar filenya.</li>
        <li><code>delete_website</code> — menghapus satu Link Instan.</li>
        <li><code>connector_status</code> — melihat platform deploy mana yang sudah siap dipakai (tanpa menampilkan token).</li>
        <li><code>deploy_project</code> — men-deploy repo GitHub ke Vercel, Cloudflare Pages, atau Railway memakai token yang kamu simpan di Settings.</li>
      </ul>

      <h2>Cara Memasang di Claude, OpenCode, Cursor, Codex &amp; Gemini (Web &amp; CLI)</h2>
      <p>
        Buka <strong>Settings → Konektor AI (MCP)</strong> di dashboard Depup untuk membuat token otomatis dan menyalin konfigurasi siap pakai:
      </p>
      <ul>
        <li>
          <strong>Claude (Web, App HP &amp; Claude Code CLI)</strong>: Tambahkan URL <code>{`${SITE}/api/mcp`}</code> di <em>Settings → Connectors → Add custom connector</em> pada claude.ai, atau jalankan:
          <pre>{`claude mcp add --transport http depup ${SITE}/api/mcp --header "Authorization: Bearer <TOKEN>"`}</pre>
        </li>
        <li>
          <strong>Gemini (Web, Google AI Studio, Firebase Studio &amp; Gemini CLI)</strong>:
          <ul>
            <li><strong>Gemini Web / AI Studio</strong>: Tambahkan server MCP dengan URL <code>{`${SITE}/api/mcp`}</code> dan gunakan OAuth 2.0 (otomatis atau dengan Custom OAuth Client ID &amp; Secret dari Settings Depup) maupun Bearer Token.</li>
            <li><strong>Gemini CLI / Code Assist</strong>: Jalankan perintah CLI atau tempel ke <code>~/.gemini/settings.json</code>:</li>
          </ul>
          <pre>{`gemini mcp add --transport http depup ${SITE}/api/mcp --header "Authorization: Bearer <TOKEN>"`}</pre>
        </li>
        <li>
          <strong>OpenCode (<code>opencode.json</code>)</strong>: Tambahkan blok <code>mcp.depup</code> bertipe <code>remote</code> di <code>opencode.json</code> atau jalankan <code>opencode mcp auth depup</code>:
          <pre>{`{\n  "$schema": "https://opencode.ai/config.json",\n  "mcp": {\n    "depup": {\n      "type": "remote",\n      "url": "${SITE}/api/mcp",\n      "enabled": true,\n      "headers": { "Authorization": "Bearer <TOKEN>" }\n    }\n  }\n}`}</pre>
        </li>
        <li>
          <strong>Cursor (<code>.cursor/mcp.json</code>)</strong>: Klik tombol <strong>Pasang 1-Klik ke Cursor</strong> di Settings Depup, atau tambahkan ke <code>.cursor/mcp.json</code>:
          <pre>{`{\n  "mcpServers": {\n    "depup": {\n      "url": "${SITE}/api/mcp",\n      "headers": { "Authorization": "Bearer <TOKEN>" }\n    }\n  }\n}`}</pre>
        </li>
        <li>
          <strong>Codex (<code>~/.codex/config.toml</code>)</strong>: Jalankan <code>{`codex mcp add depup --url ${SITE}/api/mcp`}</code> atau tambahkan di <code>~/.codex/config.toml</code>:
          <pre>{`[mcp_servers.depup]\nurl = "${SITE}/api/mcp"\nhttp_headers = { "Authorization" = "Bearer <TOKEN>" }`}</pre>
        </li>
      </ul>

      <h2>Solusi untuk <code>index.html</code> Besar &amp; Banyak File</h2>
      <ol>
        <li>AI menayangkan kerangka awal <code>index.html</code> dengan <code>deploy_website</code> sehingga link langsung aktif dalam hitungan detik.</li>
        <li>AI menyambung bagian <code>index.html</code> berikutnya memakai <code>update_website</code> (<code>append_files</code>) atau mencicil file tambahan (<code>files</code>) tanpa risiko terpotong batas token.</li>
        <li>Saat kamu meminta revisi warna/teks/komponen, AI cukup memanggil <code>update_website</code> (<code>patches</code>) sehingga perubahan tayang dalam milidetik dengan URL yang tetap sama.</li>
      </ol>

      <h2>Buat OAuth Sendiri di Settings (Custom OAuth 2.1)</h2>
      <ol>
        <li>Buka <strong>Settings → Konektor AI (MCP)</strong> lalu pilih tab <strong>Buat OAuth Sendiri</strong>.</li>
        <li>Isi nama aplikasi, pilih metode autentikasi (<strong>Client ID + Secret</strong> atau <strong>Public PKCE</strong>), dan centang preset Redirect URI untuk <strong>Claude</strong>, <strong>Gemini (Web &amp; CLI)</strong>, <strong>Cursor</strong>, <strong>OpenCode</strong>, <strong>Codex</strong>, atau URL kustommu.</li>
        <li>Klik <strong>Buat OAuth Sendiri</strong> untuk mendapatkan <code>Client ID</code> dan <code>Client Secret</code>, atau klik <strong>Buat Bearer Token Langsung</strong> (pilihan masa aktif 1–365 hari).</li>
      </ol>

      <h2>Dukungan</h2>
      <p>
        Pertanyaan dan masalah: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>. Penyalahgunaan Link Instan bisa dilaporkan di <a href="/laporkan">/laporkan</a>.
        Lihat juga <a href="/privacy">Kebijakan Privasi</a>.
      </p>
    </PublicDoc>
  );
}
