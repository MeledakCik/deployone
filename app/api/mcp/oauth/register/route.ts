import type { NextRequest } from "next/server";
import { jsonCors, preflight } from "@/app/api/_lib/mcp-auth";
import {
  MCP_SCOPE,
  generateClientSecret,
  isAllowedRedirectUri,
  signClient,
  signDynamicClient,
} from "@/app/api/_lib/mcp-token";
import { clientIp, rateLimit } from "@/app/api/_lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const OPTIONS = () => preflight();

const SUPPORTED_AUTH_METHODS = ["none", "client_secret_post", "client_secret_basic"] as const;

/**
 * POST /api/mcp/oauth/register — Dynamic Client Registration (RFC 7591), tanpa penyimpanan:
 * `client_id` adalah token bertanda tangan yang membawa nama, daftar redirect_uri (hingga 20 URI, karena
 * Google Gemini mengirim 6 URI `oauth-redirect*.googleusercontent.com` sekaligus), serta opsional hash `client_secret`
 * jika klien meminta `token_endpoint_auth_method: "client_secret_post"` atau `"client_secret_basic"`.
 */
export async function POST(req: NextRequest) {
  const rl = await rateLimit("mcp-register", `ip:${clientIp(req)}`, 30, 600);
  if (!rl.allowed) {
    return jsonCors(
      { error: "temporarily_unavailable", error_description: "Terlalu banyak registrasi." },
      429,
      { "Retry-After": String(rl.retryAfterSeconds) },
    );
  }

  let body: Record<string, unknown>;
  try {
    const parsed = await req.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("bukan objek");
    body = parsed as Record<string, unknown>;
  } catch {
    return jsonCors({ error: "invalid_client_metadata", error_description: "Body harus berupa objek JSON." }, 400);
  }

  const uris = body.redirect_uris;
  if (!Array.isArray(uris) || uris.length === 0 || uris.length > 20 || uris.some((u) => typeof u !== "string")) {
    return jsonCors({ error: "invalid_redirect_uri", error_description: "redirect_uris wajib berisi 1–20 URL." }, 400);
  }
  if (!uris.every(isAllowedRedirectUri)) {
    return jsonCors({ error: "invalid_redirect_uri", error_description: "redirect_uri tidak diizinkan untuk Depup." }, 400);
  }

  const rawMethod = body.token_endpoint_auth_method;
  const method = rawMethod === undefined ? "none" : rawMethod;
  if (typeof method !== "string" || !(SUPPORTED_AUTH_METHODS as readonly string[]).includes(method)) {
    return jsonCors(
      {
        error: "invalid_client_metadata",
        error_description: "token_endpoint_auth_method harus none, client_secret_post, atau client_secret_basic.",
      },
      400,
    );
  }

  const rawName = typeof body.client_name === "string" ? body.client_name : "";
  // Nama tampil di layar izin: buang karakter kontrol dan batasi panjang supaya tidak dipakai menipu.
  // eslint-disable-next-line no-control-regex
  const name = rawName.replace(/[\u0000-\u001f\u007f<>]/g, "").trim().slice(0, 60) || "Aplikasi MCP";

  const wantsSecret = method === "client_secret_post" || method === "client_secret_basic";
  const clientSecret = wantsSecret ? generateClientSecret() : undefined;

  let clientId: string;
  try {
    clientId = wantsSecret ? signDynamicClient(name, uris as string[], clientSecret) : signClient(name, uris as string[]);
  } catch {
    return jsonCors({ error: "server_error", error_description: "Server belum dikonfigurasi (AUTH_SECRET)." }, 503);
  }

  return jsonCors(
    {
      client_id: clientId,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      ...(clientSecret
        ? {
            client_secret: clientSecret,
            client_secret_expires_at: 0,
          }
        : {}),
      client_name: name,
      redirect_uris: uris,
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: method,
      scope: MCP_SCOPE,
    },
    201,
  );
}
