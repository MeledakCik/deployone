import { HttpError, MAX_ACTIVE_KEYS, ok, readJson, route } from "../../../_lib/db-adapter";
import { saveDb, toPublic } from "../../../_lib/dbrepo";
import { authorize, newApiKey } from "../../../_lib/dbauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Ctx = { params: { id: string } };

export const GET = route(async (req: Request, { params }: Ctx) => {
  const a = await authorize(req, params.id, { ownerOnly: true });
  return ok({ keys: toPublic(a.db, true).keys });
});

// POST { label, mode: "ro" | "rw" } — key asli hanya tampil sekali
export const POST = route(async (req: Request, { params }: Ctx) => {
  const a = await authorize(req, params.id, { ownerOnly: true });
  const body = await readJson(req, 2_000);
  const mode = body.mode === "rw" ? "rw" : body.mode === "ro" ? "ro" : null;
  if (!mode) throw new HttpError(400, "bad_mode", 'mode harus "ro" atau "rw".');
  const label = typeof body.label === "string" ? body.label.trim().slice(0, 40) : "";
  if (!label) throw new HttpError(400, "bad_label", "Label wajib diisi (maks 40 karakter).");
  if (a.db.keys.filter((k) => !k.revokedAt).length >= MAX_ACTIVE_KEYS) {
    throw new HttpError(409, "too_many_keys", `Maksimal ${MAX_ACTIVE_KEYS} API key aktif. Cabut salah satu dulu.`);
  }
  const { plain, rec } = newApiKey(mode, label);
  a.db.keys.push(rec);
  await saveDb(a.db);
  const { hash: _h, ...pub } = rec;
  return ok({ key: plain, record: pub }, 201);
});
