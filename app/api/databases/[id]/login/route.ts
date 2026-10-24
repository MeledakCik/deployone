import { HttpError, clientIp, ok, rateLimit, readJson, route } from "../../../_lib/db-adapter";
import { assertSameOrigin, clearSessionCookie, getDummyHash, makeSessionCookie, safeEqualStr, verifyPassword } from "../../../_lib/dbauth";
import { getDb } from "../../../_lib/dbrepo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Ctx = { params: { id: string } };

// POST { username, password } — login ke panel admin database di tab terpisah
export const POST = route(async (req: Request, { params }: Ctx) => {
  assertSameOrigin(req);
  await rateLimit(`dblogin:${clientIp(req)}:${params.id}`, 10, 300, "Terlalu banyak percobaan login. Coba lagi dalam beberapa menit.");
  const body = await readJson(req, 2_000);
  const username = typeof body.username === "string" ? body.username : "";
  const password = typeof body.password === "string" ? body.password : "";
  const db = await getDb(params.id);
  const passOk = await verifyPassword(password, db?.passwordHash ?? (await getDummyHash()));
  const userOk = db ? safeEqualStr(username, db.username) : false;
  if (!db || !userOk || !passOk) throw new HttpError(401, "bad_credentials", "Username atau password salah.");
  return ok({ loggedIn: true }, 200, { "Set-Cookie": makeSessionCookie(db) });
});

// DELETE — logout
export const DELETE = route(async (req: Request, { params }: Ctx) => {
  assertSameOrigin(req);
  return ok({ loggedOut: true }, 200, { "Set-Cookie": clearSessionCookie(params.id) });
});
