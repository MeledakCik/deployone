import { DocsView } from "@/components/dashboard/DocsView";
import type { Metadata } from "next";
import { PublicHeader } from "@/components/public/PublicHeader"; // Sesuaikan path-nya

export const metadata: Metadata = {
  title: "Dokumentasi Depup",
  description:
    "Panduan penggunaan Depup: men-deploy website statis, mengelola Link Instan, dan menghubungkan Claude (MCP) ke platform deploy.",
  alternates: { canonical: "/docs" },
};

export default function DocsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg)]">
      {/* Gunakan Header baru di sini */}
      <PublicHeader />

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <DocsView />
      </main>

      <footer className="border-t border-[var(--line-strong)] py-8 text-center text-[13px] text-text-muted">
        <p>
          &copy; {new Date().getFullYear()} Depup. Dibuat untuk memudahkan
          deploy.
        </p>
      </footer>
    </div>
  );
}