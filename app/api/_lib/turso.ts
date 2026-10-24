/**
 * turso.ts — klien Turso Platform API + eksekusi SQL (libSQL "Hrana over HTTP") + guard SQL + kuota.
 * TURSO_API_TOKEN hanya dibaca di sini (server). Tidak ada dependency tambahan: murni fetch.
 *
 * ⚠ VERIFIKASI di dokumentasi resmi sebelum produksi (saya tidak bisa mengeceknya dari sini):
 *   - Platform API : https://docs.turso.tech/api-reference  (create database, create token, usage)
 *   - Hrana HTTP   : https://github.com/tursodatabase/libsql/blob/main/docs/HTTP_V2_SPEC.md
 *   Titik yang ditandai [VERIFIKASI] di bawah adalah nama field yang paling mungkin berbeda.
 */
import { HttpError, QUOTA_BYTES, kv } from "./db-adapter";
import { getDb, listUserDbIds, type DbRecord } from "./dbrepo";

const PLATFORM = "https://api.turso.tech/v1";

function cfg() {
  const token = process.env.TURSO_API_TOKEN;
  const org = process.env.TURSO_ORG;
  const group = process.env.TURSO_GROUP || "default";
  if (!token || !org) throw new HttpError(500, "config", "TURSO_API_TOKEN / TURSO_ORG belum diatur di server.");
  return { token, org, group };
}

async function platform(method: string, path: string, opts: { body?: unknown; query?: Record<string, string> } = {}): Promise<any> {
  const { token, org } = cfg();
  const qs = opts.query ? "?" + new URLSearchParams(opts.query).toString() : "";
  const res = await fetch(`${PLATFORM}/organizations/${encodeURIComponent(org)}${path}${qs}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const text = await res.text();
  let json: any = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    /* bukan JSON */
  }
  if (!res.ok) {
    const msg = typeof json?.error === "string" ? json.error : `HTTP ${res.status}`;
    throw new HttpError(res.status === 404 ? 404 : 502, "turso_error", `Turso: ${msg}`);
  }
  return json;
}

// ───────────── Platform API ─────────────
export async function createTursoDb(name: string): Promise<{ hostname: string }> {
  const { group } = cfg();
  const j = await platform("POST", "/databases", { body: { name, group } });
  const hostname = j?.database?.Hostname ?? j?.database?.hostname; // [VERIFIKASI] nama field hostname
  if (!hostname) throw new HttpError(502, "turso_error", "Respons Turso tidak berisi hostname database.");
  return { hostname };
}

export async function deleteTursoDb(name: string): Promise<void> {
  try {
    await platform("DELETE", `/databases/${encodeURIComponent(name)}`);
  } catch (e) {
    if (e instanceof HttpError && e.status === 404) return; // sudah tidak ada
    throw e;
  }
}

const tokenCache = new Map<string, { jwt: string; exp: number }>();

/** Buat auth token database. expiration: "1h", "never", dst. [VERIFIKASI] nama query param. */
export async function mintToken(name: string, authorization: "full-access" | "read-only", expiration: string): Promise<string> {
  const j = await platform("POST", `/databases/${encodeURIComponent(name)}/auth/tokens`, {
    query: { expiration, authorization },
  });
  if (!j?.jwt) throw new HttpError(502, "turso_error", "Turso tidak mengembalikan token.");
  return j.jwt as string;
}

async function shortToken(name: string, authorization: "full-access" | "read-only"): Promise<string> {
  const key = `${name}:${authorization}`;
  const c = tokenCache.get(key);
  if (c && c.exp > Date.now()) return c.jwt;
  const jwt = await mintToken(name, authorization, "1h");
  tokenCache.set(key, { jwt, exp: Date.now() + 45 * 60_000 });
  return jwt;
}

async function fetchUsageBytes(name: string): Promise<number> {
  const j = await platform("GET", `/databases/${encodeURIComponent(name)}/usage`);
  const d = j?.database ?? {};
  const u = d.total ?? d.usage; // [VERIFIKASI] lokasi storage_bytes
  if (u && typeof u.storage_bytes === "number") return u.storage_bytes;
  if (Array.isArray(d.instances)) {
    return d.instances.reduce((a: number, i: any) => Math.max(a, Number(i?.usage?.storage_bytes ?? 0)), 0);
  }
  throw new HttpError(502, "turso_usage", "Format usage Turso tidak dikenali.");
}

// ───────────── Kuota 100MB ─────────────
/** Ukuran 1 database (cache KV 45 detik supaya Platform API tidak dipanggil tiap request). null = gagal dicek. */
export async function dbUsageBytes(rec: Pick<DbRecord, "id" | "tursoName">, fresh = false): Promise<number | null> {
  if (!fresh) {
    const c = await kv.get<{ bytes: number; at: number }>(`db:${rec.id}:usage`);
    if (c && Date.now() - c.at < 45_000) return c.bytes;
  }
  try {
    const bytes = await fetchUsageBytes(rec.tursoName);
    await kv.set(`db:${rec.id}:usage`, { bytes, at: Date.now() }, 300);
    return bytes;
  } catch {
    return null;
  }
}

export async function userUsage(email: string): Promise<{ total: number; unknown: boolean }> {
  const ids = await listUserDbIds(email);
  const recs = (await Promise.all(ids.map(getDb))).filter(Boolean) as DbRecord[];
  const usage = await Promise.all(recs.map((r) => dbUsageBytes(r)));
  return { total: usage.reduce<number>((a, b) => a + (b ?? 0), 0), unknown: usage.some((u) => u === null) };
}

/** Tolak operasi yang menambah data jika kuota penuh. Fail-closed bila ukuran tidak bisa dicek. */
export async function assertCanGrow(email: string, extraBytes = 0): Promise<void> {
  const { total, unknown } = await userUsage(email);
  if (unknown) throw new HttpError(503, "quota_unknown", "Tidak bisa memeriksa kuota saat ini. Coba lagi sebentar.");
  if (total + extraBytes >= QUOTA_BYTES) {
    throw new HttpError(413, "quota_exceeded", "Kuota 100MB penuh. Hapus data atau tabel dulu (DELETE/DROP tetap diizinkan).");
  }
}

// ───────────── SQL: scanner, split, guard ─────────────
/** Hapus komentar & kosongkan isi string/identifier ber-kutip, supaya pemeriksaan keyword tidak tertipu. */
export function sanitizeSql(sql: string): string {
  let out = "";
  let i = 0;
  const n = sql.length;
  while (i < n) {
    const c = sql[i];
    const d = sql[i + 1];
    if (c === "-" && d === "-") {
      while (i < n && sql[i] !== "\n") i++;
      out += " ";
    } else if (c === "/" && d === "*") {
      const end = sql.indexOf("*/", i + 2);
      i = end === -1 ? n : end + 2;
      out += " ";
    } else if (c === "'" || c === '"' || c === "`" || c === "[") {
      const close = c === "[" ? "]" : c;
      out += c;
      i++;
      while (i < n) {
        if (sql[i] === close) {
          if (close !== "]" && sql[i + 1] === close) {
            i += 2;
            continue;
          }
          break;
        }
        i++;
      }
      out += close;
      i++;
    } else {
      out += c;
      i++;
    }
  }
  return out;
}

