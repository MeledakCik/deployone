// Uji ujung-ke-ujung konektor MCP (OAuth + tools) dengan KV tiruan di memori — tanpa Redis/Supabase/jaringan.
// Jalankan dari root project:
//   node --experimental-strip-types --import ./tests/mcp-e2e/register.mjs --test tests/mcp-e2e/mcp.e2e.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";

process.env.AUTH_SECRET = "test-secret-test-secret-123456";
process.env.TUNNEL_BASE_DOMAIN = "depup.web.id";
process.env.NEXT_PUBLIC_SITE_URL = "https://depup.cloud";

const R = new URL("../../app", import.meta.url).pathname;
const { NextRequest } = await import("next/server");
const { kv } = await import("@vercel/kv");
const reg = await import(`${R}/api/mcp/oauth/register/route.ts`);
const tok = await import(`${R}/api/mcp/oauth/token/route.ts`);
const conn = await import(`${R}/api/mcp/connect/route.ts`);
const mcp = await import(`${R}/api/mcp/route.ts`);
const prm = await import(`${R}/.well-known/oauth-protected-resource/route.ts`);
const asm = await import(`${R}/.well-known/oauth-authorization-server/route.ts`);
const { signSession } = await import(`${R}/api/_lib/session.ts`);

const HOST = "depup.cloud";
const CB = "https://claude.ai/api/mcp/auth_callback";
const sessionCookie = (email) => `depup_session=${signSession({ email, name: "T", picture: null, exp: Math.floor(Date.now() / 1000) + 600 })}`;
const req = (path, init = {}) => new NextRequest(`https://${HOST}${path}`, { ...init, headers: { host: HOST, ...(init.headers || {}) } });
const json = (path, body, headers = {}, method = "POST") => req(path, { method, body: JSON.stringify(body), headers: { "content-type": "application/json", ...headers } });
const form = (path, obj) => req(path, { method: "POST", body: new URLSearchParams(obj).toString(), headers: { "content-type": "application/x-www-form-urlencoded" } });
const b64url = (b) => Buffer.from(b).toString("base64url");

async function connect(email = "user@example.com") {
  const r = await reg.POST(json("/api/mcp/oauth/register", { client_name: "Claude", redirect_uris: [CB], token_endpoint_auth_method: "none" }));
  assert.equal(r.status, 201);
  const { client_id } = await r.json();
  const verifier = b64url(randomBytes(32));
  const challenge = b64url(createHash("sha256").update(verifier).digest());
  const params = { client_id, redirect_uri: CB, response_type: "code", code_challenge: challenge, code_challenge_method: "S256", state: "st-1", resource: "https://depup.cloud/api/mcp" };
  const ck = { cookie: sessionCookie(email) };
  const prev = await conn.POST(json("/api/mcp/connect", { action: "preview", params }, ck));
  assert.equal(prev.status, 200);
  const pv = (await prev.json()).data;
  assert.equal(pv.clientName, "Claude");
  assert.equal(pv.redirectHost, "claude.ai");
  const ap = await conn.POST(json("/api/mcp/connect", { action: "approve", params }, ck));
  const { redirectTo } = (await ap.json()).data;
  const u = new URL(redirectTo);
  assert.equal(u.origin + u.pathname, CB);
  assert.equal(u.searchParams.get("state"), "st-1");
  assert.equal(u.searchParams.get("iss"), "https://depup.cloud");
  const code = u.searchParams.get("code");
  const tr = await tok.POST(form("/api/mcp/oauth/token", { grant_type: "authorization_code", code, redirect_uri: CB, code_verifier: verifier, client_id, resource: "https://depup.cloud/api/mcp" }));
  assert.equal(tr.status, 200);
  const t = await tr.json();
  return { client_id, verifier, code, t, ck };
}

const rpc = (at, method, params, id = 1) => mcp.POST(json("/api/mcp", { jsonrpc: "2.0", id, method, params }, at ? { authorization: `Bearer ${at}` } : {}));
const call = async (at, name, args) => (await (await rpc(at, "tools/call", { name, arguments: args })).json()).result;

