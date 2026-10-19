import type { Metadata } from "next";
import Link from "next/link";
import { KuliProyekDemo } from "@/components/dashboard/KuliProyekDemo";

export const metadata: Metadata = {
  title: "Demo Kuli Proyek",
  robots: { index: false, follow: false },
};

export default function DemoKuliPage() {
  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-2xl flex-col gap-5 px-4 py-10 text-[var(--text)]">
      <header className="space-y-1.5">
        <h1 className="text-2xl font-semibold">Demo Kuli Proyek</h1>
        <p className="text-[13.5px] text-[var(--text-muted)]">
          Kuli dan mandor membangun gedung kecil selagi &ldquo;deploy&rdquo; berjalan. Tekan Mulai untuk melihatnya.
        </p>
      </header>
      <KuliProyekDemo />
      <Link href="/" className="w-fit text-[13px] text-[var(--text-faint)] underline">
        Kembali ke Beranda
      </Link>
    </main>
  );
}