/** Pecah script SQL jadi statement (aware kutip, komentar, dan CREATE TRIGGER ... BEGIN ... END;). */
export function splitStatements(sql: string): string[] {
  const out: string[] = [];
  let cur = "";
  let i = 0;
  const n = sql.length;
  const push = () => {
    if (sanitizeSql(cur).trim()) out.push(cur.trim());
    cur = "";
  };
  while (i < n) {
    const c = sql[i];
    const d = sql[i + 1];
    if (c === "-" && d === "-") {
      const e = sql.indexOf("\n", i);
      const stop = e === -1 ? n : e;
      cur += sql.slice(i, stop);
      i = stop;
    } else if (c === "/" && d === "*") {
      const e = sql.indexOf("*/", i + 2);
      const stop = e === -1 ? n : e + 2;
      cur += sql.slice(i, stop);
      i = stop;
    } else if (c === "'" || c === '"' || c === "`" || c === "[") {
      const close = c === "[" ? "]" : c;
      let j = i + 1;
      while (j < n) {
        if (sql[j] === close) {
          if (close !== "]" && sql[j + 1] === close) {
            j += 2;
            continue;
          }
          break;
        }
        j++;
      }
      cur += sql.slice(i, j + 1);
      i = j + 1;
    } else if (c === ";") {
      const clean = sanitizeSql(cur).trim().toLowerCase();
      const trigger = /^create\s+(temp\s+|temporary\s+)?trigger\b/.test(clean);
      if (trigger && !/\bend\s*$/.test(clean)) {
        cur += c;
      } else {
        push();
      }
      i++;
    } else {
      cur += c;
      i++;
    }
  }
  push();
  return out;
}

export type Analysis = { kind: string; readOnly: boolean; grows: boolean; blocked?: string };

const BLOCKED_WORDS = ["attach", "detach", "load_extension", "vacuum"];
const SAFE_PRAGMAS = new Set(["table_info", "table_xinfo", "index_list", "index_info", "index_xinfo", "foreign_key_list", "table_list", "database_list"]);

