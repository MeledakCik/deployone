import { kv } from "@vercel/kv";
import { clientIp, rateLimit } from "@/app/api/_lib/rate-limit";
import {
  CHUNK_WAIT_MS,
  HEAD_WAIT_MS,
  HOP_BY_HOP,
  MAX_REQ_BODY_BYTES,
  SLUG_RE,
  kLive,
  kOver,
  kQueue,
  kRes,
  newRid,
  tunnelEnabled,
  loadMeta,
  parseKv,
  slugFromHost,
  sleep,
  type QueuedRequest,
  type ResponseChunk,
} from "@/app/api/_lib/tunnel";
import { loadSiteCached } from "@/app/api/_lib/sites";
import { serveSite } from "@/app/api/_lib/site-serve";

/**
 * Pintu publik "Link Gaib". Pengunjung (dosen/client) membuka
 *   https://<slug>.<TUNNEL_BASE_DOMAIN>/...   (middleware me-rewrite ke sini)
 *   atau https://<host depup>/t/<slug>/...     (mode path, tanpa domain wildcard)
 * Request diantre di KV, CLI di komputer developer mengambilnya lewat long-poll,
 * meneruskannya ke localhost, lalu mengirim response-nya kembali (dipotong-potong).
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Wajib: Next 14 meng-cache fetch POST di dalam route handler GET, dan klien KV (Upstash) memakai fetch —
// tanpa ini lpop/get yang sama terus mengembalikan hasil lama dari cache.
export const fetchCache = "force-no-store";
export const maxDuration = 60;

const OK_COOKIE = "depup_tunnel_ok";
const NULL_BODY_STATUS = new Set([101, 204, 205, 304]);

/** Header request yang TIDAK diteruskan ke localhost. */
const DROP_REQ_HEADERS = new Set([
  ...HOP_BY_HOP, "host", "content-length", "expect", "forwarded", "x-real-ip",
  "x-forwarded-for", "x-forwarded-host", "x-forwarded-proto", "x-forwarded-port",
]);

type Ctx = { params: { slug: string; path?: string[] } };

/* ---------- halaman bantu (HTML) ---------- */

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function page(status: number, title: string, bodyHtml: string): Response {
  const html = `<!doctype html><html lang="id"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<title>${esc(title)}</title><style>
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b0d12;color:#e7e9ee;font:16px/1.55 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;padding:24px}
.c{max-width:460px;width:100%;background:#141821;border:1px solid #232938;border-radius:16px;padding:28px}
h1{font-size:20px;margin:0 0 10px}p{margin:0 0 12px;color:#aab1c2}a.b{display:inline-block;margin-top:8px;background:#6366f1;color:#fff;text-decoration:none;padding:10px 18px;border-radius:10px;font-weight:600}
small{color:#6f7788}</style></head><body><div class="c">${bodyHtml}<p><small>Dibagikan lewat Depup · link sementara</small></p></div></body></html>`;
  return new Response(html, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-robots-tag": "noindex, nofollow",
      "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'self'",
    },
  });
}

const notFoundPage = () =>
  page(404, "Link tidak ditemukan", `<h1>Link tidak ditemukan</h1><p>Link ini salah ketik, sudah kedaluwarsa, atau sudah dihentikan oleh pemiliknya.</p>`);

const offlinePage = (port: number) =>
  page(
    502,
    "Tunnel offline",
    `<h1>Pemilik link sedang offline</h1><p>Komputer yang membagikan link ini tidak terhubung (atau <code>localhost:${port}</code> mati). Minta pemiliknya menjalankan <code>depup share</code> lagi.</p>`
  );

/* ---------- util ---------- */

function hasOkCookie(req: Request): boolean {
  const cookie = req.headers.get("cookie") ?? "";
  return cookie.split(";").some((p) => p.trim().startsWith(OK_COOKIE + "="));
}

function stripOkCookie(cookie: string): string {
  return cookie
    .split(";")
    .map((p) => p.trim())
    .filter((p) => p && !p.startsWith(OK_COOKIE + "="))
    .join("; ");
}

function safeTarget(raw: string): string | null {
  if (!raw.startsWith("/")) return null;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u0020\u007f]/.test(raw)) return null;
  return raw;
}

function stripCookieDomain(value: string): string {
  return value.replace(/;\s*domain=[^;]*/gi, "");
}

/* ---------- handler ---------- */

