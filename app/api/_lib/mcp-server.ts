import {
  SITE_LIMITS,
  deleteSiteForUser,
  inspectSiteForUser,
  listSitesForUser,
  publishInlineSite,
  updateSiteForUser,
} from "@/app/api/_lib/mcp-sites";

/**
 * Server MCP interaktif untuk Depup: JSON-RPC 2.0 lewat HTTP POST (Streamable HTTP, respons JSON biasa, tanpa SSE
 * dan tanpa session id — setiap request berdiri sendiri, cocok untuk serverless).
 */

export const SUPPORTED_PROTOCOLS = ["2025-06-18", "2025-03-26", "2024-11-05"] as const;
const LATEST = SUPPORTED_PROTOCOLS[0];

export interface RpcRequest {
  jsonrpc?: unknown;
  id?: unknown;
  method?: unknown;
  params?: unknown;
}

export interface RpcResponse {
  jsonrpc: "2.0";
  id: string | number | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

export interface RpcContext {
  email: string;
  host: string | null;
}

const E_PARSE = -32700;
const E_INVALID = -32600;
const E_METHOD = -32601;
const E_PARAMS = -32602;
const E_INTERNAL = -32603;

const rpcError = (id: RpcResponse["id"], code: number, message: string): RpcResponse => ({ jsonrpc: "2.0", id, error: { code, message } });
const rpcResult = (id: RpcResponse["id"], result: unknown): RpcResponse => ({ jsonrpc: "2.0", id, result });

const hours = (h: number) => (h < 24 ? `${h} jam` : `${h / 24} hari`);

export const SERVER_INSTRUCTIONS =
  "Depup menayangkan website statis (HTML/CSS/JS) sebagai link publik sementara (Link Instan), dan men-deploy repo GitHub ke Vercel, Cloudflare Pages, atau Railway. " +
  "TIPS UPLOAD CEPAT & FILE BESAR: Jika `index.html` sangat panjang (>400 baris) atau jumlah file banyak (banyak halaman `index.html`/CSS/JS), jangan kirim semuanya sekaligus dalam satu panggilan besar agar tidak lambat/terpotong. " +
  "Gunakan `deploy_website` untuk meng-upload kerangka awal `index.html` (atau batch file pertama), lalu panggil `update_website` (`append_files` untuk menyambung potongan `index.html` besar, atau `files` untuk menambah file/halaman berikutnya). " +
  "Untuk merevisi website yang sudah tayang, gunakan `update_website` (`patches` untuk cari-ganti teks cepat di `index.html`, atau `files` untuk menimpa file yang berubah) — link publiknya tetap sama dan jauh lebih cepat daripada upload ulang seluruh situs. " +
  "Gunakan `inspect_website` untuk melihat struktur file, statistik pengunjung, diagnostik link rusak, atau membaca isi file per rentang baris. " +
  "`deploy_project` memakai token platform yang disimpan pengguna di Depup (Settings → Konektor Claude); token tidak pernah diminta atau dikembalikan lewat tool. " +
  "`connector_status` menampilkan platform mana yang sudah siap. Konten phishing, malware, atau yang melanggar hukum tidak diterima.";

function promptList() {
  return [
    {
      name: "upload-website-besar",
      title: "Buat & Upload Website Besar / Multi-Halaman (Bertahap & Cepat)",
      description:
        "Panduan interaktif untuk membuat dan menayangkan website dengan index.html besar atau banyak halaman secara bertahap supaya upload cepat dan tidak terpotong.",
      arguments: [
        {
          name: "topik",
          description: "Tema atau nama website yang ingin dibuat (mis. Toko Kopi Nusantara, Dashboard SaaS).",
          required: true,
        },
      ],
    },
    {
      name: "edit-cepat-website",
      title: "Edit Website Aktif Tanpa Ganti Link (Fast Patch)",
      description:
        "Inspeksi website yang sedang tayang lalu terapkan perubahan dengan cepat memakai search-and-replace patch tanpa mengupload ulang seluruh index.html.",
      arguments: [
        {
          name: "site_id",
          description: "ID situs yang ingin diedit (opsional, jika kosong akan dicek lewat list_websites).",
          required: false,
        },
        {
          name: "perubahan",
          description: "Perubahan yang diinginkan pada website.",
          required: true,
        },
      ],
    },
    {
      name: "deploy-repo-github",
      title: "Cek Konektor & Deploy Repo GitHub",
      description:
        "Periksa kesiapan token platform di Depup lalu deploy repository GitHub ke Vercel, Cloudflare Pages, atau Railway secara interaktif.",
      arguments: [
        {
          name: "github_url",
          description: "URL repository GitHub yang akan dideploy.",
          required: true,
        },
      ],
    },
  ];
}

function getPrompt(name: string, args: Record<string, unknown>) {
  switch (name) {
    case "upload-website-besar": {
      const topik = typeof args.topik === "string" && args.topik.trim() ? args.topik.trim() : "website interaktif modern";
      return {
        description: `Alur bertahap pembuatan & upload website besar: ${topik}`,
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text:
                `Buatkan website untuk "${topik}" dan tayangkan ke Depup secara interaktif dan cepat.\n` +
                "Ikuti strategi upload cepat untuk file besar/banyak:\n" +
                "1. Panggil `deploy_website` terlebih dahulu dengan `index.html` bagian utama (atau kerangka awal + CSS) agar link publik langsung aktif.\n" +
                "2. Jika `index.html` panjang atau ada file tambahan (`css/style.css`, `js/app.js`, halaman `tentang/index.html`, dll.), lanjutkan dengan memanggil `update_website` memakai `append_files` atau `files` secara bertahap.\n" +
                "3. Periksa `warnings` pada hasil tool untuk memastikan tidak ada link/asset yang belum terupload.",
            },
          },
        ],
      };
    }
    case "edit-cepat-website": {
      const siteId = typeof args.site_id === "string" && args.site_id.trim() ? args.site_id.trim() : "(cek dulu dengan list_websites)";
      const perubahan = typeof args.perubahan === "string" && args.perubahan.trim() ? args.perubahan.trim() : "perbarui tampilan dan konten";
      return {
        description: `Edit cepat website ${siteId}`,
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text:
                `Saya ingin memperbarui website Depup (site_id: ${siteId}): ${perubahan}.\n` +
                "Gunakan `inspect_website` untuk melihat daftar file dan membaca bagian `index.html` yang relevan, lalu gunakan `update_website` dengan parameter `patches` (atau `files` hanya untuk file yang berubah) supaya prosesnya instan dan URL publiknya tidak berubah.",
            },
          },
        ],
      };
    }
    case "deploy-repo-github": {
      const repo = typeof args.github_url === "string" && args.github_url.trim() ? args.github_url.trim() : "";
      return {
        description: "Alur cek status konektor dan deploy repository GitHub",
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text:
                `Tolong cek platform deploy mana yang siap dengan \`connector_status\`, lalu bantu saya men-deploy repository ${repo || "GitHub saya"} dengan \`deploy_project\`.`,
            },
          },
        ],
      };
    }
    default:
      return null;
  }
}

