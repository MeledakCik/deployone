import type { NextRequest } from "next/server";
import { fail, ok, withErrorHandling } from "@/app/api/_lib/response";
import { adminFromReq } from "@/app/api/_lib/admin";
import { getStats } from "@/app/api/_lib/admin-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 30;

/** GET /api/admin/stats[?refresh=1] — angka & data grafik untuk tab Ringkasan (cache 5 menit). */
export const GET = withErrorHandling(async (req: NextRequest) => {
  if (!adminFromReq(req)) return fail("Tidak ditemukan.", 404, "not_found");
  const stats = await getStats({ refresh: req.nextUrl.searchParams.get("refresh") === "1", host: req.headers.get("host") });
  const { users: _users, ...rest } = stats;
  void _users;
  return ok(rest);
});
