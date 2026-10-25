import { kv } from "@vercel/kv";
import { getUserData, putUserData } from "@/app/api/_lib/store";
import { formatDate, normalizeDeployDomain } from "@/lib/utils";
import type { HistoryItem, Platform } from "@/types";

/**
 * Riwayat dashboard disimpan di browser lalu disinkronkan ke server (useCloudStorage), dan PUT dari browser
 * menimpa seluruh array. Deploy dari Claude ditulis dari server, jadi diberi penanda `fresh` supaya PUT dari
 * tab yang belum sempat memuatnya TIDAK menghapusnya (lihat app/api/user-data/route.ts). Penanda dilepas
 * begitu browser pernah mengambil data lewat GET, sehingga penghapusan oleh user tetap dihormati.
 */

export const MAX_HISTORY = 10; // sama dengan lib/deploy-context.tsx

export type ServerHistoryItem = HistoryItem & { fresh?: boolean };

function statusFor(readyState: string): HistoryItem["status"] {
  const s = readyState.toUpperCase();
  if (s === "READY") return "ready";
  if (s === "ERROR" || s === "CANCELED") return "failed";
  return "building";
}

export interface McpHistoryInput {
  name: string;
  platform: Platform;
  url: string;
  readyState: string;
  repo: string;
}

/** Best-effort: kegagalan di sini tidak boleh menggagalkan deploy yang sudah berjalan. */
export async function recordMcpDeploy(email: string, input: McpHistoryInput): Promise<boolean> {
  const lockKey = `mcp:hist:lock:${email}`;
  try {
    let locked = false;
    for (let i = 0; i < 5 && !locked; i++) {
      locked = (await kv.set(lockKey, 1, { nx: true, ex: 10 })) !== null;
      if (!locked) await new Promise((r) => setTimeout(r, 200));
    }
    if (!locked) return false;
    try {
      const data = await getUserData(email);
      const prev = Array.isArray(data.history) ? (data.history as ServerHistoryItem[]) : [];
      const item: ServerHistoryItem = {
        id: `${Date.now()}`,
        name: input.name,
        platform: input.platform,
        domain: normalizeDeployDomain(input.url, input.platform),
        date: formatDate(new Date()),
        status: statusFor(input.readyState),
        repo: input.repo,
        fresh: true,
      };
      // Deploy ulang project yang sama (nama + platform) memperbarui entri lama, bukan menggandakan.
      const rest = prev.filter((h) => !(h.name === input.name && h.platform === input.platform));
      await putUserData(email, { ...data, history: [item, ...rest].slice(0, MAX_HISTORY) });
      return true;
    } finally {
      await kv.del(lockKey).catch(() => undefined);
    }
  } catch (e) {
    console.error("[mcp-history] gagal mencatat riwayat", (e as Error)?.message);
    return false;
  }
}
