import type { Metadata } from "next";
import Link from "next/link";
import { AbuseReportForm } from "@/components/AbuseReportForm";

export const metadata: Metadata = {
  title: "Laporkan penyalahgunaan",
  robots: { index: false, follow: false },
};

export default function LaporkanPage({ searchParams }: { searchParams: { slug?: string | string[] } }) {
  const raw = Array.isArray(searchParams.slug) ? searchParams.slug[0] : searchParams.slug;
  // Hanya prefill slug yang bentuknya aman; sisanya dibiarkan kosong.
  const initial = raw && /^[a-z0-9-]{3,63}$/i.test(raw) ? raw : "";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-5 px-6 py-12 text-center text-[var(--text)]">
      <h1 className="text-2xl font-semibold">Laporkan penyalahgunaan</h1>
      <p className="max-w-md text-[13.5px] text-[var(--text-muted)]">
        Menemukan link Depup yang berisi phishing, penipuan, atau malware? Laporkan di sini. Jangan memasukkan
        password atau data pribadi di halaman tersebut.
      </p>
      <AbuseReportForm initialTarget={initial} />
      <Link href="/" className="text-[13px] text-[var(--text-faint)] underline">
        Kembali ke Beranda
      </Link>
    </main>
  );
}
