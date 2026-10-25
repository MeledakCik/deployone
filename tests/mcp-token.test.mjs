// Jalankan: AUTH_SECRET=... node --experimental-strip-types --test tests/mcp-token.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";

process.env.AUTH_SECRET = process.env.AUTH_SECRET || "test-secret-test-secret-123456";
delete process.env.MCP_REDIRECT_HOSTS;
delete process.env.NEXT_PUBLIC_SITE_URL;
delete process.env.NEXT_PUBLIC_APP_URL;

const {
  signMcpToken, verifyMcpToken, signClient, verifyClient, clientFingerprint,
  isAllowedRedirectUri, challengeFromVerifier, verifyPkce, CHALLENGE_RE,
  signCode, verifyCode, signAccessToken, verifyAccessToken, signRefreshToken, verifyRefreshToken,
  isMcpAuthorizeNext, appOrigin, mcpResourceUrl,
} = await import("../app/api/_lib/mcp-token.ts");
const { signSession, verifySession } = await import("../app/api/_lib/session.ts");

const b64url = (b) => Buffer.from(b).toString("base64url");
const pkce = () => {
  const verifier = b64url(randomBytes(32));
  return { verifier, challenge: b64url(createHash("sha256").update(verifier).digest()) };
};

test("PKCE S256: verifier benar lolos, salah ditolak, format challenge valid", () => {
  const { verifier, challenge } = pkce();
  assert.ok(CHALLENGE_RE.test(challenge));
  assert.equal(challengeFromVerifier(verifier), challenge);
  assert.ok(verifyPkce(verifier, challenge));
  assert.ok(!verifyPkce(pkce().verifier, challenge));
  assert.ok(!verifyPkce("pendek", challenge));
  assert.ok(!verifyPkce(undefined, challenge));
});

test("client_id: bolak-balik utuh, dipalsukan ditolak", () => {
  const id = signClient("Claude", ["https://claude.ai/api/mcp/auth_callback"]);
  assert.deepEqual(verifyClient(id), { n: "Claude", u: ["https://claude.ai/api/mcp/auth_callback"] });
  const [body, sig] = id.split(".");
  const evil = b64url(JSON.stringify({ typ: "client", n: "Claude", u: ["https://evil.example/cb"] }));
  assert.equal(verifyClient(`${evil}.${sig}`), null);
  assert.equal(verifyClient(`${body}.${sig}x`), null);
  assert.equal(verifyClient("sampah"), null);
  assert.equal(verifyClient(undefined), null);
});

test("redirect_uri: hanya host Claude (https) dan loopback (http)", () => {
  assert.ok(isAllowedRedirectUri("https://claude.ai/api/mcp/auth_callback"));
  assert.ok(isAllowedRedirectUri("https://claude.com/api/mcp/auth_callback"));
  assert.ok(isAllowedRedirectUri("http://localhost:6274/oauth/callback"));
  assert.ok(isAllowedRedirectUri("http://127.0.0.1:3000/cb"));
  assert.ok(!isAllowedRedirectUri("https://evil.example/cb"));
  assert.ok(!isAllowedRedirectUri("https://claude.ai.evil.example/cb"));
  assert.ok(!isAllowedRedirectUri("https://evil.example/?x=https://claude.ai/"));
  assert.ok(!isAllowedRedirectUri("http://claude.ai/cb"));
  assert.ok(!isAllowedRedirectUri("https://user:pw@claude.ai/cb"));
  assert.ok(!isAllowedRedirectUri("https://claude.ai/cb#frag"));
  assert.ok(!isAllowedRedirectUri("javascript:alert(1)"));
  assert.ok(!isAllowedRedirectUri(undefined));
  process.env.MCP_REDIRECT_HOSTS = "app.example.org, Other.Example.org";
  assert.ok(isAllowedRedirectUri("https://app.example.org/cb"));
  assert.ok(isAllowedRedirectUri("https://other.example.org/cb"));
  delete process.env.MCP_REDIRECT_HOSTS;
  assert.ok(!isAllowedRedirectUri("https://app.example.org/cb"));
});

