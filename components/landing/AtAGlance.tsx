import { tDeep } from "@/lib/i18n/core";
import { getT } from "@/lib/i18n/server";
import Link from "next/link";
import { FEATURES as FEATURES_RAW, PLATFORMS as PLATFORMS_RAW, SITE_DEFINITION } from "@/lib/site-content";

/**
 * Blok "Depup sekilas": ringkasan yang bisa dibaca manusia sekaligus mudah dikutip mesin pencari
 * dan asisten AI (definisi satu kalimat, daftar fitur, platform). Isinya diambil dari lib/site-content.ts,
 * jadi otomatis sama dengan /fitur, /llms.txt, dan /llms-full.txt. Server component, ikut di HTML awal.
 */
export function AtAGlance() {
  const t = getT();
  const FEATURES = tDeep(FEATURES_RAW, t);
  const PLATFORMS = tDeep(PLATFORMS_RAW, t);
  return (
    <section
      id="sekilas"
      aria-labelledby="sekilas-judul"
      className="mx-auto w-full max-w-6xl scroll-mt-24 px-4 pb-16 pt-4 sm:px-8 sm:pb-20"
    >
      <div className="mx-auto mb-10 max-w-3xl text-center">
        <h2 id="sekilas-judul" className="lp-h2">{t("Depup sekilas.")}</h2>
        <p className="lp-lead">{t(SITE_DEFINITION)}</p>
      </div>

      {/* Ringkas: nama fitur saja (penjelasan lengkap ada di /fitur dan di grid fitur di bawah),
          supaya bagian ini tidak mengulang isi FeaturesGrid. */}
      <div className="surface-solid grid gap-6 rounded-card p-6 sm:p-7 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-10">
        <div>
          <h3 className="text-[18px] font-bold tracking-[-0.02em]">{t("Yang bisa kamu lakukan")}</h3>
          <ul className="mt-4 flex flex-wrap gap-2">
            {FEATURES.map((f) => (
              <li key={f.slug}>
                <Link
                  href={`/fitur/${f.slug}`}
                  title={t(f.summary)}
                  className="pill inline-flex min-h-[40px] items-center px-4 text-[14px] font-semibold"
                >
                  {t(f.name)}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-[18px] font-bold tracking-[-0.02em]">{t("Platform tujuan")}</h3>
          <ul className="mt-4 space-y-2.5">
            {PLATFORMS.map((p) => (
              <li key={p.name} className="text-[14px] leading-snug">
                <span className="font-semibold">{t(p.name)}</span>
                <span className="text-text-muted"> — {t(p.fit)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[14px] leading-relaxed text-text-muted">
            {t("Gratis dipakai. Masuk dengan akun Google, tanpa password baru.")}{" "}
            <Link href="/fitur" className="font-semibold text-text underline underline-offset-4">
              {t("Lihat semua fitur")}
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
