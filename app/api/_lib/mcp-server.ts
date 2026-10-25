import {
  SITE_LIMITS,
  deleteSiteForUser,
  listSitesForUser,
  publishInlineSite,
} from "@/app/api/_lib/mcp-sites";

/**
 * Server MCP minimal untuk Depup: JSON-RPC 2.0 lewat HTTP POST (Streamable HTTP, respons JSON biasa, tanpa SSE
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
  "`deploy_website` mengembalikan URL publik beserta waktu kedaluwarsanya; `replace_site_id` mengganti situs lama dan mengubah link-nya. " +
  "`deploy_project` memakai token platform yang disimpan pengguna di Depup (Settings → Konektor Claude); token tidak pernah diminta atau dikembalikan lewat tool. " +
  "`connector_status` menampilkan platform mana yang sudah siap. Konten phishing, malware, atau yang melanggar hukum tidak diterima.";

function toolList() {
  const L = SITE_LIMITS;
  const mb = (L.maxBytes / 1024 / 1024).toFixed(0);
  return [
    {
      name: "deploy_website",
      title: "Publikasikan website ke Depup",
      description:
        "Menayangkan website statis (HTML/CSS/JS/gambar) ke Depup dan mengembalikan link publik HTTPS. " +
        "Syarat input: ada `index.html` di root; isi file ditulis langsung di `files` (teks biasa, atau base64 untuk file biner seperti PNG); path antar-file relatif (mis. `css/style.css`). " +
        "Tidak ada proses build dan tidak ada backend/server — hanya file statis; library JS boleh dimuat dari CDN. " +
        `Batas: ${mb} MB total, ${L.maxFiles} file, ${L.maxSites} link aktif per akun. ` +
        `Link bersifat sementara (${L.ttlOptionsHours.map(hours).join(", ")}; default ${hours(L.defaultTtlHours)}) lalu otomatis dihapus. Jika \`replace_site_id\` diisi, situs lama itu dihapus.`,
      inputSchema: {
        type: "object",
        properties: {
          name: {
            type: "string",
            maxLength: 40,
            description: "Nama singkat untuk awalan link, mis. \"warung-kopi\" (huruf kecil, angka, strip). Opsional.",
          },
          files: {
            type: "array",
            minItems: 1,
            maxItems: L.maxFiles,
            description: "Daftar file website. Harus ada `index.html` di root.",
            items: {
              type: "object",
              properties: {
                path: { type: "string", description: "Path relatif, mis. `index.html` atau `assets/logo.svg`." },
                content: { type: "string", description: "Isi file. Teks biasa, atau base64 kalau `encoding` = \"base64\"." },
                encoding: { type: "string", enum: ["utf8", "base64"], default: "utf8" },
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
            description: "ID situs lama (dari `list_websites`) yang diganti oleh versi baru ini. Link-nya akan berubah. Opsional.",
          },
        },
        required: ["files"],
        additionalProperties: false,
      },
      annotations: {
        title: "Publikasikan website ke Depup",
        readOnlyHint: false,
        destructiveHint: true, // replace_site_id menghapus situs lama
        idempotentHint: false,
        openWorldHint: true, // hasilnya terbuka untuk publik di internet
      },
    },
    {
      name: "list_websites",
      title: "Daftar website di Depup",
      description: "Menampilkan website (Link Instan) aktif milik pengguna di Depup: ID, URL, waktu kedaluwarsa, dan ukuran. Pakai ini untuk mencari `site_id` sebelum mengganti atau menghapus.",
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
      annotations: { title: "Deploy project ke Vercel / Cloudflare / Railway", readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true }, // memperbarui deployment produksi & (Railway, dengan persetujuan) meng-commit ke repo
    },
  ];
}

interface ToolOutput {
  content: { type: "text"; text: string }[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

const text = (t: string, structured?: Record<string, unknown>): ToolOutput => ({ content: [{ type: "text", text: t }], ...(structured ? { structuredContent: structured } : {}) });
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
      return text(
        `Website berhasil tayang: ${r.url}\n` +
          `ID: ${r.id} · ${r.fileCount} file · ${kb} KB · aktif sampai ${fmtDate(r.expiresAt)}.` +
          (r.replaced ? `\nVersi lama (${r.replaced}) sudah dihapus; pakai link baru ini.` : "") +
          `\nBagikan link ini ke pengguna.`,
        { id: r.id, url: r.url, expiresAt: r.expiresAt, fileCount: r.fileCount, totalBytes: r.totalBytes, replaced: r.replaced },
      );
    }
    case "list_websites": {
      const sites = await listSitesForUser(ctx.email, ctx.host);
      if (sites.length === 0) return text("Belum ada website aktif di Depup.", { sites: [], maxSites: SITE_LIMITS.maxSites });
      const lines = sites.map((s) => `- ${s.url} (ID: ${s.id}, ${s.fileCount} file, sampai ${fmtDate(s.expiresAt)})`);
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
        { platform: r.platform, project: r.project, url: r.url, inspectorUrl: r.inspectorUrl, deploymentId: r.deploymentId, readyState: r.readyState, notes: r.notes, recorded: r.recorded },
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
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: "depup", title: "Depup", version: "1.0.0" },
          instructions: SERVER_INSTRUCTIONS,
        });
      }
      case "ping":
        return rpcResult(id, {});
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
    // Kegagalan di dalam tool dilaporkan sebagai hasil tool (isError) supaya Claude bisa menjelaskannya ke user.
    if (msg.method === "tools/call") {
      const tool = typeof (params as { name?: unknown }).name === "string" ? (params as { name: string }).name : "tool";
      return rpcResult(id, toolError(`Tool \`${tool}\` gagal dijalankan karena gangguan sementara di server Depup (bukan karena input). Tidak ada perubahan yang disimpan; coba panggil lagi beberapa saat lagi.`));
    }
    return rpcError(id, E_INTERNAL, `Gagal memproses method \`${msg.method}\` karena gangguan sementara di server Depup. Coba lagi beberapa saat lagi.`);
  }
}

export const PARSE_ERROR = rpcError(null, E_PARSE, "Body harus berupa JSON yang valid.");
export const INVALID_REQUEST = rpcError(null, E_INVALID, "Request JSON-RPC tidak valid.");