import { HttpError, route } from "../../../_lib/db-adapter";
import { authorize } from "../../../_lib/dbauth";
import { csvEscape, sqlLiteral } from "../../../_lib/dbio";
import { assertIdent, q, runStatements, type Cell } from "../../../_lib/turso";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
const MAX_EXPORT_ROWS = 50_000;

// GET ?format=sql            -> dump seluruh database (.sql)
// GET ?format=csv&table=nama -> satu tabel (.csv)
export const GET = route(async (req: Request, { params }: { params: { id: string } }) => {
  const a = await authorize(req, params.id);
  const u = new URL(req.url);
  const format = u.searchParams.get("format") === "csv" ? "csv" : "sql";
  const run = { access: "full-access" as const, maxRows: MAX_EXPORT_ROWS + 1, timeoutMs: 45_000 };
  const headers = (ext: string, type: string) => ({
    "Content-Type": `${type}; charset=utf-8`,
    "Content-Disposition": `attachment; filename="${a.db.displayName}.${ext}"`,
    "Cache-Control": "no-store",
  });

  if (format === "csv") {
    const table = assertIdent(u.searchParams.get("table"), "Nama tabel");
    const { results } = await runStatements(a.db, [{ sql: `SELECT * FROM ${q(table)}` }], run);
    const r = results[0];
    if (r.error) throw new HttpError(400, "sql_error", r.error);
    if (r.rows.length > MAX_EXPORT_ROWS) throw new HttpError(413, "too_large", `Tabel melebihi ${MAX_EXPORT_ROWS} baris. Ekspor sebagian lewat tab SQL.`);
    const lines = [r.columns.map((c) => csvEscape(c)).join(","), ...r.rows.map((row) => row.map(csvEscape).join(","))];
    return new Response("\uFEFF" + lines.join("\r\n") + "\r\n", { headers: headers("csv", "text/csv") });
  }

  const master = await runStatements(
    a.db,
    [{ sql: "SELECT type, name, sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%'" }],
    run
  );
  const objs = master.results[0].rows.map((r) => ({ type: String(r[0]), name: String(r[1]), sql: String(r[2]) }));
  const tables = objs.filter((o) => o.type === "table");
  const out: string[] = [`-- Depup export: ${a.db.displayName}`, `-- ${new Date().toISOString()}`, ""];
  for (const t of tables) out.push(t.sql + ";");
  let budget = MAX_EXPORT_ROWS;
  for (const t of tables) {
    const { results } = await runStatements(a.db, [{ sql: `SELECT * FROM ${q(t.name)}` }], { ...run, maxRows: budget + 1 });
    const r = results[0];
    if (r.error) throw new HttpError(400, "sql_error", r.error);
    if (r.rows.length > budget) throw new HttpError(413, "too_large", `Database melebihi ${MAX_EXPORT_ROWS} baris. Ekspor per tabel (CSV).`);
    budget -= r.rows.length;
    const cols = r.columns.map((c) => q(c)).join(", ");
    for (const row of r.rows as Cell[][]) out.push(`INSERT INTO ${q(t.name)} (${cols}) VALUES (${row.map(sqlLiteral).join(", ")});`);
  }
  for (const typ of ["index", "view", "trigger"]) for (const o of objs.filter((x) => x.type === typ)) out.push(o.sql + ";");
  return new Response(out.join("\n") + "\n", { headers: headers("sql", "application/sql") });
});
