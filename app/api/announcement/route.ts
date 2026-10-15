import { ok, withErrorHandling } from "@/app/api/_lib/response";
import { getSettings } from "@/app/api/_lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/** GET /api/announcement — banner pengumuman dari admin (butuh login, lihat middleware). */
export const GET = withErrorHandling(async () => {
  const { announcement } = await getSettings();
  return ok({ announcement: announcement.active && announcement.text ? announcement : null });
});
