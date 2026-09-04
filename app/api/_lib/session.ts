import crypto from "crypto";

export interface SessionPayload {
  email: string;
  name: string;
  picture: string | null;
  /** unix seconds */
  exp: number;
}

/**
 * AUTH_SECRET must be set as a real environment variable (random string,
 * 32+ chars) on whatever deploys this — never hardcoded, never a fallback
 * default, so sessions can't be forged.
 */
function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "AUTH_SECRET belum di-set di server (env var, minimal 16 karakter acak). Login Google tidak bisa jalan tanpa ini."
    );
  }
  return secret;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

/** Signs a session payload into a compact `body.signature` cookie value. */
export function signSession(payload: SessionPayload): string {
  const body = base64url(JSON.stringify(payload));
  const sig = crypto.createHmac("sha256", getSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

/** Verifies and decodes a session cookie value. Returns null if missing/invalid/expired. */
export function verifySession(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  try {
    const expected = crypto.createHmac("sha256", getSecret()).update(body).digest("base64url");
    const sigBuf = Buffer.from(sig);
    const expectedBuf = Buffer.from(expected);
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return null;
    }
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf-8")) as SessionPayload;
    if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE = "depush_session";
export const OAUTH_STATE_COOKIE = "depush_oauth_state";
