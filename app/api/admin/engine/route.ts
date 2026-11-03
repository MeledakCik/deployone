import type { NextRequest } from "next/server";
import { kv } from "@vercel/kv";
import { fail, ok, withErrorHandling } from "@/app/api/_lib/response";
import { adminFromReq, audit } from "@/app/api/_lib/admin";
import { trainModel, type DomainPack, type FeedbackExample, type SiteModel } from "@/lib/site-engine/core";
import { ENGINE_FEEDBACK_KEY, ENGINE_FEEDBACK_MAX, ENGINE_MODEL_KEY, bundledModel, loadModel, resetModelCache } from "@/lib/site-engine";
import umkm from "@/data/site-engine/packs/umkm.json";
import jasa from "@/data/site-engine/packs/jasa.json";
import lainnya from "@/data/site-engine/packs/lainnya.json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 60;

const PACKS = [...umkm, ...jasa, ...lainnya] as unknown as DomainPack[];

async function readFeedback(): Promise<FeedbackExample[]> {
  const rows = await kv.lrange<FeedbackExample | string>(ENGINE_FEEDBACK_KEY, 0, ENGINE_FEEDBACK_MAX - 1);
  return rows
    .map((r) => (typeof r === "string" ? (JSON.parse(r) as FeedbackExample) : r))
    .filter((r) => r && typeof r.prompt === "string" && r.content && typeof r.content === "object");
}

/** GET /api/admin/engine → status mesin + contoh pengguna terbaru. */
export const GET = withErrorHandling(async (req: NextRequest) => {
  if (!adminFromReq(req)) return fail("Tidak ditemukan.", 404, "not_found");
  const active = await loadModel();
  const stored = await kv.get<SiteModel>(ENGINE_MODEL_KEY).catch(() => null);
  const feedback = await readFeedback().catch(() => []);
  return ok({
    active: { source: stored ? "admin" : "bawaan", trainedAt: active.trainedAt, stats: active.stats },
    bundled: { trainedAt: bundledModel().trainedAt, stats: bundledModel().stats },
    feedbackCount: feedback.length,
    recent: feedback.slice(0, 20).map((f) => ({ prompt: f.prompt, kind: f.content.kind, brand: f.content.brand, at: f.at ?? null })),
    domains: Object.values(active.packs).map((p) => ({ id: p.id, kind: p.kind, label: p.label, prompts: p.prompts.length, items: p.items.length, generic: !!p.generic })),
  });
});

/**
 * POST /api/admin/engine { action }
 *  - "train":  paket bawaan + contoh pengguna → model baru, disimpan di KV dan langsung dipakai
 *  - "reset":  hapus model hasil training admin (kembali ke model bawaan)
 *  - "export": unduh contoh pengguna sebagai JSONL (untuk data/site-engine/feedback/ + npm run engine:train)
 *  - "clear":  hapus semua contoh pengguna
 */
export const POST = withErrorHandling(async (req: NextRequest) => {
  const admin = adminFromReq(req);
  if (!admin) return fail("Tidak ditemukan.", 404, "not_found");
  let body: { action?: unknown } | null = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }
  const action = typeof body?.action === "string" ? body.action : "";

  if (action === "train") {
    const feedback = await readFeedback();
    const model = trainModel(PACKS, feedback);
    await kv.set(ENGINE_MODEL_KEY, JSON.stringify(model));
    resetModelCache();
    await audit(admin, "engine.train", `paket ${model.stats.packs}, contoh ${model.stats.feedback}`);
    return ok({ trainedAt: model.trainedAt, stats: model.stats });
  }
  if (action === "reset") {
    await kv.del(ENGINE_MODEL_KEY);
    resetModelCache();
    await audit(admin, "engine.reset", "kembali ke model bawaan");
    return ok({ reset: true });
  }
  if (action === "export") {
    const feedback = await readFeedback();
    return ok({ jsonl: feedback.map((f) => JSON.stringify(f)).join("\n"), count: feedback.length });
  }
  if (action === "clear") {
    await kv.del(ENGINE_FEEDBACK_KEY);
    await audit(admin, "engine.clear", "contoh pengguna dihapus");
    return ok({ cleared: true });
  }
  return fail("Aksi tidak dikenal.", 400, "bad_request");
});