function toolList() {
  const L = SITE_LIMITS;
  const mb = (L.maxBytes / 1024 / 1024).toFixed(0);
  const stagedMb = (L.maxStagedBytes / 1024 / 1024).toFixed(0);
  return [
    {
      name: "deploy_website",
      title: "Publikasikan website ke Depup",
      description:
        "Menayangkan website statis (HTML/CSS/JS/gambar) ke Depup dan mengembalikan link publik HTTPS beserta diagnostik kesehatannya. " +
        "Syarat input: ada `index.html` di root; isi file ditulis di `files` (`utf8`, `base64`, atau `gzip+base64`). " +
        "TIPS PENTING UNTUK FILE BESAR / BANYAK: Jika `index.html` sangat besar atau file sangat banyak, kirim kerangka awal `index.html` (atau sebagian file dulu) lewat `deploy_website`, lalu sambung sisanya memakai `update_website` (`append_files` / `files`) supaya cepat dan tidak timeout. " +
        `Batas sekali panggil: ${mb} MB (bisa ditambah bertahap lewat \`update_website\` sampai ${stagedMb} MB total, ${L.maxFiles} file, ${L.maxSites} link aktif per akun). ` +
        `Link bersifat sementara (${L.ttlOptionsHours.map(hours).join(", ")}; default ${hours(L.defaultTtlHours)}). Jika \`replace_site_id\` diisi, situs lama diganti (aktifkan \`keep_existing_files: true\` jika hanya ingin menimpa sebagian file).`,
      inputSchema: {
        type: "object",
        properties: {
          name: {
            type: "string",
            maxLength: 40,
            description: 'Nama singkat untuk awalan link, mis. "warung-kopi" (huruf kecil, angka, strip). Opsional.',
          },
          files: {
            type: "array",
            minItems: 1,
            maxItems: L.maxFiles,
            description: "Daftar file website. Harus ada `index.html` di root (kecuali `keep_existing_files: true` dan situs lama sudah punya `index.html`).",
            items: {
              type: "object",
              properties: {
                path: { type: "string", description: "Path relatif, mis. `index.html`, `produk/index.html`, atau `assets/logo.svg`." },
                content: { type: "string", description: 'Isi file. Teks biasa, base64, atau gzip+base64 sesuai `encoding`.' },
                encoding: { type: "string", enum: ["utf8", "base64", "gzip+base64"], default: "utf8" },
              },
              required: ["path", "content"],
              additionalProperties: false,
            },
          },
          ttl_hours: {
            type: "integer",
            enum: [...L.ttlOptionsHours],
            default: L.defaultTtlHours,
            description: "Berapa jam link aktif sebelum otomatis dihapus.",
          },
          spa: {
            type: "boolean",
            default: false,
            description: "true untuk single-page app: path yang tidak ditemukan dialihkan ke index.html.",
          },
          replace_site_id: {
            type: "string",
            description: "ID situs lama (dari `list_websites`) yang diganti oleh versi baru ini. Link-nya akan berubah. Untuk mempertahankan link yang sama, gunakan tool `update_website`.",
          },
          keep_existing_files: {
            type: "boolean",
            default: false,
            description: "Jika true bersama `replace_site_id`, file dari situs lama yang tidak dikirim ulang di `files` akan tetap dipertahankan.",
          },
          auto_strip_prefix: {
            type: "boolean",
            default: false,
            description: "Jika true, otomatis membuang awalan folder pembungkus bersama (mis. `dist/index.html` menjadi `index.html`).",
          },
        },
        required: ["files"],
        additionalProperties: false,
      },
      annotations: {
        title: "Publikasikan website ke Depup",
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    {
      name: "update_website",
      title: "Update bertahap / tambah file / edit cepat website aktif",
      description:
        "Memperbarui website (Link Instan) yang sudah aktif secara langsung (in-place) TANPA mengubah `site_id` maupun URL publiknya. " +
        "Sangat disarankan ketika: (1) `index.html` berukuran besar — kirim bagian pertamanya lewat `deploy_website`, lalu sambung bagian berikutnya memakai `append_files`; " +
        "(2) file atau halaman `index.html` berjumlah banyak — cicil upload per batch memakai `files`; " +
        "(3) pengguna meminta revisi pada `index.html` atau CSS/JS — gunakan `patches` (cari & ganti teks) agar selesai dalam milidetik tanpa harus meng-upload ulang seluruh file.",
      inputSchema: {
        type: "object",
        properties: {
          site_id: {
            type: "string",
            description: "ID situs aktif dari `deploy_website` atau `list_websites`.",
          },
          files: {
            type: "array",
            maxItems: L.maxFiles,
            description: "File baru yang ingin ditambahkan atau file lama yang ingin ditimpa penuh (file lain yang tidak disebut tetap utuh).",
            items: {
              type: "object",
              properties: {
                path: { type: "string", description: "Path relatif file, mis. `index.html`, `tentang/index.html`, atau `js/app.js`." },
                content: { type: "string", description: "Isi file penuh." },
                encoding: { type: "string", enum: ["utf8", "base64", "gzip+base64"], default: "utf8" },
              },
              required: ["path", "content"],
              additionalProperties: false,
            },
          },
          append_files: {
            type: "array",
            maxItems: 50,
            description: "Sambungkan (append) potongan teks/data ke bagian akhir file yang sudah ada (atau buat baru jika belum ada). Solusi terbaik untuk meng-upload `index.html` besar secara bertahap.",
            items: {
              type: "object",
              properties: {
                path: { type: "string", description: "Path relatif file yang ingin disambung, mis. `index.html`." },
                content: { type: "string", description: "Potongan lanjutan yang akan ditambahkan di akhir file." },
                encoding: { type: "string", enum: ["utf8", "base64", "gzip+base64"], default: "utf8" },
              },
              required: ["path", "content"],
              additionalProperties: false,
            },
          },
          patches: {
            type: "array",
            maxItems: 100,
            description: "Edit cepat cari-dan-ganti (search & replace) pada file teks seperti `index.html` atau `css/style.css` tanpa perlu mengirim ulang seluruh isi file.",
            items: {
              type: "object",
              properties: {
                path: { type: "string", description: "Path file yang akan diedit, mis. `index.html`." },
                find: { type: "string", description: "Potongan teks persis yang ingin dicari di dalam file." },
                replace: { type: "string", description: "Teks pengganti baru." },
                all: { type: "boolean", default: false, description: "true untuk mengganti semua kemunculan `find`, false hanya kemunculan pertama." },
              },
              required: ["path", "find", "replace"],
              additionalProperties: false,
            },
          },
          delete_paths: {
            type: "array",
            maxItems: 100,
            items: { type: "string" },
            description: "Daftar path file yang ingin dihapus dari situs (tidak boleh menghapus `index.html` utama kecuali diganti).",
          },
          ttl_hours: {
            type: "integer",
            enum: [...L.ttlOptionsHours],
            description: "Opsional: perbarui durasi aktif situs terhitung dari sekarang.",
          },
          spa: {
            type: "boolean",
            description: "Opsional: ubah pengaturan mode SPA (single-page application).",
          },
        },
        required: ["site_id"],
        additionalProperties: false,
      },
      annotations: {
        title: "Update bertahap / edit cepat website di Depup",
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    {
      name: "inspect_website",
      title: "Inspeksi file, statistik & isi website di Depup",
      description:
        "Menampilkan rincian interaktif satu website (Link Instan): daftar lengkap semua file beserta ukuran & tipe-nya, statistik kunjungan real-time (views, pengunjung unik, halaman terpopuler, error), diagnostik link HTML yang rusak/terpotong, serta membaca isi file tertentu (mendukung paginasi `start_line` s/d `end_line` untuk `index.html` besar).",
      inputSchema: {
        type: "object",
        properties: {
          site_id: { type: "string", description: "ID situs dari `list_websites` atau `deploy_website`." },
          read_path: { type: "string", description: "Opsional: path file yang ingin dibaca isinya, mis. `index.html` atau `css/style.css`." },
          start_line: { type: "integer", minimum: 1, description: "Opsional: nomor baris awal (mulai dari 1) saat membaca file panjang." },
          end_line: { type: "integer", minimum: 1, description: "Opsional: nomor baris akhir saat membaca file panjang (default maksimal 300 baris per baca)." },
        },
        required: ["site_id"],
        additionalProperties: false,
      },
      annotations: {
        title: "Inspeksi file & statistik website di Depup",
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    {
      name: "list_websites",
      title: "Daftar website di Depup",
      description:
        "Menampilkan semua website (Link Instan) aktif milik pengguna di Depup: ID, URL, daftar file, statistik kunjungan, waktu kedaluwarsa, dan ukuran. Pakai ini untuk mencari `site_id` sebelum mengedit (`update_website`), menginspeksi (`inspect_website`), atau menghapus.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { title: "Daftar website di Depup", readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    {
      name: "delete_website",
      title: "Hapus website dari Depup",
      description: "Menghapus satu website (Link Instan) milik pengguna sekarang juga, sehingga linknya langsung tidak bisa dibuka. Tindakan ini tidak bisa dibatalkan.",
      inputSchema: {
        type: "object",
        properties: { site_id: { type: "string", description: "ID situs dari `list_websites`." } },
        required: ["site_id"],
        additionalProperties: false,
      },
      annotations: { title: "Hapus website dari Depup", readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
    },
    {
      name: "connector_status",
      title: "Status konektor deploy Depup",
      description:
        "Menampilkan platform deploy mana (Vercel, Cloudflare Pages, Railway) yang sudah siap dipakai Claude: token sudah disimpan di Settings dan sudah diizinkan pengguna. " +
        "Tidak pernah menampilkan token. Berguna untuk mengetahui apakah `deploy_project` bisa dipakai saat ini.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { title: "Status konektor deploy Depup", readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    {
      name: "deploy_project",
      title: "Deploy project dari GitHub ke Vercel / Cloudflare / Railway",
      description:
        "Men-deploy repo GitHub ke Vercel, Cloudflare Pages, atau Railway memakai token yang sudah disimpan pengguna di Depup → Settings (jangan kirim token di sini). " +
        "Hanya platform yang diizinkan pengguna di Settings → Konektor Claude yang bisa dipakai. Repo harus sudah ada di GitHub dan berisi project yang akan dibangun. " +
        "Hasilnya URL deployment dan tautan dashboard; build bisa butuh beberapa menit setelah ini. Berbeda dengan `deploy_website`, hasilnya permanen dan berjalan di akun platform milik pengguna; deploy ulang memperbarui project produksi yang sama.",
      inputSchema: {
        type: "object",
        properties: {
          platform: { type: "string", enum: ["vercel", "cloudflare", "railway"], description: "Platform tujuan." },
          github_url: { type: "string", description: "URL repo GitHub, mis. https://github.com/pemilik/repo." },
          project_name: {
            type: "string",
            maxLength: 100,
            description: "Nama project di platform (huruf, angka, titik, underscore, strip). Pakai nama yang sama untuk deploy ulang.",
          },
          env_text: { type: "string", description: "Environment variables format .env (KEY=value per baris). Opsional." },
          build_command: { type: "string", description: "Khusus Cloudflare: perintah build. Kosongkan untuk memakai preset otomatis." },
          output_dir: { type: "string", description: "Khusus Cloudflare: folder output build. Kosongkan untuk preset otomatis." },
          start_command: { type: "string", description: "Khusus Railway: perintah start. Kosongkan untuk deteksi otomatis." },
          allow_repo_changes: {
            type: "boolean",
            default: false,
            description:
              "Khusus Railway: true berarti pengguna sudah menyetujui Depup meng-commit file yang kurang (mis. Procfile atau start script) ke repo mereka. Default false: tidak ada perubahan ke repo.",
          },
        },
        required: ["platform", "github_url", "project_name"],
        additionalProperties: false,
      },
      annotations: { title: "Deploy project ke Vercel / Cloudflare / Railway", readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true },
    },
  ];
}

interface ToolOutput {
  content: { type: "text"; text: string }[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

const text = (t: string, structured?: Record<string, unknown>): ToolOutput => ({
  content: [{ type: "text", text: t }],
  ...(structured ? { structuredContent: structured } : {}),
});
const toolError = (t: string): ToolOutput => ({ content: [{ type: "text", text: t }], isError: true });

function fmtDate(ms: number): string {
  return new Date(ms).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "medium", timeStyle: "short" }) + " WIB";
}

async function callTool(name: string, args: Record<string, unknown>, ctx: RpcContext): Promise<ToolOutput | null> {
  switch (name) {
    case "deploy_website": {
      const r = await publishInlineSite(ctx.email, args, ctx.host);
      if (!r.ok) return toolError(r.error);
      const kb = (r.totalBytes / 1024).toFixed(1);
      const warnBlock =
        r.warnings.length > 0
          ? `\n\nCatatan diagnostik:\n${r.warnings.map((w) => `- ⚠️ ${w}`).join("\n")}`
          : "";
      return text(
        `Website berhasil tayang: ${r.url}\n` +
          `ID: ${r.id} · ${r.fileCount} file · ${kb} KB · aktif sampai ${fmtDate(r.expiresAt)}.` +
          (r.replaced ? `\nVersi lama (${r.replaced}) sudah dihapus; pakai link baru ini.` : "") +
          warnBlock +
          `\nTips: Gunakan \`update_website\` (site_id: "${r.id}") jika ingin menambah halaman/file lagi atau mengedit \`index.html\` secara instan tanpa mengubah URL.\nBagikan link ini ke pengguna.`,
        {
          id: r.id,
          url: r.url,
          expiresAt: r.expiresAt,
          fileCount: r.fileCount,
          totalBytes: r.totalBytes,
          replaced: r.replaced,
          warnings: r.warnings,
        },
      );
    }
    case "update_website": {
      const r = await updateSiteForUser(ctx.email, args, ctx.host);
      if (!r.ok) return toolError(r.error);
      const kb = (r.totalBytes / 1024).toFixed(1);
      const warnBlock =
        r.warnings.length > 0
          ? `\n\nCatatan diagnostik:\n${r.warnings.map((w) => `- ⚠️ ${w}`).join("\n")}`
          : "";
      return text(
        `Website berhasil diperbarui (URL tetap sama): ${r.url}\n` +
          `ID: ${r.id} · ${r.fileCount} file total (${kb} KB) · aktif sampai ${fmtDate(r.expiresAt)}.` +
          (r.updatedPaths.length > 0 ? `\nFile diperbarui/ditambahkan: ${r.updatedPaths.join(", ")}` : "") +
          (r.deletedPaths.length > 0 ? `\nFile dihapus: ${r.deletedPaths.join(", ")}` : "") +
          warnBlock,
        {
          id: r.id,
          url: r.url,
          expiresAt: r.expiresAt,
          fileCount: r.fileCount,
          totalBytes: r.totalBytes,
          updatedPaths: r.updatedPaths,
          deletedPaths: r.deletedPaths,
          warnings: r.warnings,
        },
      );
    }
    case "inspect_website": {
      const r = await inspectSiteForUser(ctx.email, args, ctx.host);
      if (!r.ok) return toolError(r.error);
      const kb = (r.totalBytes / 1024).toFixed(1);
      const fileLines = r.files.map((f) => `  - ${f.path} (${(f.size / 1024).toFixed(1)} KB, ${f.contentType})`).join("\n");
      const statsLine = r.stats
        ? `Kunjungan: ${r.stats.views} tayangan · ${r.stats.visitors} pengunjung unik · ${r.stats.requests} request · ${r.stats.errors} error`
        : "Kunjungan: belum ada data";
      const warnBlock =
        r.warnings.length > 0
          ? `\nDiagnostik:\n${r.warnings.map((w) => `- ⚠️ ${w}`).join("\n")}`
          : "\nDiagnostik: semua referensi file HTML valid.";
      const contentBlock = r.fileContent
        ? `\n\nIsi \`${r.fileContent.path}\` (baris ${r.fileContent.startLine}–${r.fileContent.endLine} dari ${r.fileContent.totalLines}):\n\`\`\`\n${r.fileContent.content}\n\`\`\``
        : "";
      return text(
        `Detail website ${r.id}: ${r.url}\n` +
          `Ukuran: ${kb} KB · ${r.fileCount} file · Mode SPA: ${r.spa ? "aktif" : "mati"} · Aktif sampai ${fmtDate(r.expiresAt)}\n` +
          `${statsLine}\n` +
          `Daftar file:\n${fileLines}` +
          warnBlock +
          contentBlock,
        {
          id: r.id,
          name: r.name,
          url: r.url,
          createdAt: r.createdAt,
          expiresAt: r.expiresAt,
          spa: r.spa,
          totalBytes: r.totalBytes,
          fileCount: r.fileCount,
          files: r.files,
          stats: r.stats,
          warnings: r.warnings,
          ...(r.fileContent ? { fileContent: r.fileContent } : {}),
        },
      );
    }
    case "list_websites": {
      const sites = await listSitesForUser(ctx.email, ctx.host);
      if (sites.length === 0) return text("Belum ada website aktif di Depup.", { sites: [], maxSites: SITE_LIMITS.maxSites });
      const lines = sites.map((s) => {
        const kb = (s.totalBytes / 1024).toFixed(1);
        return `- ${s.url} (ID: ${s.id}, ${s.fileCount} file [${kb} KB], ${s.views ?? 0} views, sampai ${fmtDate(s.expiresAt)})`;
      });
      return text(`${sites.length}/${SITE_LIMITS.maxSites} website aktif:\n${lines.join("\n")}`, { sites, maxSites: SITE_LIMITS.maxSites });
    }
    case "delete_website": {
      const r = await deleteSiteForUser(ctx.email, args.site_id);
      return r.ok ? text(`Website ${r.id} sudah dihapus.`, { id: r.id }) : toolError(r.error);
    }
    case "connector_status": {
      // Dimuat saat dibutuhkan: modul deploy menarik banyak dependensi yang tidak perlu untuk tool Link Instan.
      const { getConnectorStatus } = await import("@/app/api/_lib/mcp-deploy");
      const st = await getConnectorStatus(ctx.email);
      const lines = st.platforms.map((p) => {
        const state = p.ready ? "siap dipakai" : !p.tokenSaved ? "token belum disimpan di Settings" : "token ada, tapi belum diizinkan di Settings → Konektor Claude";
        return `- ${p.label}: ${state}`;
      });
      lines.push(`- GitHub token (repo private): ${st.githubSaved ? "tersimpan" : "belum disimpan (cukup untuk repo publik)"}`);
      const anyReady = st.platforms.some((p) => p.ready);
      return text(
        `Status konektor deploy:\n${lines.join("\n")}` +
          (anyReady ? "" : "\nBelum ada platform yang siap. Minta pengguna membuka Depup → Settings, mengisi token platform, lalu mengaktifkannya di bagian Konektor Claude."),
        { platforms: st.platforms, githubSaved: st.githubSaved },
      );
    }
    case "deploy_project": {
      const { deployProject } = await import("@/app/api/_lib/mcp-deploy");
      const r = await deployProject(ctx.email, args);
      if (!r.ok) return toolError(r.error);
      return text(
        `Deploy ke ${r.platform} dimulai untuk project "${r.project}".\n` +
          `URL: ${r.url}\nDashboard: ${r.inspectorUrl}\nStatus awal: ${r.readyState} (build bisa butuh beberapa menit; URL aktif setelah build selesai).` +
          (r.notes.length ? `\nCatatan:\n${r.notes.map((n) => `- ${n}`).join("\n")}` : "") +
          (r.recorded ? "\nTercatat di riwayat dashboard Depup." : ""),
        {
          platform: r.platform,
          project: r.project,
          url: r.url,
          inspectorUrl: r.inspectorUrl,
          deploymentId: r.deploymentId,
          readyState: r.readyState,
          notes: r.notes,
          recorded: r.recorded,
        },
      );
    }
    default:
      return null;
  }
}

/** Proses satu pesan JSON-RPC. Mengembalikan null untuk notifikasi (tidak ada balasan). */
export async function handleRpc(msg: RpcRequest, ctx: RpcContext): Promise<RpcResponse | null> {
  const isNotification = msg === null || typeof msg !== "object" || !("id" in msg) || msg.id === undefined;
  const id = (isNotification ? null : (msg.id as RpcResponse["id"])) ?? null;

  if (!msg || typeof msg !== "object" || msg.jsonrpc !== "2.0" || typeof msg.method !== "string") {
    return isNotification ? null : rpcError(id, E_INVALID, "Request JSON-RPC tidak valid.");
  }
  if (isNotification) return null; // mis. notifications/initialized, notifications/cancelled

  const params = (msg.params && typeof msg.params === "object" ? msg.params : {}) as Record<string, unknown>;

  try {
    switch (msg.method) {
      case "initialize": {
        const asked = typeof params.protocolVersion === "string" ? params.protocolVersion : "";
        const version = (SUPPORTED_PROTOCOLS as readonly string[]).includes(asked) ? asked : LATEST;
        return rpcResult(id, {
          protocolVersion: version,
          capabilities: {
            tools: { listChanged: false },
            prompts: { listChanged: false },
          },
          serverInfo: { name: "depup", title: "Depup", version: "1.2.0" },
          instructions: SERVER_INSTRUCTIONS,
        });
      }
      case "ping":
        return rpcResult(id, {});
      case "prompts/list":
        return rpcResult(id, { prompts: promptList() });
      case "prompts/get": {
        const pName = typeof params.name === "string" ? params.name : "";
        const pArgs = (params.arguments && typeof params.arguments === "object" ? params.arguments : {}) as Record<string, unknown>;
        const prompt = getPrompt(pName, pArgs);
        if (!prompt) return rpcError(id, E_PARAMS, `Prompt tidak dikenal: ${pName || "(kosong)"}`);
        return rpcResult(id, prompt);
      }
      case "tools/list":
        return rpcResult(id, { tools: toolList() });
      case "tools/call": {
        const name = typeof params.name === "string" ? params.name : "";
        const args = (params.arguments && typeof params.arguments === "object" ? params.arguments : {}) as Record<string, unknown>;
        const out = await callTool(name, args, ctx);
        if (!out) return rpcError(id, E_PARAMS, `Tool tidak dikenal: ${name || "(kosong)"}`);
        return rpcResult(id, out);
      }
      default:
        return rpcError(id, E_METHOD, `Method tidak didukung: ${msg.method}`);
    }
  } catch (e) {
    console.error("[mcp] error tak terduga", (e as Error)?.message);
    if (msg.method === "tools/call") {
      const tool = typeof (params as { name?: unknown }).name === "string" ? (params as { name: string }).name : "tool";
      return rpcResult(
        id,
        toolError(
          `Tool \`${tool}\` gagal dijalankan karena gangguan sementara di server Depup (bukan karena input). Tidak ada perubahan yang disimpan; coba panggil lagi beberapa saat lagi.`,
        ),
      );
    }
    return rpcError(id, E_INTERNAL, `Gagal memproses method \`${msg.method}\` karena gangguan sementara di server Depup. Coba lagi beberapa saat lagi.`);
  }
}

export const PARSE_ERROR = rpcError(null, E_PARSE, "Body harus berupa JSON yang valid.");
export const INVALID_REQUEST = rpcError(null, E_INVALID, "Request JSON-RPC tidak valid.");