import { getUserData, putUserData } from "@/app/api/_lib/store";

/**
 * Token Groq milik user (BYOK). Disimpan di settingsTokens.groqApiKey, yang SUDAH terenkripsi
 * AES-256-GCM oleh store.ts. Hanya dibaca di server; GET /api/user-data membuangnya dari respons.
 */

export const GROQ_KEY_RE = /^gsk_[A-Za-z0-9]{20,200}$/;

export async function getUserGroqKey(email: string): Promise<string | null> {
  const data = await getUserData(email);
  const key = data.settingsTokens.groqApiKey;
  return typeof key === "string" && GROQ_KEY_RE.test(key) ? key : null;
}

export async function setUserGroqKey(email: string, key: string | null): Promise<void> {
  const data = await getUserData(email);
  const next = { ...data.settingsTokens };
  if (key) next.groqApiKey = key;
  else delete next.groqApiKey;
  await putUserData(email, { ...data, settingsTokens: next });
}

export function maskKey(key: string): string {
  return `gsk_••••${key.slice(-4)}`;
}

/** Jatah AI gratis dari token server (per akun per hari). 0 = wajib pakai token sendiri. */
export function freeAiPerDay(): number {
  const n = Number(process.env.AI_FREE_PER_DAY);
  return Number.isFinite(n) && n > 0 ? Math.min(Math.floor(n), 20) : 0;
}
