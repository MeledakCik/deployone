/**
 * Eksekusi konversi di browser, tanpa AI dan tanpa server: tiap item dikerjakan mesin lokal
 * (lib/convert/local). Berjalan berurutan dengan jeda singkat antar item supaya tampilan tetap responsif,
 * bisa dibatalkan, dan gagalnya satu file tidak menghentikan yang lain.
 */

import { renderPage, type RenderJob } from "./local/jsx-render";
import { convertFileLocal } from "./local/simple";

export type ItemStatus = "queued" | "running" | "done" | "warn" | "error" | "skipped";

export type ConvertPayload =
  | { mode: "file"; path: string; code: string; from: string; to: string }
  | { mode: "page"; job: RenderJob };

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

const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

async function convertOne(payload: ConvertPayload): Promise<{ code: string; warnings: string[] }> {
  if (payload.mode === "file") {
    return convertFileLocal({ from: payload.from, to: payload.to, code: payload.code, path: payload.path });
  }
  const r = await renderPage(payload.job);
  return { code: r.html, warnings: r.warnings };
}

/** Jalankan semua item berstatus "queued" yang punya payload. */
export async function runItems(
  items: RunItem[],
  opts: { signal: AbortSignal; onChange: (id: string, patch: Partial<RunItem>) => void },
): Promise<{ fatal?: string }> {
  const queue = items.filter((i) => i.status === "queued" && i.payload);
  for (const item of queue) {
    if (opts.signal.aborted) break;
    opts.onChange(item.id, { status: "running", message: undefined });
    await tick();
    try {
      const r = await convertOne(item.payload!);
      if (opts.signal.aborted) {
        opts.onChange(item.id, { status: "queued", message: undefined });
        break;
      }
      const note = r.warnings.length ? r.warnings.slice(0, 3).join(" · ") + (r.warnings.length > 3 ? ` · +${r.warnings.length - 3} catatan lain` : "") : undefined;
      opts.onChange(item.id, r.warnings.length ? { status: "warn", output: r.code, message: note } : { status: "done", output: r.code });
    } catch (e) {
      opts.onChange(item.id, { status: "error", message: e instanceof Error ? e.message : "Gagal." });
    }
  }
  return {};
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
