#!/usr/bin/env node
/**
 * KV lokal untuk development — server REST kompatibel Upstash/Vercel KV, data di memori.
 *
 * Gunanya: fitur yang butuh KV (Link Gaib/tunnel, Link Instan, rate limit, statistik) bisa
 * dicoba dan dites di laptop tanpa akun Upstash. JANGAN dipakai di produksi.
 *
 *   node scripts/dev-kv.mjs            # default port 8079
 *   # lalu di .env.local:
 *   KV_REST_API_URL=http://127.0.0.1:8079
 *   KV_REST_API_TOKEN=dev-local
 *
 * Mendukung perintah yang dipakai Depup: string, list, set, sorted set, hash, TTL, SCAN,
 * pipeline (/pipeline) dan transaksi (/multi-exec). Respons mengikuti header Upstash-Encoding.
 */
import http from "node:http";

const PORT = Number(process.env.DEV_KV_PORT || process.argv[2] || 8079);
const TOKEN = process.env.KV_REST_API_TOKEN || "dev-local";

/** key -> { type: "string"|"list"|"set"|"zset"|"hash", value, exp: ms|null } */
const db = new Map();

function alive(key) {
  const e = db.get(key);
  if (!e) return null;
  if (e.exp !== null && e.exp <= Date.now()) {
    db.delete(key);
    return null;
  }
  return e;
}
function typed(key, type, create) {
  const e = alive(key);
  if (e) {
    if (e.type !== type) throw new Error("WRONGTYPE Operation against a key holding the wrong kind of value");
    return e;
  }
  if (!create) return null;
  const fresh = { type, value: type === "list" ? [] : type === "set" ? new Set() : type === "zset" || type === "hash" ? new Map() : "", exp: null };
  db.set(key, fresh);
  return fresh;
}
const num = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error("ERR value is not an integer or out of range");
  return n;
};
function globToRe(glob) {
  return new RegExp("^" + glob.replace(/[.+^${}()|\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".") + "$");
}
function scoreBound(raw, isMin) {
  const s = String(raw);
  if (s === "-inf") return { v: -Infinity, ex: false };
  if (s === "+inf" || s === "inf") return { v: Infinity, ex: false };
  if (s.startsWith("(")) return { v: Number(s.slice(1)), ex: true };
  return { v: Number(s), ex: false };
}
function inRange(score, min, max) {
  const lo = min.ex ? score > min.v : score >= min.v;
  const hi = max.ex ? score < max.v : score <= max.v;
  return lo && hi;
}
function sortedZ(e) {
  return [...e.value.entries()].sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : 1));
}

