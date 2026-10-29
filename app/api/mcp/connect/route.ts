import crypto from "crypto";
import type { NextRequest } from "next/server";
import { fail, ok, withErrorHandling } from "@/app/api/_lib/response";
import { getSessionEmail } from "@/app/api/_lib/session";
import { registerMcpClient } from "@/app/api/_lib/mcp-usage";
import {
  MAX_CUSTOM_OAUTH_CLIENTS,
  getEpoch,
  isClientCidRevoked,
  listCustomOAuthClients,
  revokeAllAccess,
  revokeClientByCid,
  saveCustomOAuthClients,
  type StoredCustomOAuthClient,
} from "@/app/api/_lib/mcp-auth";
import {
  ACCESS_TTL_SECONDS,
  CHALLENGE_RE,
  DIRECT_TOKEN_TTL_DAYS,
  MCP_SCOPE,
  appOrigin,
  clientFingerprint,
  generateClientSecret,
  isAllowedRedirectUri,
  isValidCustomRedirectUri,
  matchesClientRedirectUri,
  mcpResourceUrl,
  signAccessToken,
  signCode,
  signCustomClient,
  signRefreshToken,
  verifyCustomClient,
  type CustomClientInfo,
} from "@/app/api/_lib/mcp-token";
import { MAX_ACTIVE_SITES_PER_USER, listUserSites } from "@/app/api/_lib/sites";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

interface AuthParams {
  client_id?: unknown;
  redirect_uri?: unknown;
  response_type?: unknown;
  code_challenge?: unknown;
  code_challenge_method?: unknown;
  state?: unknown;
  resource?: unknown;
  scope?: unknown;
}

const DEFAULT_CUSTOM_REDIRECT_URIS = [
  "https://claude.ai/api/mcp/auth_callback",
  "https://claude.com/api/mcp/auth_callback",
  "https://oauth-redirect.googleusercontent.com/r/callback",
  "https://oauth-redirect-sandbox.googleusercontent.com/r/callback",
  "https://oauth-redirect-test.googleusercontent.com/r/callback",
  "https://vertexaisearch.cloud.google.com/oauth-redirect",
  "https://gemini.google.com/oauth/callback",
  "cursor://anysphere.cursor-retrieval/oauth/callback",
  "cursor://anysphere.cursor-mcp/oauth/callback",
  "https://chatgpt.com/connector_platform_oauth_redirect",
  "http://localhost:6274/oauth/callback",
  "http://127.0.0.1:6274/oauth/callback",
];

/** Validasi parameter /connect/authorize. Kalau gagal, user TIDAK boleh diarahkan ke redirect_uri (bisa jahat). */
type Validated =
  | { ok: false; error: string }
  | {
      ok: true;
      client: CustomClientInfo;
      clientId: string;
      redirectUri: string;
      challenge: string;
      state: string | undefined;
    };

async function validate(p: AuthParams, origin: string): Promise<Validated> {
  const client = verifyCustomClient(p.client_id);
  if (!client) return { ok: false, error: "Aplikasi yang meminta akses tidak dikenali. Mulai lagi dari aplikasi AI atau periksa Client ID OAuth." };

  const cid = clientFingerprint(p.client_id as string);
  if (await isClientCidRevoked(cid)) {
    return { ok: false, error: "OAuth Client ini sudah dihapus atau dicabut dari Settings." };
  }

  const redirectUri = typeof p.redirect_uri === "string" ? p.redirect_uri : "";
  const uriAllowed = client.custom === true ? isValidCustomRedirectUri(redirectUri) : isAllowedRedirectUri(redirectUri);
  if (!matchesClientRedirectUri(client, redirectUri) || !uriAllowed) {
    return { ok: false, error: "Alamat pengembalian (redirect_uri) tidak terdaftar atau tidak diizinkan." };
  }
  if (p.response_type !== "code") return { ok: false, error: 'response_type harus "code".' };

  // PKCE S256 wajib untuk public client; untuk confidential client (yang punya client_secret / `client.sh`)
  // PKCE S256 tetap diverifikasi jika dikirim, atau diizinkan dengan penanda "CONFIDENTIAL" jika klien mengandalkan client_secret.
  let challenge = "";
  const hasPkceParams = p.code_challenge !== undefined || p.code_challenge_method !== undefined;
  if (hasPkceParams || !client.sh) {
    if (p.code_challenge_method !== "S256" || typeof p.code_challenge !== "string" || !CHALLENGE_RE.test(p.code_challenge)) {
      return { ok: false, error: "PKCE (S256) wajib dipakai." };
    }
    challenge = p.code_challenge;
  } else {
    challenge = "CONFIDENTIAL";
  }

  // Gemini Web mengirim parameter `state` ~1.400 karakter, jadi batas dinaikkan ke 4.096 karakter.
  if (p.state !== undefined && (typeof p.state !== "string" || p.state.length > 4096)) {
    return { ok: false, error: "Parameter state tidak valid." };
  }
  if (typeof p.resource === "string" && p.resource && p.resource.replace(/\/+$/, "") !== mcpResourceUrl(origin)) {
    return { ok: false, error: "resource tidak cocok dengan server MCP Depup." };
  }
  return {
    ok: true,
    client,
    clientId: p.client_id as string,
    redirectUri,
    challenge,
    state: typeof p.state === "string" ? p.state : undefined,
  };
}

