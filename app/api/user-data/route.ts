import type { NextRequest } from "next/server";
import { ok, fail, withErrorHandling } from "@/app/api/_lib/response";
import { getUserData, putUserData, type UserData } from "@/app/api/_lib/store";
import { getSessionEmail } from "@/app/api/_lib/session";

export const runtime = "nodejs";

type UserDataPayload = Partial<UserData>;

export const GET = withErrorHandling(async (req: NextRequest) => {
  const email = getSessionEmail(req);
  if (!email) return fail("Belum login.", 401, "unauthorized");

  const data = await getUserData(email);

  // getUserData sudah dijamin balikin shape lengkap dari store.ts,
  // tapi tetap defensif di sini kalau ada format data lama yang beda.
  return ok<UserData>({
    history: Array.isArray(data.history) ? data.history : [],
    domains: Array.isArray(data.domains) ? data.domains : [],
    envVars: Array.isArray(data.envVars) ? data.envVars : [],
    settingsTokens: data.settingsTokens ?? {},
  });
});

export const PUT = withErrorHandling(async (req: NextRequest) => {
  const email = getSessionEmail(req);
  if (!email) return fail("Belum login.", 401, "unauthorized");

  const body = (await req.json().catch(() => null)) as UserDataPayload | null;

  // Guard krusial: body kosong / bukan object / tidak ada field apapun
  // JANGAN dianggap "user memang mau kosongin semua data". Ini biasanya
  // sinyal bug di client (state belum ke-hydrate sebelum PUT terpanggil,
  // atau race condition setelah logout/login). Tolak, jangan proses.
  const looksEmpty =
    !body || typeof body !== "object" || Object.keys(body).length === 0;

  if (looksEmpty) {
    return fail("Payload kosong ditolak — tidak ada perubahan disimpan.", 400, "bad_request");
  }

  // Merge, BUKAN overwrite: ambil data lama dulu, timpa hanya field yang
  // benar-benar dikirim client dan valid tipenya. Field yang tidak dikirim
  // atau dikirim dengan tipe salah tetap pakai data lama — ini mencegah
  // [] atau {} yang tidak sengaja menimpa data yang sudah tersimpan.
  const existing = await getUserData(email);

  const merged: UserData = {
    history: Array.isArray(body.history) ? body.history : existing.history,
    domains: Array.isArray(body.domains) ? body.domains : existing.domains,
    envVars: Array.isArray(body.envVars) ? body.envVars : existing.envVars,
    settingsTokens:
      body.settingsTokens && typeof body.settingsTokens === "object"
        ? { ...existing.settingsTokens, ...body.settingsTokens }
        : existing.settingsTokens,
  };

  const saved = await putUserData(email, merged);
  return ok<UserData>(saved);
});
