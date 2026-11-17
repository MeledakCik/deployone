import type { NextRequest } from "next/server";
import { fail, ok, withErrorHandling } from "@/app/api/_lib/response";
import { getSessionEmail } from "@/app/api/_lib/session";
import { getEpoch } from "@/app/api/_lib/mcp-auth";
import { CLI_TOKEN_TTL_DAYS, signCliToken } from "@/app/api/_lib/cli-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/**
 * POST /api/cli/token — buat token CLI dari Pengaturan (untuk server/CI tanpa browser):
 *   npx depup-share login --token <token>   atau   DEPUP_TOKEN=<token> npx depup-share share
 */
export const POST = withErrorHandling(async (req: NextRequest) => {
  const email = getSessionEmail(req);
  if (!email) return fail("Sesi login habis. Silakan login lagi.", 401, "unauthorized");
  const token = signCliToken(email, await getEpoch(email));
  return ok({ token, email, ttlDays: CLI_TOKEN_TTL_DAYS });
});
