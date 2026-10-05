/** Tutupi pola token/secret umum sebelum teks keluar ke penyedia AI. */
export function redactSecrets(text: string): string {
  return text
    .replace(/\bgithub_pat_[A-Za-z0-9_]{20,}/g, "[token disembunyikan]")
    .replace(/\bgh[pousr]_[A-Za-z0-9]{20,}/g, "[token disembunyikan]")
    .replace(/\b(?:gsk|sk|rk|pk)[-_][A-Za-z0-9_-]{20,}/g, "[token disembunyikan]")
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]{16,}/gi, "Bearer [token disembunyikan]")
    .replace(
      /\b(token|api[_ -]?key|secret|password|passwd)\s*[:=]\s*["']?[A-Za-z0-9._~+/=-]{12,}["']?/gi,
      "$1: [disembunyikan]"
    );
}
