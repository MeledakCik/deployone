import type { ReactNode } from "react";
import { PublicNav } from "./PublicNav";
import { PublicFooter } from "./PublicFooter";

/**
 * Kerangka satu-satunya untuk halaman publik di luar landing: /fitur, /docs, /privacy, /docs/mcp, /laporkan.
 * Kanvas lilac (sama dengan dashboard) + kartu putih datar + header & footer yang seragam.
 * Server component: tidak memakai sesi/cookie kecuali bila `cta` diisi komponen yang sadar-login.
 */
export function PublicShell({
  children,
  cta,
  width = "4xl",
}: {
  children: ReactNode;
  cta?: ReactNode;
  /** 3xl untuk dokumen bacaan panjang, 4xl untuk halaman berisi kartu. */
  width?: "3xl" | "4xl";
}) {
  return (
    <div className="app-canvas flex min-h-[100dvh] flex-col">
      <PublicNav cta={cta} />
      <main className={`mx-auto w-full flex-1 px-4 pb-14 pt-6 sm:px-6 lg:px-8 ${width === "3xl" ? "max-w-3xl" : "max-w-4xl"}`}>{children}</main>
      <PublicFooter />
    </div>
  );
}
