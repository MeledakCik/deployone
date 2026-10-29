import Link from "next/link";
import { FEATURES, PLATFORMS, SITE_DEFINITION } from "@/lib/site-content";

/**
 * Blok "Depup sekilas": ringkasan yang bisa dibaca manusia sekaligus mudah dikutip mesin pencari
 * dan asisten AI (definisi satu kalimat, daftar fitur, platform). Isinya diambil dari lib/site-content.ts,
 * jadi otomatis sama dengan /fitur, /llms.txt, dan /llms-full.txt. Server component, ikut di HTML awal.
 */
export function AtAGlance() {
  return (
    <section
      id="sekilas"
      aria-labelledby="sekilas-judul"
      className="mx-auto w-full max-w-6xl scroll-mt-24 px-4 pb-16 pt-4 sm:px-8 sm:pb-20"
    >
      <div className="mx-auto mb-10 max-w-3xl text-center">
        <h2 id="sekilas-judul" className="lp-h2">Depup sekilas.</h2>
        <p className="lp-lead">{SITE_DEFINITION}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="surface-solid rounded-card p-6 sm:p-7 lg:col-span-2">
          <h3 className="text-[17px] font-bold tracking-[-0.02em]">Yang bisa kamu lakukan</h3>
          <ul className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <li key={f.slug} className="text-[13.5px] leading-relaxed">
                <Link href={`/fitur/${f.slug}`} className="font-semibold underline-offset-4 hover:underline">
                  {f.name}
                </Link>
                <span className="block text-text-muted">{f.summary}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="surface-solid flex flex-col rounded-card p-6 sm:p-7">
          <h3 className="text-[17px] font-bold tracking-[-0.02em]">Platform tujuan</h3>
          <ul className="mt-4 space-y-3">
            {PLATFORMS.map((p) => (
              <li key={p.name} className="text-[13.5px] leading-relaxed">
                <span className="block font-semibold">{p.name}</span>
                <span className="text-text-muted">{p.fit}</span>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-[13px] leading-relaxed text-text-muted">
            Gratis dipakai. Masuk dengan akun Google, tanpa password baru.
          </p>
          <Link href="/fitur" className="mt-auto pt-5 text-[13px] font-semibold underline underline-offset-4">
            Lihat semua fitur
          </Link>
        </div>
      </div>
    </section>
  );
}
