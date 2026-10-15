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
  tunnelEnabled,
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
  // Kill-switch: TUNNEL_ENABLED=false menghentikan CLI yang masih berjalan (CLI berhenti rapi di 410).
  if (!tunnelEnabled()) return fail("Fitur Link Gaib dimatikan oleh admin Depup.", 410, "tunnel_expired");

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

  const startedAt = Date.now();
  while (Date.now() < deadline) {
    // Satu LPOP dengan count = satu command Redis, berapa pun jumlah request yang antre.
    const popped = await kv.lpop<unknown>(kQueue(id), MAX_BATCH);
    const items = Array.isArray(popped) ? popped : popped != null ? [popped] : [];
    for (const raw of items) {
      const item = parseKv<QueuedRequest>(raw);
      if (item) requests.push(item);
    }
    if (requests.length > 0) break;
    // Idle: 1 dtk di 4 dtk pertama, lalu 2 dtk. ~15 command per poll (dulu ~25).
    // `hot` = CLI baru saja sibuk, tetap cepat (200 ms).
    await sleep(hot ? 200 : Date.now() - startedAt < 4000 ? 1000 : 2000);
  }

  return ok({ requests, expiresAt: meta.expiresAt });
});
