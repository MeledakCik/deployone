import { getT } from "@/lib/i18n/server";
import type { Metadata } from "next";
import { AbuseReportForm } from "@/components/AbuseReportForm";
import { PublicShell } from "@/components/public/PublicShell";

export function generateMetadata(): Metadata {
  return { title: getT()("Laporkan penyalahgunaan"), robots: { index: false, follow: false } };
}

export default function LaporkanPage({ searchParams }: { searchParams: { slug?: string | string[] } }) {
  const t = getT();
  const raw = Array.isArray(searchParams.slug) ? searchParams.slug[0] : searchParams.slug;
  // Hanya prefill slug yang bentuknya aman; sisanya dibiarkan kosong.
  const initial = raw && /^[a-z0-9-]{3,63}$/i.test(raw) ? raw : "";

  return (
    <PublicShell width="3xl">
      <div className="flex flex-col items-center gap-5 pt-4 text-center">
        <h1 className="page-title">{t("Laporkan penyalahgunaan")}</h1>
        <p className="max-w-md text-[14px] leading-relaxed text-text-muted">
          {t("Menemukan link Depup yang berisi phishing, penipuan, atau malware? Laporkan di sini. Jangan memasukkan password atau data pribadi di halaman tersebut.")}
        </p>
        <AbuseReportForm initialTarget={initial} />
      </div>
    </PublicShell>
  );
}
