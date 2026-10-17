import type { NextRequest } from "next/server";
import { kv } from "@vercel/kv";
import { fail, ok, withErrorHandling } from "@/app/api/_lib/response";
import { adminFromReq, audit } from "@/app/api/_lib/admin";
import { rateLimit } from "@/app/api/_lib/rate-limit";
import { groqChat, GroqError } from "@/app/api/_lib/groq";
import { AUDIT_SYSTEM_PROMPT, auditToPrompt, hasFindings, runSiteAudit, type AuditResult } from "@/app/api/_lib/site-audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 30;

const LAST_KEY = "admin:health:last";
const LAST_TTL = 30 * 24 * 60 * 60;

async function loadLast(): Promise<AuditResult | null> {
  try {
    return (await kv.get<AuditResult>(LAST_KEY)) ?? null;
  } catch {
    return null;
  }
}

async function saveLast(r: AuditResult): Promise<void> {
  try {
    await kv.set(LAST_KEY, r, { ex: LAST_TTL });
  } catch (e) {
    console.error("[admin/health] gagal menyimpan hasil audit", (e as Error)?.message);
  }
}

/** GET — hasil audit terakhir (hanya baca KV: tidak menjalankan pemeriksaan, tidak memakai AI). */
export const GET = withErrorHandling(async (req: NextRequest) => {
  if (!adminFromReq(req)) return fail("Tidak ditemukan.", 404, "not_found");
  return ok({ result: await loadLast(), aiReady: !!process.env.GROQ_API_KEY?.trim() });
});

/**
 * POST { action: "run" }                  -> jalankan pemeriksaan (tanpa AI)
 * POST { action: "analyze", force?: bool } -> analisis AI atas hasil terakhir (1 panggilan Groq, hanya saat ditekan)
 */
export const POST = withErrorHandling(async (req: NextRequest) => {
  const admin = adminFromReq(req);
  if (!admin) return fail("Tidak ditemukan.", 404, "not_found");
  let b: { action?: unknown; force?: unknown } = {};
  try {
    b = await req.json();
  } catch {
    return fail("Body harus berupa JSON.", 400, "bad_request");
  }

  if (b.action === "run") {
    const rl = await rateLimit("health-run", `u:${admin}`, 6, 60);
    if (!rl.allowed) return fail("Terlalu sering menjalankan audit. Tunggu sebentar.", 429, "rate_limited");
    const result = await runSiteAudit(req.nextUrl.origin);
    await saveLast(result);
    await audit(admin, "health.run", `${result.counts.problem} masalah, ${result.counts.warn} perhatian`);
    return ok({ result });
  }

  if (b.action === "analyze") {
    const last = await loadLast();
    if (!last) return fail("Jalankan audit dulu sebelum meminta analisis.", 400, "bad_request");
    // Analisis untuk hasil yang sama dipakai ulang — tidak memanggil AI lagi kecuali diminta (force).
    if (last.analysis && b.force !== true) return ok({ result: last });

    if (!hasFindings(last)) {
      last.analysis = { at: new Date().toISOString(), usedAi: false, text: "Semua pemeriksaan sehat dan tidak ada error server tercatat, jadi tidak ada yang perlu dianalisis. (AI tidak dipanggil, tidak ada token terpakai.)" };
      await saveLast(last);
      return ok({ result: last });
    }

    const rl = await rateLimit("health-ai", `u:${admin}`, 8, 3600);
    if (!rl.allowed) return fail("Batas analisis AI per jam tercapai. Coba lagi nanti.", 429, "rate_limited");

    try {
      const text = await groqChat(AUDIT_SYSTEM_PROMPT, [{ role: "user", content: auditToPrompt(last) }]);
      last.analysis = { at: new Date().toISOString(), usedAi: true, text: text.slice(0, 4000) };
      await saveLast(last);
      await audit(admin, "health.analyze", "analisis AI atas hasil audit");
      return ok({ result: last });
    } catch (e) {
      if (e instanceof GroqError) {
        if (e.kind === "not_configured") return fail("GROQ_API_KEY belum diisi / ditolak, jadi analisis AI belum aktif.", 503, "ai_not_configured");
        if (e.kind === "rate_limited") return fail("Kuota Groq sedang habis. Coba lagi nanti.", 429, "ai_unavailable");
        if (e.kind === "timeout") return fail("AI terlalu lama menjawab. Coba klik lagi.", 504, "ai_unavailable");
        return fail(e.message, 502, "ai_unavailable");
      }
      throw e;
    }
  }

  return fail("Aksi tidak dikenal.", 400, "bad_request");
});
