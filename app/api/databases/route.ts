import { MAX_DBS_PER_USER, QUOTA_BYTES, HttpError, kv, ok, rateLimit, randomPassword, randomString, readJson, requireEmail, route } from "../_lib/db-adapter";
import { getDb, listUserDbIds, nameLockKey, saveDb, setUserDbIds, toPublic, validateName, type DbRecord } from "../_lib/dbrepo";
import { hashPassword, newApiKey } from "../_lib/dbauth";
import { assertCanGrow, createTursoDb, dbUsageBytes, deleteTursoDb } from "../_lib/turso";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/databases — daftar database milik user + pemakaian kuota
export const GET = route(async (req: Request) => {
  const email = await requireEmail(req);
  const ids = await listUserDbIds(email);
  const recs = (await Promise.all(ids.map(getDb))).filter(Boolean) as DbRecord[];
  const usages = await Promise.all(recs.map((r) => dbUsageBytes(r)));
  return ok({
    databases: recs.map((r, i) => ({ ...toPublic(r, false), usageBytes: usages[i] })),
    usedBytes: usages.reduce<number>((a, b) => a + (b ?? 0), 0),
    usageUnknown: usages.some((u) => u === null),
    quotaBytes: QUOTA_BYTES,
    maxDatabases: MAX_DBS_PER_USER,
  });
});

// POST /api/databases { name } — buat database baru
export const POST = route(async (req: Request) => {
  const email = await requireEmail(req);
  const body = await readJson(req, 2_000);
  const name = validateName(body.name);
  await rateLimit(`dbcreate:${email}`, 5, 3600, "Terlalu banyak pembuatan database. Coba lagi nanti.");

  const ids = await listUserDbIds(email);
  if (ids.length >= MAX_DBS_PER_USER) throw new HttpError(409, "limit_reached", `Maksimal ${MAX_DBS_PER_USER} database per akun.`);
  await assertCanGrow(email, 0);

  const id = randomString(16);
  const lockOk = await kv.setnx(nameLockKey(email, name), id);
  if (!lockOk) throw new HttpError(409, "name_taken", "Nama database sudah kamu pakai.");

  const tursoName = `dp-${randomString(14)}`;
  let created = false;
  try {
    const { hostname } = await createTursoDb(tursoName);
    created = true;
    const password = randomPassword();
    const ro = newApiKey("ro", "Read-only");
    const rw = newApiKey("rw", "Read-write");
    const rec: DbRecord = {
      id,
      ownerEmail: email,
      displayName: name,
      tursoName,
      hostname,
      createdAt: Date.now(),
      username: `u_${randomString(8)}`,
      passwordHash: await hashPassword(password),
      credVersion: 1,
      keys: [ro.rec, rw.rec],
    };
    await saveDb(rec);
    await setUserDbIds(email, [...(await listUserDbIds(email)), id]);
    return ok(
      {
        database: toPublic(rec, true),
        credentials: { username: rec.username, password }, // tampil SEKALI
        apiKeys: [
          { ...ro.rec, hash: undefined, plain: ro.plain },
          { ...rw.rec, hash: undefined, plain: rw.plain },
        ],
      },
      201
    );
  } catch (e) {
    await kv.del(nameLockKey(email, name)).catch(() => {});
    if (created) await deleteTursoDb(tursoName).catch(() => {});
    throw e;
  }
});
