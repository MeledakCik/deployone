import { HttpError, kv, ok, readJson, route } from "../../_lib/db-adapter";
import { listUserDbIds, nameLockKey, saveDb, setUserDbIds, toPublic, validateName } from "../../_lib/dbrepo";
import { authorize } from "../../_lib/dbauth";
import { QUOTA_BYTES } from "../../_lib/db-adapter";
import { dbUsageBytes, deleteTursoDb, userUsage } from "../../_lib/turso";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Ctx = { params: { id: string } };

export const GET = route(async (req: Request, { params }: Ctx) => {
  const a = await authorize(req, params.id);
  const [usage, total] = await Promise.all([dbUsageBytes(a.db), userUsage(a.db.ownerEmail)]);
  return ok({
    database: toPublic(a.db, a.via === "owner"),
    access: a.via,
    usageBytes: usage,
    userUsedBytes: total.total,
    quotaBytes: QUOTA_BYTES,
  });
});

// PATCH { name } — rename (pemilik saja)
export const PATCH = route(async (req: Request, { params }: Ctx) => {
  const a = await authorize(req, params.id, { ownerOnly: true });
  const body = await readJson(req, 2_000);
  const name = validateName(body.name);
  if (name === a.db.displayName) return ok({ database: toPublic(a.db, true) });
  const got = await kv.setnx(nameLockKey(a.db.ownerEmail, name), a.db.id);
  if (!got) throw new HttpError(409, "name_taken", "Nama database sudah kamu pakai.");
  const old = a.db.displayName;
  a.db.displayName = name;
  await saveDb(a.db);
  await kv.del(nameLockKey(a.db.ownerEmail, old));
  return ok({ database: toPublic(a.db, true) });
});

// DELETE { confirm: "<nama database>" } — hapus permanen (pemilik saja)
export const DELETE = route(async (req: Request, { params }: Ctx) => {
  const a = await authorize(req, params.id, { ownerOnly: true });
  const body = await readJson(req, 2_000);
  if (body.confirm !== a.db.displayName) throw new HttpError(400, "confirm_mismatch", "Konfirmasi nama database tidak cocok.");
  await deleteTursoDb(a.db.tursoName);
  await kv.del(`db:${a.db.id}`);
  await kv.del(`db:${a.db.id}:usage`);
  await kv.del(nameLockKey(a.db.ownerEmail, a.db.displayName));
  const ids = await listUserDbIds(a.db.ownerEmail);
  await setUserDbIds(a.db.ownerEmail, ids.filter((x) => x !== a.db.id));
  return ok({ deleted: true });
});
