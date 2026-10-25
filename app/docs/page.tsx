import { DocsView } from "@/components/dashboard/DocsView";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Dokumentasi Depup",
  description:
    "Panduan penggunaan Depup: men-deploy website statis, mengelola Link Instan, dan menghubungkan Claude (MCP) ke platform deploy.",
  alternates: { canonical: "/docs" },
};

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <header className="border-b border-[var(--line-strong)] bg-[var(--surface-solid)]">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="text-[16px] font-bold tracking-tight hover:opacity-80">
            Depup.
          </Link>
          <Link
            href="/login"
            className="rounded-full bg-[var(--pill-bg)] px-5 py-2 text-[13px] font-medium transition-colors hover:brightness-95"
          >
            Masuk
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <DocsView />
      </main>
    </div>
  );
}