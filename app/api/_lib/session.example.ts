/**
 * CONTOH TAMBAHAN untuk app/api/_lib/session.ts kamu yang sudah ada.
 * File ini BUKAN pengganti session.ts asli — cuma referensi helper
 * yang dipanggil dari app/api/user-data/route.ts.
 *
 * Copy fungsi getSessionEmail di bawah ke session.ts asli kamu,
 * sesuaikan dengan implementasi getSession/verifySessionCookie
 * yang sudah ada (HMAC verify dsb).
 */

import { NextRequest } from "next/server";

// Asumsi: fungsi ini sudah ada di session.ts kamu dan melakukan
// verifikasi HMAC terhadap cookie "depush_session", lalu mengembalikan
// payload session atau null kalau invalid/expired.
declare function getSession(req: NextRequest): { email: string } | null;

/**
 * Helper: ambil email dari session, sudah dinormalisasi (lowercase+trim)
 * supaya selalu konsisten dengan key yang dipakai di store.ts.
 * Return null kalau tidak ada session valid.
 */
export function getSessionEmail(req: NextRequest): string | null {
  const session = getSession(req);
  if (!session?.email) return null;
  return session.email.trim().toLowerCase();
}
