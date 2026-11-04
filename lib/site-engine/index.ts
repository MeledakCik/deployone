/**
 * Pintu masuk mesin AI Web Builder di sisi server Next.js.
 * Model bawaan dibundel dari lib/site-engine/model.json (hasil `npm run engine:train`).
 * Admin bisa melatih ulang dari Panel Admin; model hasilnya disimpan di KV dan dipakai menggantikan bawaan.
 */
import bundled from "./model.json";
import { editSite, generateSite, type FeedbackExample, type Kind, type SiteModel } from "./core";
import { normalizeContent, type SiteContent, type SiteKind } from "@/lib/ai-site-templates";

export const ENGINE_MODEL_KEY = "engine:site:model";
export const ENGINE_FEEDBACK_KEY = "engine:site:feedback";
/** Paket domain hasil impor Panel Admin (array DomainPack, JSON). Digabung dengan paket bawaan saat melatih. */
export const ENGINE_PACKS_KEY = "engine:site:packs";
/** Batas paket impor (jumlah dan ukuran total), supaya model tetap muat di satu nilai KV. */
export const ENGINE_PACKS_MAX = 60;
export const ENGINE_PACKS_MAX_BYTES = 400_000;
/** Paket gaya visual hasil impor (array StylePack, JSON). */
export const ENGINE_STYLES_KEY = "engine:site:styles";
export const ENGINE_STYLES_MAX = 40;
/** Paket ikon & paket elemen hasil impor (array, JSON). */
export const ENGINE_ICONS_KEY = "engine:site:icons";
export const ENGINE_ELEMENTS_KEY = "engine:site:elements";
/** Batas ukuran total paket ikon/elemen (karakter JSON) supaya model tetap muat di KV. */
export const ENGINE_ASSETS_MAX_BYTES = 450_000;
/** Batas contoh pengguna yang disimpan (yang lama dibuang). */
export const ENGINE_FEEDBACK_MAX = 2000;

const BUNDLED = bundled as unknown as SiteModel;

let cache: { model: SiteModel; at: number } | null = null;

/** Model aktif: hasil training admin di KV (bila ada), atau model bawaan. Disimpan di memori 60 detik. */
export async function loadModel(): Promise<SiteModel> {
  if (cache && Date.now() - cache.at < 60_000) return cache.model;
  let model = BUNDLED;
  try {
    if (process.env.KV_REST_API_URL) {
      const { kv } = await import("@vercel/kv");
      const stored = await kv.get<SiteModel>(ENGINE_MODEL_KEY);
      if (stored && stored.version === 1 && Array.isArray(stored.domains)) model = stored;
    }
  } catch (e) {
    console.error("[site-engine] model KV tidak terbaca, pakai bawaan:", e instanceof Error ? e.message : e);
  }
  cache = { model, at: Date.now() };
  return model;
}

export function bundledModel(): SiteModel {
  return BUNDLED;
}

export function resetModelCache(): void {
  cache = null;
}

export interface EngineGenerate {
  content: SiteContent;
  domain: string;
  confidence: number;
}

export async function engineGenerate(
  prompt: string,
  opts: { variant?: number; kind?: SiteKind; wantItems?: number | null; wantArticles?: number | null },
): Promise<EngineGenerate | null> {
  const model = await loadModel();
  const res = generateSite(model, prompt, { ...opts, kind: opts.kind as Kind | undefined });
  const content = normalizeContent(res.raw, opts.kind);
  return content ? { content, domain: res.domain, confidence: res.confidence } : null;
}

export async function engineEdit(current: SiteContent, instruction: string): Promise<{ content: SiteContent | null; note: string }> {
  const model = await loadModel();
  const res = editSite(model, current as unknown as Record<string, unknown>, instruction);
  if (!res.raw) return { content: null, note: res.note };
  return { content: normalizeContent(res.raw, current.kind), note: res.note };
}

export type { FeedbackExample, SiteModel };
