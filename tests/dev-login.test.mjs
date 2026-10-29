import { isDevAutoLogin, devUser } from "../app/api/_lib/dev-login.ts";
const mk = (headers = {}, method = "GET") => ({ method, headers: new Headers(headers) });
const base = { host: "localhost:3000" };
let fail = 0;
function t(name, got, want) { const ok = got === want; if (!ok) fail++; console.log((ok ? "PASS" : "FAIL"), name, "->", got); }
const origWarn = console.warn; console.warn = () => {};

process.env.NODE_ENV = "development"; process.env.DEV_AUTO_LOGIN = "true";
t("localhost normal", isDevAutoLogin(mk(base)), true);
t("127.0.0.1", isDevAutoLogin(mk({ host: "127.0.0.1:3000" })), true);
t("[::1]", isDevAutoLogin(mk({ host: "[::1]:3000" })), true);
t("navigasi ketik URL (sec-fetch-site none)", isDevAutoLogin(mk({ ...base, "sec-fetch-site": "none" })), true);
t("same-origin", isDevAutoLogin(mk({ ...base, "sec-fetch-site": "same-origin", origin: "http://localhost:3000" })), true);
t("host LAN", isDevAutoLogin(mk({ host: "192.168.1.5:3000" })), false);
t("host domain", isDevAutoLogin(mk({ host: "evil.com" })), false);
t("host localhost.evil.com", isDevAutoLogin(mk({ host: "localhost.evil.com" })), false);
t("host localhost:3000@evil", isDevAutoLogin(mk({ host: "localhost:3000@evil.com" })), false);
t("port 99999", isDevAutoLogin(mk({ host: "localhost:99999" })), false);
t("port 6 digit", isDevAutoLogin(mk({ host: "localhost:123456" })), false);
t("host kosong", isDevAutoLogin(mk({})), false);
t("host berisi newline/spasi", isDevAutoLogin(mk({ host: "localhost:3000 \t" })), true); // Headers trim whitespace
t("host kebesaran 5000 char", isDevAutoLogin(mk({ host: "localhost:" + "1".repeat(5000) })), false);
t("xff publik", isDevAutoLogin(mk({ ...base, "x-forwarded-for": "8.8.8.8" })), false);
t("xff loopback", isDevAutoLogin(mk({ ...base, "x-forwarded-for": "127.0.0.1" })), true);
t("xff loopback,publik", isDevAutoLogin(mk({ ...base, "x-forwarded-for": "127.0.0.1, 8.8.8.8" })), false);
t("xff 1000 item", isDevAutoLogin(mk({ ...base, "x-forwarded-for": Array(1000).fill("127.0.0.1").join(",") })), false);
t("xff 9 item", isDevAutoLogin(mk({ ...base, "x-forwarded-for": Array(9).fill("127.0.0.1").join(",") })), false);
t("x-real-ip publik", isDevAutoLogin(mk({ ...base, "x-real-ip": "1.2.3.4" })), false);
t("xf-host publik", isDevAutoLogin(mk({ ...base, "x-forwarded-host": "abc.depup.cloud" })), false);
t("xf-proto https", isDevAutoLogin(mk({ ...base, "x-forwarded-proto": "https" })), false);
t("header forwarded", isDevAutoLogin(mk({ ...base, forwarded: "for=1.1.1.1" })), false);
t("header via", isDevAutoLogin(mk({ ...base, via: "1.1 proxy" })), false);
t("x-vercel-id", isDevAutoLogin(mk({ ...base, "x-vercel-id": "x" })), false);
t("cf-ray", isDevAutoLogin(mk({ ...base, "cf-ray": "x" })), false);
t("x-depup-target", isDevAutoLogin(mk({ ...base, "x-depup-target": "/" })), false);
t("sec-fetch-site cross-site", isDevAutoLogin(mk({ ...base, "sec-fetch-site": "cross-site" })), false);
t("sec-fetch-site same-site", isDevAutoLogin(mk({ ...base, "sec-fetch-site": "same-site" })), false);
t("origin evil", isDevAutoLogin(mk({ ...base, origin: "https://evil.com" })), false);
t("origin null", isDevAutoLogin(mk({ ...base, origin: "null" })), false);
t("method POST", isDevAutoLogin(mk(base, "POST")), false);

process.env.VERCEL = "1";
t("env VERCEL", isDevAutoLogin(mk(base)), false); delete process.env.VERCEL;
process.env.DEV_AUTO_LOGIN = "false";
t("flag off", isDevAutoLogin(mk(base)), false); process.env.DEV_AUTO_LOGIN = "true";
process.env.NODE_ENV = "production";
t("NODE_ENV production", isDevAutoLogin(mk(base)), false);
process.env.NODE_ENV = "development";

// devUser
const e = (v) => { if (v === undefined) delete process.env.DEV_AUTO_LOGIN_EMAIL; else process.env.DEV_AUTO_LOGIN_EMAIL = v; return devUser(); };
t("email default", e(undefined).email, "dev@localhost");
t("email valid", e("Admin@Example.com ").email, "admin@example.com");
t("email invalid (spasi/kutip)", e('a b"@x.com').email, "dev@localhost");
t("email shell inj", e("a;rm -rf /@x.com").email, "dev@localhost");
t("email $(cmd)", e("$(id)@x.com").email, "dev@localhost");
t("email 5000 char", e("a".repeat(5000) + "@x.com").email, "dev@localhost");
t("devUser dev flag", e(undefined).dev, true);
console.warn = origWarn;
console.log(fail ? `\n${fail} GAGAL` : "\nSemua lulus");
process.exit(fail ? 1 : 0);
