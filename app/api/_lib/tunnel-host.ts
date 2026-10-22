/**
 * Helper host/slug untuk fitur "Link Gaib" (tunnel). SENGAJA tanpa import
 * node:* supaya aman dipakai di edge middleware.
 */

/** Subdomain yang tidak boleh dipakai sebagai slug tunnel (tetap milik Depup). */
export const TUNNEL_RESERVED = new Set([
  "www", "app", "api", "dashboard", "admin", "mail", "t", "static",
  "assets", "cdn", "docs", "status", "login", "auth",
]);

export const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/;

export function tunnelEnabled(): boolean {
  return process.env.TUNNEL_ENABLED !== "false";
}

/** Domain dasar tunnel, mis. "depup.cloud". null = mode path (/t/<slug>). */
export function tunnelBaseDomain(): string | null {
  const raw = (process.env.TUNNEL_BASE_DOMAIN ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^\*?\./, "")
    .replace(/[/:].*$/, "");
  return raw || null;
}

/**
 * "cantik-kopi-x7k2m.depup.cloud" -> "cantik-kopi-x7k2m".
 * Mengembalikan null untuk host biasa (apex, www, host Vercel, localhost).
 */
export function slugFromHost(hostHeader: string | null): string | null {
  const base = tunnelBaseDomain();
  if (!base || !hostHeader) return null;
  const host = hostHeader.toLowerCase().replace(/:\d+$/, "");
  if (!host.endsWith("." + base)) return null;
  const label = host.slice(0, -(base.length + 1));
  if (!label || label.includes(".")) return null;
  if (!SLUG_RE.test(label) || TUNNEL_RESERVED.has(label)) return null;
  return label;
}
