import type { NextRequest } from "next/server";
import { kv } from "@vercel/kv";
import { fail, ok, withErrorHandling } from "@/app/api/_lib/response";
import { getSessionEmail } from "@/app/api/_lib/session";
import { recordStat } from "@/app/api/_lib/admin";
import { addUserSite, kSiteChunk, kSiteMeta, loadSite, siteUrl } from "@/app/api/_lib/sites";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/** POST /api/sites/:id/finish — pastikan semua potongan ada, lalu aktifkan link. */
export const POST = withErrorHandling(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const email = getSessionEmail(req);
  if (!email) return fail("Sesi login habis. Silakan login lagi.", 401, "unauthorized");

  const meta = await loadSite(params.id, { includePending: true });
  if (!meta || meta.owner !== email) return fail("Upload tidak ditemukan.", 404, "not_found");
  if (meta.status === "active") return ok({ id: meta.id, url: siteUrl(meta.id, req.headers.get("host")), expiresAt: meta.expiresAt });

  const keys = Array.from({ length: meta.chunkCount }, (_, i) => kSiteChunk(meta.id, i));
  const present = await kv.exists(...keys);
  if (present !== keys.length) {
    return fail("Upload belum lengkap — ada potongan file yang belum terkirim. Coba upload ulang.", 409, "bad_request");
  }

  // TTL sebenarnya dimulai dari sekarang (bukan dari saat upload dimulai).
  const now = Date.now();
  const ttlMs = meta.expiresAt - meta.createdAt;
  const active = { ...meta, status: "active" as const, expiresAt: now + ttlMs };
  const ttlSec = Math.ceil(ttlMs / 1000) + 60;

  const pipe = kv.pipeline();
  pipe.set(kSiteMeta(meta.id), JSON.stringify(active), { ex: ttlSec });
  for (const k of keys) pipe.expire(k, ttlSec);
  await pipe.exec();
  await addUserSite(email, meta.id);
  await recordStat("sites");

  return ok({ id: meta.id, url: siteUrl(meta.id, req.headers.get("host")), expiresAt: active.expiresAt });
});