function buildOAuthEndpoints(origin: string) {
  return {
    issuer: origin,
    mcpUrl: mcpResourceUrl(origin),
    authorizationEndpoint: `${origin}/connect/authorize`,
    tokenEndpoint: `${origin}/api/mcp/oauth/token`,
    registrationEndpoint: `${origin}/api/mcp/oauth/register`,
  };
}

function parseRedirectUrisInput(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw
      .filter((x): x is string => typeof x === "string")
      .map((x) => x.trim())
      .filter(Boolean);
  }
  if (typeof raw === "string") {
    return raw
      .split(/[\r\n,]+/)
      .map((x) => x.trim())
      .filter(Boolean);
  }
  return [];
}

/** GET /api/mcp/connect — info untuk kartu konektor MCP (Claude, OpenCode, Cursor, Codex, Gemini) & Custom OAuth di Settings. */
export const GET = withErrorHandling(async (req: NextRequest) => {
  const email = getSessionEmail(req);
  if (!email) return fail("Sesi login habis. Silakan login lagi.", 401, "unauthorized");
  const origin = appOrigin(req.headers.get("host"));
  const [customClients, sites] = await Promise.all([
    listCustomOAuthClients(email),
    listUserSites(email).catch(() => []),
  ]);
  return ok({
    mcpUrl: mcpResourceUrl(origin),
    origin,
    oauthEndpoints: buildOAuthEndpoints(origin),
    customClients,
    activeSitesCount: sites.length,
    maxSites: MAX_ACTIVE_SITES_PER_USER,
  });
});

/**
 * POST /api/mcp/connect
 */
