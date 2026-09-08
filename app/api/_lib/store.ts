import { kv } from "@vercel/kv";
import { decryptJson, encryptJson } from "@/app/api/_lib/crypto";

export type UserData = {
  history: any[];
  domains: any[];
  envVars: any[];
  settingsTokens: Record<string, any>;
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
  const data = await kv.get<Record<string, any>>(key);

  if (!data) {
    return { ...EMPTY_USER_DATA };
  }

  return {
    history: Array.isArray(data.history) ? data.history : [],
    domains: Array.isArray(data.domains) ? data.domains : [],
    envVars: Array.isArray(data.envVars) ? data.envVars : [],
    // settingsTokens (isinya token Vercel/GitHub) disimpan terenkripsi di
    // KV — decryptJson otomatis fallback ke data apa adanya kalau formatnya
    // masih plain object lama (sebelum enkripsi ini ada), jadi aman untuk
    // data yang sudah ada duluan.
    settingsTokens: decryptJson<Record<string, any>>(data.settingsTokens, {}),
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

  const safeSettingsTokens: Record<string, any> =
    data.settingsTokens && typeof data.settingsTokens === "object"
      ? data.settingsTokens
      : {};

  const safeData = {
    history: Array.isArray(data.history) ? data.history : [],
    domains: Array.isArray(data.domains) ? data.domains : [],
    envVars: Array.isArray(data.envVars) ? data.envVars : [],
    // Dienkripsi sebelum disentuh KV — kalau KV/backup-nya suatu saat bocor,
    // token Vercel/GitHub user tidak ikut ke-expose plaintext.
    settingsTokens: encryptJson(safeSettingsTokens),
  };

  await kv.set(key, safeData);

  // Yang di-return ke caller (route -> client) tetap bentuk decrypted,
  // bukan blob yang barusan disimpan ke KV.
  return { ...safeData, settingsTokens: safeSettingsTokens };
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
