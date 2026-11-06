import { getT } from "@/lib/i18n/server";
import Link from "next/link";
import { PublicShell } from "@/components/public/PublicShell";

export default function NotFound() {
  const t = getT();
  return (
    <PublicShell width="3xl">
      <div className="surface-solid mx-auto mt-6 flex w-full max-w-md flex-col items-center gap-3 px-8 py-14 text-center">
        <span className="rounded-lg bg-tone-lilac px-2.5 py-1 text-[12px] font-semibold tabular-nums text-lav-text">404</span>
        <h1 className="mt-2 text-[28px] font-bold tracking-[-0.035em]">{t("Halaman tidak ditemukan")}</h1>
        <p className="max-w-sm text-[14px] leading-relaxed text-text-muted">
          {t("Halaman yang kamu cari tidak ada, atau mungkin sudah dipindahkan.")}
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <Link href="/" className="btn-primary btn-md">
            {t("Kembali ke beranda")}
          </Link>
          <Link href="/docs" className="pill btn-md font-medium">
            {t("Buka dokumentasi")}
          </Link>
        </div>
      </div>
    </PublicShell>
  );
}
