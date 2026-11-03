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

/**
 * Bentuk slug yang PASTI buatan Depup: "<awalan>-<5 karakter acak>" (alfabet tanpa i, l, o, 0, 1).
 * Dipakai untuk mengenali link tunnel dari path/Referer tanpa salah tangkap halaman lain.
 */
export const TUNNEL_SLUG_STRICT_RE = /^[a-z0-9][a-z0-9-]{0,56}-[a-hj-km-np-z2-9]{5}$/;

export function isTunnelSlug(s: string): boolean {
  return SLUG_RE.test(s) && TUNNEL_SLUG_STRICT_RE.test(s);
}

/**
 * Host khusus tunnel mode path, mis. "t.depup.web.id" (opsional, env TUNNEL_PATH_HOST).
 * Link menjadi https://t.depup.web.id/<slug>/ — cukup SATU record DNS (tanpa wildcard), dan
 * karena domainnya terpisah dari dashboard, kode milik pengunjung tidak berjalan di origin Depup.
 */
export function tunnelPathHost(): string | null {
  const raw = (process.env.TUNNEL_PATH_HOST ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");
  return raw || null;
}

/** Host sama persis (port ikut dibandingkan bila salah satunya menyebut port). */
export function sameHost(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const x = a.toLowerCase();
  const y = b.toLowerCase();
  if (x === y) return true;
  return x.replace(/:\d+$/, "") === y.replace(/:\d+$/, "") && (!/:\d+$/.test(x) || !/:\d+$/.test(y));
}

/**
 * Slug tunnel asal sebuah request, dibaca dari header Referer — inilah yang membuat link mode path
 * bekerja seperti ngrok: halaman yang dibagikan biasanya memakai URL absolut ("/style.css",
 * "/_next/...", fetch("/api/..."), <a href="/about">), yang tanpa ini jatuh ke route Depup sendiri
 * (404 atau "Sesi login habis"). Hanya Referer dari host yang sama yang dipercaya.
 *   - host utama:       https://depup.cloud/t/<slug>/...
 *   - TUNNEL_PATH_HOST: https://t.depup.web.id/<slug>/...
 */
export function slugFromReferer(referer: string | null, host: string | null, pathHostMode: boolean): string | null {
  if (!referer || !host) return null;
  let u: URL;
  try {
    u = new URL(referer);
  } catch {
    return null;
  }
  if (!sameHost(u.host, host)) return null;
  const m = pathHostMode ? /^\/([^/?#]+)(?:\/|$)/.exec(u.pathname) : /^\/t\/([^/?#]+)(?:\/|$)/.exec(u.pathname);
  return m && isTunnelSlug(m[1]) ? m[1] : null;
}
