import { kv } from "@vercel/kv";
import { fail, ok, withErrorHandling } from "@/app/api/_lib/response";
import {
  POLL_WINDOW_MS,
  authTunnel,
  kLive,
  kQueue,
  loadMeta,
  parseKv,
  sleep,
  type QueuedRequest,
} from "@/app/api/_lib/tunnel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Wajib: Next 14 meng-cache fetch POST di dalam route handler GET, dan klien KV (Upstash) memakai fetch —
// tanpa ini lpop/get yang sama terus mengembalikan hasil lama dari cache.
export const fetchCache = "force-no-store";
export const maxDuration = 60;

const MAX_BATCH = 8;

/**
 * GET /api/tunnel/poll?id=<slug>&hot=0|1 — long-poll dari CLI.
 * Menahan koneksi sampai ada request pengunjung (maks ~25 dtk), lalu
 * mengembalikan sampai 8 request sekaligus. `hot=1` = CLI baru saja sibuk,
 * jadi cek KV lebih sering (hemat perintah KV saat idle).
 */
export const GET = withErrorHandling(async (req: Request) => {
  const url = new URL(req.url);
  const id = url.searchParams.get("id") ?? "";
  const hot = url.searchParams.get("hot") === "1";

  const meta = await authTunnel(req, id);
  if (!meta) {
    const stillThere = await loadMeta(id);
    return stillThere
      ? fail("Token tunnel tidak valid.", 401, "unauthorized")
      : fail("Tunnel sudah kedaluwarsa atau ditutup.", 410, "tunnel_expired");
  }

  // Tandai CLI online. TTL > POLL_WINDOW supaya tidak "putus" di antara dua poll.
  await kv.set(kLive(id), 1, { ex: 45 });

  const deadline = Date.now() + POLL_WINDOW_MS;
  const requests: QueuedRequest[] = [];

  while (Date.now() < deadline) {
    while (requests.length < MAX_BATCH) {
      const item = parseKv<QueuedRequest>(await kv.lpop(kQueue(id)));
      if (!item) break;
      requests.push(item);
    }
    if (requests.length > 0) break;
    await sleep(hot ? 200 : 1000);
  }

  return ok({ requests, expiresAt: meta.expiresAt });
});
