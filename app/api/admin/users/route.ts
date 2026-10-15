import type { NextRequest } from "next/server";
import { kv } from "@vercel/kv";
import { fail, ok, withErrorHandling } from "@/app/api/_lib/response";
import {
  LINK_BAN_SECONDS,
  adminFromReq,
  audit,
  isAdminEmail,
  kLinkBan,
  kUserRec,
  listBlocked,
  scanKeys,
  setBlocked,
  validEmail,
  type UserRecord,
} from "@/app/api/_lib/admin";
import { getStats } from "@/app/api/_lib/admin-data";
import { parseKv } from "@/app/api/_lib/tunnel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 30;

/** GET /api/admin/users[?q=teks&refresh=1] */
export const GET = withErrorHandling(async (req: NextRequest) => {
  if (!adminFromReq(req)) return fail("Tidak ditemukan.", 404, "not_found");
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().toLowerCase().slice(0, 100);
  const stats = await getStats({ refresh: req.nextUrl.searchParams.get("refresh") === "1", host: req.headers.get("host") });

  const indexed = ((await kv.zrange("admin:users", 0, 1499, { rev: true })) as string[]) ?? [];
  const emails = Array.from(new Set([...stats.users.map((u) => u.email), ...indexed]));
  const recRows = emails.length ? await kv.mget<unknown[]>(...emails.map(kUserRec)) : [];
  const recs = new Map<string, UserRecord>();
  recRows.forEach((r, i) => {
    const rec = parseKv<UserRecord>(r);
    if (rec) recs.set(emails[i], rec);
  });
  const summaries = new Map(stats.users.map((u) => [u.email, u]));

  const [blockedList, banKeys] = await Promise.all([listBlocked(), scanKeys("site:ban:*", 500)]);
  const blocked = new Set(blockedList);
  const banned = new Set(banKeys.map((k) => k.slice("site:ban:".length)));

  let users = emails.map((email) => {
    const rec = recs.get(email);
    const sum = summaries.get(email);
    return {
      email,
      name: rec?.name ?? "",
      picture: rec?.picture ?? null,
      firstSeen: rec?.first ?? 0,
      lastSeen: rec?.last ?? 0,
      logins: rec?.logins ?? 0,
      deploys: sum?.deploys ?? 0,
      lastDeploy: sum?.lastDeploy ?? 0,
      sites: sum?.sites ?? 0,
      blocked: blocked.has(email),
      linkBanned: banned.has(email),
      isAdmin: isAdminEmail(email),
    };
  });
  if (q) users = users.filter((u) => u.email.includes(q) || u.name.toLowerCase().includes(q));
  users.sort((a, b) => (b.lastSeen || b.lastDeploy) - (a.lastSeen || a.lastDeploy));
  return ok({ total: emails.length, users: users.slice(0, 300), truncated: stats.usersTruncated });
});

/** POST /api/admin/users — body: { email, action: "block" | "unblock" | "ban_links" | "unban_links" } */
export const POST = withErrorHandling(async (req: NextRequest) => {
  const admin = adminFromReq(req);
  if (!admin) return fail("Tidak ditemukan.", 404, "not_found");

  let body: { email?: unknown; action?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return fail("Body harus berupa JSON.", 400, "bad_request");
  }
  if (!validEmail(body.email)) return fail("Email tidak valid.", 400, "bad_request");
  const email = body.email.trim().toLowerCase();
  const action = String(body.action);
  if (!["block", "unblock", "ban_links", "unban_links"].includes(action)) {
    return fail("Aksi tidak dikenal.", 400, "bad_request");
  }
  if (isAdminEmail(email) && (action === "block" || action === "ban_links")) {
    return fail("Akun admin tidak bisa diblokir.", 400, "bad_request");
  }

  if (action === "block") await setBlocked(email, true);
  else if (action === "unblock") await setBlocked(email, false);
  else if (action === "ban_links") await kv.set(kLinkBan(email), 1, { ex: LINK_BAN_SECONDS });
  else await kv.del(kLinkBan(email));

  await audit(admin, `user.${action}`, email);
  return ok({ email, action });
});
