#!/usr/bin/env node
"use strict";

/**
 * depup — CLI Depup: `depup login`, lalu `depup share [port]` (Link Gaib).
 * Yang membuat link wajib login (sekali saja, ala `ngrok authtoken`); yang membuka link tidak perlu login.
 * Tanpa dependensi, butuh Node.js >= 18.
 */

const http = require("node:http");
const net = require("node:net");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");

const VERSION = require("../package.json").version;
const DEFAULT_HOST = process.env.DEPUP_HOST || "https://depup.cloud";
const COMMON_PORTS = [3000, 5173, 8000, 8080, 4200, 5000, 4321, 3001, 5174, 4000, 8081, 8888, 9000];
const LOOPBACK = new Set(["localhost", "127.0.0.1", "::1", "[::1]", "0.0.0.0"]);

const CHUNK_BYTES = 256 * 1024; // potongan response (raw) per kiriman
const FLUSH_MS = 40; // kirim lebih awal kalau response lambat/streaming
const LOCAL_TIMEOUT_MS = 25_000;
const MAX_INFLIGHT = 24;

const HOP_BY_HOP = new Set([
  "connection", "keep-alive", "proxy-authenticate", "proxy-authorization", "proxy-connection",
  "te", "trailer", "transfer-encoding", "upgrade",
]);

/* ---------- tampilan ---------- */

const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const c = (code) => (s) => (useColor ? `\x1b[${code}m${s}\x1b[0m` : String(s));
const bold = c("1"), dim = c("2"), red = c("31"), green = c("32"), yellow = c("33"), cyan = c("36"), magenta = c("35");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function die(msg, code = 1) {
  console.error(`\n  ${red("✖")} ${msg}\n`);
  process.exit(code);
}

function help() {
  console.log(`
  ${bold("depup")} ${dim("v" + VERSION)}

  ${bold("Pemakaian")}
    npx depup-share login            ${dim("# sekali saja: hubungkan CLI ke akun Depup-mu")}
    npx depup-share share [port] [opsi]
    npx depup-share whoami | logout

  ${bold("Contoh")}
    npx depup-share share            ${dim("# deteksi otomatis port yang sedang jalan")}
    npx depup-share share 8000
    npx depup-share share localhost:5173 --name skripsi --ttl 240
    npx depup-share login --token <token>   ${dim("# server/CI tanpa browser (token dari Pengaturan)")}

  ${bold("Opsi")}
    --name <awalan>   awalan nama link (huruf/angka/-), bagian acak tetap ditambahkan
    --ttl <menit>     masa aktif link, default 120, maks 480
    --token <token>   pakai token CLI ini (atau env DEPUP_TOKEN)
    --host <url>      server Depup (default ${DEFAULT_HOST}, atau env DEPUP_HOST)
    -h, --help        tampilkan bantuan
    -v, --version     tampilkan versi

  ${dim("Hanya kamu (pembuat link) yang perlu login. Orang yang kamu kirimi link langsung bisa membukanya.")}
`);
}

/* ---------- argumen ---------- */

function parseArgs(argv) {
  const out = { _: [], name: null, ttl: null, host: DEFAULT_HOST, token: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "-h" || a === "--help") out.help = true;
    else if (a === "-v" || a === "--version") out.version = true;
    else if (a === "--name") out.name = argv[++i];
    else if (a === "--ttl") out.ttl = Number(argv[++i]);
    else if (a === "--host") out.host = argv[++i];
    else if (a === "--token") out.token = argv[++i];
    else if (a.startsWith("--token=")) out.token = a.slice(8);
    else if (a.startsWith("--name=")) out.name = a.slice(7);
    else if (a.startsWith("--ttl=")) out.ttl = Number(a.slice(6));
    else if (a.startsWith("--host=")) out.host = a.slice(7);
    else if (a.startsWith("-")) die(`Opsi tidak dikenal: ${a}\n    Jalankan ${bold("depup --help")}.`);
    else out._.push(a);
  }
  return out;
}

