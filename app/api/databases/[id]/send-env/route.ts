import { HttpError, ok, readJson, route } from "../../../_lib/db-adapter";
import { authorize } from "../../../_lib/dbauth";
import { mintToken } from "../../../_lib/turso";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Ctx = { params: { id: string } };

/**
 * Menyuntik TURSO_DATABASE_URL + TURSO_AUTH_TOKEN ke project Vercel pilihan user.
 * Token Vercel dikirim lewat header `x-vercel-token` (pola yang sama dengan route deploy) dan TIDAK disimpan/di-log.
 * CATATAN: route env Vercel yang sudah ada di app/api/vercel/env/* tidak terlihat oleh saya, jadi route ini
 * memanggil Vercel REST API langsung (POST /v10/projects/{id}/env?upsert=true). Kalau mau memakai route lama,
 * ganti blok fetch di bawah dengan pemanggilan helper di _lib/vercel.ts.
 */
function vercelToken(req: Request): string {
  const t = req.headers.get("x-vercel-token");
  if (!t) throw new HttpError(400, "no_token", "Token Vercel diperlukan (header x-vercel-token).");
  return t;
}
const teamQuery = (teamId: unknown) => {
  if (teamId == null || teamId === "") return "";
  if (typeof teamId !== "string" || !/^team_[A-Za-z0-9]+$/.test(teamId)) throw new HttpError(400, "bad_team", "teamId tidak valid.");
  return `&teamId=${teamId}`;
};

// GET — daftar project Vercel milik token tersebut (untuk dropdown)
export const GET = route(async (req: Request, { params }: Ctx) => {
  await authorize(req, params.id, { ownerOnly: true });
  const token = vercelToken(req);
  const teamId = new URL(req.url).searchParams.get("teamId");
  const res = await fetch(`https://api.vercel.com/v9/projects?limit=100${teamQuery(teamId)}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const j: any = await res.json().catch(() => ({}));
  if (!res.ok) throw new HttpError(res.status === 403 || res.status === 401 ? 401 : 502, "vercel_error", `Vercel: ${j?.error?.message ?? res.status}`);
  return ok({ projects: (j.projects ?? []).map((p: any) => ({ id: String(p.id), name: String(p.name) })) });
});

// POST { project, mode?: "full-access" | "read-only", teamId? }
export const POST = route(async (req: Request, { params }: Ctx) => {
  const a = await authorize(req, params.id, { ownerOnly: true });
  const token = vercelToken(req);
  const body = await readJson(req, 2_000);
  const project = typeof body.project === "string" ? body.project : "";
  if (!/^[A-Za-z0-9._-]{1,100}$/.test(project)) throw new HttpError(400, "bad_project", "Project Vercel tidak valid.");
  const mode = body.mode === "read-only" ? "read-only" : "full-access";

  const jwt = await mintToken(a.db.tursoName, mode, "never");
  const targets = ["production", "preview", "development"];
  const res = await fetch(`https://api.vercel.com/v10/projects/${encodeURIComponent(project)}/env?upsert=true${teamQuery(body.teamId)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify([
      { key: "TURSO_DATABASE_URL", value: `libsql://${a.db.hostname}`, type: "encrypted", target: targets },
      { key: "TURSO_AUTH_TOKEN", value: jwt, type: "encrypted", target: targets },
    ]),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const j: any = await res.json().catch(() => ({}));
  if (!res.ok) throw new HttpError(res.status === 401 || res.status === 403 ? 401 : 502, "vercel_error", `Vercel: ${j?.error?.message ?? res.status}`);
  return ok({ project, set: ["TURSO_DATABASE_URL", "TURSO_AUTH_TOKEN"], note: "Redeploy project agar variabel baru terbaca." });
});
