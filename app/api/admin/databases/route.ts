import type { NextRequest } from "next/server";
import { fail, ok, withErrorHandling } from "@/app/api/_lib/response";
import { adminFromReq, audit } from "@/app/api/_lib/admin";
import { rateLimit } from "@/app/api/_lib/rate-limit";
import { groqChat, GroqError } from "@/app/api/_lib/groq";
import { DB_ANALYSIS_SYSTEM_PROMPT, getDatabasesOverview, hasDbFindings, overviewToPrompt } from "@/app/api/_lib/admin-databases";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 30;

/**
 * GET  /api/admin/databases[?refresh=1] — pemakaian semua database user (cache 2 menit; refresh=1 baca ulang dari Turso).
 * POST { action: "analyze" }            — analisis AI atas ringkasan terakhir (1 panggilan Groq, hanya saat ditekan).
 */
export const GET = withErrorHandling(async (req: NextRequest) => {
  const admin = adminFromReq(req);
  if (!admin) return fail("Tidak ditemukan.", 404, "not_found");
  const refresh = req.nextUrl.searchParams.get("refresh") === "1";
  if (refresh) {
    const rl = await rateLimit("databases-check", `u:${admin}`, 10, 60);
    if (!rl.allowed) return fail("Terlalu sering mengecek. Tunggu sebentar.", 429, "rate_limited");
  }
  const overview = await getDatabasesOverview(refresh);
  if (refresh) await audit(admin, "databases.check", `${overview.totals.databases} database, ${overview.findings.filter((f) => f.level !== "info").length} temuan`);
  return ok({ overview, aiReady: !!process.env.GROQ_API_KEY?.trim() });
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const admin = adminFromReq(req);
  if (!admin) return fail("Tidak ditemukan.", 404, "not_found");
  let b: { action?: unknown } = {};
  try {
    b = await req.json();
  } catch {
    return fail("Body harus berupa JSON.", 400, "bad_request");
  }
  if (b.action !== "analyze") return fail("Aksi tidak dikenal.", 400, "bad_request");

  const overview = await getDatabasesOverview(false);
  if (!hasDbFindings(overview)) {
    return ok({
      analysis: { at: new Date().toISOString(), usedAi: false, text: "Semua pemeriksaan database sehat, jadi tidak ada yang perlu dianalisis. (AI tidak dipanggil, tidak ada token terpakai.)" },
    });
  }

  const rl = await rateLimit("databases-ai", `u:${admin}`, 8, 3600);
  if (!rl.allowed) return fail("Batas analisis AI per jam tercapai. Coba lagi nanti.", 429, "rate_limited");

  try {
    const text = await groqChat(DB_ANALYSIS_SYSTEM_PROMPT, [{ role: "user", content: overviewToPrompt(overview) }]);
    await audit(admin, "databases.analyze", "analisis AI atas pemakaian database");
    return ok({ analysis: { at: new Date().toISOString(), usedAi: true, text: text.slice(0, 4000) } });
  } catch (e) {
    if (e instanceof GroqError) {
      if (e.kind === "not_configured") return fail("GROQ_API_KEY belum diisi / ditolak, jadi analisis AI belum aktif.", 503, "ai_not_configured");
      if (e.kind === "rate_limited") return fail("Kuota Groq sedang habis. Coba lagi nanti.", 429, "ai_unavailable");
      if (e.kind === "timeout") return fail("AI terlalu lama menjawab. Coba klik lagi.", 504, "ai_unavailable");
      return fail(e.message, 502, "ai_unavailable");
    }
    throw e;
  }
});
