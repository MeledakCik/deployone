import { NextResponse } from "next/server";
import type { ApiError, ApiOk } from "@/types";

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

/** Wraps a route handler so unexpected throws never leak a raw 500 HTML page. */
export function withErrorHandling<A extends unknown[]>(
  handler: (...args: A) => Promise<NextResponse>
) {
  return async (...args: A): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (err) {
      // Detail lengkap tetap di-log server-side buat debugging. Error yang
      // SUDAH dikenal (BadRequestError, VercelApiError, GithubApiError, dll)
      // ditangani masing-masing route SEBELUM sampai ke sini dan tidak
      // kena blok ini — jadi ini murni buat error tak terduga (bug, network
      // fail, dll) yang pesan aslinya bisa saja kebawa detail internal
      // (path file, pesan library pihak ketiga) dan sebaiknya tidak
      // langsung ditampilkan ke client di production.
      console.error("[api] unhandled error", err);
      const message =
        process.env.NODE_ENV === "production"
          ? "Terjadi kesalahan di server. Coba lagi sebentar lagi."
          : err instanceof Error
            ? err.message
            : "Internal server error";
      return fail(message, 500);
    }
  };
}
