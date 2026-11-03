import type { NextRequest } from "next/server";
import { kv } from "@vercel/kv";
import { fail, ok, withErrorHandling } from "@/app/api/_lib/response";
import { adminFromReq, audit } from "@/app/api/_lib/admin";
import { trainModel, type DomainPack, type FeedbackExample, type SiteModel } from "@/lib/site-engine/core";
import { completePack, mergePacks, parseImport, validatePack, type PackRules } from "@/lib/site-engine/import";
import {
  ENGINE_FEEDBACK_KEY,
  ENGINE_FEEDBACK_MAX,
  ENGINE_MODEL_KEY,
  ENGINE_PACKS_KEY,
  ENGINE_PACKS_MAX,
  ENGINE_PACKS_MAX_BYTES,
  bundledModel,
  loadModel,
  resetModelCache,
} from "@/lib/site-engine";
import { ICON_NAMES } from "@/lib/lucide-icons";
import { BANNED_PHRASES } from "@/lib/ai-site-prompts";
import { FEAT_LAYOUTS, HERO_LAYOUTS, TEMPLATES } from "@/lib/ai-site-templates";
import umkm from "@/data/site-engine/packs/umkm.json";
import jasa from "@/data/site-engine/packs/jasa.json";
import lainnya from "@/data/site-engine/packs/lainnya.json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 60;

const BUNDLED_PACKS = [...umkm, ...jasa, ...lainnya] as unknown as DomainPack[];
const BUNDLED_IDS = new Set(BUNDLED_PACKS.map((p) => p.id));
/** Batas teks impor: ±2 MB (batas body Vercel 4,5 MB). */
const IMPORT_MAX_CHARS = 2_000_000;

const RULES: PackRules = {
  icons: new Set(ICON_NAMES),
  banned: BANNED_PHRASES,
  templates: new Set(TEMPLATES.map((t) => t.id)),
  heroes: new Set(HERO_LAYOUTS.map((h) => h.id)),
  feats: new Set(FEAT_LAYOUTS.map((f) => f.id)),
};

async function readFeedback(): Promise<FeedbackExample[]> {
  const rows = await kv.lrange<FeedbackExample | string>(ENGINE_FEEDBACK_KEY, 0, ENGINE_FEEDBACK_MAX - 1);
  return rows
    .map((r) => (typeof r === "string" ? (JSON.parse(r) as FeedbackExample) : r))
    .filter((r) => r && typeof r.prompt === "string" && r.content && typeof r.content === "object");
}

async function readImportedPacks(): Promise<DomainPack[]> {
  const v = await kv.get<DomainPack[] | string>(ENGINE_PACKS_KEY).catch(() => null);
  const list = typeof v === "string" ? (JSON.parse(v) as DomainPack[]) : v;
  return Array.isArray(list) ? list : [];
}

/** Latih model dari paket bawaan + paket impor + contoh pengguna, simpan di KV, dan langsung pakai. */
async function retrain(): Promise<SiteModel> {
  const [imported, feedback] = await Promise.all([readImportedPacks(), readFeedback()]);
  const model = trainModel(mergePacks(BUNDLED_PACKS, imported), feedback);
  await kv.set(ENGINE_MODEL_KEY, JSON.stringify(model));
  resetModelCache();
  return model;
}

/** GET /api/admin/engine → status mesin, paket impor, dan contoh pengguna terbaru. */
export const GET = withErrorHandling(async (req: NextRequest) => {
  if (!adminFromReq(req)) return fail("Tidak ditemukan.", 404, "not_found");
  const active = await loadModel();
  const stored = await kv.get<SiteModel>(ENGINE_MODEL_KEY).catch(() => null);
  const feedback = await readFeedback().catch(() => []);
  const imported = await readImportedPacks().catch(() => []);
  const importedIds = new Set(imported.map((p) => p.id));
  return ok({
    active: { source: stored ? "admin" : "bawaan", trainedAt: active.trainedAt, stats: active.stats },
    bundled: { trainedAt: bundledModel().trainedAt, stats: bundledModel().stats },
    feedbackCount: feedback.length,
    recent: feedback.slice(0, 20).map((f) => ({ prompt: f.prompt, kind: f.content.kind, brand: f.content.brand, at: f.at ?? null })),
    imported: imported.map((p) => ({ id: p.id, kind: p.kind, label: p.label, prompts: p.prompts.length, items: p.items.length, replacesBundled: BUNDLED_IDS.has(p.id) })),
    domains: Object.values(active.packs).map((p) => ({
      id: p.id,
      kind: p.kind,
      label: p.label,
      prompts: p.prompts.length,
      items: p.items.length,
      generic: !!p.generic,
      imported: importedIds.has(p.id),
    })),
  });
});

