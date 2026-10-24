import { HttpError, PANEL_TIMEOUT_MS, kv, ok, readJson, route } from "../../../_lib/db-adapter";
import { authorize } from "../../../_lib/dbauth";
import { IDENT_RE, analyzeStatement, assertCanGrow, assertIdent, q, runStatements } from "../../../_lib/turso";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;
type Ctx = { params: { id: string } };

// GET — daftar tabel/view + kolom + index + jumlah baris
export const GET = route(async (req: Request, { params }: Ctx) => {
  const a = await authorize(req, params.id);
  const opts = { access: "full-access" as const, maxRows: 5000, timeoutMs: PANEL_TIMEOUT_MS };
  const master = await runStatements(
    a.db,
    [{ sql: "SELECT type, name, tbl_name, sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY type, name" }],
    opts
  );
  const rows = master.results[0].rows.map((r) => ({ type: String(r[0]), name: String(r[1]), tbl: String(r[2]), sql: r[3] == null ? null : String(r[3]) }));
  const tables = rows.filter((r) => r.type === "table" || r.type === "view").slice(0, 100);
  const indexes = rows.filter((r) => r.type === "index");
  const triggers = rows.filter((r) => r.type === "trigger").map((r) => ({ name: r.name, table: r.tbl, sql: r.sql }));

  const stmts = tables.flatMap((t) => [
    { sql: 'SELECT cid, name, type, "notnull", dflt_value, pk FROM pragma_table_info(?)', args: [t.name] },
    { sql: 'SELECT name, "unique", origin FROM pragma_index_list(?)', args: [t.name] },
    { sql: `SELECT count(*) FROM ${q(t.name)}` },
  ]);
  const detail = stmts.length ? (await runStatements(a.db, stmts, opts)).results : [];
  const out = tables.map((t, i) => {
    const [cols, idx, cnt] = [detail[i * 3], detail[i * 3 + 1], detail[i * 3 + 2]];
    return {
      name: t.name,
      type: t.type,
      sql: t.sql,
      rowCount: cnt?.rows?.[0]?.[0] ?? null,
      columns: (cols?.rows ?? []).map((r) => ({ cid: r[0], name: r[1], type: r[2], notnull: r[3], dflt: r[4], pk: r[5] })),
      indexes: (idx?.rows ?? []).map((r) => ({
        name: String(r[0]),
        unique: Number(r[1]) === 1,
        origin: String(r[2]),
        sql: indexes.find((x) => x.name === r[0])?.sql ?? null,
      })),
    };
  });
  return ok({ tables: out, triggers });
});

// ───────────── POST: operasi struktur (DDL) lewat form, bukan SQL mentah ─────────────
const TYPES = new Set(["INTEGER", "TEXT", "REAL", "BLOB", "NUMERIC"]);

function defaultSql(v: unknown): string {
  if (typeof v !== "string" || v.trim() === "") return "";
  const t = v.trim();
  if (/^-?\d+(\.\d+)?$/.test(t)) return ` DEFAULT ${t}`;
  if (t.toUpperCase() === "NULL") return " DEFAULT NULL";
  if (t.toUpperCase() === "CURRENT_TIMESTAMP") return " DEFAULT CURRENT_TIMESTAMP";
  return ` DEFAULT '${t.replace(/'/g, "''")}'`;
}

function colType(v: unknown): string {
  const t = typeof v === "string" ? v.toUpperCase() : "TEXT";
  if (!TYPES.has(t)) throw new HttpError(400, "bad_type", `Tipe kolom harus salah satu dari: ${[...TYPES].join(", ")}.`);
  return t;
}

function buildDdl(b: Record<string, any>): string {
  switch (b.action) {
    case "createTable": {
      const table = assertIdent(b.name, "Nama tabel");
      const cols: any[] = Array.isArray(b.columns) ? b.columns : [];
      if (!cols.length || cols.length > 100) throw new HttpError(400, "bad_columns", "Tabel butuh 1–100 kolom.");
      const names = new Set<string>();
      const pkCols = cols.filter((c) => c.pk);
      const inlineAutoPk = pkCols.length === 1 && colType(pkCols[0].type) === "INTEGER" && pkCols[0].autoincrement;
      const defs = cols.map((c) => {
        const n = assertIdent(c.name, "Nama kolom");
        if (names.has(n.toLowerCase())) throw new HttpError(400, "dup_column", `Kolom "${n}" duplikat.`);
        names.add(n.toLowerCase());
        const t = colType(c.type);
        if (inlineAutoPk && c.pk) return `${q(n)} INTEGER PRIMARY KEY AUTOINCREMENT`;
        return `${q(n)} ${t}${c.notNull ? " NOT NULL" : ""}${c.unique ? " UNIQUE" : ""}${defaultSql(c.default)}`;
      });
      if (pkCols.length && !inlineAutoPk) defs.push(`PRIMARY KEY (${pkCols.map((c) => q(assertIdent(c.name))).join(", ")})`);
      return `CREATE TABLE ${q(table)} (${defs.join(", ")})`;
    }
    case "dropTable":
      return `DROP TABLE ${q(assertIdent(b.table, "Nama tabel"))}`;
    case "addColumn": {
      const c = b.column ?? {};
      const n = assertIdent(c.name, "Nama kolom");
      const def = defaultSql(c.default);
      if (c.notNull && !def) throw new HttpError(400, "need_default", "Kolom NOT NULL yang ditambahkan ke tabel berisi harus punya nilai default.");
      return `ALTER TABLE ${q(assertIdent(b.table, "Nama tabel"))} ADD COLUMN ${q(n)} ${colType(c.type)}${c.notNull ? " NOT NULL" : ""}${def}`;
    }
    case "dropColumn":
      return `ALTER TABLE ${q(assertIdent(b.table, "Nama tabel"))} DROP COLUMN ${q(assertIdent(b.column, "Nama kolom"))}`;
    case "createIndex": {
      const cols: unknown[] = Array.isArray(b.columns) ? b.columns : [];
      if (!cols.length || cols.length > 16) throw new HttpError(400, "bad_columns", "Index butuh 1–16 kolom.");
      return `CREATE ${b.unique ? "UNIQUE " : ""}INDEX ${q(assertIdent(b.name, "Nama index"))} ON ${q(assertIdent(b.table, "Nama tabel"))} (${cols.map((c) => q(assertIdent(c, "Nama kolom"))).join(", ")})`;
    }
    case "dropIndex":
      return `DROP INDEX ${q(assertIdent(b.name, "Nama index"))}`;
    default:
      throw new HttpError(400, "bad_action", "Aksi tidak dikenal.");
  }
}

export const POST = route(async (req: Request, { params }: Ctx) => {
  const a = await authorize(req, params.id);
  const body = await readJson(req, 50_000);
  const sql = buildDdl(body);
  const an = analyzeStatement(sql);
  if (an.blocked) throw new HttpError(400, "blocked", an.blocked);
  if (an.grows) await assertCanGrow(a.db.ownerEmail, 0);
  const { results } = await runStatements(a.db, [{ sql }], { access: "full-access", maxRows: 1, timeoutMs: PANEL_TIMEOUT_MS });
  if (results[0].error) throw new HttpError(400, "sql_error", results[0].error);
  await kv.del(`db:${a.db.id}:usage`);
  return ok({ sql });
});

void IDENT_RE;
