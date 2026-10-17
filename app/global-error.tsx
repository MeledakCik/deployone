"use client";

import * as React from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // Detail teknis cukup di console/log server — yang tampil ke user tetap generik.
    console.error("[app] unhandled render error:", error);
  }, [error]);

  return (
    <html lang="id">
      <body>
        <main className="grid min-h-[100dvh] place-items-center p-4 text-[var(--text)]">
          <div className="surface-solid flex w-full max-w-md flex-col items-center gap-3 px-8 py-14 text-center">
            <span className="rounded-lg bg-tone-peach px-2.5 py-1 text-[12px] font-semibold">Error</span>
            <h1 className="mt-2 text-[28px] font-bold tracking-[-0.035em]">Ada yang tidak beres</h1>
            <p className="max-w-sm text-[13.5px] text-text-muted">
              Terjadi kesalahan yang tidak terduga saat memuat halaman ini. Coba muat ulang halamannya.
            </p>
            <button
              type="button"
              onClick={() => reset()}
              className="btn-primary mt-3 inline-flex items-center gap-2 px-5 py-3 text-[13px]"
            >
              Coba lagi
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
