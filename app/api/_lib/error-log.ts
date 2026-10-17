/**
 * Log error server (500 yang tidak tertangani) untuk audit sistem di panel admin.
 *
 * Disimpan di Redis (KV) sebagai list pendek: 100 entri terakhir, kedaluwarsa 7 hari. Hanya terisi
 * saat ada error sungguhan, jadi biayanya nol saat sistem sehat. Pesan error disamarkan dari token
 * (redactSecrets) dan dipotong. TIDAK PERNAH melempar error.
 */
import { kv } from "@vercel/kv";
import { redactSecrets } from "@/app/api/_lib/redact";

const KEY = "admin:errlog";
const MAX_ENTRIES = 100;
const TTL_SECONDS = 7 * 24 * 60 * 60;

export interface ErrorLogEntry {
  at: number;
  method: string;
  /** Path sudah dinormalkan (id/domain diganti :id) supaya error yang sama bisa dikelompokkan. */
  path: string;
  message: string;
}

function normalizePath(pathname: string): string {
  return pathname
    .split("/")
    .map((seg) => (seg.length > 16 || seg.includes(".") || /^[0-9a-f-]{8,}$/i.test(seg) ? ":id" : seg))
    .join("/")
    .slice(0, 120);
}

export async function recordServerError(req: unknown, err: unknown): Promise<void> {
  try {
    const r = (req ?? {}) as { url?: unknown; method?: unknown };
    let path = "(tidak diketahui)";
    if (typeof r.url === "string") {
      try {
        path = normalizePath(new URL(r.url).pathname);
      } catch {
        /* url tidak valid */
      }
    }
    const raw = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    const entry: ErrorLogEntry = {
      at: Date.now(),
      method: typeof r.method === "string" ? r.method : "?",
      path,
      message: redactSecrets(raw).replace(/\s+/g, " ").slice(0, 200),
    };
    // Dibatasi 1,5 detik: pencatatan tidak boleh memperlambat respons error.
    await Promise.race([
      (async () => {
        await kv.lpush(KEY, JSON.stringify(entry));
        await kv.ltrim(KEY, 0, MAX_ENTRIES - 1);
        await kv.expire(KEY, TTL_SECONDS);
      })(),
      new Promise<void>((resolve) => setTimeout(resolve, 1500)),
    ]);
  } catch {
    /* log error tidak boleh membuat error baru */
  }
}

export async function readServerErrors(limit = MAX_ENTRIES): Promise<ErrorLogEntry[]> {
  const raw = (await kv.lrange(KEY, 0, Math.max(0, limit - 1))) as unknown[];
  const out: ErrorLogEntry[] = [];
  for (const item of raw) {
    try {
      const e = (typeof item === "string" ? JSON.parse(item) : item) as Partial<ErrorLogEntry>;
      if (typeof e?.at === "number" && typeof e.path === "string") {
        out.push({ at: e.at, method: String(e.method ?? "?"), path: e.path, message: String(e.message ?? "") });
      }
    } catch {
      /* entri rusak dilewati */
    }
  }
  return out;
}
