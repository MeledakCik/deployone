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
    <main className="app-canvas flex flex-col items-center justify-center gap-5 px-6 py-12 text-center">
      <h1 className="page-title">Laporkan penyalahgunaan</h1>
      <p className="max-w-md text-[13.5px] leading-relaxed text-text-muted">
        Menemukan link Depup yang berisi phishing, penipuan, atau malware? Laporkan di sini. Jangan memasukkan
        password atau data pribadi di halaman tersebut.
      </p>
      <AbuseReportForm initialTarget={initial} />
      <Link href="/" className="pill px-5 py-2.5 text-[13px] font-medium">
        Kembali ke beranda
      </Link>
    </main>
  );
}
