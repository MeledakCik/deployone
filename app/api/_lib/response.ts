import { NextResponse } from "next/server";
import type { ApiError, ApiOk } from "@/types";
import { getSessionEmail } from "@/app/api/_lib/session";

export function ok<T>(data: T, init?: number): NextResponse<ApiOk<T>> {
  return NextResponse.json({ ok: true, data }, { status: init ?? 200 });
}

export function fail(
  error: string,
  status: number,
  code?: ApiError["code"]
): NextResponse<ApiError> {
  return NextResponse.json({ ok: false, error, code }, { status });
}

interface HandlerOptions {
  /** true = route boleh diakses tanpa login (hanya /api/auth/session). */
  public?: boolean;
}

/**
 * Wraps a route handler so unexpected throws never leak a raw 500 HTML page.
 *
 * Secara default juga MEWAJIBKAN session valid — lapis kedua di belakang
 * middleware.ts, supaya kalau matcher middleware suatu saat bocor/dilewati
 * (mis. advisory middleware di Next), route proxy tetap tidak terbuka.
 */
export function withErrorHandling<A extends unknown[]>(
  handler: (...args: A) => Promise<NextResponse>,
  options: HandlerOptions = {}
) {
  return async (...args: A): Promise<NextResponse> => {
    try {
      if (!options.public) {
        const req = args[0] as { cookies?: unknown } | undefined;
        if (!req || !req.cookies || !getSessionEmail(req as Parameters<typeof getSessionEmail>[0])) {
          return fail("Sesi login habis. Silakan login lagi.", 401, "unauthorized");
        }
      }
      return await handler(...args);
    } catch (err) {
      // Sinyal internal Next.js (route ini dinamis) harus diteruskan, bukan ditelan
      // sebagai "500" — kalau tidak build penuh log error palsu.
      if (
        err &&
        typeof err === "object" &&
        (err as { digest?: string }).digest === "DYNAMIC_SERVER_USAGE"
      ) {
        throw err;
      }
      console.error("[api] unhandled error", err);
      // Detail error cuma di log server — jangan bocor ke client.
      return fail("Terjadi kesalahan di server. Coba lagi sebentar lagi.", 500);
    }
  };
}
