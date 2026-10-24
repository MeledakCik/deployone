/** dbrepo.ts — tipe data + akses KV untuk database milik user. */
import { HttpError, kv } from "./db-adapter";

export type ApiKeyRec = {
  id: string;
  label: string;
  mode: "ro" | "rw";
  hash: string; // SHA-256 hex dari key; key asli TIDAK pernah disimpan
  prefix: string; // untuk ditampilkan, mis. "dpk_ro_ab12"
  createdAt: number;
  revokedAt?: number;
};

export type DbRecord = {
  id: string; // id publik acak (dipakai di URL)
  ownerEmail: string;
  displayName: string;
  tursoName: string; // nama database di Turso (tidak pernah dikirim ke client)
  hostname: string; // host libSQL (tidak pernah dikirim ke client)
  createdAt: number;
  username: string;
  passwordHash: string; // scrypt
  credVersion: number; // naik tiap reset password -> sesi lama otomatis tidak valid
  keys: ApiKeyRec[];
};

export const ID_RE = /^[a-z0-9]{16}$/;
export const NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function validateName(raw: unknown): string {
  const name = typeof raw === "string" ? raw.trim() : "";
  if (name.length < 3 || name.length > 32 || !NAME_RE.test(name)) {
    throw new HttpError(400, "invalid_name", "Nama harus 3–32 karakter: huruf kecil, angka, dan strip (tidak di awal/akhir).");
  }
  return name;
}

export async function getDb(id: string): Promise<DbRecord | null> {
  if (!ID_RE.test(id)) return null;
  return kv.get<DbRecord>(`db:${id}`);
}
export const saveDb = (rec: DbRecord) => kv.set(`db:${rec.id}`, rec);

export async function listUserDbIds(email: string): Promise<string[]> {
  return (await kv.get<string[]>(`user:${email}:dbs`)) ?? [];
}
export const setUserDbIds = (email: string, ids: string[]) => kv.set(`user:${email}:dbs`, ids);
export const nameLockKey = (email: string, name: string) => `dbname:${email}:${name}`;

/** Bentuk aman untuk dikirim ke client (tanpa hash/secret). */
export function toPublic(rec: DbRecord, withKeys: boolean) {
  return {
    id: rec.id,
    displayName: rec.displayName,
    createdAt: rec.createdAt,
    username: rec.username,
    keys: withKeys ? rec.keys.map(({ hash: _h, ...k }) => k) : undefined,
  };
}
