import crypto from "crypto";

const ALGO = "aes-256-gcm";
const PREFIX = "enc:v1:";

// Salt KDF ini TIDAK rahasia (boleh ada di source) — fungsinya cuma
// mendomain-pisahkan key enkripsi dari AUTH_SECRET mentah, supaya kita
// tidak perlu env var baru (ENCRYPTION_KEY dsb.) yang gampang lupa di-set
// pas deploy. Keamanan tetap bergantung ke AUTH_SECRET yang sudah wajib ada.
const KDF_SALT = "depush-settings-tokens-v1";

function getKey(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "AUTH_SECRET belum di-set — dibutuhkan juga untuk enkripsi token yang disimpan."
    );
  }
  return crypto.scryptSync(secret, KDF_SALT, 32);
}

/** Enkripsi sebuah value (akan di-JSON.stringify) jadi satu string aman-disimpan. */
export function encryptJson(value: unknown): string {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const plaintext = Buffer.from(JSON.stringify(value), "utf-8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return (
    PREFIX +
    [iv, tag, ciphertext].map((b) => b.toString("base64url")).join(".")
  );
}

/**
 * Dekripsi string hasil encryptJson. Kalau input BUKAN format terenkripsi
 * (mis. data lama dari sebelum fitur ini ada — masih plain object di KV,
 * atau field belum pernah diisi) -> dikembalikan apa adanya / fallback,
 * TIDAK di-throw. Ini penting supaya rollout fitur ini tidak menghilangkan
 * atau meng-error-kan data user yang sudah ada.
 */
export function decryptJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string" || !value.startsWith(PREFIX)) {
    return value != null ? (value as T) : fallback;
  }
  try {
    const key = getKey();
    const [ivB64, tagB64, dataB64] = value.slice(PREFIX.length).split(".");
    const iv = Buffer.from(ivB64, "base64url");
    const tag = Buffer.from(tagB64, "base64url");
    const data = Buffer.from(dataB64, "base64url");
    const decipher = crypto.createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(data), decipher.final()]);
    return JSON.parse(plaintext.toString("utf-8")) as T;
  } catch (err) {
    console.error("[crypto] gagal dekripsi data, pakai fallback:", err);
    return fallback;
  }
}
