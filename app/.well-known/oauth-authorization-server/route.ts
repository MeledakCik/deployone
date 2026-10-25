import type { NextRequest } from "next/server";
import { CORS_HEADERS, preflight } from "@/app/api/_lib/mcp-auth";
import { MCP_SCOPE, appOrigin } from "@/app/api/_lib/mcp-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const OPTIONS = () => preflight();

/** RFC 8414 — metadata server otorisasi (OAuth 2.1: kode + PKCE S256, client publik, registrasi dinamis). */
export function GET(req: NextRequest) {
  const origin = appOrigin(req.headers.get("host"));
  return Response.json(
    {
      issuer: origin,
      authorization_endpoint: `${origin}/connect/authorize`,
      token_endpoint: `${origin}/api/mcp/oauth/token`,
      registration_endpoint: `${origin}/api/mcp/oauth/register`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: ["none"],
      scopes_supported: [MCP_SCOPE],
      authorization_response_iss_parameter_supported: true,
    },
    { headers: { ...CORS_HEADERS, "Cache-Control": "public, max-age=300" } },
  );
}
