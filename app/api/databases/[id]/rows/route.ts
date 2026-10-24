import { HttpError, PANEL_TIMEOUT_MS, kv, ok, readJson, route } from "../../../_lib/db-adapter";
import { authorize } from "../../../_lib/dbauth";
import { assertCanGrow, assertIdent, q, runStatements, tableMeta } from "../../../_lib/turso";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;
type Ctx = { params: { id: string } };
const run = { access: "full-access" as const, maxRows: 1000, timeoutMs: PANEL_TIMEOUT_MS };

function cleanValues(values: unknown, cols: { name: string }[]): [string, string | number | null][] {
  if (!values || typeof values !== "object" || Array.isArray(values)) throw new HttpError(400, "bad_values", "values harus berupa objek.");
  const allowed = new Set(cols.map((c) => c.name));
  return Object.entries(values as Record<string, unknown>).map(([k, v]) => {
    if (!allowed.has(k)) throw new HttpError(400, "bad_column", `Kolom "${k}" tidak ada di tabel.`);
    if (v !== null && typeof v !== "string" && typeof v !== "number" && typeof v !== "boolean") {
      throw new HttpError(400, "bad_value", `Nilai kolom "${k}" tidak valid.`);
    }
    return [k, typeof v === "boolean" ? (v ? 1 : 0) : (v as string | number | null)];
  });
}

function parseRid(v: unknown): number {
  const n = typeof v === "string" && /^-?\d+$/.test(v) ? Number(v) : v;
  if (typeof n !== "number" || !Number.isSafeInteger(n)) throw new HttpError(400, "bad_rid", "rid tidak valid.");
  return n;
}

// GET ?table=&page=&pageSize=&sort=&dir=
export const GET = route(async (req: Request, { params }: Ctx) => {
  const a = await authorize(req, params.id);
  const u = new URL(req.url);
  const table = assertIdent(u.searchParams.get("table"), "Nama tabel");
  const page = Math.max(1, parseInt(u.searchParams.get("page") || "1", 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(u.searchParams.get("pageSize") || "50", 10) || 50));
  const meta = await tableMeta(a.db, table);
  const sort = u.searchParams.get("sort");
  const dir = u.searchParams.get("dir") === "desc" ? "DESC" : "ASC";
  const order = sort && meta.cols.some((c) => c.name === sort) ? `ORDER BY ${q(sort)} ${dir}` : meta.editable ? "ORDER BY rowid" : "";
  const { results } = await runStatements(
    a.db,
    [
      { sql: `SELECT ${meta.editable ? "rowid AS __rid, " : ""}* FROM ${q(table)} ${order} LIMIT ? OFFSET ?`, args: [pageSize, (page - 1) * pageSize] },
      { sql: `SELECT count(*) FROM ${q(table)}` },
    ],
    run
  );
  if (results[0].error) throw new HttpError(400, "sql_error", results[0].error);
  const r = results[0];
  const rids = meta.editable ? r.rows.map((row) => row[0]) : [];
  return ok({
    columns: meta.editable ? r.columns.slice(1) : r.columns,
    colInfo: meta.cols,
    rows: meta.editable ? r.rows.map((row) => row.slice(1)) : r.rows,
    rids,
    total: results[1].rows[0]?.[0] ?? 0,
    page,
    pageSize,
    editable: meta.editable,
  });
});

// POST { table, values } — tambah row
export const POST = route(async (req: Request, { params }: Ctx) => {
  const a = await authorize(req, params.id);
  const body = await readJson(req, 500_000);
  const table = assertIdent(body.table, "Nama tabel");
  const meta = await tableMeta(a.db, table);
  if (meta.type !== "table") throw new HttpError(400, "not_table", "Hanya tabel biasa yang bisa diubah.");
  const entries = cleanValues(body.values, meta.cols);
  await assertCanGrow(a.db.ownerEmail, JSON.stringify(entries).length);
  const sql = entries.length
    ? `INSERT INTO ${q(table)} (${entries.map(([k]) => q(k)).join(", ")}) VALUES (${entries.map(() => "?").join(", ")})`
    : `INSERT INTO ${q(table)} DEFAULT VALUES`;
  const { results } = await runStatements(a.db, [{ sql, args: entries.map(([, v]) => v) }], run);
  if (results[0].error) throw new HttpError(400, "sql_error", results[0].error);
  await kv.del(`db:${a.db.id}:usage`);
  return ok({ affected: results[0].affected, lastInsertRowid: results[0].lastInsertRowid }, 201);
});

// PATCH { table, rid, values } — ubah row
export const PATCH = route(async (req: Request, { params }: Ctx) => {
  const a = await authorize(req, params.id);
  const body = await readJson(req, 500_000);
  const table = assertIdent(body.table, "Nama tabel");
  const meta = await tableMeta(a.db, table);
  if (!meta.editable) throw new HttpError(400, "not_editable", "Tabel ini tidak bisa diedit lewat Browse.");
  const entries = cleanValues(body.values, meta.cols);
  if (!entries.length) throw new HttpError(400, "empty", "Tidak ada perubahan.");
  await assertCanGrow(a.db.ownerEmail, JSON.stringify(entries).length);
  const sql = `UPDATE ${q(table)} SET ${entries.map(([k]) => `${q(k)} = ?`).join(", ")} WHERE rowid = ?`;
  const { results } = await runStatements(a.db, [{ sql, args: [...entries.map(([, v]) => v), parseRid(body.rid)] }], run);
  if (results[0].error) throw new HttpError(400, "sql_error", results[0].error);
  await kv.del(`db:${a.db.id}:usage`);
  return ok({ affected: results[0].affected });
});

// DELETE { table, rid } — hapus row (tetap diizinkan walau kuota penuh)
export const DELETE = route(async (req: Request, { params }: Ctx) => {
  const a = await authorize(req, params.id);
  const body = await readJson(req, 5_000);
  const table = assertIdent(body.table, "Nama tabel");
  const meta = await tableMeta(a.db, table);
  if (!meta.editable) throw new HttpError(400, "not_editable", "Tabel ini tidak bisa diedit lewat Browse.");
  const { results } = await runStatements(a.db, [{ sql: `DELETE FROM ${q(table)} WHERE rowid = ?`, args: [parseRid(body.rid)] }], run);
  if (results[0].error) throw new HttpError(400, "sql_error", results[0].error);
  await kv.del(`db:${a.db.id}:usage`);
  return ok({ affected: results[0].affected });
});
