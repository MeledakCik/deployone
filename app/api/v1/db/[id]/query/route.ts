import { NextResponse } from "next/server";
import { API_MAX_ROWS, API_RATE_LIMIT_PER_MIN, API_TIMEOUT_MS, HttpError, clientIp, fail, ok, rateLimit, route } from "../../../../_lib/db-adapter";
import { findKey } from "../../../../_lib/dbauth";
import { getDb } from "../../../../_lib/dbrepo";
import { analyzeStatement, assertCanGrow, runStatements, splitStatements } from "../../../../_lib/turso";
import { kv } from "../../../../_lib/db-adapter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
export const OPTIONS = () => new NextResponse(null, { status: 204, headers: CORS });

/**
 * POST /api/v1/db/<id>/query
 * Header: Authorization: Bearer <api_key>     Body: { "sql": "...", "args": [...] }
 * Hanya Bearer key (tanpa cookie), jadi aman dengan CORS "*".
 */
export const POST = route(async (req: Request, { params }: { params: { id: string } }) => {
  const ip = clientIp(req);
  await rateLimit(`apibad:${ip}`, 120, 60); // peredam brute force/scan
  const m = /^Bearer\s+(dpk_(?:ro|rw)_[A-Za-z0-9]{40})$/.exec(req.headers.get("authorization") || "");
  const db = m ? await getDb(params.id) : null;
  const key = db && m ? findKey(db, m[1]) : null;
  if (!db || !key) return fail(401, "unauthorized", "API key tidak valid atau sudah dicabut.", CORS);

  await rateLimit(`api:${db.id}:${key.id}`, API_RATE_LIMIT_PER_MIN, 60, `Batas ${API_RATE_LIMIT_PER_MIN} request/menit per API key terlampaui.`);

  const text = await req.text();
  if (text.length > 100_000) throw new HttpError(413, "too_large", "Body terlalu besar.");
  let body: any;
  try {
    body = JSON.parse(text);
  } catch {
    throw new HttpError(400, "bad_json", "Body JSON tidak valid.");
  }
  const sql = typeof body?.sql === "string" ? body.sql : "";
  const args = body?.args === undefined ? [] : body.args;
  if (!Array.isArray(args) || args.length > 100) throw new HttpError(400, "bad_args", "args harus array (maks 100).");
  const stmts = splitStatements(sql);
  if (stmts.length !== 1) throw new HttpError(400, "single_statement", "Kirim tepat satu statement SQL per request.");
  const an = analyzeStatement(stmts[0]);
  if (an.blocked) throw new HttpError(400, "blocked", `Statement diblokir: ${an.blocked}.`);
  if (key.mode === "ro" && !(an.readOnly && an.kind !== "pragma")) {
    throw new HttpError(403, "read_only_key", "API key read-only hanya boleh SELECT.");
  }
  if (an.grows) await assertCanGrow(db.ownerEmail, sql.length);

  const { results } = await runStatements(db, [{ sql: stmts[0], args }], {
    access: key.mode === "ro" ? "read-only" : "full-access", // lapis kedua: token Turso read-only
    maxRows: API_MAX_ROWS,
    timeoutMs: API_TIMEOUT_MS,
  });
  const r = results[0];
  if (r.error) throw new HttpError(400, "sql_error", r.error);
  if (!an.readOnly) await kv.del(`db:${db.id}:usage`);
  const res = ok({ columns: r.columns, rows: r.rows, rowsAffected: r.affected, lastInsertRowid: r.lastInsertRowid, truncated: r.truncated, maxRows: API_MAX_ROWS });
  Object.entries(CORS).forEach(([k, v]) => res.headers.set(k, v));
  return res;
});
