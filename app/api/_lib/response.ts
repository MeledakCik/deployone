import { NextResponse } from "next/server";
import type { ApiError, ApiOk, ErrorGuide } from "@/types";

export function ok<T>(data: T, init?: number): NextResponse<ApiOk<T>> {
  return NextResponse.json({ ok: true, data }, { status: init ?? 200 });
}

export function fail(
  error: string,
  status: number,
  code?: ApiError["code"],
  guide?: ErrorGuide
): NextResponse<ApiError> {
  return NextResponse.json({ ok: false, error, code, guide }, { status });
}

/** Wraps a route handler so unexpected throws never leak a raw 500 HTML page. */
export function withErrorHandling<A extends unknown[]>(
  handler: (...args: A) => Promise<NextResponse>
) {
  return async (...args: A): Promise<NextResponse> => {
    try {
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
