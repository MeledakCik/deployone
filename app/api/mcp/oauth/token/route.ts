import type { NextRequest } from "next/server";
import { consumeCode, getEpoch, isAccountBlocked, jsonCors, preflight } from "@/app/api/_lib/mcp-auth";
import {
  ACCESS_TTL_SECONDS,
  MCP_SCOPE,
  appOrigin,
  clientFingerprint,
  mcpResourceUrl,
  signAccessToken,
  signRefreshToken,
  verifyClient,
  verifyCode,
  verifyPkce,
  verifyRefreshToken,
} from "@/app/api/_lib/mcp-token";
import { clientIp, rateLimit } from "@/app/api/_lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const OPTIONS = () => preflight();

const oauthError = (error: string, description: string, status = 400) => jsonCors({ error, error_description: description }, status);

/** Body bisa form-urlencoded (standar OAuth) atau JSON (beberapa klien). */
async function readParams(req: NextRequest): Promise<Record<string, string>> {
  const type = req.headers.get("content-type") ?? "";
  const out: Record<string, string> = {};
  if (type.includes("application/json")) {
    const j = (await req.json()) as Record<string, unknown>;
    for (const [k, v] of Object.entries(j ?? {})) if (typeof v === "string") out[k] = v;
  } else {
    const form = new URLSearchParams(await req.text());
    form.forEach((v, k) => (out[k] = v));
  }
  return out;
}

async function issue(email: string, clientId: string) {
  const ep = await getEpoch(email);
  const cid = clientFingerprint(clientId);
  return { ep, cid, body: {
    access_token: signAccessToken(email, cid, ep),
    token_type: "Bearer",
    expires_in: ACCESS_TTL_SECONDS,
    refresh_token: signRefreshToken(email, cid, ep),
    scope: MCP_SCOPE,
  } };
}

/**
 * POST /api/mcp/oauth/token — tukar kode otorisasi (+ PKCE) atau refresh token jadi access token.
 * Client publik: tanpa client_secret; keamanan bertumpu pada PKCE S256 dan redirect_uri yang terdaftar.
 */
export async function POST(req: NextRequest) {
  const rl = await rateLimit("mcp-token", `ip:${clientIp(req)}`, 60, 60);
  if (!rl.allowed) return oauthError("temporarily_unavailable", "Terlalu banyak permintaan.", 429);

  let p: Record<string, string>;
  try {
    p = await readParams(req);
  } catch {
    return oauthError("invalid_request", "Body tidak bisa dibaca.");
  }

  try {
    const client = verifyClient(p.client_id);
    if (!client) return oauthError("invalid_client", "client_id tidak dikenal.", 401);
    const cid = clientFingerprint(p.client_id);

    if (p.resource) {
      const want = mcpResourceUrl(appOrigin(req.headers.get("host")));
      if (p.resource.replace(/\/+$/, "") !== want) return oauthError("invalid_target", "resource tidak cocok dengan server MCP Depup.");
    }

    if (p.grant_type === "authorization_code") {
      const code = verifyCode(p.code);
      if (!code) return oauthError("invalid_grant", "Kode otorisasi tidak valid atau kedaluwarsa.");
      if (code.cid !== cid) return oauthError("invalid_grant", "Kode ini bukan untuk client tersebut.");
      if (code.ruri !== p.redirect_uri) return oauthError("invalid_grant", "redirect_uri tidak cocok.");
      if (!verifyPkce(p.code_verifier, code.cc)) return oauthError("invalid_grant", "code_verifier salah.");
      // Satu kode hanya boleh ditukar sekali (cegah replay).
      if (!(await consumeCode(code.jti))) return oauthError("invalid_grant", "Kode otorisasi sudah dipakai.");
      if ((await getEpoch(code.email)) !== code.ep) return oauthError("invalid_grant", "Akses sudah dicabut.");
      if (await isAccountBlocked(code.email)) return oauthError("access_denied", "Akun ini dinonaktifkan oleh admin Depup.", 403);

      return jsonCors((await issue(code.email, p.client_id)).body);
    }

    if (p.grant_type === "refresh_token") {
      const rt = verifyRefreshToken(p.refresh_token);
      if (!rt || rt.cid !== cid) return oauthError("invalid_grant", "Refresh token tidak valid atau kedaluwarsa.");
      const current = await getEpoch(rt.email);
      if (current !== rt.ep) return oauthError("invalid_grant", "Akses sudah dicabut. Hubungkan ulang konektor.");
      if (await isAccountBlocked(rt.email)) return oauthError("access_denied", "Akun ini dinonaktifkan oleh admin Depup.", 403);

      return jsonCors((await issue(rt.email, p.client_id)).body);
    }

    return oauthError("unsupported_grant_type", "Gunakan authorization_code atau refresh_token.");
  } catch (e) {
    console.error("[mcp] token error", (e as Error)?.message);
    return oauthError("server_error", "Terjadi kesalahan di server. Coba lagi sebentar lagi.", 500);
  }
}
