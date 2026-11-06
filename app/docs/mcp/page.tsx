import { getT } from "@/lib/i18n/server";
import type { Metadata } from "next";
import { PublicDoc } from "@/components/public/PublicDoc";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbLd, pageMeta } from "@/lib/seo";

export function generateMetadata(): Metadata {
  const t = getT();
  return pageMeta({
    title: t("Konektor MCP: Claude, Cursor, Codex, Gemini, DeepSeek"),
    description: t("Hubungkan Depup ke Claude, Cursor, Codex, Gemini, OpenCode, dan DeepSeek Harness lewat MCP: publish website sebagai Link Instan atau deploy repo GitHub."),
    path: "/docs/mcp",
    type: "article",
  });
}

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://depup.cloud").replace(/\/+$/, "");
const CONTACT = "depupdev@gmail.com";

export default function McpDocsPage() {
  const t = getT();
  return (
    <PublicDoc title={t("Konektor MCP (Claude, OpenCode, Cursor, Codex, Gemini & DeepSeek) untuk Depup")} updated="28 Oktober 2026">
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
            headline: t("Konektor MCP untuk Claude, Cursor, Codex, Gemini & DeepSeek"),
            inLanguage: "id-ID",
            dateModified: "2026-10-28",
            mainEntityOfPage: `${SITE}/docs/mcp`,
            author: { "@type": "Organization", name: "Depup", url: SITE },
            publisher: { "@type": "Organization", name: "Depup", url: SITE },
          },
        ]}
      />
      <p>
        {t("Konektor MCP Depup mendukung")}{" "}<strong>{t("Claude")}</strong>, <strong>{t("OpenCode")}</strong>, <strong>{t("Cursor")}</strong>, <strong>{t("Codex")}</strong>, <strong>{t("Gemini (Web & CLI)")}</strong>{t(", serta")}{" "}<strong>{t("DeepSeek Harness")}</strong>{t(". AI pilihanmu bisa menayangkan website statis sebagai")}{" "}<strong>{t("Link Instan")}</strong>{" "}{t("(termasuk website dengan file")}{" "}<code>index.html</code>{" "}{t("yang besar atau banyak halaman secara bertahap), mengedit halaman secara instan tanpa mengubah URL, serta men-deploy repo GitHub ke")}
        <strong>{" "}{t("Vercel")}</strong>, <strong>{t("Cloudflare Pages")}</strong>{t(", dan")}{" "}<strong>{t("Railway")}</strong>.
      </p>

      <h2>{t("Apa yang bisa dilakukan (Tools Interaktif)")}</h2>
      <ul>
        <li><code>{t("deploy_website")}</code>{" "}{t("— menayangkan file HTML/CSS/JS sebagai link publik sementara (1 jam sampai 7 hari). Mendukung kompresi")}{" "}<code>{t("gzip+base64")}</code>, <code>{t("auto_strip_prefix")}</code>{t(", dan")}{" "}<code>{t("keep_existing_files")}</code>.</li>
        <li><code>{t("update_website")}</code>{" "}{t("— memperbarui website aktif secara langsung (")}<em>in-place</em>) <strong>{t("tanpa mengubah URL publiknya")}</strong>{t(": menyambung potongan file")}{" "}<code>index.html</code>{" "}{t("besar (")}<code>{t("append_files")}</code>{t("), menambah halaman/file secara bertahap (")}<code>files</code>{t("), atau melakukan edit cari-dan-ganti instan (")}<code>patches</code>).</li>
        <li><code>{t("inspect_website")}</code>{" "}{t("— melihat rincian interaktif website aktif: daftar semua file & ukurannya, statistik kunjungan real-time, diagnostik link HTML yang rusak/terpotong, serta membaca isi file per rentang baris (")}<code>{t("start_line")}</code>–<code>{t("end_line")}</code>).</li>
        <li><code>{t("list_websites")}</code>{" "}{t("— melihat semua Link Instan aktif beserta jumlah tayangan (views) dan daftar filenya.")}</li>
        <li><code>{t("delete_website")}</code>{" "}{t("— menghapus satu Link Instan.")}</li>
        <li><code>{t("connector_status")}</code>{" "}{t("— melihat platform deploy mana yang sudah siap dipakai (tanpa menampilkan token).")}</li>
        <li><code>{t("deploy_project")}</code>{" "}{t("— men-deploy repo GitHub ke Vercel, Cloudflare Pages, atau Railway memakai token yang kamu simpan di Pengaturan.")}</li>
      </ul>

      <h2>{t("Cara Memasang di Claude, OpenCode, Cursor, Codex, Gemini & DeepSeek")}</h2>
      <p>
        {t("Buka")}{" "}<strong>{t("Pengaturan → Konektor AI (MCP)")}</strong>{" "}{t("di dashboard Depup untuk membuat token otomatis dan menyalin konfigurasi siap pakai:")}
      </p>
      <ul>
        <li>
          <strong>{t("Claude (Web, App HP & Claude Code CLI)")}</strong>{t(": Tambahkan URL")}{" "}<code>{`${SITE}/api/mcp`}</code>{" "}{t("di")}{" "}<em>{t("Settings → Connectors → Add custom connector")}</em>{" "}{t("pada claude.ai, atau jalankan:")}
          <pre>{t("claude mcp add --transport http depup {SITE}/api/mcp --header \"Authorization: Bearer <TOKEN>\"", { SITE })}</pre>
        </li>
        <li>
          <strong>{t("Gemini (Web, Google AI Studio, Firebase Studio & Gemini CLI)")}</strong>:
          <ul>
            <li><strong>{t("Gemini Web / AI Studio")}</strong>{t(": Tambahkan server MCP dengan URL")}{" "}<code>{`${SITE}/api/mcp`}</code>{" "}{t("dan gunakan OAuth 2.0 (otomatis atau dengan Custom OAuth Client ID & Secret dari Pengaturan Depup) maupun Bearer Token.")}</li>
            <li><strong>{t("Gemini CLI / Code Assist")}</strong>{t(": Jalankan perintah CLI atau tempel ke")}{" "}<code>{t("~/.gemini/settings.json")}</code>:</li>
          </ul>
          <pre>{t("gemini mcp add --transport http depup {SITE}/api/mcp --header \"Authorization: Bearer <TOKEN>\"", { SITE })}</pre>
        </li>
        <li>
          <strong>{t("OpenCode (")}<code>opencode.json</code>)</strong>{t(": Tambahkan blok")}{" "}<code>mcp.depup</code> bertipe <code>remote</code>{" "}{t("di")}{" "}<code>opencode.json</code>{" "}{t("atau jalankan")}{" "}<code>{t("opencode mcp auth depup")}</code>:
          <pre>{`{\n  "$schema": "https://opencode.ai/config.json",\n  "mcp": {\n    "depup": {\n      "type": "remote",\n      "url": "${SITE}/api/mcp",\n      "enabled": true,\n      "headers": { "Authorization": "Bearer <TOKEN>" }\n    }\n  }\n}`}</pre>
        </li>
        <li>
          <strong>{t("Cursor (")}<code>{t(".cursor/mcp.json")}</code>)</strong>{t(": Klik tombol")}{" "}<strong>{t("Pasang 1-Klik ke Cursor")}</strong>{" "}{t("di Pengaturan Depup, atau tambahkan ke")}{" "}<code>{t(".cursor/mcp.json")}</code>:
          <pre>{`{\n  "mcpServers": {\n    "depup": {\n      "url": "${SITE}/api/mcp",\n      "headers": { "Authorization": "Bearer <TOKEN>" }\n    }\n  }\n}`}</pre>
        </li>
        <li>
          <strong>{t("Codex (")}<code>{t("~/.codex/config.toml")}</code>)</strong>{t(": Jalankan")}{" "}<code>{t("codex mcp add depup --url {SITE}/api/mcp", { SITE })}</code>{" "}{t("atau tambahkan di")}{" "}<code>{t("~/.codex/config.toml")}</code>:
          <pre>{`[mcp_servers.depup]\nurl = "${SITE}/api/mcp"\nhttp_headers = { "Authorization" = "Bearer <TOKEN>" }`}</pre>
        </li>
        <li>
          <strong>{t("DeepSeek Harness (")}<code>dsh</code>)</strong>{t(": memakai paket resmi")}{" "}<code>@deepseek-ai/dsh-mcp-client</code>{" "}{t("dan Bearer Token (bukan OAuth otomatis). Buat token di")}{" "}<em>{t("Pengaturan → Konektor AI (MCP) → DeepSeek")}</em>{t(". DeepSeek Harness masih")}{" "}<em>{t("developer preview")}</em>{t(", jadi format konfigurasinya bisa berubah antar rilis. Urutannya: pasang paket dulu, baru tulis konfigurasi.")}
          <pre>{`# 1) Pasang paket (ganti VERSI_DSH dengan hasil: dsh --version)\ndsh plugin --profile web add @deepseek-ai/dsh-mcp-client@VERSI_DSH\n\n# 2) Isi token lewat variabel lingkungan, bukan di file YAML\nexport DEPUP_MCP_AUTH="Bearer <TOKEN>"`}</pre>
          {t("Lalu tambahkan ke")}{" "}<code>{t("~/.dsh/profiles/web/cordis.patch.yml")}</code>{" "}{t("(ganti")}{" "}<code>web</code>{" "}{t("dengan nama profilmu), dan restart")}{" "}<code>{t("dsh web")}</code>:
          <pre>{t("- insert:\n    - id: mcp-depup\n      name: '@deepseek-ai/dsh-mcp-client'\n      config:\n        serverName: 'depup'\n        transport: streamable-http\n        url: '{SITE}/api/mcp'\n        headers:\n          Authorization: !!js process.env.DEPUP_MCP_AUTH", { SITE })}</pre>
          {t("Cek hasilnya dengan")}{" "}<code>{t("dsh --profile web --dump-config | grep mcp-")}</code>{t(". Tool Depup muncul dengan nama seperti")}{" "}<code>{t("mcp__depup__deploy_website")}</code>.
        </li>
      </ul>

      <h2>{t("Solusi untuk")}{" "}<code>index.html</code>{" "}{t("Besar & Banyak File")}</h2>
      <ol>
        <li>{t("AI menayangkan kerangka awal")}{" "}<code>index.html</code>{" "}{t("dengan")}{" "}<code>{t("deploy_website")}</code>{" "}{t("sehingga link langsung aktif dalam hitungan detik.")}</li>
        <li>{t("AI menyambung bagian")}{" "}<code>index.html</code>{" "}{t("berikutnya memakai")}{" "}<code>{t("update_website")}</code> (<code>{t("append_files")}</code>{t(") atau mencicil file tambahan (")}<code>files</code>{t(") tanpa risiko terpotong batas token.")}</li>
        <li>{t("Saat kamu meminta revisi warna/teks/komponen, AI cukup memanggil")}{" "}<code>{t("update_website")}</code> (<code>patches</code>{t(") sehingga perubahan tayang dalam milidetik dengan URL yang tetap sama.")}</li>
      </ol>

      <h2>{t("Buat OAuth Sendiri di Pengaturan (Custom OAuth 2.1)")}</h2>
      <ol>
        <li>{t("Buka")}{" "}<strong>{t("Pengaturan → Konektor AI (MCP)")}</strong>{" "}{t("lalu pilih tab")}{" "}<strong>{t("Buat OAuth Sendiri")}</strong>.</li>
        <li>{t("Isi nama aplikasi, pilih metode autentikasi (")}<strong>{t("Client ID + Secret")}</strong>{" "}{t("atau")}{" "}<strong>{t("Public PKCE")}</strong>{t("), dan centang preset Redirect URI untuk")}{" "}<strong>{t("Claude")}</strong>, <strong>{t("Gemini (Web & CLI)")}</strong>, <strong>{t("Cursor")}</strong>, <strong>{t("OpenCode")}</strong>, <strong>{t("Codex")}</strong>{t(", atau URL kustommu.")}</li>
        <li>{t("Klik")}{" "}<strong>{t("Buat OAuth Sendiri")}</strong>{" "}{t("untuk mendapatkan")}{" "}<code>{t("Client ID")}</code>{" "}{t("dan")}{" "}<code>{t("Client Secret")}</code>{t(", atau klik")}{" "}<strong>{t("Buat Bearer Token Langsung")}</strong>{" "}{t("(pilihan masa aktif 1–365 hari).")}</li>
      </ol>

      <h2>{t("Dukungan")}</h2>
      <p>
        {t("Pertanyaan dan masalah:")}{" "}<a href={`mailto:${CONTACT}`}>{CONTACT}</a>{t(". Penyalahgunaan Link Instan bisa dilaporkan di")}{" "}<a href="/laporkan">/laporkan</a>{t(". Lihat juga")}{" "}<a href="/privacy">{t("Kebijakan Privasi")}</a>.
      </p>
    </PublicDoc>
  );
}