function run(cmdRaw) {
  const [name, ...a] = cmdRaw.map((x) => (typeof x === "string" ? x : JSON.stringify(x)));
  const cmd = String(name).toUpperCase();
  switch (cmd) {
    case "PING":
      return "PONG";
    case "GET": {
      const e = typed(a[0], "string", false);
      return e ? e.value : null;
    }
    case "SET": {
      let nx = false, xx = false, exp = null, get = false, keepttl = false;
      for (let i = 2; i < a.length; i++) {
        const o = a[i].toUpperCase();
        if (o === "NX") nx = true;
        else if (o === "XX") xx = true;
        else if (o === "GET") get = true;
        else if (o === "KEEPTTL") keepttl = true;
        else if (o === "EX") exp = Date.now() + num(a[++i]) * 1000;
        else if (o === "PX") exp = Date.now() + num(a[++i]);
        else if (o === "EXAT") exp = num(a[++i]) * 1000;
        else if (o === "PXAT") exp = num(a[++i]);
      }
      const cur = alive(a[0]);
      if ((nx && cur) || (xx && !cur)) return get ? (cur ? cur.value : null) : null;
      const prev = cur ? cur.value : null;
      db.set(a[0], { type: "string", value: a[1], exp: keepttl && cur ? cur.exp : exp });
      return get ? prev : "OK";
    }
    case "SETNX":
      return run(["SET", a[0], a[1], "NX"]) === "OK" ? 1 : 0;
    case "SETEX":
      return run(["SET", a[0], a[2], "EX", a[1]]);
    case "MGET":
      return a.map((k) => {
        const e = alive(k);
        return e && e.type === "string" ? e.value : null;
      });
    case "DEL":
    case "UNLINK":
      return a.reduce((n, k) => n + (alive(k) && db.delete(k) ? 1 : 0), 0);
    case "EXISTS":
      return a.reduce((n, k) => n + (alive(k) ? 1 : 0), 0);
    case "INCR":
    case "INCRBY":
    case "DECR":
    case "DECRBY": {
      const by = cmd === "INCR" ? 1 : cmd === "DECR" ? -1 : cmd === "DECRBY" ? -num(a[1]) : num(a[1]);
      const e = typed(a[0], "string", true);
      const next = (e.value === "" ? 0 : num(e.value)) + by;
      e.value = String(next);
      return next;
    }
    case "EXPIRE":
    case "PEXPIRE": {
      const e = alive(a[0]);
      if (!e) return 0;
      e.exp = Date.now() + num(a[1]) * (cmd === "EXPIRE" ? 1000 : 1);
      return 1;
    }
    case "PERSIST": {
      const e = alive(a[0]);
      if (!e || e.exp === null) return 0;
      e.exp = null;
      return 1;
    }
    case "TTL":
    case "PTTL": {
      const e = alive(a[0]);
      if (!e) return -2;
      if (e.exp === null) return -1;
      const ms = e.exp - Date.now();
      return cmd === "TTL" ? Math.ceil(ms / 1000) : ms;
    }
    case "TYPE": {
      const e = alive(a[0]);
      return e ? e.type : "none";
    }
    case "DBSIZE":
      [...db.keys()].forEach(alive);
      return db.size;
    case "FLUSHDB":
    case "FLUSHALL":
      db.clear();
      return "OK";
    case "KEYS": {
      const re = globToRe(a[0] ?? "*");
      return [...db.keys()].filter((k) => alive(k) && re.test(k));
    }
    case "SCAN": {
      let match = "*", count = 1000;
      for (let i = 1; i < a.length; i++) {
        const o = a[i].toUpperCase();
        if (o === "MATCH") match = a[++i];
        else if (o === "COUNT") count = num(a[++i]);
      }
      const re = globToRe(match);
      const all = [...db.keys()].filter((k) => alive(k));
      const start = num(a[0]);
      const slice = all.slice(start, start + count).filter((k) => re.test(k));
      const next = start + count >= all.length ? 0 : start + count;
      return [String(next), slice];
    }
    /* ---- list ---- */
    case "RPUSH":
    case "LPUSH": {
      const e = typed(a[0], "list", true);
      for (const v of a.slice(1)) cmd === "RPUSH" ? e.value.push(v) : e.value.unshift(v);
      return e.value.length;
    }
    case "LPOP":
    case "RPOP": {
      const e = typed(a[0], "list", false);
      if (!e || e.value.length === 0) return null;
      const n = a[1] !== undefined ? num(a[1]) : null;
      const take = (k) => (cmd === "LPOP" ? e.value.splice(0, k) : e.value.splice(-k).reverse());
      const out = take(n ?? 1);
      if (e.value.length === 0) db.delete(a[0]);
      return n === null ? out[0] ?? null : out;
    }
    case "LLEN": {
      const e = typed(a[0], "list", false);
      return e ? e.value.length : 0;
    }
    case "LRANGE": {
      const e = typed(a[0], "list", false);
      if (!e) return [];
      const len = e.value.length;
      let s = num(a[1]), t = num(a[2]);
      if (s < 0) s = Math.max(0, len + s);
      if (t < 0) t = len + t;
      return e.value.slice(s, t + 1);
    }
    case "LTRIM": {
      const e = typed(a[0], "list", false);
      if (!e) return "OK";
      const len = e.value.length;
      let s = num(a[1]), t = num(a[2]);
      if (s < 0) s = Math.max(0, len + s);
      if (t < 0) t = len + t;
      e.value = e.value.slice(s, t + 1);
      return "OK";
    }
    /* ---- set ---- */
    case "SADD": {
      const e = typed(a[0], "set", true);
      let n = 0;
      for (const v of a.slice(1)) if (!e.value.has(v)) (e.value.add(v), n++);
      return n;
    }
    case "SREM": {
      const e = typed(a[0], "set", false);
      if (!e) return 0;
      let n = 0;
      for (const v of a.slice(1)) if (e.value.delete(v)) n++;
      return n;
    }
    case "SMEMBERS": {
      const e = typed(a[0], "set", false);
      return e ? [...e.value] : [];
    }
    case "SISMEMBER": {
      const e = typed(a[0], "set", false);
      return e && e.value.has(a[1]) ? 1 : 0;
    }
    case "SCARD": {
      const e = typed(a[0], "set", false);
      return e ? e.value.size : 0;
    }
    /* ---- sorted set ---- */
    case "ZADD": {
      const e = typed(a[0], "zset", true);
      let i = 1;
      while (i < a.length && /^(NX|XX|GT|LT|CH|INCR)$/i.test(a[i])) i++;
      let n = 0;
      for (; i + 1 < a.length; i += 2) {
        if (!e.value.has(a[i + 1])) n++;
        e.value.set(a[i + 1], num(a[i]));
      }
      return n;
    }
    case "ZCARD": {
      const e = typed(a[0], "zset", false);
      return e ? e.value.size : 0;
    }
    case "ZCOUNT": {
      const e = typed(a[0], "zset", false);
      if (!e) return 0;
      const min = scoreBound(a[1]), max = scoreBound(a[2]);
      return [...e.value.values()].filter((s) => inRange(s, min, max)).length;
    }
    case "ZREMRANGEBYSCORE": {
      const e = typed(a[0], "zset", false);
      if (!e) return 0;
      const min = scoreBound(a[1]), max = scoreBound(a[2]);
      let n = 0;
      for (const [m, s] of [...e.value]) if (inRange(s, min, max)) (e.value.delete(m), n++);
      return n;
    }
    case "ZRANGE": {
      const e = typed(a[0], "zset", false);
      if (!e) return [];
      const opts = a.slice(3).map((x) => x.toUpperCase());
      const withScores = opts.includes("WITHSCORES");
      let list = sortedZ(e);
      if (opts.includes("BYSCORE")) {
        const min = scoreBound(a[1]), max = scoreBound(a[2]);
        list = list.filter(([, s]) => inRange(s, min, max));
      } else {
        const len = list.length;
        let s = num(a[1]), t = num(a[2]);
        if (s < 0) s = Math.max(0, len + s);
        if (t < 0) t = len + t;
        list = list.slice(s, t + 1);
      }
      if (opts.includes("REV")) list.reverse();
      return withScores ? list.flatMap(([m, s]) => [m, String(s)]) : list.map(([m]) => m);
    }
    /* ---- hash ---- */
    case "HSET": {
      const e = typed(a[0], "hash", true);
      let n = 0;
      for (let i = 1; i + 1 < a.length; i += 2) {
        if (!e.value.has(a[i])) n++;
        e.value.set(a[i], a[i + 1]);
      }
      return n;
    }
    case "HGET": {
      const e = typed(a[0], "hash", false);
      return e && e.value.has(a[1]) ? e.value.get(a[1]) : null;
    }
    case "HDEL": {
      const e = typed(a[0], "hash", false);
      if (!e) return 0;
      return a.slice(1).reduce((n, f) => n + (e.value.delete(f) ? 1 : 0), 0);
    }
    case "HINCRBY": {
      const e = typed(a[0], "hash", true);
      const next = num(e.value.get(a[1]) ?? 0) + num(a[2]);
      e.value.set(a[1], String(next));
      return next;
    }
    case "HGETALL": {
      const e = typed(a[0], "hash", false);
      return e ? [...e.value].flat() : [];
    }
    default:
      throw new Error(`ERR unknown command '${name}' (belum didukung dev-kv)`);
  }
}