/** "8000" | ":8000" | "localhost:8000" | "http://127.0.0.1:8000" -> { host, port } */
function parseTarget(raw) {
  let s = String(raw).trim();
  if (/^\d+$/.test(s)) return { host: null, port: Number(s) };
  if (!/^[a-z]+:\/\//i.test(s)) s = "http://" + (s.startsWith(":") ? "localhost" + s : s);
  let u;
  try { u = new URL(s); } catch { return null; }
  if (u.protocol !== "http:") return { error: "Hanya http:// yang didukung untuk localhost (bukan https)." };
  if (!LOOPBACK.has(u.hostname)) {
    return { error: `Demi keamanan, hanya localhost yang boleh dibagikan (bukan "${u.hostname}").` };
  }
  const port = Number(u.port || 80);
  return { host: null, port };
}

/* ---------- koneksi ke localhost ---------- */

function canConnect(host, port, timeout = 600) {
  return new Promise((resolve) => {
    const sock = net.connect({ host, port });
    const done = (ok) => { sock.destroy(); resolve(ok); };
    sock.setTimeout(timeout, () => done(false));
    sock.once("connect", () => done(true));
    sock.once("error", () => done(false));
  });
}

/** Cari alamat loopback yang benar-benar menerima koneksi (IPv4 atau IPv6). */
async function probe(port) {
  for (const host of ["127.0.0.1", "::1"]) if (await canConnect(host, port)) return host;
  return null;
}

async function resolveTarget(arg) {
  if (arg) {
    const t = parseTarget(arg);
    if (!t) die(`Target tidak valid: "${arg}". Contoh: ${bold("depup share 8000")}`);
    if (t.error) die(t.error);
    const host = await probe(t.port);
    if (!host) {
      die(`Tidak ada server yang jalan di ${bold("localhost:" + t.port)}.\n    Jalankan dulu project kamu (mis. ${bold("npm run dev")}), lalu coba lagi.`);
    }
    return { host, port: t.port };
  }
  for (const port of COMMON_PORTS) {
    const host = await probe(port);
    if (host) {
      console.log(`  ${dim("Terdeteksi server di")} localhost:${port}`);
      return { host, port };
    }
  }
  die(`Tidak menemukan server lokal di port umum (${COMMON_PORTS.slice(0, 5).join(", ")}, …).\n    Sebutkan port-nya: ${bold("depup share 8000")}`);
}

/* ---------- API Depup ---------- */

async function api(base, path, { method = "GET", token, body, timeout = 15_000 } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      "user-agent": `depup-share/${VERSION}`,
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(timeout),
  });
  let json = null;
  try { json = await res.json(); } catch { /* bukan JSON */ }
  return { status: res.status, json };
}

/* ---------- meneruskan request ke localhost ---------- */

function buildLocalHeaders(pairs, port, bodyLen) {
  const h = {};
  for (const [name, value] of pairs) {
    const n = name.toLowerCase();
    if (HOP_BY_HOP.has(n) || n === "host" || n === "content-length") continue;
    h[n] = h[n] === undefined ? value : h[n] + (n === "cookie" ? "; " : ", ") + value;
  }
  h.host = `localhost:${port}`;
  if (bodyLen > 0) h["content-length"] = String(bodyLen);
  return h;
}

function rewriteLocation(value, publicBase) {
  return value.replace(/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)(:\d+)?/i, publicBase);
}

function localErrorPage(status, title, detail) {
  const html = `<!doctype html><meta charset="utf-8"><title>${title}</title><body style="font:16px system-ui;max-width:480px;margin:15vh auto;padding:0 20px"><h1 style="font-size:20px">${title}</h1><p style="color:#555">${detail}</p><p><small>Depup Share</small></p>`;
  return { status, headers: [["content-type", "text/html; charset=utf-8"]], body: Buffer.from(html) };
}

function logLine(method, path, status, ms) {
  const col = status >= 500 ? red : status >= 400 ? yellow : status >= 300 ? cyan : green;
  const p = path.length > 64 ? path.slice(0, 61) + "…" : path;
  const t = new Date().toLocaleTimeString("id-ID", { hour12: false });
  console.log(`  ${dim(t)}  ${bold(method.padEnd(6))} ${p.padEnd(40)} ${col(String(status))} ${dim(ms + "ms")}`);
}

/* ---------- login (token pembuat link) ---------- */

const CONFIG_DIR = path.join(os.homedir(), ".depup");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

function readConfig() {
  try {
    const j = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
    return j && typeof j === "object" ? j : {};
  } catch {
    return {};
  }
}

function writeConfig(cfg) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2) + "\n", { mode: 0o600 });
  try { fs.chmodSync(CONFIG_FILE, 0o600); } catch { /* Windows */ }
}

