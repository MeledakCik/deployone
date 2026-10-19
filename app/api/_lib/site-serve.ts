import { rateLimit } from "@/app/api/_lib/rate-limit";
import { readSiteFile, type SiteFile, type SiteMeta } from "@/app/api/_lib/sites";
import { withDirBase } from "@/app/api/_lib/site-html";

/** Menyajikan satu request GET/HEAD dari situs statis "Link Instan". */

const BASE_HEADERS: Record<string, string> = {
  "x-content-type-options": "nosniff",
  "x-robots-tag": "noindex, nofollow",
  "referrer-policy": "strict-origin-when-cross-origin",
};

/**
 * Isi sebuah slug tidak pernah berubah (upload ulang = slug baru), jadi aman di-cache lama di CDN
 * dan browser — ini yang paling menghemat Redis & function. Dibatasi sisa masa aktif supaya situs
 * kedaluwarsa tidak tersaji. Konsekuensi: link yang DIHAPUS / di-takedown masih bisa tersaji ≤ 2 menit.
 */
function cacheControlFor(meta: SiteMeta): string {
  const left = Math.floor((meta.expiresAt - Date.now()) / 1000);
  if (left <= 0) return "no-store";
  return `public, max-age=${Math.min(60, left)}, s-maxage=${Math.min(120, left)}`;
}

function textPage(status: number, title: string, msg: string): Response {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  return new Response(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>` +
      `<body style="font:16px system-ui;display:grid;place-items:center;min-height:100vh;margin:0;background:#0b0d12;color:#e7e9ee;text-align:center;padding:24px">` +
      `<div><h1 style="font-size:22px">${esc(title)}</h1><p style="color:#aab1c2">${esc(msg)}</p></div>`,
    {
      status,
      headers: { ...BASE_HEADERS, "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
    }
  );
}

async function send(meta: SiteMeta, file: SiteFile, status: number, method: string, dirBase?: string): Promise<Response> {
  let buf = await readSiteFile(meta, file);
  if (!buf) return textPage(500, "Isi situs tidak lengkap", "Pemilik perlu meng-upload ulang situs ini.");
  if (dirBase && file.t.startsWith("text/html")) buf = Buffer.from(withDirBase(buf.toString("utf8"), dirBase), "utf8");
  const headers = {
    ...BASE_HEADERS,
    "cache-control": cacheControlFor(meta),
    "content-type": file.t,
    "content-length": String(buf.length),
  };
  return new Response(method === "HEAD" ? null : new Uint8Array(buf), { status, headers });
}

export async function serveSite(req: Request, meta: SiteMeta, target: string): Promise<Response> {
  const method = req.method.toUpperCase();
  if (method !== "GET" && method !== "HEAD") {
    return textPage(405, "Method tidak didukung", "Situs statis hanya melayani GET.");
  }

  const rl = await rateLimit("site-hit", meta.id, 1200, 60);
  if (!rl.allowed) return textPage(429, "Terlalu ramai", "Situs ini sedang menerima terlalu banyak kunjungan. Coba lagi sebentar.");

  const url = new URL(target, "http://x");
  let decoded: string;
  try {
    decoded = decodeURIComponent(url.pathname);
  } catch {
    return textPage(400, "Request tidak valid", "Path mengandung karakter yang tidak valid.");
  }
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f]/.test(decoded) || decoded.split("/").some((s) => s === "..")) {
    return textPage(400, "Request tidak valid", "Path mengandung karakter yang tidak valid.");
  }

  const map = new Map(meta.files.map((f) => [f.p, f]));
  const rel = decoded.replace(/^\/+/, "");

  let hit: SiteFile | undefined;
  let dirBase: string | undefined;
  if (rel === "" || rel.endsWith("/")) {
    hit = map.get(rel + "index.html");
  } else {
    // /about -> about.html atau about/index.html. Tidak di-redirect ke "/about/" karena Next.js
    // sendiri menormalkan trailing slash (akan jadi loop); sama seperti "cleanUrls" di Vercel.
    hit = map.get(rel) ?? map.get(rel + ".html");
    if (!hit) {
      // /dashboard -> dashboard/index.html: href relatif di dalamnya harus dihitung dari "/dashboard/".
      hit = map.get(rel + "/index.html");
      if (hit) dirBase = rel;
    }
  }
  if (hit) return send(meta, hit, 200, method, dirBase);

  const last = rel.split("/").pop() ?? "";
  const looksLikeAsset = last.includes(".");
  if (meta.spa && !looksLikeAsset) {
    const index = map.get("index.html");
    if (index) return send(meta, index, 200, method);
  }
  const custom = map.get("404.html");
  if (custom) return send(meta, custom, 404, method);
  return textPage(404, "Halaman tidak ditemukan", "File yang diminta tidak ada di situs ini.");
}
