import zlib from "node:zlib";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { CORS_HEADERS, authenticateBearer, jsonCors, preflight, rejectDisallowedOrigin } from "@/app/api/_lib/mcp-auth";
import { INVALID_REQUEST, PARSE_ERROR, handleRpc, type RpcRequest, type RpcResponse } from "@/app/api/_lib/mcp-server";
import { clientIp, rateLimit } from "@/app/api/_lib/rate-limit";
import { recordMcpUse, summarizeRpcBody } from "@/app/api/_lib/mcp-usage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/** Batas body JSON-RPC (4,5 MB sesuai batas payload serverless Vercel). Mendukung juga Content-Encoding: gzip. */
const MAX_BODY_BYTES = Math.floor(4.5 * 1024 * 1024);
const MAX_BATCH = 20;

export const OPTIONS = () => preflight();

/**
 * GET dipakai klien MCP untuk membuka stream SSE server->client. Depup tidak butuh itu (semua respons langsung
 * di POST), jadi sesuai spesifikasi dijawab 405.
 */
export const GET = () =>
  new NextResponse(JSON.stringify({ error: "Gunakan POST untuk endpoint MCP ini." }), {
    status: 405,
    headers: { ...CORS_HEADERS, Allow: "POST, OPTIONS", "Content-Type": "application/json" },
  });

/** Tidak ada session MCP yang perlu ditutup. */
export const DELETE = GET;

async function readJsonRpcBody(req: NextRequest): Promise<{ ok: true; body: unknown } | { ok: false; status: number; response: unknown }> {
  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    return { ok: false, status: 413, response: { jsonrpc: "2.0", id: null, error: { code: -32600, message: "Body terlalu besar. Gunakan `update_website` untuk meng-upload file secara bertahap." } } };
  }

  const contentEncoding = (req.headers.get("content-encoding") ?? "").toLowerCase();
  try {
    let rawText: string;
    if (contentEncoding === "gzip" || contentEncoding === "x-gzip") {
      const ab = await req.arrayBuffer();
      if (ab.byteLength > MAX_BODY_BYTES) {
        return { ok: false, status: 413, response: { jsonrpc: "2.0", id: null, error: { code: -32600, message: "Body terlalu besar." } } };
      }
      const unzipped = zlib.gunzipSync(Buffer.from(ab), { maxOutputLength: MAX_BODY_BYTES });
      rawText = unzipped.toString("utf8");
    } else {
      rawText = await req.text();
      if (rawText.length > MAX_BODY_BYTES) {
        return { ok: false, status: 413, response: { jsonrpc: "2.0", id: null, error: { code: -32600, message: "Body terlalu besar. Gunakan `update_website` untuk meng-upload file secara bertahap." } } };
      }
    }
    return { ok: true, body: JSON.parse(rawText) };
  } catch {
    return { ok: false, status: 400, response: PARSE_ERROR };
  }
}

/**
 * POST /api/mcp — endpoint MCP (Streamable HTTP). Autentikasi Bearer access token dari alur OAuth Depup
 * (middleware melewatkan path ini karena tidak memakai cookie session).
 */
export async function POST(req: NextRequest) {
  // Syarat direktori Claude: tolak Origin yang bukan Claude/Depup/loopback (cegah DNS rebinding). Tanpa Origin = server Claude.
  const badOrigin = rejectDisallowedOrigin(req);
  if (badOrigin) return badOrigin;

  // Batasi probing tanpa token per IP sebelum menyentuh kripto/KV.
  const hasAuth = (req.headers.get("authorization") ?? "").length > 0;
  if (!hasAuth) {
    const rl = await rateLimit("mcp-anon", `ip:${clientIp(req)}`, 60, 60);
    if (!rl.allowed) return jsonCors({ error: "rate_limited" }, 429, { "Retry-After": String(rl.retryAfterSeconds) });
  }

  const auth = await authenticateBearer(req);
  if (!auth.ok) return auth.response;

  const rl = await rateLimit("mcp", `u:${auth.email}`, 180, 60);
  if (!rl.allowed) {
    return jsonCors({ error: "rate_limited", error_description: "Terlalu banyak request. Coba lagi sebentar lagi." }, 429, {
      "Retry-After": String(rl.retryAfterSeconds),
    });
  }

  const parsed = await readJsonRpcBody(req);
  if (!parsed.ok) return jsonCors(parsed.response, parsed.status);
  const { body } = parsed;

  // Catat siapa & lewat aplikasi apa (untuk panel admin). Best-effort, tidak pernah menggagalkan request.
  await recordMcpUse(auth.email, auth.cid, summarizeRpcBody(body));

  const ctx = { email: auth.email, host: req.headers.get("host") };

  // Batch (spesifikasi 2025-03-26): proses berurutan, notifikasi tidak dibalas.
  if (Array.isArray(body)) {
    if (body.length === 0 || body.length > MAX_BATCH) return jsonCors(INVALID_REQUEST, 400);
    const out: RpcResponse[] = [];
    for (const m of body) {
      const r = await handleRpc(m as RpcRequest, ctx);
      if (r) out.push(r);
    }
    return out.length ? jsonCors(out) : new NextResponse(null, { status: 202, headers: CORS_HEADERS });
  }

  if (!body || typeof body !== "object") return jsonCors(INVALID_REQUEST, 400);
  const res = await handleRpc(body as RpcRequest, ctx);
  // Notifikasi / response dari klien: cukup 202 tanpa isi.
  if (!res) return new NextResponse(null, { status: 202, headers: CORS_HEADERS });
  return jsonCors(res);
}
