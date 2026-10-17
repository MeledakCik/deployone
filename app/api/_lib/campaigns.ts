/**
 * Kampanye email promosi. Disimpan di Supabase (tabel `campaigns`).
 */
import { db, must } from "@/app/api/_lib/supabase";
import { listBlocked, scanKeys, validEmail } from "@/app/api/_lib/admin";
import { listUnsubscribed } from "@/app/api/_lib/email";

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

type CampaignRow = {
  id: string; created_at: number; by: string; subject: string; body: string; preheader: string;
  cta_label: string; cta_url: string; status: Campaign["status"]; total: number; sent: number;
  failed: number; last_error: string | null;
};

const toRow = (c: Campaign): CampaignRow => ({
  id: c.id, created_at: c.createdAt, by: c.by, subject: c.subject, body: c.body, preheader: c.preheader,
  cta_label: c.ctaLabel, cta_url: c.ctaUrl, status: c.status, total: c.total, sent: c.sent,
  failed: c.failed, last_error: c.lastError,
});

const fromRow = (r: CampaignRow): Campaign => ({
  id: r.id, createdAt: Number(r.created_at), by: r.by, subject: r.subject, body: r.body, preheader: r.preheader,
  ctaLabel: r.cta_label, ctaUrl: r.cta_url, status: r.status, total: r.total, sent: r.sent,
  failed: r.failed, lastError: r.last_error,
});

export function newCampaignId(): string {
  return `PR-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 4).toUpperCase()}`;
}

export async function saveCampaign(c: Campaign): Promise<void> {
  must(await db().from("campaigns").upsert(toRow(c), { onConflict: "id" }), "simpan kampanye");
}

export async function createCampaign(c: Campaign): Promise<void> {
  await saveCampaign(c);
}

export async function getCampaign(id: string): Promise<Campaign | null> {
  const res = await db().from("campaigns").select("*").eq("id", id).maybeSingle<CampaignRow>();
  const row = must(res, "baca kampanye");
  return row ? fromRow(row) : null;
}

export async function listCampaigns(limit = 30): Promise<Campaign[]> {
  const res = await db().from("campaigns").select("*").order("created_at", { ascending: false }).limit(Math.min(limit, 100));
  return ((must(res, "daftar kampanye") ?? []) as CampaignRow[]).map(fromRow);
}

async function listAllEmails(table: "app_users" | "user_data"): Promise<string[]> {
  const out: string[] = [];
  for (let from = 0; from < 20000; from += 1000) {
    const res = await db().from(table).select("email").order("email").range(from, from + 999);
    const rows = (must(res, `baca ${table}`) ?? []) as { email: string }[];
    out.push(...rows.map((r) => r.email));
    if (rows.length < 1000) break;
  }
  return out;
}

/**
 * Semua email akun yang pernah login (tabel app_users + user_data, plus key user:<email> Redis yang belum dimigrasi),
 * dikurangi akun yang diblokir. `unsubscribed` dikembalikan terpisah supaya UI bisa menampilkan angkanya.
 */
export async function loadAudience(): Promise<{ eligible: string[]; total: number; unsubscribed: number; blocked: number }> {
  const [indexed, withData, blockedList, unsub, legacyKeys] = await Promise.all([
    listAllEmails("app_users"),
    listAllEmails("user_data"),
    listBlocked(),
    listUnsubscribed(),
    scanKeys("user:*", 5000), // akun lama yang belum dimigrasi dari Redis
  ]);
  const all = new Set<string>();
  for (const e of [...indexed, ...withData]) if (validEmail(e)) all.add(e.trim().toLowerCase());
  for (const k of legacyKeys) {
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
