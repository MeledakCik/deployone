import { kv } from "@vercel/kv";
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

/**
 * Ambil data user dari KV. TIDAK PERNAH return null/undefined —
 * kalau belum ada data (user baru / key belum pernah di-set),
 * balikin struktur kosong dengan shape yang konsisten.
 */
export async function getUserData(email: string): Promise<UserData> {
  const key = userKey(email);
  const data = await kv.get<Partial<UserData>>(key);

  if (!data) {
    return { ...EMPTY_USER_DATA };
  }

  // envVars & settingsTokens berisi secret (token platform, value env var) —
  // di KV disimpan terenkripsi (AES-256-GCM). decryptJson otomatis
  // meloloskan data lama yang masih plaintext, jadi tidak ada migrasi manual.
  const envVars = decryptJson<EnvItem[]>(data.envVars, []);
  const settingsTokens = decryptJson<Partial<SettingsTokens>>(data.settingsTokens, {});

  return {
    history: Array.isArray(data.history) ? data.history : [],
    domains: Array.isArray(data.domains) ? data.domains : [],
    envVars: Array.isArray(envVars) ? envVars : [],
    settingsTokens:
      settingsTokens && typeof settingsTokens === "object" ? settingsTokens : {},
  };
}

/**
 * Overwrite penuh ke KV. Dipakai HANYA oleh route yang sudah melakukan
 * merge di layer atasnya (lihat app/api/user-data/route.ts).
 * Jangan panggil ini langsung dengan payload parsial dari client,
 * karena akan menimpa field lain dengan default kosong.
 */
export async function putUserData(
  email: string,
  data: UserData
): Promise<UserData> {
  const key = userKey(email);

  const safeData: UserData = {
    history: Array.isArray(data.history) ? data.history : [],
    domains: Array.isArray(data.domains) ? data.domains : [],
    envVars: Array.isArray(data.envVars) ? data.envVars : [],
    settingsTokens:
      data.settingsTokens && typeof data.settingsTokens === "object"
        ? data.settingsTokens
        : {},
  };

  await kv.set(key, {
    ...safeData,
    envVars: encryptJson(safeData.envVars),
    settingsTokens: encryptJson(safeData.settingsTokens),
  });
  return safeData;
}

/**
 * SENGAJA TIDAK ADA fungsi deleteUserData / clearUserData / kv.del
 * di file ini. Logout TIDAK PERNAH boleh menghapus data user dari KV.
 *
 * Kalau di masa depan butuh fitur "hapus akun", buat fungsi eksplisit
 * baru (mis. `deleteUserAccount`) yang dipanggil dari endpoint khusus
 * dengan konfirmasi eksplisit dari user — JANGAN pernah dipanggil
 * dari flow logout atau dari useCloudStorage.
 */
