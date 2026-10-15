import type { NextRequest } from "next/server";
import { kv } from "@vercel/kv";
import { fail, ok, withErrorHandling } from "@/app/api/_lib/response";
import { getSessionEmail } from "@/app/api/_lib/session";
import {
  PENDING_TTL_SECONDS,
  encodeChunk,
  expectedChunkSize,
  kSiteChunk,
  loadSite,
} from "@/app/api/_lib/sites";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/** PUT /api/sites/:id/chunk?i=N — body mentah (octet-stream), ukuran harus persis sesuai rencana. */
export const PUT = withErrorHandling(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const email = getSessionEmail(req);
  if (!email) return fail("Sesi login habis. Silakan login lagi.", 401, "unauthorized");

  const meta = await loadSite(params.id, { includePending: true });
  if (!meta || meta.owner !== email || meta.status !== "pending") {
    return fail("Upload tidak ditemukan atau sudah selesai.", 404, "not_found");
  }

  const index = Number(new URL(req.url).searchParams.get("i"));
  const want = Number.isInteger(index) ? expectedChunkSize(meta.totalBytes, index) : -1;
  if (want < 0) return fail("Nomor potongan tidak valid.", 400, "bad_request");

  const buf = Buffer.from(await req.arrayBuffer());
  if (buf.length !== want) {
    return fail(`Ukuran potongan salah (diterima ${buf.length}, seharusnya ${want}).`, 400, "bad_request");
  }

  await kv.set(kSiteChunk(meta.id, index), encodeChunk(buf), { ex: PENDING_TTL_SECONDS });
  return ok({ index });
});
