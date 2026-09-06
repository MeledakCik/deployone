import { NextRequest, NextResponse } from "next/server";
import { getUserData, putUserData } from "../_lib/store";
import { getSessionEmail } from "../_lib/session";

type UserDataPayload = {
  history?: any[];
  domains?: any[];
  envVars?: any[];
  settingsTokens?: Record<string, any>;
};

export async function GET(req: NextRequest) {
  const email = getSessionEmail(req);

  if (!email) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const data = await getUserData(email);

  // getUserData sudah dijamin balikin shape lengkap dari store.ts,
  // tapi tetap defensif di sini kalau ada format data lama yang beda.
  return NextResponse.json({
    history: Array.isArray(data.history) ? data.history : [],
    domains: Array.isArray(data.domains) ? data.domains : [],
    envVars: Array.isArray(data.envVars) ? data.envVars : [],
    settingsTokens: data.settingsTokens ?? {},
  });
}

export async function PUT(req: NextRequest) {
  const email = getSessionEmail(req);

  if (!email) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  let body: UserDataPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  // Guard krusial: body kosong / bukan object / tidak ada field apapun
  // JANGAN dianggap "user memang mau kosongin semua data". Ini biasanya
  // sinyal bug di client (state belum ke-hydrate sebelum PUT terpanggil).
  const looksEmpty =
    !body || typeof body !== "object" || Object.keys(body).length === 0;

  if (looksEmpty) {
    return NextResponse.json(
      { error: "empty payload rejected, no changes made" },
      { status: 400 }
    );
  }

  // Merge, BUKAN overwrite: ambil data lama dulu, timpa hanya field yang
  // benar-benar dikirim client dan valid sebagai array. Field yang tidak
  // dikirim atau dikirim dalam bentuk salah tetap pakai data lama —
  // ini mencegah [] yang tidak sengaja menimpa data yang sudah ada.
  const existing = await getUserData(email);

  const merged = {
    history: Array.isArray(body.history) ? body.history : existing.history,
    domains: Array.isArray(body.domains) ? body.domains : existing.domains,
    envVars: Array.isArray(body.envVars) ? body.envVars : existing.envVars,
    settingsTokens:
      body.settingsTokens && typeof body.settingsTokens === "object"
        ? { ...existing.settingsTokens, ...body.settingsTokens }
        : existing.settingsTokens,
  };

  const saved = await putUserData(email, merged);
  return NextResponse.json(saved);
}
