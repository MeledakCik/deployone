import { SLUG_RE, slugFromHost } from "@/app/api/_lib/tunnel-host";

/** Ambil slug dari input pelapor: slug polos, URL subdomain, atau URL mode path (/t/<slug>). */
export function parseAbuseTarget(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const s = input.trim().slice(0, 300);
  if (!s) return null;
  const lower = s.toLowerCase();
  if (SLUG_RE.test(lower)) return lower;
  let u: URL;
  try {
    u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
  } catch {
    return null;
  }
  const fromHost = slugFromHost(u.host);
  if (fromHost) return fromHost;
  const m = /^\/t\/([^/]+)/.exec(u.pathname);
  if (m && SLUG_RE.test(m[1].toLowerCase())) return m[1].toLowerCase();
  return null;
}

/** Buang karakter kontrol & batasi panjang. */
export function cleanText(v: unknown, max: number): string {
  // eslint-disable-next-line no-control-regex
  return typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max) : "";
}
