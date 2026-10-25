import type { NextRequest } from "next/server";
import { fail, ok, withErrorHandling } from "@/app/api/_lib/response";
import { getSessionEmail } from "@/app/api/_lib/session";
import { getEpoch, revokeAllAccess } from "@/app/api/_lib/mcp-auth";
import {
  CHALLENGE_RE,
  appOrigin,
  clientFingerprint,
  isAllowedRedirectUri,
  mcpResourceUrl,
  signCode,
  verifyClient,
} from "@/app/api/_lib/mcp-token";

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
}

/** Validasi parameter /connect/authorize. Kalau gagal, user TIDAK boleh diarahkan ke redirect_uri (bisa jahat). */
type Validated =
  | { ok: false; error: string }
  | { ok: true; client: { n: string; u: string[] }; clientId: string; redirectUri: string; challenge: string; state: string | undefined };

function validate(p: AuthParams, origin: string): Validated {
  const client = verifyClient(p.client_id);
  if (!client) return { ok: false, error: "Aplikasi yang meminta akses tidak dikenali. Mulai lagi dari Claude." };
  const redirectUri = typeof p.redirect_uri === "string" ? p.redirect_uri : "";
  if (!client.u.includes(redirectUri) || !isAllowedRedirectUri(redirectUri)) {
    return { ok: false, error: "Alamat pengembalian (redirect_uri) tidak terdaftar atau tidak diizinkan." };
  }
  if (p.response_type !== "code") return { ok: false, error: "response_type harus \"code\"." };
  if (p.code_challenge_method !== "S256" || typeof p.code_challenge !== "string" || !CHALLENGE_RE.test(p.code_challenge)) {
    return { ok: false, error: "PKCE (S256) wajib dipakai." };
  }
  if (p.state !== undefined && (typeof p.state !== "string" || p.state.length > 512)) return { ok: false, error: "Parameter state tidak valid." };
  if (typeof p.resource === "string" && p.resource && p.resource.replace(/\/+$/, "") !== mcpResourceUrl(origin)) {
    return { ok: false, error: "resource tidak cocok dengan server MCP Depup." };
  }
  return {
    ok: true,
    client,
    clientId: p.client_id as string,
    redirectUri,
    challenge: p.code_challenge,
    state: typeof p.state === "string" ? p.state : undefined,
  };
}

/** GET /api/mcp/connect — info untuk kartu "Hubungkan Claude" di dashboard. */
export const GET = withErrorHandling(async (req: NextRequest) => {
  const email = getSessionEmail(req);
  if (!email) return fail("Sesi login habis. Silakan login lagi.", 401, "unauthorized");
  const origin = appOrigin(req.headers.get("host"));
  return ok({ mcpUrl: mcpResourceUrl(origin), origin });
});

/**
 * POST /api/mcp/connect
 *  - { action: "preview", params }  -> info aplikasi peminta untuk layar izin
 *  - { action: "approve", params }  -> terbitkan kode otorisasi, balas { redirectTo }
 *  - { action: "deny", params }     -> balas { redirectTo } berisi error=access_denied
 *  - { action: "revoke" }           -> cabut semua akses konektor milik user ini
 * Wajib session Google (middleware + cek di sini) dan Origin sama (anti-CSRF di middleware).
 */
export const POST = withErrorHandling(async (req: NextRequest) => {
  const email = getSessionEmail(req);
  if (!email) return fail("Sesi login habis. Silakan login lagi.", 401, "unauthorized");

  let body: { action?: unknown; params?: AuthParams };
  try {
    body = await req.json();
  } catch {
    return fail("Body harus berupa JSON.", 400, "bad_request");
  }

  if (body.action === "revoke") {
    await revokeAllAccess(email);
    return ok({ revoked: true });
  }

  const origin = appOrigin(req.headers.get("host"));
  const v = validate(body.params ?? {}, origin);
  if (!v.ok) return fail(v.error, 400, "bad_request");

  if (body.action === "preview") {
    let host = "";
    try {
      host = new URL(v.redirectUri).host;
    } catch {
      /* sudah tervalidasi di atas */
    }
    return ok({ clientName: v.client.n, redirectHost: host, email });
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