test("authorization code: bawa data, kedaluwarsa ditolak, jenis token tidak bisa ditukar", () => {
  const { challenge } = pkce();
  const { token, jti } = signCode({ email: "a@b.com", cid: clientFingerprint("x"), ruri: "https://claude.ai/cb", cc: challenge, ep: 3 });
  const c = verifyCode(token);
  assert.equal(c?.email, "a@b.com");
  assert.equal(c?.jti, jti);
  assert.equal(c?.ep, 3);
  // kedaluwarsa
  const old = signMcpToken("code", { jti: "j", email: "a@b.com", cid: "c", ruri: "r", cc: challenge, ep: 0, exp: 1 });
  assert.equal(verifyCode(old), null);
  // peran tidak bisa ditukar: code bukan access token
  assert.equal(verifyAccessToken(token), null);
  assert.equal(verifyRefreshToken(token), null);
  const at = signAccessToken("a@b.com", "cid", 0);
  assert.equal(verifyCode(at), null);
  assert.equal(verifyRefreshToken(at), null);
  assert.equal(verifyAccessToken(signRefreshToken("a@b.com", "cid", 0)), null);
});

test("access token: epoch & email terbawa; tanda tangan diganti ditolak", () => {
  const at = signAccessToken("a@b.com", "cid", 7);
  const g = verifyAccessToken(at);
  assert.equal(g?.email, "a@b.com");
  assert.equal(g?.ep, 7);
  const [body] = at.split(".");
  assert.equal(verifyAccessToken(`${body}.AAAA`), null);
  const payload = JSON.parse(Buffer.from(body, "base64url").toString());
  const forged = b64url(JSON.stringify({ ...payload, email: "victim@x.com" }));
  assert.equal(verifyAccessToken(`${forged}.${at.split(".")[1]}`), null);
});

test("domain separation: session cookie bukan token MCP, dan sebaliknya", () => {
  const session = signSession({ email: "a@b.com", name: "A", picture: null, exp: Math.floor(Date.now() / 1000) + 600 });
  assert.equal(verifyAccessToken(session), null);
  assert.equal(verifyMcpToken("at", session), null);
  const at = signAccessToken("a@b.com", "cid", 0);
  assert.equal(verifySession(at), null);
});

test("next login: hanya /connect/authorize?... (anti open redirect)", () => {
  assert.ok(isMcpAuthorizeNext("/connect/authorize?client_id=abc.def&redirect_uri=https%3A%2F%2Fclaude.ai%2Fcb&state=x_y-1"));
  assert.ok(!isMcpAuthorizeNext("//evil.example/connect/authorize?x=1"));
  assert.ok(!isMcpAuthorizeNext("https://evil.example/connect/authorize?x=1"));
  assert.ok(!isMcpAuthorizeNext("/connect/authorize"));
  assert.ok(!isMcpAuthorizeNext("/connect/authorize?x=1\r\nSet-Cookie: a=b"));
  assert.ok(!isMcpAuthorizeNext("/connect/authorize?<script>"));
  assert.ok(!isMcpAuthorizeNext("/admin"));
  assert.ok(!isMcpAuthorizeNext(null));
  assert.ok(!isMcpAuthorizeNext("/connect/authorize?" + "a".repeat(2000)));
});

test("origin kanonik: env > localhost > depup.cloud (Host asing tidak dipercaya)", () => {
  assert.equal(appOrigin("evil.example"), "https://depup.cloud");
  assert.equal(appOrigin("localhost:3000"), "http://localhost:3000");
  assert.equal(mcpResourceUrl("https://depup.cloud"), "https://depup.cloud/api/mcp");
  process.env.NEXT_PUBLIC_SITE_URL = "https://depup.example/";
  assert.equal(appOrigin("evil.example"), "https://depup.example");
  delete process.env.NEXT_PUBLIC_SITE_URL;
});