/**
 * POST /api/admin/engine { action }
 *  - "import":      { text } JSON/JSONL berisi paket domain dan/atau contoh pengguna → disimpan, lalu mesin dilatih ulang
 *  - "removePack":  { id } hapus satu paket impor, lalu latih ulang
 *  - "exportPacks": unduh paket impor sebagai JSON (bisa disalin ke data/site-engine/packs/ agar jadi bawaan)
 *  - "train":       paket bawaan + paket impor + contoh pengguna → model baru, disimpan di KV dan langsung dipakai
 *  - "reset":       hapus model hasil training admin (kembali ke model bawaan; paket impor tetap tersimpan)
 *  - "export":      unduh contoh pengguna sebagai JSONL
 *  - "clear":       hapus semua contoh pengguna
 */
export const POST = withErrorHandling(async (req: NextRequest) => {
  const admin = adminFromReq(req);
  if (!admin) return fail("Tidak ditemukan.", 404, "not_found");
  let body: { action?: unknown; text?: unknown; id?: unknown } | null = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }
  const action = typeof body?.action === "string" ? body.action : "";

  if (action === "import") {
    const text = typeof body?.text === "string" ? body.text : "";
    if (text.length > IMPORT_MAX_CHARS) return fail("File terlalu besar (maks. ±2 MB). Bagi jadi beberapa file.", 413, "bad_request");
    const parsed = parseImport(text);
    const errors = [...parsed.errors];

    const seen = new Set<string>();
    for (const p of parsed.packs) {
      errors.push(...validatePack(p, RULES));
      if (seen.has(p.id)) errors.push(`Paket "${p.id}" muncul dua kali di file ini.`);
      seen.add(p.id);
    }
    if (!parsed.packs.length && !parsed.feedback.length && !errors.length) errors.push("Tidak ada paket atau contoh yang bisa diimpor.");
    // Semua atau tidak sama sekali: file dengan kesalahan tidak diimpor sebagian, supaya mudah diperbaiki lalu diunggah ulang.
    if (errors.length) return ok({ imported: false, errors: errors.slice(0, 50), moreErrors: Math.max(0, errors.length - 50) });

    const notes: string[] = [];
    const current = await readImportedPacks();
    const base = mergePacks(BUNDLED_PACKS, current);
    const byId = new Map(current.map((p) => [p.id, p]));
    const added: string[] = [];
    const updated: string[] = [];
    for (const p of parsed.packs) {
      const { pack, filled } = completePack(p, base);
      if (filled.length) notes.push(`"${p.id}": ${filled.join(", ")} diambil dari paket umum ${p.kind}.`);
      if (BUNDLED_IDS.has(p.id)) notes.push(`"${p.id}" menggantikan paket bawaan dengan id yang sama.`);
      (byId.has(p.id) || BUNDLED_IDS.has(p.id) ? updated : added).push(p.id);
      byId.set(p.id, pack);
    }
    const next = [...byId.values()];
    const size = JSON.stringify(next).length;
    if (next.length > ENGINE_PACKS_MAX) return ok({ imported: false, errors: [`Maksimal ${ENGINE_PACKS_MAX} paket impor. Hapus yang tidak dipakai, atau pindahkan ke data/site-engine/packs/ di repo.`] });
    if (size > ENGINE_PACKS_MAX_BYTES)
      return ok({ imported: false, errors: [`Total paket impor ${Math.round(size / 1000)} KB, melebihi ${ENGINE_PACKS_MAX_BYTES / 1000} KB. Pindahkan sebagian ke data/site-engine/packs/ di repo.`] });

    if (parsed.packs.length) await kv.set(ENGINE_PACKS_KEY, JSON.stringify(next));
    if (parsed.feedback.length) {
      const rows = parsed.feedback.slice(0, ENGINE_FEEDBACK_MAX).map((f) => JSON.stringify(f));
      for (let i = 0; i < rows.length; i += 200) await kv.lpush(ENGINE_FEEDBACK_KEY, ...rows.slice(i, i + 200));
      await kv.ltrim(ENGINE_FEEDBACK_KEY, 0, ENGINE_FEEDBACK_MAX - 1);
      if (parsed.feedback.length > ENGINE_FEEDBACK_MAX) notes.push(`Hanya ${ENGINE_FEEDBACK_MAX} contoh terakhir yang disimpan.`);
    }

    const model = await retrain();
    await audit(admin, "engine.import", `paket +${added.length} ~${updated.length}, contoh +${parsed.feedback.length}`);
    return ok({ imported: true, added, updated, feedback: parsed.feedback.length, notes, trainedAt: model.trainedAt, stats: model.stats });
  }

  if (action === "removePack") {
    const id = typeof body?.id === "string" ? body.id : "";
    const current = await readImportedPacks();
    const next = current.filter((p) => p.id !== id);
    if (next.length === current.length) return fail("Paket impor tidak ditemukan.", 404, "not_found");
    if (next.length) await kv.set(ENGINE_PACKS_KEY, JSON.stringify(next));
    else await kv.del(ENGINE_PACKS_KEY);
    const model = await retrain();
    await audit(admin, "engine.removePack", id);
    return ok({ removed: id, stats: model.stats });
  }

  if (action === "exportPacks") {
    const packs = await readImportedPacks();
    return ok({ json: JSON.stringify(packs, null, 2) + "\n", count: packs.length });
  }

  if (action === "train") {
    const model = await retrain();
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
