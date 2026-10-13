/**
 * Parser teks env "KEY=value per baris" (format .env). Dipakai bersama oleh
 * deploy Vercel/Cloudflare/Railway supaya semuanya membaca env dengan aturan sama.
 * Mendukung: komentar (#), prefix "export ", nilai berkutip "..." / '...'.
 * Key yang bukan UPPER_SNAKE_CASE dilewati (aturan yang sama dengan halaman Environment).
 */
const LINE_RE = /^(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=\s*(.*)$/;
export const MAX_ENV_VARS = 100;

/** Bersihkan nilai mentah sebuah baris env: buang kutip pembungkus & komentar di belakang. */
export function cleanEnvValue(raw: string): string {
  const v = raw.trim();
  const quoted = /^(["'])(.*?)\1\s*(?:#.*)?$/.exec(v);
  if (quoted) return quoted[2];
  // Tanpa kutip: " # komentar" di akhir baris dibuang.
  return v.replace(/\s+#.*$/, "");
}

export function parseEnvText(text: string | undefined | null): Record<string, string> {
  const env: Record<string, string> = {};
  if (!text) return env;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const m = LINE_RE.exec(line);
    if (!m) continue;
    const value = cleanEnvValue(m[2]);
    // Nilai kosong (placeholder dari .env.example) tidak dikirim — platform menolak value kosong.
    if (value === "") continue;
    env[m[1]] = value;
    if (Object.keys(env).length >= MAX_ENV_VARS) break;
  }
  return env;
}