export function analyzeStatement(sql: string): Analysis {
  const clean = sanitizeSql(sql).toLowerCase();
  const tokens: string[] = clean.match(/[a-z_][a-z0-9_]*/g) ?? [];
  const kind = tokens[0] ?? "";
  const bad = tokens.find((t) => BLOCKED_WORDS.includes(t));
  if (bad) return { kind, readOnly: false, grows: false, blocked: `"${bad.toUpperCase()}" tidak diizinkan` };
  if (kind === "pragma") {
    if (!SAFE_PRAGMAS.has(tokens[1] ?? "") || clean.includes("=")) {
      return { kind, readOnly: false, grows: false, blocked: "PRAGMA ini tidak diizinkan (hanya PRAGMA baca skema)" };
    }
    return { kind, readOnly: true, grows: false };
  }
  if (kind === "select" || kind === "values" || kind === "explain") return { kind, readOnly: true, grows: false };
  if (kind === "with") {
    const writes = tokens.some((t) => t === "insert" || t === "update" || t === "delete");
    const grows = tokens.some((t) => t === "insert" || t === "update");
    return { kind, readOnly: !writes, grows };
  }
  const grows =
    kind === "insert" || kind === "replace" || kind === "update" || kind === "create" || (kind === "alter" && tokens.includes("add"));
  return { kind, readOnly: false, grows };
}

// ───────────── Eksekusi SQL (Hrana over HTTP) ─────────────
export type Cell = null | number | string | { blob: string };
export type Stmt = { sql: string; args?: unknown[] };
export type StmtResult = {
  columns: string[];
  rows: Cell[][];
  affected: number;
  lastInsertRowid: string | null;
  truncated: boolean;
  error?: string;
};
export type RunOpts = {
  access: "full-access" | "read-only";
  chain?: boolean; // statement berikutnya dilewati kalau yang sebelumnya gagal
  transaction?: boolean; // BEGIN ... COMMIT (otomatis ROLLBACK kalau ada yang gagal)
  maxRows: number;
  timeoutMs: number;
};

function toHrana(v: unknown): Record<string, unknown> {
  if (v === null || v === undefined) return { type: "null" };
  if (typeof v === "boolean") return { type: "integer", value: v ? "1" : "0" };
  if (typeof v === "number") {
    if (!Number.isFinite(v)) throw new HttpError(400, "bad_arg", "Argumen angka tidak valid.");
    return Number.isInteger(v) ? { type: "integer", value: String(v) } : { type: "float", value: v };
  }
  if (typeof v === "string") return { type: "text", value: v };
  if (typeof v === "object" && v && typeof (v as any).blob === "string") return { type: "blob", base64: (v as any).blob };
  throw new HttpError(400, "bad_arg", "Tipe argumen tidak didukung (gunakan string, angka, boolean, atau null).");
}

function fromHrana(v: any): Cell {
  switch (v?.type) {
    case "null":
      return null;
    case "integer": {
      const n = Number(v.value);
      return Number.isSafeInteger(n) ? n : String(v.value);
    }
    case "float":
      return Number(v.value);
    case "text":
      return String(v.value);
    case "blob":
      return { blob: String(v.base64 ?? "") };
    default:
      return null;
  }
}

