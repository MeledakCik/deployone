import { kv } from "@vercel/kv";
import { fail, ok, withErrorHandling } from "@/app/api/_lib/response";
import { authTunnel, kBytes, kOver, kRes, tunnelMaxBytes, type ResponseChunk } from "@/app/api/_lib/tunnel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Wajib: Next 14 meng-cache fetch POST di dalam route handler GET, dan klien KV (Upstash) memakai fetch —
// tanpa ini lpop/get yang sama terus mengembalikan hasil lama dari cache.
export const fetchCache = "force-no-store";
export const maxDuration = 30;

const RID_RE = /^[a-f0-9]{18}$/;
/** base64 dari MAX_CHUNK_BYTES (384 KB) = ~512 KB; beri sedikit ruang. */
const MAX_B64_LEN = 560_000;

/**
 * POST /api/tunnel/respond?id=<slug> — CLI mengirim potongan response.
 * Body: { rid, seq, status?, headers?, data (base64), last }
 * seq 0 wajib membawa status + headers.
 */
export const POST = withErrorHandling(async (req: Request) => {
  const id = new URL(req.url).searchParams.get("id") ?? "";
  const meta = await authTunnel(req, id);
  if (!meta) return fail("Tunnel tidak valid atau sudah kedaluwarsa.", 401, "unauthorized");

  let b: Record<string, unknown>;
  try {
    b = await req.json();
  } catch {
    return fail("Body harus berupa JSON.", 400, "bad_request");
  }

  const rid = typeof b.rid === "string" ? b.rid : "";
  const seq = typeof b.seq === "number" ? Math.floor(b.seq) : -1;
  const data = typeof b.data === "string" ? b.data : "";
  if (!RID_RE.test(rid) || seq < 0 || seq > 5000 || data.length > MAX_B64_LEN) {
    return fail("Payload tidak valid.", 400, "bad_request");
  }

  const chunk: ResponseChunk = { seq, data, last: b.last === true };
  if (seq === 0) {
    const status = typeof b.status === "number" ? Math.floor(b.status) : 0;
    if (status < 200 || status > 599) return fail("Status HTTP tidak valid.", 400, "bad_request");
    const headers = Array.isArray(b.headers) ? b.headers : [];
    chunk.status = status;
    chunk.headers = headers
      .filter((h): h is [string, string] => Array.isArray(h) && typeof h[0] === "string" && typeof h[1] === "string")
      .slice(0, 100);
  }

  await kv.set(kRes(id, rid, seq), JSON.stringify(chunk), { ex: 90 });

  // Kuota data per link. Best-effort: kalau penghitung gagal, response tetap jalan (tidak fatal).
  // Yang diblokir adalah request pengunjung BERIKUTNYA (lihat app/t/[slug]), bukan yang sedang berjalan.
  const cap = tunnelMaxBytes();
  if (cap > 0) {
    try {
      const add = Math.ceil((data.length * 3) / 4);
      if (add > 0) {
        const total = await kv.incrby(kBytes(id), add);
        const ttl = Math.max(60, Math.ceil((meta.expiresAt - Date.now()) / 1000) + 60);
        if (total === add) await kv.expire(kBytes(id), ttl);
        if (total > cap && total - add <= cap) await kv.set(kOver(id), 1, { ex: ttl });
      }
    } catch (e) {
      console.error("[tunnel/respond] hitung kuota gagal:", (e as Error)?.message);
    }
  }
  return ok({ stored: true });
});
