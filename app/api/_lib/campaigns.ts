/**
 * Kampanye email promosi. Disimpan di KV:
 *   promo:campaign:<id>  -> Campaign (365 hari)
 *   promo:campaigns      -> list id terbaru (maks 100)
 */
import { kv } from "@vercel/kv";
import { listBlocked, scanKeys, validEmail } from "@/app/api/_lib/admin";
import { listUnsubscribed } from "@/app/api/_lib/email";
import { parseKv } from "@/app/api/_lib/tunnel";

export interface Campaign {
  id: string;
  createdAt: number;
  by: string;
  subject: string;
  body: string;
  preheader: string;
  ctaLabel: string;
  ctaUrl: string;
  status: "sending" | "done" | "partial" | "failed";
  total: number;
  sent: number;
  failed: number;
  lastError: string | null;
}

const LIST_KEY = "promo:campaigns";
const kCampaign = (id: string) => `promo:campaign:${id}`;

export function newCampaignId(): string {
  return `PR-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 4).toUpperCase()}`;
}

export async function saveCampaign(c: Campaign): Promise<void> {
  await kv.set(kCampaign(c.id), JSON.stringify(c), { ex: 60 * 60 * 24 * 365 });
}

export async function createCampaign(c: Campaign): Promise<void> {
  await saveCampaign(c);
  await kv.lpush(LIST_KEY, c.id);
  await kv.ltrim(LIST_KEY, 0, 99);
}

export async function getCampaign(id: string): Promise<Campaign | null> {
  return parseKv<Campaign>(await kv.get(kCampaign(id)));
}

export async function listCampaigns(limit = 30): Promise<Campaign[]> {
  const ids = ((await kv.lrange<string>(LIST_KEY, 0, Math.min(limit, 100) - 1)) as string[]) ?? [];
  const rows = await Promise.all(ids.map((id) => getCampaign(id)));
  return rows.filter((x): x is Campaign => !!x);
}

/**
 * Semua email akun yang pernah login (index admin:users + key user:<email> akun lama),
 * dikurangi akun yang diblokir. `unsubscribed` dikembalikan terpisah supaya UI bisa menampilkan angkanya.
 */
export async function loadAudience(): Promise<{ eligible: string[]; total: number; unsubscribed: number; blocked: number }> {
  const [indexed, userKeys, blockedList, unsub] = await Promise.all([
    kv.zrange("admin:users", 0, 4999, { rev: true }).then((r) => (r as string[]) ?? []),
    scanKeys("user:*", 5000),
    listBlocked(),
    listUnsubscribed(),
  ]);
  const all = new Set<string>();
  for (const e of indexed) if (validEmail(e)) all.add(e.trim().toLowerCase());
  for (const k of userKeys) {
    const e = k.slice("user:".length).toLowerCase();
    if (validEmail(e)) all.add(e);
  }
  const blocked = new Set(blockedList);
  const eligible = Array.from(all).filter((e) => !blocked.has(e) && !unsub.has(e));
  return {
    eligible,
    total: all.size,
    unsubscribed: Array.from(all).filter((e) => unsub.has(e)).length,
    blocked: Array.from(all).filter((e) => blocked.has(e)).length,
  };
}