export async function runStatements(
  db: Pick<DbRecord, "tursoName" | "hostname">,
  stmts: Stmt[],
  o: RunOpts
): Promise<{ results: StmtResult[]; ms: number }> {
  const steps: any[] = [];
  if (o.transaction) steps.push({ stmt: { sql: "BEGIN", want_rows: false } });
  const offset = steps.length;
  stmts.forEach((s) => {
    const idx = steps.length;
    const step: any = { stmt: { sql: s.sql, args: (s.args ?? []).map(toHrana), want_rows: true } };
    if ((o.chain || o.transaction) && idx > 0) step.condition = { type: "ok", step: idx - 1 };
    steps.push(step);
  });
  let commitIdx = -1;
  if (o.transaction) {
    commitIdx = steps.length;
    steps.push({ stmt: { sql: "COMMIT", want_rows: false }, condition: { type: "ok", step: commitIdx - 1 } });
    steps.push({ stmt: { sql: "ROLLBACK", want_rows: false }, condition: { type: "not", cond: { type: "ok", step: commitIdx } } });
  }
  const payload = JSON.stringify({ requests: [{ type: "batch", batch: { steps } }, { type: "close" }] });

  const started = Date.now();
  let json: any;
  for (let attempt = 0; attempt < 2; attempt++) {
    const jwt = await shortToken(db.tursoName, o.access);
    let res: Response;
    try {
      res = await fetch(`https://${db.hostname}/v2/pipeline`, {
        method: "POST",
        headers: { Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
        body: payload,
        cache: "no-store",
        signal: AbortSignal.timeout(o.timeoutMs),
      });
    } catch (e) {
      if ((e as Error)?.name === "TimeoutError" || (e as Error)?.name === "AbortError") {
        throw new HttpError(408, "timeout", `Query melebihi batas waktu (${Math.round(o.timeoutMs / 1000)} detik).`);
      }
      throw new HttpError(502, "turso_unreachable", "Database tidak bisa dihubungi.");
    }
    if (res.status === 401 && attempt === 0) {
      tokenCache.delete(`${db.tursoName}:${o.access}`);
      continue;
    }
    const text = await res.text();
    if (text.length > 25_000_000) throw new HttpError(413, "result_too_large", "Hasil query terlalu besar. Tambahkan LIMIT.");
    try {
      json = JSON.parse(text);
    } catch {
      throw new HttpError(502, "turso_bad_response", "Respons database tidak valid.");
    }
    if (!res.ok) throw new HttpError(502, "turso_error", `Database menolak permintaan (HTTP ${res.status}).`);
    break;
  }

  const first = json?.results?.[0];
  if (first?.type === "error") throw new HttpError(400, "sql_error", String(first?.error?.message ?? "Query gagal."));
  const br = first?.response?.result;
  if (!br) throw new HttpError(502, "turso_bad_response", "Respons database tidak dikenali.");

  if (o.transaction && br.step_errors?.[commitIdx]) {
    throw new HttpError(400, "sql_error", String(br.step_errors[commitIdx]?.message ?? "COMMIT gagal."));
  }

  const results: StmtResult[] = stmts.map((_, i) => {
    const err = br.step_errors?.[offset + i];
    const r = br.step_results?.[offset + i];
    if (err) return { columns: [], rows: [], affected: 0, lastInsertRowid: null, truncated: false, error: String(err.message ?? "Query gagal.") };
    if (!r) return { columns: [], rows: [], affected: 0, lastInsertRowid: null, truncated: false, error: "Dilewati karena statement sebelumnya gagal." };
    const allRows: any[][] = r.rows ?? [];
    return {
      columns: (r.cols ?? []).map((c: any) => String(c.name ?? "")),
      rows: allRows.slice(0, o.maxRows).map((row) => row.map(fromHrana)),
      affected: Number(r.affected_row_count ?? 0),
      lastInsertRowid: r.last_insert_rowid != null ? String(r.last_insert_rowid) : null,
      truncated: allRows.length > o.maxRows,
    };
  });
  return { results, ms: Date.now() - started };
}

// ───────────── Util identifier ─────────────
export const IDENT_RE = /^[A-Za-z_][A-Za-z0-9_]{0,62}$/;
export const q = (ident: string) => `"${ident.replace(/"/g, '""')}"`;
export function assertIdent(v: unknown, what = "Nama"): string {
  if (typeof v !== "string" || !IDENT_RE.test(v) || v.toLowerCase().startsWith("sqlite_")) {
    throw new HttpError(400, "invalid_identifier", `${what} tidak valid (huruf/angka/underscore, mulai dengan huruf atau _).`);
  }
  return v;
}

export type ColInfo = { cid: number; name: string; type: string; notnull: number; dflt: Cell; pk: number };

/** Info kolom + apakah tabel bisa diedit lewat rowid. Melempar 404 kalau tabel tidak ada. */
export async function tableMeta(db: DbRecord, table: string): Promise<{ cols: ColInfo[]; type: string; editable: boolean }> {
  const { results } = await runStatements(
    db,
    [
      { sql: "SELECT cid, name, type, \"notnull\", dflt_value, pk FROM pragma_table_info(?)", args: [table] },
      { sql: "SELECT type, sql FROM sqlite_master WHERE name = ? AND type IN ('table','view')", args: [table] },
    ],
    { access: "full-access", maxRows: 1000, timeoutMs: 15_000 }
  );
  const cols = results[0].rows.map((r) => ({ cid: Number(r[0]), name: String(r[1]), type: String(r[2] ?? ""), notnull: Number(r[3]), dflt: r[4], pk: Number(r[5]) }));
  if (!cols.length || !results[1].rows.length) throw new HttpError(404, "no_table", "Tabel tidak ditemukan.");
  const type = String(results[1].rows[0][0]);
  const ddl = String(results[1].rows[0][1] ?? "");
  return { cols, type, editable: type === "table" && !/without\s+rowid/i.test(ddl) };
}
