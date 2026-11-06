import { NextResponse } from "next/server";
import type { ApiError, ApiOk, ErrorGuide } from "@/types";
import { recordServerError } from "@/app/api/_lib/error-log";
import { headers } from "next/headers";
import { LANG_HEADER, translateLoose } from "@/lib/i18n/core";
import "@/lib/i18n/dict/all";

/** Pesan error mengikuti bahasa pengguna (header dari middleware). */
function localize(msg: string): string {
  try {
    return headers().get(LANG_HEADER) === "en" ? translateLoose("en", msg) : msg;
  } catch {
    return msg;
  }
}

export function ok<T>(data: T, init?: number): NextResponse<ApiOk<T>> {
  return NextResponse.json({ ok: true, data }, { status: init ?? 200 });
}

export function fail(
  error: string,
  status: number,
  code?: ApiError["code"],
  guide?: ErrorGuide
): NextResponse<ApiError> {
  return NextResponse.json({ ok: false, error: localize(error), code, guide }, { status });
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
      // Dicatat ke log ringan (KV) supaya muncul di menu Audit sistem di panel admin.
      await recordServerError(args[0], err);
      // Detail error cuma di log server — jangan bocor ke client.
      return fail("Terjadi kesalahan di server. Coba lagi sebentar lagi.", 500);
    }
  };
}
