import type { EnvValidationIssue } from "@/types";

const KEY_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

export interface ParsedEnvEntry {
  key: string;
  value: string;
  line: number;
}

export interface EnvValidationResult {
  entries: ParsedEnvEntry[];
  issues: EnvValidationIssue[];
  hasErrors: boolean;
}

/** Validates a single env var key — used by the Environment Variables "Add Secret" modal. */
export function validateEnvKey(key: string): string | null {
  const trimmed = key.trim();
  if (!trimmed) return "Key tidak boleh kosong.";
  if (!KEY_RE.test(trimmed)) {
    return 'Key hanya boleh huruf, angka & underscore, tidak diawali angka (contoh: DATABASE_URL).';
  }
  return null;
}

/**
 * Parses a `KEY=value` textarea block (Railway/Render deploy forms) and
 * validates every non-empty, non-comment line: missing "=", invalid key
 * names, duplicate keys, and empty values are all surfaced so the user can
 * fix them before the deploy is submitted.
 */
export function parseAndValidateEnvText(text: string): EnvValidationResult {
  const issues: EnvValidationIssue[] = [];
  const entries: ParsedEnvEntry[] = [];
  const seenKeys = new Map<string, number>();

  text.split("\n").forEach((raw, idx) => {
    const line = idx + 1;
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith("#")) return;

    const eq = trimmed.indexOf("=");
    if (eq === -1) {
      issues.push({ line, level: "error", message: `Baris ${line}: format harus KEY=value.` });
      return;
    }

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    const keyError = validateEnvKey(key);
    if (keyError) {
      issues.push({ line, level: "error", message: `Baris ${line}: ${keyError}` });
      return;
    }

    if (seenKeys.has(key)) {
      issues.push({
        line,
        level: "error",
        message: `Baris ${line}: key "${key}" duplikat (lihat baris ${seenKeys.get(key)}).`,
      });
      return;
    }
    seenKeys.set(key, line);

    if (!value) {
      issues.push({ line, level: "warning", message: `Baris ${line}: value untuk "${key}" kosong.` });
    }

    entries.push({ key, value, line });
  });

  return { entries, issues, hasErrors: issues.some((i) => i.level === "error") };
}
