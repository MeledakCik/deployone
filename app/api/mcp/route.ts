import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { CORS_HEADERS, authenticateBearer, jsonCors, preflight, rejectDisallowedOrigin } from "@/app/api/_lib/mcp-auth";
import { INVALID_REQUEST, PARSE_ERROR, handleRpc, type RpcRequest, type RpcResponse } from "@/app/api/_lib/mcp-server";
import { clientIp, rateLimit } from "@/app/api/_lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/** Body JSON-RPC kecil saja; isi situs besar dibatasi lagi di mcp-sites.ts. Vercel menolak >4,5 MB. */
const MAX_BODY_BYTES = 4 * 1024 * 1024;
const MAX_BATCH = 10;

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

/**
 * POST /api/mcp — endpoint MCP (Streamable HTTP). Autentikasi Bearer access token dari alur OAuth Depup
 * (middleware melewatkan path ini karena tidak memakai cookie session).
 */
export async function POST(req: NextRequest) {
  // Syarat direktori Claude: tolak Origin yang bukan Claude/loopback (cegah DNS rebinding). Tanpa Origin = server Claude.
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

  const rl = await rateLimit("mcp", `u:${auth.email}`, 120, 60);
  if (!rl.allowed) {
    return jsonCors({ error: "rate_limited", error_description: "Terlalu banyak request. Coba lagi sebentar lagi." }, 429, {
      "Retry-After": String(rl.retryAfterSeconds),
    });
  }

  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    return jsonCors({ jsonrpc: "2.0", id: null, error: { code: -32600, message: "Body terlalu besar." } }, 413);
  }

  let body: unknown;
  try {
    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) {
      return jsonCors({ jsonrpc: "2.0", id: null, error: { code: -32600, message: "Body terlalu besar." } }, 413);
    }
    body = JSON.parse(raw);
  } catch {
    return jsonCors(PARSE_ERROR, 400);
  }

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
