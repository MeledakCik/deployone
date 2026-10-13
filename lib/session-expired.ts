export const SESSION_EXPIRED_EVENT = "depup:session-expired";

/**
 * Dipanggil setiap kali client menerima body error dari /api/*.
 * Hanya kode `unauthorized` (session Depup habis) yang dianggap sesi habis —
 * 401 dengan kode lain (mis. `invalid_token` dari Vercel/GitHub) artinya
 * token platform user salah, dan sudah punya pesan sendiri.
 */
export function notifySessionExpired(body: { ok?: boolean; code?: string } | null): void {
  if (typeof window === "undefined") return;
  if (body && body.ok === false && body.code === "unauthorized") {
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  }
}
