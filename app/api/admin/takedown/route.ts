import type { NextRequest } from "next/server";
import { fail, ok, withErrorHandling } from "@/app/api/_lib/response";
import { adminFromReq, audit } from "@/app/api/_lib/admin";
import { dropStatsCache } from "@/app/api/_lib/admin-data";
import { cleanText, parseAbuseTarget } from "@/app/api/_lib/abuse";
import { performTakedown } from "@/app/api/_lib/takedown";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/**
 * POST /api/admin/takedown — hanya admin (depupdev@gmail.com + ADMIN_EMAILS). Body: { slug: string, ban?: boolean }
 * Menghapus situs statis dan/atau tunnel dengan slug itu. `ban: true` juga melarang pemilik situs
 * membuat Link Instan selama 30 hari. Cache CDN/instance lain bisa masih menyajikannya ≤ 2 menit.
 */
export const POST = withErrorHandling(async (req: NextRequest) => {
  const admin = adminFromReq(req);
  if (!admin) {
    // Sama dengan "tidak ada" supaya endpoint ini tidak membocorkan keberadaannya ke non-admin.
    return fail("Tidak ditemukan.", 404, "not_found");
  }

  let body: { slug?: unknown; ban?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return fail("Body harus berupa JSON.", 400, "bad_request");
  }
  const slug = parseAbuseTarget(cleanText(body.slug, 300));
  if (!slug) return fail("Slug tidak valid.", 400, "bad_request");

  const res = await performTakedown(slug, { ban: body.ban === true });
  await dropStatsCache();
  await audit(admin, body.ban === true ? "takedown.ban" : "takedown", `${slug} (situs: ${res.removedSite}, ban: ${res.banned})`);
  console.warn(`[takedown] ${slug} oleh ${admin} (situs: ${res.removedSite}, ban: ${res.banned})`);
  return ok({ slug, removedSite: res.removedSite, banned: res.banned });
});