export const POST = withErrorHandling(async (req: NextRequest) => {
  const email = getSessionEmail(req);
  if (!email) return fail("Sesi login habis. Silakan login lagi.", 401, "unauthorized");

  let body: {
    action?: unknown;
    params?: AuthParams;
    name?: unknown;
    redirectUris?: unknown;
    withSecret?: unknown;
    id?: unknown;
    ttlDays?: unknown;
    clientLabel?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return fail("Body harus berupa JSON.", 400, "bad_request");
  }

  const origin = appOrigin(req.headers.get("host"));

  if (body.action === "revoke") {
    await revokeAllAccess(email);
    return ok({ revoked: true });
  }

  if (body.action === "create_oauth") {
    const existing = await listCustomOAuthClients(email);
    if (existing.length >= MAX_CUSTOM_OAUTH_CLIENTS) {
      return fail(`Maksimal ${MAX_CUSTOM_OAUTH_CLIENTS} Custom OAuth Client per akun. Hapus salah satu yang tidak dipakai terlebih dahulu.`, 400, "bad_request");
    }

    const rawName = typeof body.name === "string" ? body.name : "";
    // eslint-disable-next-line no-control-regex
    const name = rawName.replace(/[\u0000-\u001f\u007f<>]/g, "").trim().slice(0, 60);
    if (!name) {
      return fail('Nama OAuth Client wajib diisi (mis. "Claude / Cursor / OpenCode / Codex / Gemini").', 400, "bad_request");
    }

    const parsedUris = parseRedirectUrisInput(body.redirectUris);
    const redirectUris = Array.from(new Set(parsedUris.length > 0 ? parsedUris : DEFAULT_CUSTOM_REDIRECT_URIS));
    if (redirectUris.length === 0 || redirectUris.length > 25) {
      return fail("Masukkan antara 1 sampai 25 Redirect URI.", 400, "bad_request");
    }
    const invalidUri = redirectUris.find((u) => !isValidCustomRedirectUri(u));
    if (invalidUri) {
      return fail(
        `Redirect URI tidak valid: "${invalidUri}". Gunakan URL https:// (tanpa #), http://localhost:port, atau custom URI (cursor://, opencode://, codex://, gemini://, claude://, vscode://).`,
        400,
        "bad_request",
      );
    }

    const withSecret = body.withSecret !== false;
    const clientSecret = withSecret ? generateClientSecret() : undefined;
    const kid = `oauth_${crypto.randomBytes(6).toString("hex")}`;
    const clientId = signCustomClient({
      kid,
      name,
      redirectUris,
      owner: email,
      clientSecret,
    });

    const entry: StoredCustomOAuthClient = {
      id: kid,
      name,
      clientId,
      redirectUris,
      hasSecret: withSecret,
      secretPreview: clientSecret ? `${clientSecret.slice(0, 12)}••••••••${clientSecret.slice(-4)}` : null,
      createdAt: Date.now(),
    };

    const nextList = [entry, ...existing];
    await saveCustomOAuthClients(email, nextList);

    return ok({
      client: entry,
      clientSecret: clientSecret ?? null,
      oauthEndpoints: buildOAuthEndpoints(origin),
      customClients: nextList,
    });
  }

  if (body.action === "delete_oauth") {
    const targetId = typeof body.id === "string" ? body.id.trim() : "";
    if (!targetId) return fail("ID OAuth Client wajib diisi.", 400, "bad_request");
    const existing = await listCustomOAuthClients(email);
    const target = existing.find((c) => c.id === targetId);
    if (!target) return fail("OAuth Client tidak ditemukan.", 404, "not_found");

    await revokeClientByCid(clientFingerprint(target.clientId));
    const nextList = existing.filter((c) => c.id !== targetId);
    await saveCustomOAuthClients(email, nextList);
    return ok({ deletedId: targetId, customClients: nextList });
  }

  if (body.action === "generate_oauth_token") {
    const targetId = typeof body.id === "string" ? body.id.trim() : "";
    const rawLabel = typeof body.clientLabel === "string" ? body.clientLabel.trim().slice(0, 40) : "";
    let clientIdForToken = `personal:${rawLabel || "cli"}:${email}`;
    let clientName = rawLabel || "Personal MCP Token";
    if (targetId) {
      const existing = await listCustomOAuthClients(email);
      const found = existing.find((c) => c.id === targetId);
      if (!found) return fail("OAuth Client tidak ditemukan.", 404, "not_found");
      clientIdForToken = found.clientId;
      clientName = found.name;
    }

    const reqDays = Number(body.ttlDays);
    const ttlSeconds =
      Number.isFinite(reqDays) && (DIRECT_TOKEN_TTL_DAYS as readonly number[]).includes(reqDays)
        ? reqDays * 24 * 3600
        : ACCESS_TTL_SECONDS;

    const ep = await getEpoch(email);
    const cid = clientFingerprint(clientIdForToken);
    await registerMcpClient(cid, { name: clientName, via: "token" });
    const accessToken = signAccessToken(email, cid, ep, ttlSeconds);
    const refreshToken = signRefreshToken(email, cid, ep);
    return ok({
      clientName,
      accessToken,
      refreshToken,
      tokenType: "Bearer",
      expiresIn: ttlSeconds,
      scope: MCP_SCOPE,
      mcpUrl: mcpResourceUrl(origin),
    });
  }

  const v = await validate(body.params ?? {}, origin);
  if (!v.ok) return fail(v.error, 400, "bad_request");

  if (body.action === "preview") {
    let host = "";
    try {
      const u = new URL(v.redirectUri);
      host = u.host || u.protocol.replace(/:$/, "");
    } catch {
      /* sudah tervalidasi di atas */
    }
    return ok({ clientName: v.client.n, redirectHost: host, email, isCustomClient: v.client.custom === true });
  }

  const back = new URL(v.redirectUri);

  if (body.action === "deny") {
    back.searchParams.set("error", "access_denied");
    back.searchParams.set("error_description", "Pengguna menolak akses.");
    if (v.state) back.searchParams.set("state", v.state);
    back.searchParams.set("iss", origin);
    return ok({ redirectTo: back.toString() });
  }

  if (body.action === "approve") {
    const { token } = signCode({
      email,
      cid: clientFingerprint(v.clientId),
      ruri: v.redirectUri,
      cc: v.challenge,
      ep: await getEpoch(email),
    });
    back.searchParams.set("code", token);
    if (v.state) back.searchParams.set("state", v.state);
    back.searchParams.set("iss", origin);
    return ok({ redirectTo: back.toString() });
  }

  return fail("Aksi tidak dikenal.", 400, "bad_request");
});
