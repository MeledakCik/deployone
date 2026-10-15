import type { NextRequest } from "next/server";
import { fail, ok, withErrorHandling } from "@/app/api/_lib/response";
import { getSessionEmail } from "@/app/api/_lib/session";
import { deleteSiteData, loadSite, removeUserSite } from "@/app/api/_lib/sites";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/** DELETE /api/sites/:id — hapus link + isinya sekarang juga. */
export const DELETE = withErrorHandling(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const email = getSessionEmail(req);
  if (!email) return fail("Sesi login habis. Silakan login lagi.", 401, "unauthorized");

  const meta = await loadSite(params.id, { includePending: true });
  if (!meta || meta.owner !== email) return fail("Link tidak ditemukan.", 404, "not_found");

  await deleteSiteData(meta);
  await removeUserSite(email, meta.id);
  return ok({ id: meta.id });
});
