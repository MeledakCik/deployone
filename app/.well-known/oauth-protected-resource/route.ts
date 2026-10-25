import type { NextRequest } from "next/server";
import { CORS_HEADERS, preflight } from "@/app/api/_lib/mcp-auth";
import { MCP_SCOPE, appOrigin, mcpResourceUrl } from "@/app/api/_lib/mcp-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const OPTIONS = () => preflight();

/** RFC 9728 — memberi tahu klien MCP server otorisasi mana yang melindungi /api/mcp. */
export function GET(req: NextRequest) {
  const origin = appOrigin(req.headers.get("host"));
  return Response.json(
    {
      resource: mcpResourceUrl(origin),
      authorization_servers: [origin],
      scopes_supported: [MCP_SCOPE],
      bearer_methods_supported: ["header"],
      resource_name: "Depup",
      resource_documentation: `${origin}/dashboard`,
    },
    { headers: { ...CORS_HEADERS, "Cache-Control": "public, max-age=300" } },
  );
}
