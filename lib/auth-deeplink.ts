/**
 * Parser deep link balik dari login Google: depup://auth?token=... atau depup://auth?error=...
 *
 * SENGAJA tidak memakai `new URL(raw).hostname`: di Android System WebView versi lama,
 * URL dengan skema kustom (non-http) diparsing dengan hostname kosong, sehingga deep link
 * yang sah terbaca "bukan milik kita" dan diabaikan diam-diam. Parser string ini
 * tidak bergantung pada versi WebView. File ini tanpa import supaya bisa dites langsung dengan node.
 */
export interface AuthDeepLink {
  token?: string;
  error?: string;
}

export function parseAuthDeepLink(raw: string): AuthDeepLink | null {
  const m = /^depup:(?:\/\/)?auth\/?(?:\?([^#]*))?(?:#.*)?$/i.exec(String(raw).trim());
  if (!m) return null;
  const q = new URLSearchParams(m[1] ?? "");
  return { token: q.get("token") ?? undefined, error: q.get("error") ?? undefined };
}
