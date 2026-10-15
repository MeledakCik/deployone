import type { NextRequest } from "next/server";
import { fail, ok, withErrorHandling } from "@/app/api/_lib/response";
import { adminFromReq } from "@/app/api/_lib/admin";
import { listSupportReports } from "@/app/api/_lib/support-reports";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/** GET /api/admin/support — laporan dari chat bantuan (tombol "Laporkan ke developer" + laporan otomatis). */
export const GET = withErrorHandling(async (req: NextRequest) => {
  if (!adminFromReq(req)) return fail("Tidak ditemukan.", 404, "not_found");
  return ok({ reports: await listSupportReports(50) });
});