/** Token disimpan per server Depup, supaya --host lain tidak memakai token yang salah. */
function savedAuth(base) {
  const a = (readConfig().auth || {})[base];
  return a && typeof a.token === "string" ? a : null;
}

function saveAuth(base, token, email) {
  const cfg = readConfig();
  cfg.auth = { ...(cfg.auth || {}), [base]: { token, email: email || null, savedAt: new Date().toISOString() } };
  writeConfig(cfg);
}

function clearAuth(base) {
  const cfg = readConfig();
  if (!cfg.auth || !cfg.auth[base]) return false;
  delete cfg.auth[base];
  writeConfig(cfg);
  return true;
}

function baseOf(opts) {
  const base = String(opts.host || "").replace(/\/+$/, "");
  if (!/^https?:\/\//.test(base)) die(`--host harus diawali http:// atau https:// (dapat: "${opts.host}")`);
  return base;
}

function openBrowser(url) {
  if (process.env.DEPUP_NO_BROWSER) return false;
  const cmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "cmd" : "xdg-open";
  const args = process.platform === "win32" ? ["/c", "start", "", url] : [url];
  try {
    const p = spawn(cmd, args, { stdio: "ignore", detached: true });
    p.on("error", () => {});
    p.unref();
    return true;
  } catch {
    return false;
  }
}

/** Login lewat browser (device flow). Mengembalikan { token, email }. */
async function browserLogin(base) {
  let start;
  try {
    const r = await api(base, "/api/cli/login/start", { method: "POST", body: {} });
    if (!r.json || !r.json.ok) die((r.json && r.json.error) || `Server Depup menjawab HTTP ${r.status}.`);
    start = r.json.data;
  } catch (e) {
    die(`Tidak bisa menghubungi ${base} (${e.message}). Periksa koneksi internet kamu.`);
  }

  console.log(`  ${bold("Login Depup CLI")} ${dim("— cukup sekali di komputer ini")}\n`);
  console.log(`  Buka link ini lalu tekan ${bold("Izinkan")}:`);
  console.log(`    ${bold(cyan(start.verifyUrl))}`);
  console.log(`  Kode: ${bold(magenta(start.userCode))} ${dim("(pastikan sama dengan yang tampil di browser)")}\n`);
  if (openBrowser(start.verifyUrl)) console.log(`  ${dim("Browser sudah dibuka. Menunggu persetujuan…")}`);
  else console.log(`  ${dim("Menunggu persetujuan…")}`);

  const deadline = Date.now() + (start.expiresIn || 600) * 1000;
  const interval = Math.max(1, start.interval || 2) * 1000;
  while (Date.now() < deadline) {
    await sleep(interval);
    let r;
    try {
      r = await api(base, "/api/cli/login/poll", { method: "POST", body: { deviceCode: start.deviceCode } });
    } catch {
      continue; // koneksi putus sebentar: coba lagi
    }
    if (r.status === 429) { await sleep(interval); continue; }
    if (!r.json) continue;
    if (!r.json.ok) die(r.json.error || `Login gagal (HTTP ${r.status}).`);
    const d = r.json.data;
    if (d && d.status === "approved" && d.token) {
      saveAuth(base, d.token, d.email);
      console.log(`  ${green("✔")} Login sebagai ${bold(d.email)}\n`);
      return { token: d.token, email: d.email };
    }
  }
  die("Waktu login habis. Jalankan lagi: depup login");
}

/** Token untuk membuat link: --token, env DEPUP_TOKEN, atau token tersimpan. null kalau belum login. */
function currentAuth(opts, base) {
  if (opts.token) return { token: opts.token, email: null, source: "--token" };
  if (process.env.DEPUP_TOKEN) return { token: process.env.DEPUP_TOKEN.trim(), email: null, source: "DEPUP_TOKEN" };
  const a = savedAuth(base);
  return a ? { token: a.token, email: a.email, source: "config" } : null;
}

async function login(opts) {
  const base = baseOf(opts);
  console.log(`\n  ${bold("Depup")} ${dim("v" + VERSION)}\n`);
  if (opts.token) {
    saveAuth(base, opts.token.trim(), null);
    console.log(`  ${green("✔")} Token disimpan di ${dim(CONFIG_FILE)}\n`);
    return;
  }
  await browserLogin(base);
  console.log(`  Sekarang jalankan: ${bold("npx depup-share share")}\n`);
}

function logout(opts) {
  const base = baseOf(opts);
  const removed = clearAuth(base);
  console.log(removed ? `\n  ${green("✔")} Logout. Token CLI dihapus dari komputer ini.\n` : `\n  ${dim("Belum login di " + base + ".")}\n`);
}

function whoami(opts) {
  const base = baseOf(opts);
  const a = currentAuth(opts, base);
  if (!a) return console.log(`\n  ${dim("Belum login.")} Jalankan: ${bold("npx depup-share login")}\n`);
  console.log(`\n  ${a.email ? bold(a.email) : "Token dari " + a.source} ${dim("· " + base)}\n`);
}

/* ---------- share ---------- */

async function share(opts) {
  const base = baseOf(opts);

  console.log(`\n  ${bold("Depup Share")} ${dim("v" + VERSION)}\n`);
  const target = await resolveTarget(opts._[0]);

  // Pembuat link wajib login (sekali). Belum login -> langsung buka login di browser, lalu lanjut share.
  let auth = currentAuth(opts, base);
  if (!auth) auth = await browserLogin(base);

  const createLink = () =>
    api(base, "/api/tunnel/create", {
      method: "POST",
      token: auth.token,
      body: { port: target.port, name: opts.name || undefined, ttlMinutes: Number.isFinite(opts.ttl) ? opts.ttl : undefined },
    });

  let created;
  try {
    let r = await createLink();
    // Token tersimpan kedaluwarsa/dicabut: login ulang sekali lalu coba lagi.
    if (r.status === 401 && !opts.token && !process.env.DEPUP_TOKEN) {
      clearAuth(base);
      console.log(`  ${yellow("!")} ${(r.json && r.json.error) || "Login CLI tidak berlaku lagi."}\n`);
      auth = await browserLogin(base);
      r = await createLink();
    }
    if (!r.json || !r.json.ok) {
      die(`${(r.json && r.json.error) || `Server Depup menjawab HTTP ${r.status}.`}`);
    }
    created = r.json.data;
  } catch (e) {
    die(`Tidak bisa menghubungi ${base} (${e.message}). Periksa koneksi internet kamu.`);
  }

  const { id, token, publicBase } = created;
  const left = Math.round((created.expiresAt - Date.now()) / 60000);
  console.log(`  ${green("●")} ${bold("Online")}   localhost:${target.port}  ${dim("→")}  ${bold(cyan(created.url))}`);
  console.log(`  ${dim("Aktif ±" + left + " menit · Ctrl+C untuk berhenti" + (created.owner ? " · milik " + created.owner : ""))}`);
  console.log(`  ${dim("Siapa pun yang punya link bisa membukanya tanpa login.")}`);
  console.log(`  ${dim("Batas: tanpa WebSocket, body upload maks ~600 KB. Pengunjung melihat halaman peringatan sekali.")}\n`);

  let stopping = false;
  let inflight = 0;
  let lastActivity = 0;

  async function stop(reason, code = 0) {
    if (stopping) return;
    stopping = true;
    if (reason) console.log(`\n  ${yellow("■")} ${reason}`);
    try { await api(base, `/api/tunnel/close?id=${encodeURIComponent(id)}`, { method: "POST", token, timeout: 4000 }); } catch { /* abaikan */ }
    console.log(`  ${dim("Link sudah dimatikan.")}\n`);
    process.exit(code);
  }
  process.on("SIGINT", () => stop("Dihentikan.", 0));
  process.on("SIGTERM", () => stop("Dihentikan.", 0));
  setTimeout(() => stop("Masa aktif link habis. Jalankan lagi untuk link baru.", 0), Math.max(1000, created.expiresAt - Date.now())).unref();

  const send = (rid, payload) =>
    api(base, `/api/tunnel/respond?id=${encodeURIComponent(id)}`, { method: "POST", token, body: { rid, ...payload }, timeout: 20_000 }).catch(() => null);

  function handle(item) {
    if (item.exp && Date.now() > item.exp) return;
    inflight++;
    const started = Date.now();
    const body = item.body ? Buffer.from(item.body, "base64") : null;
    let seq = 0;
    let chain = Promise.resolve();
    let statusForLog = 0;
    let settled = false;

    const emit = (payload) => { chain = chain.then(() => send(item.rid, payload)); };
    const finish = () => {
      if (settled) return;
      settled = true;
      logLine(item.method, item.path, statusForLog, Date.now() - started);
      chain.finally(() => { inflight--; });
    };
    const replyError = ({ status, headers, body: b }) => {
      if (settled) return;
      statusForLog = status;
      emit({ seq: seq++, status, headers, data: b.toString("base64"), last: true });
      finish();
    };

    const req = http.request(
      {
        host: target.host,
        port: target.port,
        method: item.method,
        path: item.path,
        headers: buildLocalHeaders(item.headers, target.port, body ? body.length : 0),
        setHost: false,
        timeout: LOCAL_TIMEOUT_MS,
      },
      (res) => {
        statusForLog = res.statusCode || 502;
        const headers = [];
        for (let i = 0; i < res.rawHeaders.length; i += 2) {
          const name = res.rawHeaders[i];
          const lower = name.toLowerCase();
          if (HOP_BY_HOP.has(lower) || lower === "content-length") continue;
          let value = res.rawHeaders[i + 1];
          if (lower === "location") value = rewriteLocation(value, publicBase);
          headers.push([name, value]);
        }

        let pending = [];
        let pendingLen = 0;
        let timer = null;
        const flush = (last) => {
          if (timer) { clearTimeout(timer); timer = null; }
          let buf = Buffer.concat(pending, pendingLen);
          pending = []; pendingLen = 0;
          do {
            const part = buf.subarray(0, CHUNK_BYTES);
            buf = buf.subarray(part.length);
            const isLast = last && buf.length === 0;
            const payload = { seq: seq, data: part.toString("base64"), last: isLast };
            if (seq === 0) { payload.status = statusForLog; payload.headers = headers; }
            seq++;
            emit(payload);
          } while (buf.length > 0);
        };

        res.on("data", (d) => {
          pending.push(d); pendingLen += d.length;
          if (pendingLen >= CHUNK_BYTES) flush(false);
          else if (!timer) timer = setTimeout(() => { timer = null; if (pendingLen > 0 || seq === 0) flush(false); }, FLUSH_MS);
        });
        res.on("end", () => { flush(true); finish(); });
        res.on("error", () => { flush(true); finish(); });
      }
    );

    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", (e) => {
      if (e.message === "timeout") {
        replyError(localErrorPage(504, "Localhost tidak merespons", `Server di localhost:${target.port} tidak menjawab dalam ${LOCAL_TIMEOUT_MS / 1000} detik.`));
      } else if (e.code === "ECONNREFUSED" || e.code === "ECONNRESET") {
        replyError(localErrorPage(502, "Server lokal mati", `Tidak ada server yang jalan di localhost:${target.port}. Jalankan lagi project-nya.`));
      } else {
        replyError(localErrorPage(400, "Request tidak valid", "Request tidak bisa diteruskan ke localhost."));
      }
    });
    if (body) req.write(body);
    req.end();
  }

  // Loop long-poll.
  let backoff = 1000;
  while (!stopping) {
    if (inflight >= MAX_INFLIGHT) { await sleep(100); continue; }
    try {
      const hot = Date.now() - lastActivity < 8000 ? 1 : 0;
      const res = await fetch(`${base}/api/tunnel/poll?id=${encodeURIComponent(id)}&hot=${hot}`, {
        headers: { authorization: `Bearer ${token}`, "user-agent": `depup-share/${VERSION}` },
        signal: AbortSignal.timeout(40_000),
      });
      if (res.status === 410 || res.status === 401) {
        return stop("Link sudah kedaluwarsa atau ditutup.", 0);
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      backoff = 1000;
      const items = (json && json.data && json.data.requests) || [];
      if (items.length) lastActivity = Date.now();
      for (const item of items) handle(item);
    } catch (e) {
      if (stopping) break;
      console.log(`  ${yellow("!")} ${dim("Koneksi ke Depup terganggu (" + e.message + "), mencoba lagi…")}`);
      await sleep(backoff);
      backoff = Math.min(backoff * 2, 15_000);
    }
  }
}

/* ---------- main ---------- */

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.version) return console.log(VERSION);
  const cmd = opts._.shift();
  if (opts.help || !cmd || cmd === "help") return help();
  if (cmd === "share") return share(opts);
  if (cmd === "login") return login(opts);
  if (cmd === "logout") return logout(opts);
  if (cmd === "whoami") return whoami(opts);
  die(`Perintah tidak dikenal: "${cmd}". Jalankan ${bold("depup --help")}.`);
}

main().catch((e) => die(e && e.message ? e.message : String(e)));
