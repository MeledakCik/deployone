import { ok, randomPassword, route } from "../../../_lib/db-adapter";
import { saveDb } from "../../../_lib/dbrepo";
import { authorize, hashPassword } from "../../../_lib/dbauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST — reset password (tampil sekali). Semua sesi login database lama otomatis tidak valid.
export const POST = route(async (req: Request, { params }: { params: { id: string } }) => {
  const a = await authorize(req, params.id, { ownerOnly: true });
  const password = randomPassword();
  a.db.passwordHash = await hashPassword(password);
  a.db.credVersion += 1;
  await saveDb(a.db);
  return ok({ credentials: { username: a.db.username, password } });
});
