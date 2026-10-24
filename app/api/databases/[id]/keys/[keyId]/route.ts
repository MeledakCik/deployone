import { HttpError, ok, route } from "../../../../_lib/db-adapter";
import { saveDb } from "../../../../_lib/dbrepo";
import { authorize } from "../../../../_lib/dbauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// DELETE — cabut API key (token Turso tidak diganti)
export const DELETE = route(async (req: Request, { params }: { params: { id: string; keyId: string } }) => {
  const a = await authorize(req, params.id, { ownerOnly: true });
  const k = a.db.keys.find((x) => x.id === params.keyId);
  if (!k) throw new HttpError(404, "not_found", "API key tidak ditemukan.");
  if (!k.revokedAt) {
    k.revokedAt = Date.now();
    await saveDb(a.db);
  }
  return ok({ revoked: true });
});