test("metadata OAuth benar", async () => {
  const p = await (await prm.GET(req("/.well-known/oauth-protected-resource/api/mcp"))).json();
  assert.equal(p.resource, "https://depup.cloud/api/mcp");
  assert.deepEqual(p.authorization_servers, ["https://depup.cloud"]);
  const a = await (await asm.GET(req("/.well-known/oauth-authorization-server"))).json();
  assert.equal(a.authorization_endpoint, "https://depup.cloud/connect/authorize");
  assert.deepEqual(a.code_challenge_methods_supported, ["S256"]);
});

test("tanpa token -> 401 dengan WWW-Authenticate menunjuk metadata", async () => {
  const r = await rpc(null, "initialize", {});
  assert.equal(r.status, 401);
  assert.match(r.headers.get("www-authenticate"), /resource_metadata="https:\/\/depup\.cloud\/\.well-known\/oauth-protected-resource\/api\/mcp"/);
  const bad = await rpc("sampah", "initialize", {});
  assert.equal(bad.status, 401);
  assert.match(bad.headers.get("www-authenticate"), /invalid_token/);
});

test("registrasi menolak redirect_uri asing", async () => {
  const r = await reg.POST(json("/api/mcp/oauth/register", { client_name: "x", redirect_uris: ["https://evil.example/cb"] }));
  assert.equal(r.status, 400);
  assert.equal((await r.json()).error, "invalid_redirect_uri");
});

test("izin tanpa login -> 401 (layar izin menampilkan tombol login)", async () => {
  const r = await conn.POST(json("/api/mcp/connect", { action: "preview", params: {} }));
  assert.equal(r.status, 401);
});

