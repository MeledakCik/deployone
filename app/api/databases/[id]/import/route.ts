import { HttpError, kv, ok, readJson, route } from "../../../_lib/db-adapter";
import { authorize } from "../../../_lib/dbauth";
import { normalizeHeaders, parseCsv } from "../../../_lib/dbio";
import { analyzeStatement, assertCanGrow, assertIdent, q, runStatements, splitStatements, tableMeta, type Stmt } from "../../../_lib/turso";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
const MAX_CHARS = 2_000_000;
const MAX_CSV_ROWS = 5_000;
const MAX_SQL_STMTS = 5_000;
const TX_WORDS = new Set(["begin", "commit", "end", "rollback", "savepoint", "release"]);

// POST { kind:"sql", content } | { kind:"csv", table, content, hasHeader?, createTable? }
// Semua dijalankan dalam 1 transaksi: kalau satu gagal, semuanya dibatalkan.
export const POST = route(async (req: Request, { params }: { params: { id: string } }) => {
  const a = await authorize(req, params.id);
  const body = await readJson(req, MAX_CHARS + 2_000);
  const content = typeof body.content === "string" ? body.content : "";
  if (!content.trim()) throw new HttpError(400, "empty", "File kosong.");
  if (content.length > MAX_CHARS) throw new HttpError(413, "too_large", "File terlalu besar (maks 2MB).");
  const opts = { access: "full-access" as const, transaction: true, maxRows: 1, timeoutMs: 50_000 };

  if (body.kind === "sql") {
    const stmts = splitStatements(content);
    if (!stmts.length) throw new HttpError(400, "empty", "Tidak ada statement SQL.");
    if (stmts.length > MAX_SQL_STMTS) throw new HttpError(400, "too_many", `Maksimal ${MAX_SQL_STMTS} statement per import.`);
    for (const s of stmts) {
      const an = analyzeStatement(s);
      if (an.blocked) throw new HttpError(400, "blocked", `Statement diblokir: ${an.blocked}.`);
      if (TX_WORDS.has(an.kind)) throw new HttpError(400, "blocked", "Hapus BEGIN/COMMIT/ROLLBACK dari file; import sudah otomatis memakai transaksi.");
    }
    await assertCanGrow(a.db.ownerEmail, content.length * 2);
    const { results } = await runStatements(a.db, stmts.map((s) => ({ sql: s })), opts);
    const bad = results.findIndex((r) => r.error);
    if (bad >= 0) throw new HttpError(400, "sql_error", `Statement #${bad + 1} gagal: ${results[bad].error} (tidak ada perubahan yang disimpan).`);
    await kv.del(`db:${a.db.id}:usage`);
    return ok({ executed: stmts.length });
  }

  if (body.kind === "csv") {
    const table = assertIdent(body.table, "Nama tabel");
    const rows = parseCsv(content);
    const hasHeader = body.hasHeader !== false;
    if (!rows.length) throw new HttpError(400, "empty", "CSV kosong.");
    const width = rows[0].length;
    const header = normalizeHeaders(hasHeader ? rows[0] : Array.from({ length: width }, (_, i) => `kolom_${i + 1}`));
    const data = hasHeader ? rows.slice(1) : rows;
    if (!data.length) throw new HttpError(400, "empty", "CSV tidak punya baris data.");
    if (data.length > MAX_CSV_ROWS) throw new HttpError(400, "too_many", `Maksimal ${MAX_CSV_ROWS} baris per import CSV.`);
    if (data.some((r) => r.length !== width)) throw new HttpError(400, "ragged", "Jumlah kolom tidak konsisten di semua baris CSV.");

    const stmts: Stmt[] = [];
    let exists = true;
    try {
      const meta = await tableMeta(a.db, table);
      const names = new Set(meta.cols.map((c) => c.name));
      const missing = header.filter((h) => !names.has(h));
      if (missing.length) throw new HttpError(400, "bad_column", `Kolom CSV tidak ada di tabel: ${missing.join(", ")}.`);
    } catch (e) {
      if (!(e instanceof HttpError && e.code === "no_table")) throw e;
      exists = false;
    }
    if (!exists) {
      if (!body.createTable) throw new HttpError(404, "no_table", "Tabel tujuan belum ada. Centang \"buat tabel baru\".");
      stmts.push({ sql: `CREATE TABLE ${q(table)} (${header.map((h) => `${q(h)} TEXT`).join(", ")})` });
    }
    const ins = `INSERT INTO ${q(table)} (${header.map(q).join(", ")}) VALUES (${header.map(() => "?").join(", ")})`;
    for (const r of data) stmts.push({ sql: ins, args: r.map((v) => (v === "" ? null : v)) });

    await assertCanGrow(a.db.ownerEmail, content.length * 2);
    const { results } = await runStatements(a.db, stmts, opts);
    const bad = results.findIndex((r) => r.error);
    if (bad >= 0) throw new HttpError(400, "sql_error", `Baris ke-${bad + 1} gagal: ${results[bad].error} (tidak ada perubahan yang disimpan).`);
    await kv.del(`db:${a.db.id}:usage`);
    return ok({ inserted: data.length, createdTable: !exists });
  }

  throw new HttpError(400, "bad_kind", 'kind harus "sql" atau "csv".');
});
