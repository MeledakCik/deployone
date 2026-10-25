import { DocsView } from "@/components/dashboard/DocsView";
import type { Metadata } from "next";
import { PublicHeader } from "@/components/public/PublicHeader"; // Sesuaikan path

export const metadata: Metadata = {
  title: "Dokumentasi Depup",
  description:
    "Panduan penggunaan Depup: men-deploy website statis, mengelola Link Instan, dan menghubungkan Claude (MCP) ke platform deploy.",
  alternates: { canonical: "/docs" },
};

export default function DocsPage() {
  return (
    // PERUBAHAN: bg-[var(--bg)] diganti jadi bg-slate-50 (abu-abu sangat muda)
    // Ini bikin teks hitam dan kartu putih jadi jauh lebih menonjol dan bersih.
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-zinc-950">
      <PublicHeader />

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <DocsView />
      </main>

      <footer className="border-t border-slate-200 dark:border-zinc-800 py-8 text-center text-[13px] text-slate-500 dark:text-zinc-400">
        <p>
          &copy; {new Date().getFullYear()} Depup. Dibuat untuk memudahkan deploy.
        </p>
      </footer>
    </div>
  );
}