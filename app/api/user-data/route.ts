import type { NextRequest } from "next/server";
import { ok, fail, withErrorHandling } from "@/app/api/_lib/response";
import { getUserData, putUserData, type UserData } from "@/app/api/_lib/store";
import { getSessionEmail } from "@/app/api/_lib/session";
import { MAX_HISTORY, type ServerHistoryItem } from "@/app/api/_lib/mcp-history";

export const runtime = "nodejs";

type UserDataPayload = Partial<UserData>;

const MAX_BODY_BYTES = 1_000_000; // ~1 MB per request
const MAX_ITEMS = 2000;
const ALLOWED_TOKEN_KEYS = [
  "vercelToken",
  "cloudflareToken",
  "cloudflareAccountId",
  "githubPat",
  "railwayToken",
  "mcpDeployPlatforms",
] as const;

const MCP_PLATFORMS = ["vercel", "cloudflare", "railway"];

function normalizeMcpPlatforms(v: string): string {
  const picked = v.split(",").map((x) => x.trim().toLowerCase());
  return MCP_PLATFORMS.filter((p) => picked.includes(p)).join(",");
}

/** Hanya izinkan key token yang dikenal, value string, panjang dibatasi. */
function sanitizeTokens(input: unknown): Record<string, string> | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const out: Record<string, string> = {};
  for (const k of ALLOWED_TOKEN_KEYS) {
    const v = (input as Record<string, unknown>)[k];
    if (typeof v !== "string" || v.length > 4000) continue;
    // Daftar platform konektor Claude: hanya nama platform yang dikenal, tanpa duplikat.
    out[k] = k === "mcpDeployPlatforms" ? normalizeMcpPlatforms(v) : v;
  }
  return out;
}

const stripFresh = (list: unknown[]): unknown[] =>
  list.map((h) => {
    if (h && typeof h === "object" && "fresh" in h) {
      const { fresh: _f, ...rest } = h as Record<string, unknown>;
      return rest;
    }
    return h;
  });

/**
 * Riwayat dari browser menimpa seluruh array. Entri hasil deploy lewat Claude yang masih `fresh` (belum pernah
 * diambil browser lewat GET) dipertahankan kalau browser yang sudah basi tidak memilikinya. `fresh` dari klien
 * selalu diabaikan, jadi klien tidak bisa membuat entri "kebal hapus".
 */
function mergeHistory(incoming: unknown[], existing: unknown[]): unknown[] {
  const clean = stripFresh(incoming) as { id?: unknown }[];
  const ids = new Set(clean.map((h) => String(h?.id)));
  const keep = (existing as ServerHistoryItem[]).filter((h) => h?.fresh === true && !ids.has(String(h.id)));
  return [...keep, ...clean].slice(0, MAX_HISTORY);
}

const okArray = (v: unknown): v is unknown[] => Array.isArray(v) && v.length <= MAX_ITEMS;

export const GET = withErrorHandling(async (req: NextRequest) => {
  const email = getSessionEmail(req);
  if (!email) return fail("Belum login.", 401, "unauthorized");

  const data = await getUserData(email);

  // Entri hasil deploy Claude yang baru: begitu sampai ke browser, penanda `fresh` dilepas (best-effort).
  const hasFresh = Array.isArray(data.history) && (data.history as ServerHistoryItem[]).some((h) => h?.fresh === true);
  if (hasFresh) {
    data.history = stripFresh(data.history) as UserData["history"];
    await putUserData(email, data).catch(() => undefined);
  }

  // getUserData sudah dijamin balikin shape lengkap dari store.ts,
  // tapi tetap defensif di sini kalau ada format data lama yang beda.
  return ok<UserData>({
    history: Array.isArray(data.history) ? data.history : [],
    domains: Array.isArray(data.domains) ? data.domains : [],
    envVars: Array.isArray(data.envVars) ? data.envVars : [],
    // groqApiKey sengaja TIDAK dikirim ke browser (hanya server yang memakainya, lewat /api/ai/*).
    settingsTokens: (({ groqApiKey: _omit, ...rest }) => rest)(data.settingsTokens ?? {}),
  });
});

export const PUT = withErrorHandling(async (req: NextRequest) => {
  const email = getSessionEmail(req);
  if (!email) return fail("Belum login.", 401, "unauthorized");

  const raw = await req.text().catch(() => "");
  if (raw.length > MAX_BODY_BYTES) {
    return fail("Data terlalu besar untuk disimpan.", 413, "bad_request");
  }
  let parsed: UserDataPayload | null = null;
  try {
    parsed = JSON.parse(raw) as UserDataPayload;
  } catch {
    parsed = null;
  }

  // Guard krusial: body kosong / bukan object / tidak ada field apapun
  // JANGAN dianggap "user memang mau kosongin semua data". Ini biasanya
  // sinyal bug di client (state belum ke-hydrate sebelum PUT terpanggil,
  // atau race condition setelah logout/login). Tolak, jangan proses.
  const looksEmpty =
    !parsed || typeof parsed !== "object" || Object.keys(parsed).length === 0;

  if (looksEmpty || !parsed) {
    return fail("Payload kosong ditolak — tidak ada perubahan disimpan.", 400, "bad_request");
  }
  const body: UserDataPayload = parsed;

  // Merge, BUKAN overwrite: ambil data lama dulu, timpa hanya field yang
  // benar-benar dikirim client dan valid tipenya. Field yang tidak dikirim
  // atau dikirim dengan tipe salah tetap pakai data lama — ini mencegah
  // [] atau {} yang tidak sengaja menimpa data yang sudah tersimpan.
  const existing = await getUserData(email);

  const merged: UserData = {
    history: okArray(body.history) ? (mergeHistory(body.history, existing.history) as UserData["history"]) : existing.history,
    domains: okArray(body.domains) ? body.domains : existing.domains,
    envVars: okArray(body.envVars) ? body.envVars : existing.envVars,
    settingsTokens: (() => {
      const clean = sanitizeTokens(body.settingsTokens);
      return clean ? { ...existing.settingsTokens, ...clean } : existing.settingsTokens;
    })(),
  };

  // Tidak ada perubahan -> lewati SET ke Redis (hemat command + bandwidth).
  if (JSON.stringify(merged) === JSON.stringify(existing)) {
    return ok<UserData>(existing);
  }

  const saved = await putUserData(email, merged);
  return ok<UserData>(saved);
});
