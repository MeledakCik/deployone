import type { NextRequest } from "next/server";
import { fail, ok, withErrorHandling } from "@/app/api/_lib/response";
import { adminFromReq } from "@/app/api/_lib/admin";
import { listLiveLinks } from "@/app/api/_lib/admin-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 30;

/** GET /api/admin/links — semua situs statis & tunnel yang sedang hidup (data segar, tanpa cache). */
export const GET = withErrorHandling(async (req: NextRequest) => {
  if (!adminFromReq(req)) return fail("Tidak ditemukan.", 404, "not_found");
  return ok({ links: await listLiveLinks(req.headers.get("host")) });
});
