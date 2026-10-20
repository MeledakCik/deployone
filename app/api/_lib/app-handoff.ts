import crypto from "crypto";

/**
 * Serah-terima login Google untuk app mobile (Capacitor).
 *
 * Kenapa ada: Google memblokir OAuth di dalam WebView (error 403 disallowed_useragent),
 * jadi di app, login dibuka di Chrome Custom Tabs. Cookie browser itu TIDAK dibagi ke
 * WebView app, jadi hasil login dikirim balik lewat deep link `depup://auth?token=...`
 * lalu ditukar jadi cookie session di dalam WebView lewat POST /api/auth/app-exchange.
 *
 * Pengamanan:
 *  - PKCE: app membuat `verifier` acak yang tidak pernah keluar dari WebView; ke server
 *    hanya dikirim `challenge` = SHA-256(verifier). Token hanya bisa ditukar oleh pemegang
 *    verifier, jadi app lain yang ikut mendaftarkan skema `depup://` tidak bisa memakainya.
 *  - Kunci tanda tangan dipisah (domain separation) dari cookie session: token serah-terima
 *    TIDAK akan pernah lolos verifySession() kalau dipasang sebagai cookie.
 *  - Umur token sangat pendek (60 detik).
 *
 * File ini sengaja hanya bergantung pada `crypto` supaya bisa dites langsung dengan node.
 */

export const OAUTH_APP_COOKIE = "depup_oauth_app";
export const APP_SCHEME_URL = "depup://auth";
export const HANDOFF_TTL_SECONDS = 60;

const CHALLENGE_RE = /^[A-Za-z0-9_-]{43}$/; // base64url(SHA-256) tanpa padding = 43 karakter
const VERIFIER_RE = /^[A-Za-z0-9_-]{43,128}$/;

export interface HandoffPayload {
  email: string;
  name: string;
  picture: string | null;
  /** challenge PKCE (base64url SHA-256 dari verifier) */
  ch: string;
  /** unix seconds */
  exp: number;
  typ: "app-handoff";
}

function handoffKey(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("AUTH_SECRET belum diatur di server (minimal 16 karakter acak).");
  }
  return crypto.createHmac("sha256", secret).update("depup:app-handoff:v1").digest();
}

export function isValidChallenge(v: unknown): v is string {
  return typeof v === "string" && CHALLENGE_RE.test(v);
}

export function isValidVerifier(v: unknown): v is string {
  return typeof v === "string" && VERIFIER_RE.test(v);
}

export function challengeFromVerifier(verifier: string): string {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

export function signHandoff(
  user: { email: string; name: string; picture: string | null },
  challenge: string,
  now = Math.floor(Date.now() / 1000)
): string {
  const payload: HandoffPayload = {
    ...user,
    ch: challenge,
    exp: now + HANDOFF_TTL_SECONDS,
    typ: "app-handoff",
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", handoffKey()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

/** Mengembalikan payload kalau token valid, belum kedaluwarsa, dan verifier cocok dengan challenge. */
export function verifyHandoff(
  token: unknown,
  verifier: unknown,
  now = Math.floor(Date.now() / 1000)
): HandoffPayload | null {
  if (typeof token !== "string" || !isValidVerifier(verifier)) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  try {
    const expected = crypto.createHmac("sha256", handoffKey()).update(body).digest("base64url");
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf-8")) as HandoffPayload;
    if (payload.typ !== "app-handoff") return null;
    if (typeof payload.exp !== "number" || payload.exp < now) return null;
    if (typeof payload.email !== "string" || !payload.email) return null;

    const got = Buffer.from(challengeFromVerifier(verifier));
    const want = Buffer.from(String(payload.ch));
    if (got.length !== want.length || !crypto.timingSafeEqual(got, want)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function appDeepLink(params: { token?: string; error?: string }): string {
  const u = new URL(APP_SCHEME_URL);
  if (params.token) u.searchParams.set("token", params.token);
  if (params.error) u.searchParams.set("error", params.error.slice(0, 200));
  return u.toString();
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/**
 * Halaman perantara di Custom Tab. Chrome kadang memblokir redirect 302 ke skema kustom
 * tanpa gestur pengguna, jadi: coba otomatis + sediakan tombol (gestur pasti lolos).
 */
export function appReturnHtml(deepLink: string, failed: boolean): string {
  const href = esc(deepLink);
  const js = JSON.stringify(deepLink).replace(/</g, "\\u003c");
  return `<!doctype html><html lang="id"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>Kembali ke Depup</title>
<style>body{font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;padding:24px;text-align:center;background:#0f0d1a;color:#fff}
a{display:inline-block;margin-top:20px;padding:14px 28px;border-radius:12px;background:#7c3aed;color:#fff;text-decoration:none;font-weight:600}
p{opacity:.7;margin:8px 0 0}</style></head><body><main>
<h1>${failed ? "Login belum berhasil" : "Login berhasil"}</h1>
<p>${failed ? "Kembali ke aplikasi untuk melihat detailnya." : "Mengembalikan kamu ke aplikasi Depup…"}</p>
<a id="back" href="${href}">Buka aplikasi Depup</a>
</main><script>setTimeout(function(){location.href=${js}},150);</script></body></html>`;
}
