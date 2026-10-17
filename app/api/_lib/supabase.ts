import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Klien Supabase KHUSUS SERVER (pakai service_role key — melewati RLS).
 * JANGAN pernah import file ini dari komponen client / kode yang dibundel ke browser,
 * dan JANGAN pakai prefix NEXT_PUBLIC_ untuk key-nya.
 *
 * Pembagian tugas dengan Redis (KV):
 *   - Supabase = data yang harus awet & bertumbuh (data dashboard user, direktori user,
 *     laporan abuse/bantuan, kampanye, audit, pengaturan, unsubscribe, statistik harian).
 *   - Redis    = data sementara & panas (rate-limit, relay tunnel, lock, dedupe, chunk Link Instan,
 *     cache statistik, daftar blokir yang dicek middleware di tiap request).
 */

let client: SupabaseClient | null = null;

export function supabaseConfigured(): boolean {
  return !!process.env.SUPABASE_URL?.trim() && !!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
}

export function db(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error("Supabase belum dikonfigurasi (isi SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY).");
  }
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      // Next.js 14 meng-cache fetch GET secara default — data admin/user harus selalu segar.
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
  });
  return client;
}

/** Lempar error yang jelas kalau query Supabase gagal (pesan error PostgREST tidak membawa secret). */
export function must<T>(res: { data: T | null; error: { message: string; code?: string } | null }, ctx: string): T | null {
  if (res.error) throw new Error(`[supabase] ${ctx}: ${res.error.message}`);
  return res.data;
}