const b64 = (v) =>
  v === null || v === undefined
    ? v
    : typeof v === "string"
      ? Buffer.from(v, "utf8").toString("base64")
      : Array.isArray(v)
        ? v.map(b64)
        : v;

function exec(cmd, encode) {
  try {
    const result = run(cmd);
    return { result: encode ? b64(result) : result };
  } catch (e) {
    return { error: e.message };
  }
}

const server = http.createServer((req, res) => {
  const send = (status, body) => {
    res.writeHead(status, { "content-type": "application/json" });
    res.end(JSON.stringify(body));
  };
  if ((req.headers.authorization ?? "") !== `Bearer ${TOKEN}`) return send(401, { error: "Unauthorized" });
  const encode = String(req.headers["upstash-encoding"] ?? "").toLowerCase() === "base64";
  let raw = "";
  req.on("data", (c) => (raw += c));
  req.on("end", () => {
    let body;
    try {
      body = raw ? JSON.parse(raw) : null;
    } catch {
      return send(400, { error: "ERR body bukan JSON" });
    }
    const path = (req.url ?? "/").split("?")[0].replace(/\/+$/, "");
    if (path === "/pipeline" || path === "/multi-exec") {
      if (!Array.isArray(body)) return send(400, { error: "ERR pipeline harus array" });
      return send(200, body.map((c) => exec(c, encode)));
    }
    // Bentuk lain Upstash: POST /set/key/value atau body array.
    const cmd = Array.isArray(body) ? body : path.split("/").filter(Boolean).map(decodeURIComponent);
    if (!cmd.length) return send(400, { error: "ERR perintah kosong" });
    const out = exec(cmd, encode);
    return send(out.error ? 400 : 200, out);
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[dev-kv] KV lokal siap di http://127.0.0.1:${PORT} (token: ${TOKEN}). Data hilang saat dihentikan.`);
});