test("alur penuh: initialize, tools/list, deploy, list, delete", async () => {
  const { t } = await connect();
  const init = await (await rpc(t.access_token, "initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "claude", version: "1" } })).json();
  assert.equal(init.result.protocolVersion, "2025-06-18");
  assert.equal(init.result.serverInfo.name, "depup");

  const note = await mcp.POST(json("/api/mcp", { jsonrpc: "2.0", method: "notifications/initialized" }, { authorization: `Bearer ${t.access_token}` }));
  assert.equal(note.status, 202);

  const list = await (await rpc(t.access_token, "tools/list", {})).json();
  assert.deepEqual(list.result.tools.map((x) => x.name), ["deploy_website", "list_websites", "delete_website", "connector_status", "deploy_project"]);
  for (const x of list.result.tools) assert.ok(x.annotations && x.inputSchema.type === "object");

  const html = "<!doctype html><title>Warung</title><link rel=stylesheet href=css/s.css><h1>Kopi</h1>";
  const d = await call(t.access_token, "deploy_website", { name: "Warung Kopi", ttl_hours: 6, files: [{ path: "index.html", content: html }, { path: "./css/s.css", content: "h1{color:red}" }, { path: "img/p.png", content: Buffer.from("PNGDATA").toString("base64"), encoding: "base64" }] });
  assert.ok(!d.isError, JSON.stringify(d));
  assert.match(d.structuredContent.url, /^https:\/\/warung-kopi-[a-z0-9]{5}\.depup\.web\.id\/$/);
  const id = d.structuredContent.id;

  // meta & isi tersimpan persis seperti jalur dashboard
  const { loadSite, readSiteFile } = await import(`${R}/api/_lib/sites.ts`);
  const meta = await loadSite(id);
  assert.equal(meta.status, "active");
  assert.equal(meta.owner, "user@example.com");
  assert.deepEqual(meta.files.map((f) => f.p), ["index.html", "css/s.css", "img/p.png"]);
  assert.equal((await readSiteFile(meta, meta.files[0])).toString(), html);
  assert.equal((await readSiteFile(meta, meta.files[2])).toString(), "PNGDATA");
  assert.equal(meta.files[0].t, "text/html; charset=utf-8");
  assert.ok(Math.abs(meta.expiresAt - Date.now() - 6 * 3600 * 1000) < 5000);

  const l = await call(t.access_token, "list_websites", {});
  assert.equal(l.structuredContent.sites.length, 1);
  assert.equal(l.structuredContent.sites[0].id, id);

  // replace: kuota tidak bertambah, versi lama terhapus
  const r2 = await call(t.access_token, "deploy_website", { files: [{ path: "index.html", content: "<h1>v2</h1>" }], replace_site_id: id });
  assert.ok(!r2.isError, JSON.stringify(r2));
  assert.equal(r2.structuredContent.replaced, id);
  assert.equal(await loadSite(id), null);
  const l2 = await call(t.access_token, "list_websites", {});
  assert.equal(l2.structuredContent.sites.length, 1);

  const del = await call(t.access_token, "delete_website", { site_id: r2.structuredContent.id });
  assert.ok(!del.isError);
  assert.equal((await call(t.access_token, "list_websites", {})).structuredContent.sites.length, 0);
});

test("validasi file: pesan error jelas & tidak memakan kuota", async () => {
  const { t } = await connect("val@example.com");
  const run = (files, extra = {}) => call(t.access_token, "deploy_website", { files, ...extra });
  assert.match((await run([])).content[0].text, /kosong/);
  assert.match((await run([{ path: "about.html", content: "x" }])).content[0].text, /index\.html/);
  assert.match((await run([{ path: "site/index.html", content: "x" }])).content[0].text, /hapus awalan folder/);
  assert.match((await run([{ path: "../index.html", content: "x" }])).content[0].text, /tidak valid/);
  assert.match((await run([{ path: "index.html", content: "a" }, { path: "index.html", content: "b" }])).content[0].text, /ganda/);
  assert.match((await run([{ path: "index.html", content: "!!", encoding: "base64" }])).content[0].text, /base64/);
  assert.match((await run([{ path: "index.html", content: "x" }], { replace_site_id: "tidak-ada" })).content[0].text, /tidak ditemukan/);
  const big = await run([{ path: "index.html", content: "a".repeat(3 * 1024 * 1024 + 1) }]);
  assert.match(big.content[0].text, /Ukuran total melebihi/);
  assert.equal((await call(t.access_token, "list_websites", {})).structuredContent.sites.length, 0);
});

test("kuota per akun ditegakkan (default 3)", async () => {
  const { t } = await connect("quota@example.com");
  const ok = [];
  for (let i = 0; i < 3; i++) { const r = await call(t.access_token, "deploy_website", { files: [{ path: "index.html", content: String(i) }] }); assert.ok(!r.isError); ok.push(r.structuredContent.id); }
  const over = await call(t.access_token, "deploy_website", { files: [{ path: "index.html", content: "4" }] });
  assert.ok(over.isError);
  assert.match(over.content[0].text, /maksimal 3/);
});

test("isolasi antar-user: tidak bisa hapus/ganti situs orang lain", async () => {
  const a = (await connect("a@example.com")).t.access_token;
  const b = (await connect("b@example.com")).t.access_token;
  const site = (await call(a, "deploy_website", { files: [{ path: "index.html", content: "A" }] })).structuredContent.id;
  assert.ok((await call(b, "delete_website", { site_id: site })).isError);
  assert.ok((await call(b, "deploy_website", { files: [{ path: "index.html", content: "B" }], replace_site_id: site })).isError);
  assert.equal((await call(b, "list_websites", {})).structuredContent.sites.length, 0);
  assert.equal((await call(a, "list_websites", {})).structuredContent.sites.length, 1);
});

test("kode otorisasi sekali pakai, PKCE salah ditolak, client lain ditolak", async () => {
  const r = await reg.POST(json("/api/mcp/oauth/register", { client_name: "C", redirect_uris: [CB] }));
  const { client_id } = await r.json();
  const verifier = b64url(randomBytes(32));
  const challenge = b64url(createHash("sha256").update(verifier).digest());
  const params = { client_id, redirect_uri: CB, response_type: "code", code_challenge: challenge, code_challenge_method: "S256" };
  const ap = await conn.POST(json("/api/mcp/connect", { action: "approve", params }, { cookie: sessionCookie("c@example.com") }));
  const code = new URL((await ap.json()).data.redirectTo).searchParams.get("code");
  const base = { grant_type: "authorization_code", code, redirect_uri: CB, client_id };

  const wrong = await tok.POST(form("/api/mcp/oauth/token", { ...base, code_verifier: b64url(randomBytes(32)) }));
  assert.equal(wrong.status, 400);
  assert.equal((await wrong.json()).error, "invalid_grant");

  const other = (await (await reg.POST(json("/api/mcp/oauth/register", { client_name: "Lain", redirect_uris: [CB] }))).json()).client_id;
  const cross = await tok.POST(form("/api/mcp/oauth/token", { ...base, client_id: other, code_verifier: verifier }));
  assert.equal(cross.status, 400);

  const badRedirect = await tok.POST(form("/api/mcp/oauth/token", { ...base, redirect_uri: "https://claude.ai/lain", code_verifier: verifier }));
  assert.equal(badRedirect.status, 400);

  const good = await tok.POST(form("/api/mcp/oauth/token", { ...base, code_verifier: verifier }));
  assert.equal(good.status, 200);
  const replay = await tok.POST(form("/api/mcp/oauth/token", { ...base, code_verifier: verifier }));
  assert.equal(replay.status, 400);
  assert.match((await replay.json()).error_description, /sudah dipakai/);
});

test("refresh token menerbitkan token baru; cabut akses mematikan semuanya", async () => {
  const { t, client_id } = await connect("rev@example.com");
  const rf = await tok.POST(form("/api/mcp/oauth/token", { grant_type: "refresh_token", refresh_token: t.refresh_token, client_id }));
  assert.equal(rf.status, 200);
  const t2 = await rf.json();
  assert.equal((await rpc(t2.access_token, "ping", {})).status, 200);

  const revoke = await conn.POST(json("/api/mcp/connect", { action: "revoke" }, { cookie: sessionCookie("rev@example.com") }));
  assert.equal(revoke.status, 200);

  assert.equal((await rpc(t.access_token, "ping", {})).status, 401);
  assert.equal((await rpc(t2.access_token, "ping", {})).status, 401);
  const dead = await tok.POST(form("/api/mcp/oauth/token", { grant_type: "refresh_token", refresh_token: t2.refresh_token, client_id }));
  assert.equal(dead.status, 400);
  // konektor bisa dihubungkan ulang
  const again = await connect("rev@example.com");
  assert.equal((await rpc(again.t.access_token, "ping", {})).status, 200);
});

test("refresh token dari client lain & access token sebagai refresh ditolak", async () => {
  const { t } = await connect("x@example.com");
  const other = (await (await reg.POST(json("/api/mcp/oauth/register", { client_name: "Lain", redirect_uris: [CB] }))).json()).client_id;
  assert.equal((await tok.POST(form("/api/mcp/oauth/token", { grant_type: "refresh_token", refresh_token: t.refresh_token, client_id: other }))).status, 400);
  assert.equal((await tok.POST(form("/api/mcp/oauth/token", { grant_type: "refresh_token", refresh_token: t.access_token, client_id: other }))).status, 400);
});

test("persetujuan menolak parameter berbahaya", async () => {
  const ck = { cookie: sessionCookie("p@example.com") };
  const { client_id } = await (await reg.POST(json("/api/mcp/oauth/register", { client_name: "C", redirect_uris: [CB] }))).json();
  const challenge = b64url(createHash("sha256").update("x".repeat(43)).digest());
  const ok = { client_id, redirect_uri: CB, response_type: "code", code_challenge: challenge, code_challenge_method: "S256" };
  const post = (params) => conn.POST(json("/api/mcp/connect", { action: "approve", params }, ck));
  assert.equal((await post({ ...ok, redirect_uri: "https://evil.example/cb" })).status, 400);
  assert.equal((await post({ ...ok, code_challenge_method: "plain" })).status, 400);
  assert.equal((await post({ ...ok, code_challenge: "pendek" })).status, 400);
  assert.equal((await post({ ...ok, response_type: "token" })).status, 400);
  assert.equal((await post({ ...ok, client_id: "palsu" })).status, 400);
  assert.equal((await post({ ...ok, resource: "https://lain.example/mcp" })).status, 400);
  assert.equal((await post(ok)).status, 200);
  const deny = await conn.POST(json("/api/mcp/connect", { action: "deny", params: { ...ok, state: "s" } }, ck));
  assert.match((await deny.json()).data.redirectTo, /error=access_denied.*state=s|state=s.*error=access_denied/);
});

test("JSON-RPC: method asing, tool asing, JSON rusak, batch, GET", async () => {
  const { t } = await connect("rpc@example.com");
  assert.equal((await (await rpc(t.access_token, "resources/list", {})).json()).error.code, -32601);
  assert.equal((await (await rpc(t.access_token, "tools/call", { name: "nope", arguments: {} })).json()).error.code, -32602);
  const broken = await mcp.POST(req("/api/mcp", { method: "POST", body: "{bukan json", headers: { authorization: `Bearer ${t.access_token}`, "content-type": "application/json" } }));
  assert.equal(broken.status, 400);
  const batch = await mcp.POST(json("/api/mcp", [{ jsonrpc: "2.0", id: 1, method: "ping" }, { jsonrpc: "2.0", method: "notifications/initialized" }, { jsonrpc: "2.0", id: 2, method: "tools/list" }], { authorization: `Bearer ${t.access_token}` }));
  const out = await batch.json();
  assert.equal(out.length, 2);
  assert.equal(mcp.GET().status, 405);
  // protokol tak dikenal -> server menawarkan versi terbaru
  const init = await (await rpc(t.access_token, "initialize", { protocolVersion: "1999-01-01" })).json();
  assert.equal(init.result.protocolVersion, "2025-06-18");
});

test("Origin: tanpa Origin / Claude / loopback diizinkan, selain itu 403 (syarat direktori Claude)", async () => {
  const { t } = await connect("origin@example.com");
  const at = { authorization: `Bearer ${t.access_token}` };
  const ping = (origin) => mcp.POST(json("/api/mcp", { jsonrpc: "2.0", id: 1, method: "ping" }, origin === undefined ? at : { ...at, origin }));
  assert.equal((await ping(undefined)).status, 200); // server Claude tidak mengirim Origin
  assert.equal((await ping("https://claude.ai")).status, 200);
  assert.equal((await ping("https://claude.com")).status, 200);
  assert.equal((await ping("http://localhost:6274")).status, 200); // MCP Inspector
  for (const bad of ["https://evil.example", "https://claude.ai.evil.example", "http://claude.ai", "null", "bukan-url"]) {
    const r = await ping(bad);
    assert.equal(r.status, 403, `Origin ${bad} harus ditolak`);
    assert.equal((await r.json()).error, "forbidden_origin");
  }
});

test("Setiap tool punya title, annotations, nama <=64 karakter (gerbang portal direktori)", async () => {
  const { t } = await connect("tools@example.com");
  const { tools } = (await (await rpc(t.access_token, "tools/list", {})).json()).result;
  assert.ok(tools.length >= 1);
  for (const tool of tools) {
    assert.ok(tool.name.length <= 64, tool.name);
    assert.ok(tool.title, `${tool.name} tanpa title`);
    const a = tool.annotations ?? {};
    assert.equal(typeof a.readOnlyHint === "boolean" || typeof a.destructiveHint === "boolean", true, `${tool.name} tanpa readOnlyHint/destructiveHint`);
    assert.ok(tool.description && tool.description.length > 30, `${tool.name} deskripsi terlalu pendek`);
  }
});
