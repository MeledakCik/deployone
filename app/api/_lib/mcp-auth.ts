import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isAdminEmail } from "@/app/api/_lib/admin-config";
import { appOrigin, isAllowedRedirectUri, verifyAccessToken } from "@/app/api/_lib/mcp-token";

/** Epoch pencabutan per-user. Naik 1 = semua token/kode MCP lama milik user itu langsung mati. */
const kEpoch = (email: string) => `mcp:epoch:${email}`;
const kCodeUsed = (jti: string) => `mcp:code:${jti}`;

export async function getEpoch(email: string): Promise<number> {
  const v = await kv.get<number | string | null>(kEpoch(email));
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export async function revokeAllAccess(email: string): Promise<void> {
  await kv.incr(kEpoch(email));
}

/** true = kode ini baru pertama kali dipakai. Dipakai untuk menolak replay authorization code. */
export async function consumeCode(jti: string): Promise<boolean> {
  const res = await kv.set(kCodeUsed(jti), 1, { nx: true, ex: 15 * 60 });
  return res !== null;
}

/** Akun yang diblokir admin tidak boleh memakai konektor (sama seperti gerbang di middleware). */
export async function isAccountBlocked(email: string): Promise<boolean> {
  if (isAdminEmail(email)) return false;
  try {
    return (await kv.sismember("admin:blocked", email)) === 1;
  } catch {
    return false; // fail-open, sama dengan middleware
  }
}

/* ---------------- CORS (token Bearer, tanpa cookie -> aman dibuka) ---------------- */

export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, Accept, Mcp-Session-Id, Mcp-Protocol-Version",
  "Access-Control-Expose-Headers": "WWW-Authenticate, Mcp-Session-Id",
  "Access-Control-Max-Age": "86400",
};

export function preflight(): NextResponse {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export function jsonCors(body: unknown, status = 200, extra: Record<string, string> = {}): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { ...CORS_HEADERS, "Cache-Control": "no-store", ...extra },
  });
}

/* ---------------- validasi header Origin (syarat direktori konektor Claude, cegah DNS rebinding) ---------------- */

/**
 * Request dari server Claude (cloud Anthropic) tidak membawa header Origin, jadi tanpa Origin = diizinkan.
 * Kalau Origin ada (klien berbasis browser), hanya host Claude (claude.ai / claude.com, plus MCP_REDIRECT_HOSTS)
 * dan loopback (MCP Inspector / uji lokal) yang diterima. Selain itu ditolak 403.
 * Memakai daftar host yang sama dengan redirect_uri OAuth supaya konfigurasinya satu tempat.
 */
export function isAllowedMcpOrigin(origin: string | null): boolean {
  if (origin === null || origin === "") return true;
  if (origin === "null") return false;
  try {
    const u = new URL(origin);
    if (u.pathname !== "/" || u.search || u.hash) return false;
    // isAllowedRedirectUri menilai URL penuh; origin saja cukup dengan path "/" agar aturannya sama.
    return isAllowedRedirectUri(`${u.protocol}//${u.host}/`);
  } catch {
    return false;
  }
}

export function rejectDisallowedOrigin(req: NextRequest): NextResponse | null {
  if (isAllowedMcpOrigin(req.headers.get("origin"))) return null;
  return jsonCors({ error: "forbidden_origin", error_description: "Origin tidak diizinkan untuk endpoint MCP Depup." }, 403);
}

/* ---------------- autentikasi request /api/mcp ---------------- */

export type McpAuthResult = { ok: true; email: string } | { ok: false; response: NextResponse };

function unauthorized(req: NextRequest, description: string, invalid: boolean): NextResponse {
  const origin = appOrigin(req.headers.get("host"));
  const challenge =
    `Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource/api/mcp"` +
    (invalid ? `, error="invalid_token", error_description="${description}"` : "");
  return jsonCors({ error: invalid ? "invalid_token" : "unauthorized", error_description: description }, 401, {
    "WWW-Authenticate": challenge,
  });
}

/** Baca Bearer token, cek tanda tangan, kedaluwarsa, epoch (pencabutan), dan blokir admin. */
export async function authenticateBearer(req: NextRequest): Promise<McpAuthResult> {
  const header = req.headers.get("authorization") ?? "";
  const m = /^Bearer\s+(\S+)$/i.exec(header);
  if (!m) return { ok: false, response: unauthorized(req, "Perlu login Depup.", false) };

  let grant: ReturnType<typeof verifyAccessToken>;
  try {
    grant = verifyAccessToken(m[1]);
  } catch {
    return { ok: false, response: jsonCors({ error: "server_error", error_description: "Server belum dikonfigurasi (AUTH_SECRET)." }, 503) };
  }
  if (!grant) return { ok: false, response: unauthorized(req, "Token tidak valid atau kedaluwarsa.", true) };

  const email = grant.email.trim().toLowerCase();
  try {
    if ((await getEpoch(email)) !== grant.ep) {
      return { ok: false, response: unauthorized(req, "Akses sudah dicabut. Hubungkan ulang konektor.", true) };
    }
  } catch {
    return { ok: false, response: jsonCors({ error: "server_error", error_description: "Penyimpanan sementara tidak bisa diakses." }, 503) };
  }
  if (await isAccountBlocked(email)) {
    return { ok: false, response: jsonCors({ error: "access_denied", error_description: "Akun ini dinonaktifkan oleh admin Depup." }, 403) };
  }
  return { ok: true, email };
}
