import { HttpError, PANEL_MAX_ROWS, PANEL_TIMEOUT_MS, kv, ok, readJson, route } from "../../../_lib/db-adapter";
import { authorize } from "../../../_lib/dbauth";
import { analyzeStatement, assertCanGrow, runStatements, splitStatements } from "../../../_lib/turso";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// POST { sql } — jalankan SQL (boleh banyak statement) dari panel admin
export const POST = route(async (req: Request, { params }: { params: { id: string } }) => {
  const a = await authorize(req, params.id);
  const body = await readJson(req, 300_000);
  const sql = typeof body.sql === "string" ? body.sql : "";
  const stmts = splitStatements(sql);
  if (!stmts.length) throw new HttpError(400, "empty", "SQL kosong.");
  if (stmts.length > 50) throw new HttpError(400, "too_many", "Maksimal 50 statement per eksekusi.");
  const analyses = stmts.map(analyzeStatement);
  const blocked = analyses.find((x) => x.blocked);
  if (blocked) throw new HttpError(400, "blocked", `Statement diblokir: ${blocked.blocked}.`);
  const writes = analyses.some((x) => !x.readOnly);
  if (analyses.some((x) => x.grows)) await assertCanGrow(a.db.ownerEmail, sql.length);

  const { results, ms } = await runStatements(a.db, stmts.map((s) => ({ sql: s })), {
    access: "full-access",
    chain: true,
    maxRows: PANEL_MAX_ROWS,
    timeoutMs: PANEL_TIMEOUT_MS,
  });
  if (writes) await kv.del(`db:${a.db.id}:usage`);
  return ok({ results: results.map((r, i) => ({ sql: stmts[i], ...r })), ms });
});
