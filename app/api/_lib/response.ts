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
      console.error("[api] unhandled error", err);
      const message = err instanceof Error ? err.message : "Internal server error";
      return fail(message, 500);
    }
  };
}
