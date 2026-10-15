/**
 * Daftar admin. SENGAJA tanpa import node:* supaya aman dipakai di edge middleware.
 *
 * Panel /admin hanya untuk depupdev@gmail.com. Email lain bisa ditambahkan lewat env
 * ADMIN_EMAILS (pisahkan dengan koma), tapi alamat utama ini selalu admin.
 */
export const DEFAULT_ADMIN_EMAIL = "depupdev@gmail.com";

export function adminEmails(): string[] {
  const extra = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return Array.from(new Set([DEFAULT_ADMIN_EMAIL, ...extra]));
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails().includes(email.trim().toLowerCase());
}
