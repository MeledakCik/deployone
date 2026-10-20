/**
 * Klien tipis untuk Groq Cloud (API kompatibel OpenAI). Hanya jalan di server —
 * GROQ_API_KEY tidak boleh sampai ke browser.
 *
 * Model diatur lewat env GROQ_MODEL supaya ganti model tidak perlu ubah kode.
 * Default: openai/gpt-oss-120b. llama-3.3-70b-versatile sudah dimatikan Groq
 * pada 16 Agustus 2026; ini pengganti resmi yang direkomendasikan Groq.
 */

export const DEFAULT_GROQ_MODEL = "openai/gpt-oss-120b";
const DEFAULT_BASE_URL = "https://api.groq.com/openai/v1";
const TIMEOUT_MS = 28_000;

export type ChatRole = "user" | "assistant";
export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export type GroqErrorKind = "not_configured" | "invalid_key" | "rate_limited" | "timeout" | "model_unavailable" | "upstream";

export class GroqError extends Error {
  kind: GroqErrorKind;
  constructor(kind: GroqErrorKind, message: string) {
    super(message);
    this.name = "GroqError";
    this.kind = kind;
  }
}

export function getGroqModel(): string {
  return process.env.GROQ_MODEL?.trim() || DEFAULT_GROQ_MODEL;
}

export interface GroqOptions {
  /** Token Groq milik user (BYOK). Kosong = pakai GROQ_API_KEY server. */
  apiKey?: string;
  maxTokens?: number;
  temperature?: number;
  /** Minta keluaran berupa satu objek JSON valid (response_format json_object). */
  json?: boolean;
}

export async function groqChat(system: string, messages: ChatMessage[], opts: GroqOptions = {}): Promise<string> {
  const ownKey = !!opts.apiKey;
  const apiKey = (opts.apiKey ?? process.env.GROQ_API_KEY)?.trim();
  if (!apiKey) throw new GroqError("not_configured", "GROQ_API_KEY belum diatur.");

  const model = getGroqModel();
  const baseUrl = (process.env.GROQ_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/$/, "");

  const body: Record<string, unknown> = {
    model,
    messages: [{ role: "system", content: system }, ...messages],
    temperature: opts.temperature ?? 0.3,
    // Model gpt-oss menghitung token "berpikir" ke dalam batas ini, jadi dibuat longgar.
    max_completion_tokens: opts.maxTokens ?? 1500,
  };
  if (model.startsWith("openai/gpt-oss")) body.reasoning_effort = "low";
  if (opts.json) body.response_format = { type: "json_object" };

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
      signal: ctrl.signal,
      cache: "no-store",
    });
  } catch (e) {
    if ((e as { name?: string })?.name === "AbortError") {
      throw new GroqError("timeout", "Groq tidak merespons tepat waktu.");
    }
    throw new GroqError("upstream", "Tidak bisa terhubung ke Groq.");
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    // Detail hanya di log server, tidak dikirim ke user.
    console.error(`[groq] ${res.status} model=${model}`, detail.slice(0, 500));
    if (res.status === 429) {
      throw new GroqError(
        "rate_limited",
        ownKey ? "Kuota token Groq-mu sedang habis (limit per menit/hari dari Groq). Tunggu sebentar lalu coba lagi." : "Kuota Groq habis / terlalu banyak request."
      );
    }
    if (res.status === 404 || (res.status === 400 && /model/i.test(detail))) {
      throw new GroqError("model_unavailable", `Model "${model}" tidak tersedia. Ganti GROQ_MODEL.`);
    }
    if (res.status === 401 || res.status === 403) {
      if (ownKey) throw new GroqError("invalid_key", "Token Groq-mu ditolak Groq. Periksa atau buat ulang di console.groq.com/keys.");
      throw new GroqError("not_configured", "GROQ_API_KEY ditolak Groq.");
    }
    throw new GroqError("upstream", `Groq membalas ${res.status}.`);
  }

  const json = (await res.json().catch(() => null)) as {
    choices?: { message?: { content?: string | null } }[];
  } | null;
  const text = json?.choices?.[0]?.message?.content?.trim();
  if (!text) throw new GroqError("upstream", "Groq mengembalikan jawaban kosong.");
  return text;
}

/** Cek token Groq lewat endpoint daftar model (tidak memakai kuota token). */
export async function verifyGroqKey(apiKey: string): Promise<"ok" | "invalid" | "unreachable"> {
  const baseUrl = (process.env.GROQ_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/$/, "");
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10_000);
  try {
    const res = await fetch(`${baseUrl}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: ctrl.signal,
      cache: "no-store",
    });
    if (res.ok) return "ok";
    if (res.status === 401 || res.status === 403) return "invalid";
    return "unreachable";
  } catch {
    return "unreachable";
  } finally {
    clearTimeout(timer);
  }
}
