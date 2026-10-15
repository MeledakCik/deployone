import type { NextRequest } from "next/server";
import { kv } from "@vercel/kv";
import { fail, ok, withErrorHandling } from "@/app/api/_lib/response";
import { getSessionEmail } from "@/app/api/_lib/session";
import { isAdminEmail } from "@/app/api/_lib/support-reports";
import { cleanText, parseAbuseTarget } from "@/app/api/_lib/abuse";
import { deleteSiteData, loadSite, removeUserSite } from "@/app/api/_lib/sites";
import { forgetMeta, kLive, kMeta, kOver, kQueue, kBytes } from "@/app/api/_lib/tunnel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const BAN_SECONDS = 60 * 60 * 24 * 30;

/**
 * POST /api/admin/takedown — hanya email di ADMIN_EMAILS. Body: { slug: string, ban?: boolean }
 * Menghapus situs statis dan/atau tunnel dengan slug itu. `ban: true` juga melarang pemilik situs
 * membuat Link Instan selama 30 hari. Cache CDN/instance lain bisa masih menyajikannya ≤ 2 menit.
 */
export const POST = withErrorHandling(async (req: NextRequest) => {
  const email = getSessionEmail(req);
  if (!email || !isAdminEmail(email)) {
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

  const site = await loadSite(slug, { includePending: true });
  if (site) {
    await deleteSiteData(site);
    await removeUserSite(site.owner, slug);
    if (body.ban === true) await kv.set(`site:ban:${site.owner}`, 1, { ex: BAN_SECONDS });
  }
  await kv.del(kMeta(slug), kLive(slug), kQueue(slug), kBytes(slug), kOver(slug));
  forgetMeta(slug);

  console.warn(`[takedown] ${slug} oleh ${email} (situs: ${!!site}, ban: ${!!site && body.ban === true})`);
  return ok({ slug, removedSite: !!site, banned: !!site && body.ban === true });
});
