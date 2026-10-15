import { kv } from "@vercel/kv";
import { deleteSiteData, loadSite, removeUserSite } from "@/app/api/_lib/sites";
import { forgetMeta, kBytes, kLive, kMeta, kOver, kQueue } from "@/app/api/_lib/tunnel";
import { LINK_BAN_SECONDS, kLinkBan, recordStat } from "@/app/api/_lib/admin";

export interface TakedownResult {
  slug: string;
  removedSite: boolean;
  banned: boolean;
  owner: string | null;
}

/**
 * Hapus situs statis dan/atau tunnel dengan slug itu. `ban` juga melarang pemilik situs membuat
 * Link Instan selama 30 hari. Cache CDN/instance lain bisa masih menyajikannya ≤ 2 menit.
 */
export async function performTakedown(slug: string, opts: { ban?: boolean } = {}): Promise<TakedownResult> {
  const site = await loadSite(slug, { includePending: true });
  if (site) {
    await deleteSiteData(site);
    await removeUserSite(site.owner, slug);
    if (opts.ban === true) await kv.set(kLinkBan(site.owner), 1, { ex: LINK_BAN_SECONDS });
  }
  await kv.del(kMeta(slug), kLive(slug), kQueue(slug), kBytes(slug), kOver(slug));
  forgetMeta(slug);
  await recordStat("takedowns");
  return { slug, removedSite: !!site, banned: !!site && opts.ban === true, owner: site?.owner ?? null };
}
