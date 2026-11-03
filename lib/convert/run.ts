/** Eksekusi konversi (mesin Depup) dari browser: satu permintaan per file, paralel terbatas, ulang otomatis, bisa dibatalkan. */

export type ItemStatus = "queued" | "running" | "done" | "warn" | "error" | "skipped";

export type ConvertPayload =
  | { mode: "file"; path: string; code: string; from: string; to: string }
  | {
      mode: "page";
      path: string;
      code: string;
      context: { path: string; code: string }[];
      routeMap: Record<string, string>;
      assetPrefix: string;
      cssLinks: string[];
      imageImports: string[];
      tailwind: boolean;
      hint?: string;
    };

export interface RunItem {
  id: string;
  /** File sumber (untuk tampilan). */
  path: string;
  /** File hasil. */
  outPath: string;
  status: ItemStatus;
  message?: string;
  output?: string;
  payload: ConvertPayload | null;
}

interface ApiBody {
  ok?: boolean;
  data?: { code: string; truncated: boolean; source: string; warnings?: string[] };
  error?: string;
  code?: string;
}

class FatalError extends Error {}

const sleep = (ms: number, signal: AbortSignal): Promise<void> =>
  new Promise((resolve) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => (clearTimeout(t), resolve()), { once: true });
  });

async function callOnce(payload: ConvertPayload, signal: AbortSignal): Promise<{ code: string; truncated: boolean; warnings?: string[] }> {
  let res: Response;
  try {
    res = await fetch("/api/convert", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), signal });
  } catch (e) {
    if (signal.aborted) throw e;
    throw new Error("transient:Koneksi ke server gagal.");
  }
  const body = (await res.json().catch(() => null)) as ApiBody | null;
  if (body?.ok && body.data) return body.data;
  const msg = body?.error ?? `Server menjawab error (${res.status}).`;
  // Berhenti total: sesi habis, token/jatah bermasalah, AI belum aktif.
  if (res.status === 401 || res.status === 402 || res.status === 503 || body?.code === "invalid_token" || body?.code === "rate_limited") throw new FatalError(msg);
  if (res.status === 429 || res.status === 502 || res.status === 504) throw new Error(`transient:${msg}`);
  throw new Error(msg);
}

/** Jalankan semua item berstatus "queued" yang punya payload. Mengembalikan pesan bila proses dihentikan karena masalah akun/token. */
export async function runItems(
  items: RunItem[],
  opts: { signal: AbortSignal; onChange: (id: string, patch: Partial<RunItem>) => void; concurrency?: number },
): Promise<{ fatal?: string }> {
  const queue = items.filter((i) => i.status === "queued" && i.payload);
  let next = 0;
  let fatal: string | undefined;

  const work = async (): Promise<void> => {
    while (!fatal && !opts.signal.aborted) {
      const item = queue[next++];
      if (!item) return;
      opts.onChange(item.id, { status: "running", message: undefined });
      let lastErr = "";
      for (let attempt = 0; attempt < 3; attempt++) {
        if (opts.signal.aborted) break;
        try {
          const r = await callOnce(item.payload!, opts.signal);
          opts.onChange(item.id, r.truncated
            ? { status: "warn", output: r.code, message: "Hasil terpotong karena terlalu panjang — periksa bagian akhirnya atau pecah file ini." }
            : r.warnings?.length
              ? { status: "warn", output: r.code, message: r.warnings.join(" · ") }
              : { status: "done", output: r.code });
          lastErr = "";
          break;
        } catch (e) {
          if (opts.signal.aborted) break;
          if (e instanceof FatalError) {
            fatal = e.message;
            opts.onChange(item.id, { status: "queued", message: undefined });
            return;
          }
          const m = e instanceof Error ? e.message : "Gagal.";
          lastErr = m.replace(/^transient:/, "");
          if (!m.startsWith("transient:")) break;
          await sleep(3000 * (attempt + 1), opts.signal);
        }
      }
      if (opts.signal.aborted) {
        opts.onChange(item.id, { status: "queued", message: undefined });
        return;
      }
      if (lastErr) opts.onChange(item.id, { status: "error", message: lastErr });
    }
  };

  await Promise.all(Array.from({ length: Math.min(opts.concurrency ?? 2, Math.max(1, queue.length)) }, work));
  return { fatal };
}

/** Kemas file jadi ZIP (JSZip dimuat saat dibutuhkan). */
export async function buildZip(files: { path: string; data: string | Uint8Array }[]): Promise<Blob> {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  for (const f of files) zip.file(f.path, f.data);
  return zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
}

export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
