import { kv } from "@vercel/kv";
import { db, must } from "@/app/api/_lib/supabase";
import { encryptJson, decryptJson } from "@/app/api/_lib/crypto";
import type { HistoryItem, DomainItem, EnvItem, SettingsTokens } from "@/types";

export type UserData = {
  history: HistoryItem[];
  domains: DomainItem[];
  envVars: EnvItem[];
  // Partial: field token yang belum pernah diisi user tidak ada di sini.
  settingsTokens: Partial<SettingsTokens>;
};

const EMPTY_USER_DATA: UserData = {
  history: [],
  domains: [],
  envVars: [],
  settingsTokens: {},
};

/**
 * Normalisasi key: lowercase + trim.
 * JANGAN pernah generate random id di sini — key harus deterministik
 * berdasarkan email supaya data yang sama selalu ketemu lagi, baik
 * setelah logout/login ulang maupun dari device/browser lain.
 */
export function userKey(email: string): string {
  if (!email || typeof email !== "string") {
    throw new Error("userKey: email is required");
  }
  return `user:${email.trim().toLowerCase()}`;
}

type UserRow = {
  email: string;
  history: unknown;
  domains: unknown;
  env_vars: unknown;
  settings_tokens: unknown;
};

function normalize(raw: {
  history?: unknown;
  domains?: unknown;
  envVars?: unknown;
  settingsTokens?: unknown;
}): UserData {
  // envVars & settingsTokens berisi secret (token platform, value env var) —
  // disimpan terenkripsi (AES-256-GCM). decryptJson otomatis meloloskan data
  // lama yang masih plaintext, jadi tidak ada migrasi manual.
  const envVars = decryptJson<EnvItem[]>(raw.envVars, []);
  const settingsTokens = decryptJson<Partial<SettingsTokens>>(raw.settingsTokens, {});
  return {
    history: Array.isArray(raw.history) ? (raw.history as HistoryItem[]) : [],
    domains: Array.isArray(raw.domains) ? (raw.domains as DomainItem[]) : [],
    envVars: Array.isArray(envVars) ? envVars : [],
    settingsTokens:
      settingsTokens && typeof settingsTokens === "object" ? settingsTokens : {},
  };
}

/**
 * Ambil data user dari Supabase (tabel user_data). TIDAK PERNAH return null/undefined —
 * kalau belum ada data (user baru), balikin struktur kosong dengan shape yang konsisten.
 *
 * MIGRASI MALAS dari Redis: kalau belum ada baris di Supabase, cek key lama `user:<email>`
 * di Redis. Kalau ketemu, disalin ke Supabase (dienkripsi ulang) lalu dipakai. Key Redis lama
 * TIDAK dihapus di sini (aman untuk rollback; bersihkan lewat scripts/migrate-redis-to-supabase.mjs --delete-old).
 */
export async function getUserData(email: string): Promise<UserData> {
  const key = userKey(email);
  const addr = key.slice("user:".length);

  const res = await db()
    .from("user_data")
    .select("email,history,domains,env_vars,settings_tokens")
    .eq("email", addr)
    .maybeSingle<UserRow>();
  const row = must(res, "baca user_data");
  if (row) {
    return normalize({
      history: row.history,
      domains: row.domains,
      envVars: row.env_vars,
      settingsTokens: row.settings_tokens,
    });
  }

  try {
    const legacy = await kv.get<Partial<UserData>>(key);
    if (legacy && typeof legacy === "object") {
      const data = normalize(legacy);
      await putUserData(email, data);
      return data;
    }
  } catch (e) {
    console.error("[store] fallback Redis gagal", (e as Error)?.message);
  }
  return { ...EMPTY_USER_DATA };
}

/**
 * Overwrite penuh ke Supabase. Dipakai HANYA oleh route yang sudah melakukan
 * merge di layer atasnya (lihat app/api/user-data/route.ts).
 * Jangan panggil ini langsung dengan payload parsial dari client,
 * karena akan menimpa field lain dengan default kosong.
 */
export async function putUserData(
  email: string,
  data: UserData
): Promise<UserData> {
  const addr = userKey(email).slice("user:".length);

  const safeData: UserData = {
    history: Array.isArray(data.history) ? data.history : [],
    domains: Array.isArray(data.domains) ? data.domains : [],
    envVars: Array.isArray(data.envVars) ? data.envVars : [],
    settingsTokens:
      data.settingsTokens && typeof data.settingsTokens === "object"
        ? data.settingsTokens
        : {},
  };

  must(
    await db().from("user_data").upsert(
      {
        email: addr,
        history: safeData.history,
        domains: safeData.domains,
        env_vars: encryptJson(safeData.envVars),
        settings_tokens: encryptJson(safeData.settingsTokens),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "email" }
    ),
    "tulis user_data"
  );
  return safeData;
}

/**
 * SENGAJA TIDAK ADA fungsi deleteUserData / clearUserData / delete
 * di file ini. Logout TIDAK PERNAH boleh menghapus data user dari database.
 *
 * Kalau di masa depan butuh fitur "hapus akun", buat fungsi eksplisit
 * baru (mis. `deleteUserAccount`) yang dipanggil dari endpoint khusus
 * dengan konfirmasi eksplisit dari user — JANGAN pernah dipanggil
 * dari flow logout atau dari useCloudStorage.
 */
