/**
 * Bagian bersama route AI Web Builder: ekstraksi JSON dari balasan model, pemilihan sumber token
 * (milik user atau jatah gratis), dan eksekusi satu kali "ubah dengan perintah".
 */

import { fail } from "@/app/api/_lib/response";
import { rateLimit } from "@/app/api/_lib/rate-limit";
import { groqChat, GroqError } from "@/app/api/_lib/groq";
import { freeAiPerDay, getUserGroqKey } from "@/app/api/_lib/ai-keys";
import { type SiteContent } from "@/lib/ai-site-templates";
import { EDIT_SYSTEM_PROMPT } from "@/lib/ai-site-prompts";
import { applyPatch, buildEditMessage, type PatchResult } from "@/lib/ai-site-edit";

/** Ambil objek JSON pertama dari balasan model (jaga-jaga kalau dibungkus teks/markdown atau terpotong). */
export function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  if (start === -1) return null;
  const end = text.lastIndexOf("}");
  const tryParse = (t: string): unknown => {
    try {
      return JSON.parse(t);
    } catch {
      return undefined;
    }
  };
  if (end > start) {
    const body = text.slice(start, end + 1);
    const a = tryParse(body) ?? tryParse(body.replace(/,\s*([}\]])/g, "$1")); // koma sisa sebelum } atau ]
    if (a !== undefined) return a;
  }
  // Balasan terpotong (kehabisan token): tutup kurung yang masih terbuka.
  let s = text.slice(start).replace(/,\s*$/, "");
  const stack: string[] = [];
  let inStr = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      if (ch === "\\") i++;
      else if (ch === '"') inStr = false;
    } else if (ch === '"') inStr = true;
    else if (ch === "{") stack.push("}");
    else if (ch === "[") stack.push("]");
    else if (ch === "}" || ch === "]") stack.pop();
  }
  if (inStr) s += '"';
  s = s.replace(/,\s*$/, "").replace(/"[^"]*"\s*:\s*$/, "").replace(/,\s*$/, "");
  const fixed = s + stack.reverse().join("");
  return tryParse(fixed) ?? tryParse(fixed.replace(/,\s*([}\]])/g, "$1")) ?? null;
}

export type AiSource = { ok: true; ownKey: string | null; source: "own" | "free" } | { ok: false; res: ReturnType<typeof fail> };

/**
 * Token milik user diutamakan. Tanpa itu, pakai token server hanya bila admin memberi jatah harian.
 * Hasil `ok: false` membawa Response error siap kirim.
 */
export async function resolveAiSource(email: string): Promise<AiSource> {
  const ownKey = await getUserGroqKey(email);
  if (ownKey) return { ok: true, ownKey, source: "own" };
  const free = freeAiPerDay();
  if (free === 0) {
    return { ok: false, res: fail("Pasang token Groq-mu dulu di halaman AI Web Builder (gratis di console.groq.com/keys).", 402, "ai_not_configured") };
  }
  const daily = await rateLimit("ai-site-free-daily", `u:${email}`, free, 86400);
  if (!daily.allowed) {
    return { ok: false, res: fail(`Jatah AI gratis hari ini (${free}x) sudah habis. Pasang token Groq-mu sendiri untuk lanjut tanpa batas dari Depup.`, 429, "rate_limited") };
  }
  return { ok: true, ownKey: null, source: "free" };
}

export interface EditOutcome extends PatchResult {
  /** Penjelasan singkat dari AI tentang perubahan (boleh kosong). */
  note: string;
}

/** Kirim isi saat ini + perintah ke AI, gabungkan patch-nya. Mengembalikan null bila balasan tak bisa dipakai. */
export async function runSiteEdit(
  current: SiteContent,
  instruction: string,
  opts: { apiKey?: string; timeoutMs: number },
): Promise<EditOutcome | null> {
  const size = (current.articles ?? []).length;
  const reply = await groqChat(EDIT_SYSTEM_PROMPT, [{ role: "user", content: buildEditMessage(current, instruction) }], {
    apiKey: opts.apiKey,
    maxTokens: size > 0 ? Math.min(14000, 3500 + size * 600) : 6000,
    temperature: 0.4,
    json: true,
    timeoutMs: opts.timeoutMs,
    reasoningEffort: "low",
  });
  const json = extractJson(reply);
  if (!json || typeof json !== "object") return null;
  const note = typeof (json as { note?: unknown }).note === "string" ? ((json as { note: string }).note.replace(/\s+/g, " ").trim().slice(0, 120)) : "";
  const res = applyPatch(current, json);
  if (!res) return null;
  return { ...res, note };
}

export { GroqError };