async function handle(req: Request, ctx: Ctx): Promise<Response> {
  const slug = ctx.params.slug;
  if (!SLUG_RE.test(slug)) return notFoundPage();

  // Kill-switch penuh: TUNNEL_ENABLED=false mematikan tunnel DAN hosting statis (cadangan darurat kalau ada abuse).
  if (!tunnelEnabled()) {
    return page(503, "Fitur dimatikan", `<h1>Fitur dimatikan</h1><p>Link sementara Depup sedang dinonaktifkan oleh admin.</p>`);
  }

  const hostMode = slugFromHost(req.headers.get("host")) === slug;
  const prefix = hostMode ? "" : `/t/${slug}`;

  // Jalur laporan abuse: <link>/__depup/report -> form laporan di domain utama Depup.
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").trim().replace(/\/+$/, "");
  const hasAppUrl = /^https?:\/\//i.test(appUrl);
  if (hasAppUrl && (req.headers.get("x-depup-target") ?? "").split("?")[0] === "/__depup/report") {
    return new Response(null, {
      status: 302,
      headers: { location: `${appUrl}/laporkan?slug=${encodeURIComponent(slug)}`, "cache-control": "no-store" },
    });
  }

  // Hosting statis ("Link Instan") dicek lebih dulu. Hanya di mode subdomain: JS milik user
  // tidak boleh dijalankan di origin dashboard (mode path /t/<slug>).
  if (hostMode) {
    const site = await loadSiteCached(slug);
    if (site) {
      const siteTarget = safeTarget(req.headers.get("x-depup-target") ?? "/" + (ctx.params.path ?? []).join("/") + new URL(req.url).search);
      if (!siteTarget) return page(400, "Permintaan tidak valid", `<h1>Permintaan tidak valid</h1><p>Alamat mengandung karakter yang tidak diperbolehkan.</p>`);
      return serveSite(req, site, siteTarget);
    }
  }

  const meta = await loadMeta(slug);
  if (!meta) return notFoundPage();

  // Path + query asli dari pengunjung — diisi middleware (tidak bisa dipalsukan klien).
  const fallback = "/" + (ctx.params.path ?? []).join("/") + new URL(req.url).search;
  const target = safeTarget(req.headers.get("x-depup-target") ?? fallback);
  if (!target) return page(400, "Permintaan tidak valid", `<h1>Permintaan tidak valid</h1><p>Alamat mengandung karakter yang tidak diperbolehkan.</p>`);

  const url = new URL(target, "http://x");

  // Tombol "Lanjutkan" di halaman peringatan.
  if (url.pathname === "/__depup/continue") {
    const to = safeTarget(url.searchParams.get("to") ?? "/") ?? "/";
    const dest = to.startsWith("//") ? "/" : to;
    return new Response(null, {
      status: 303,
      headers: {
        location: prefix + dest,
        "set-cookie": `${OK_COOKIE}=1; Path=${prefix || "/"}; Max-Age=43200; HttpOnly; Secure; SameSite=Lax`,
        "cache-control": "no-store",
      },
    });
  }

  const method = req.method.toUpperCase();
  const accept = req.headers.get("accept") ?? "";
  const isBrowserNav = method === "GET" && accept.includes("text/html") && !req.headers.get("x-depup-skip-warning");
  if (isBrowserNav && !hasOkCookie(req)) {
    const cont = `${prefix}/__depup/continue?to=${encodeURIComponent(target)}`;
    return page(
      200,
      "Link sementara dari Depup",
      `<h1>Halaman sementara</h1>
<p>Kamu akan membuka website yang berjalan di <b>komputer seseorang</b> dan dibagikan lewat Depup. Depup tidak membuat atau memeriksa isinya.</p>
<p>Jangan memasukkan password, data kartu, atau informasi sensitif kecuali kamu percaya pada orang yang mengirim link ini.</p>
<a class="b" href="${esc(cont)}">Saya mengerti, lanjutkan</a>${
        hasAppUrl
          ? `<p style="margin-top:14px"><small><a href="${esc(appUrl)}/laporkan?slug=${esc(slug)}" style="color:#8b93a7">Laporkan link ini</a></small></p>`
          : ""
      }`
    );
  }

  // Satu command Redis untuk dua penanda: CLI online? dan kuota data habis?
  const [live, over] = await kv.mget<[unknown, unknown]>(kLive(slug), kOver(slug));
  if (over) {
    return page(
      429,
      "Kuota link habis",
      `<h1>Kuota data link ini habis</h1><p>Link ini sudah mencapai batas data yang diizinkan. Minta pemiliknya membuat link baru dengan <code>depup share</code>.</p>`
    );
  }
  if (!live) return offlinePage(meta.port);

  const rl = await rateLimit("tunnel-hit", slug, 600, 60);
  if (!rl.allowed) {
    return page(429, "Terlalu ramai", `<h1>Terlalu banyak permintaan</h1><p>Link ini sedang menerima terlalu banyak kunjungan. Coba lagi sebentar lagi.</p>`);
  }

  // Body request (inline di KV, jadi ada batasnya).
  let bodyB64: string | null = null;
  if (method !== "GET" && method !== "HEAD") {
    const buf = Buffer.from(await req.arrayBuffer());
    if (buf.length > MAX_REQ_BODY_BYTES) {
      return page(413, "Unggahan terlalu besar", `<h1>Unggahan terlalu besar</h1><p>Link Gaib membatasi ukuran data yang dikirim sampai ${Math.floor(MAX_REQ_BODY_BYTES / 1024)} KB.</p>`);
    }
    if (buf.length > 0) bodyB64 = buf.toString("base64");
  }

  // Header yang diteruskan ke localhost.
  const headers: [string, string][] = [];
  req.headers.forEach((value, name) => {
    const n = name.toLowerCase();
    if (DROP_REQ_HEADERS.has(n) || n.startsWith("x-vercel-") || n.startsWith("x-middleware-") || n.startsWith("x-depup-")) return;
    if (n === "cookie") {
      const cleaned = stripOkCookie(value);
      if (cleaned) headers.push([n, cleaned]);
      return;
    }
    headers.push([n, value]);
  });
  const visitorHost = req.headers.get("host") ?? "";
  headers.push(["x-forwarded-for", clientIp(req)]);
  headers.push(["x-forwarded-host", visitorHost]);
  headers.push(["x-forwarded-proto", "https"]);

  const rid = newRid();
  const envelope: QueuedRequest = {
    rid,
    method,
    path: target,
    headers,
    body: bodyB64,
    exp: Date.now() + HEAD_WAIT_MS + 5_000,
  };

  const pipe = kv.pipeline();
  pipe.rpush(kQueue(slug), JSON.stringify(envelope));
  pipe.expire(kQueue(slug), 300);
  await pipe.exec();

  // Tunggu potongan pertama (status + headers).
  const first = await waitChunk(slug, rid, 0, HEAD_WAIT_MS);
  if (!first || typeof first.status !== "number") {
    return page(
      504,
      "Tidak ada respons",
      `<h1>Localhost tidak merespons</h1><p>Komputer pemilik link online, tetapi server di <code>localhost:${meta.port}</code> tidak menjawab dalam ${HEAD_WAIT_MS / 1000} detik.</p>`
    );
  }

  const status = first.status >= 200 && first.status <= 599 ? first.status : 502;
  const resHeaders = new Headers();
  for (const [name, value] of first.headers ?? []) {
    const n = name.toLowerCase();
    if (HOP_BY_HOP.has(n) || n === "content-length") continue;
    try {
      resHeaders.append(name, n === "set-cookie" ? stripCookieDomain(value) : value);
    } catch {
      /* header tidak valid — lewati */
    }
  }
  resHeaders.set("x-robots-tag", "noindex, nofollow");
  resHeaders.set("x-depup-tunnel", "1");
  // Jangan biarkan CDN Vercel menyimpan response localhost orang.
  resHeaders.set("cdn-cache-control", "no-store");
  resHeaders.set("vercel-cdn-cache-control", "no-store");

  if (method === "HEAD" || NULL_BODY_STATUS.has(status)) {
    return new Response(null, { status, headers: resHeaders });
  }

  let nextSeq = 1;
  let finished = first.last;
  let pendingFirst: string | null = first.data;

  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (pendingFirst !== null) {
        const d = pendingFirst;
        pendingFirst = null;
        if (d) controller.enqueue(new Uint8Array(Buffer.from(d, "base64")));
        if (finished) controller.close();
        return;
      }
      if (finished) {
        controller.close();
        return;
      }
      const chunk = await waitChunk(slug, rid, nextSeq, CHUNK_WAIT_MS);
      if (!chunk) {
        controller.error(new Error("tunnel: potongan response tidak datang"));
        return;
      }
      nextSeq++;
      finished = chunk.last;
      if (chunk.data) controller.enqueue(new Uint8Array(Buffer.from(chunk.data, "base64")));
      if (finished) controller.close();
    },
  });

  return new Response(stream, { status, headers: resHeaders });
}

/** Polling KV untuk potongan response; interval merenggang supaya hemat perintah KV. */
async function waitChunk(id: string, rid: string, seq: number, timeoutMs: number): Promise<ResponseChunk | null> {
  const deadline = Date.now() + timeoutMs;
  let delay = 120;
  while (Date.now() < deadline) {
    const chunk = parseKv<ResponseChunk>(await kv.get(kRes(id, rid, seq)));
    if (chunk) return chunk;
    await sleep(delay);
    delay = Math.min(Math.round(delay * 1.5), 500);
  }
  return null;
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export const HEAD = handle;
export const OPTIONS = handle;
