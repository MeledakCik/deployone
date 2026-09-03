/** Lightweight runtime checks for API request bodies — no extra deps. */

export function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new BadRequestError(`Field "${field}" wajib diisi.`);
  }
  return value.trim();
}

export function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export class BadRequestError extends Error {
  code = "bad_request" as const;
}

/** Very small guard against obviously-malformed project names before we hand them to Vercel. */
export function assertValidProjectName(name: string) {
  if (!/^[a-z0-9][a-z0-9._-]{0,99}$/i.test(name)) {
    throw new BadRequestError(
      "Nama project hanya boleh huruf, angka, titik, underscore, dan strip."
    );
  }
}
