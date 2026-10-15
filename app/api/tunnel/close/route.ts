import { kv } from "@vercel/kv";
import { fail, ok, withErrorHandling } from "@/app/api/_lib/response";
import { authTunnel, forgetMeta, kLive, kMeta, kQueue } from "@/app/api/_lib/tunnel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Wajib: Next 14 meng-cache fetch POST di dalam route handler GET, dan klien KV (Upstash) memakai fetch —
// tanpa ini lpop/get yang sama terus mengembalikan hasil lama dari cache.
export const fetchCache = "force-no-store";

/** POST /api/tunnel/close?id=<slug> — CLI berhenti (Ctrl+C): link langsung mati. */
export const POST = withErrorHandling(async (req: Request) => {
  const id = new URL(req.url).searchParams.get("id") ?? "";
  const meta = await authTunnel(req, id);
  if (!meta) return fail("Tunnel tidak valid atau sudah kedaluwarsa.", 401, "unauthorized");
  await kv.del(kMeta(id), kLive(id), kQueue(id));
  forgetMeta(id);
  return ok({ closed: true });
});
