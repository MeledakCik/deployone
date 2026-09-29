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
        <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0a0a0f] px-6 text-center text-white">
          <span className="text-[13px] font-medium tracking-wide text-white/50">Error</span>
          <h1 className="text-2xl font-semibold">Ada yang salah</h1>
          <p className="max-w-sm text-[13.5px] text-white/70">
            Terjadi kesalahan tak terduga saat memuat halaman ini. Coba muat ulang.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="mt-2 inline-flex items-center gap-2 rounded-full bg-violet-500 px-5 py-2.5 text-[13px] font-medium text-white hover:brightness-110"
          >
            Coba Lagi
          </button>
        </main>
      </body>
    </html>
  );
}
