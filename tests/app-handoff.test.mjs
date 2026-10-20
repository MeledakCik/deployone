// Jalankan: AUTH_SECRET=... node --experimental-strip-types --test tests/app-handoff.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import {
  signHandoff, verifyHandoff, challengeFromVerifier, isValidChallenge, isValidVerifier,
  appDeepLink, appReturnHtml, HANDOFF_TTL_SECONDS,
} from "../app/api/_lib/app-handoff.ts";
import { verifySession, signSession } from "../app/api/_lib/session.ts";

process.env.AUTH_SECRET = process.env.AUTH_SECRET || "test-secret-test-secret-123456";

const user = { email: "a@b.com", name: "A", picture: null };
// Salinan algoritma klien (lib/native-auth.ts makePkce) memakai WebCrypto, untuk memastikan cocok dengan server.
function b64url(bytes) { let s = ""; bytes.forEach((b) => (s += String.fromCharCode(b))); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
async function clientPkce() {
  const verifier = b64url(webcrypto.getRandomValues(new Uint8Array(32)));
  const d = await webcrypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return { verifier, challenge: b64url(new Uint8Array(d)) };
}

test("PKCE klien (WebCrypto) cocok dengan server dan lolos validasi format", async () => {
  const { verifier, challenge } = await clientPkce();
  assert.equal(verifier.length, 43);
  assert.ok(isValidVerifier(verifier));
  assert.ok(isValidChallenge(challenge));
  assert.equal(challengeFromVerifier(verifier), challenge);
});

test("alur normal: token + verifier benar -> payload", async () => {
  const { verifier, challenge } = await clientPkce();
  const p = verifyHandoff(signHandoff(user, challenge), verifier);
  assert.equal(p?.email, "a@b.com");
});

test("verifier salah (app lain yang mencegat deep link) ditolak", async () => {
  const a = await clientPkce();
  const b = await clientPkce();
  assert.equal(verifyHandoff(signHandoff(user, a.challenge), b.verifier), null);
});

test("token kedaluwarsa ditolak", async () => {
  const { verifier, challenge } = await clientPkce();
  const t = signHandoff(user, challenge, 1_000);
  assert.ok(verifyHandoff(t, verifier, 1_000 + HANDOFF_TTL_SECONDS - 1));
  assert.equal(verifyHandoff(t, verifier, 1_000 + HANDOFF_TTL_SECONDS + 1), null);
});

test("token dimodifikasi (ganti email) ditolak", async () => {
  const { verifier, challenge } = await clientPkce();
  const [body, sig] = signHandoff(user, challenge).split(".");
  const evil = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(body, "base64url")), email: "admin@x.com" })).toString("base64url");
  assert.equal(verifyHandoff(`${evil}.${sig}`, verifier), null);
});

test("token serah-terima TIDAK bisa dipakai sebagai cookie session", async () => {
  const { challenge } = await clientPkce();
  assert.equal(verifySession(signHandoff(user, challenge)), null);
});

test("cookie session TIDAK bisa dipakai sebagai token serah-terima", async () => {
  const { verifier } = await clientPkce();
  const session = signSession({ ...user, exp: Math.floor(Date.now() / 1000) + 600 });
  assert.equal(verifyHandoff(session, verifier), null);
});

test("input sampah tidak melempar error", () => {
  for (const v of [undefined, null, "", "abc", "a.b", 123, {}]) assert.equal(verifyHandoff(v, "x".repeat(43)), null);
  assert.equal(isValidChallenge("pendek"), false);
  assert.equal(isValidVerifier("a b".repeat(20)), false);
});

test("halaman perantara: deep link di-escape (tidak bisa XSS)", () => {
  const link = appDeepLink({ error: `"></script><script>alert(1)</script>` });
  const html = appReturnHtml(link, true);
  assert.ok(!html.includes("<script>alert(1)"));
  assert.ok(html.includes("depup://auth"));
});
