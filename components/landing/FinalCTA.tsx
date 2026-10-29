import { DashboardLink } from "./DashboardLink";
import { ArrowRight } from "@/components/ui/icons";
import { WA_CHANNEL_URL } from "@/lib/community";

/**
 * Kartu penutup berwarna Midnight: permukaan gelap yang sama dengan dashboard mode gelap,
 * dengan lime sebagai satu-satunya aksen (tombol dan garis gelombang).
 * Midnight dipilih, bukan ungu, karena di bagian bawah halaman kanvasnya sendiri sudah ungu.
 */
export function FinalCTA() {
  return (
    <section className="mx-auto w-full max-w-6xl px-3 py-16 sm:px-8">
      <div className="relative overflow-hidden rounded-[32px] bg-midnight p-6 text-white sm:rounded-[40px] sm:p-14">
        <svg
          aria-hidden="true"
          viewBox="0 0 200 90"
          className="pointer-events-none absolute right-8 top-8 hidden h-24 w-52 lg:block"
          fill="none"
          stroke="#C6F432"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 60 C 18 60, 20 30, 32 30 S 44 74, 56 74 S 66 18, 80 18 S 92 66, 104 66 S 116 38, 128 38 S 140 58, 152 54 S 168 20, 196 12" />
        </svg>

        <div className="relative z-10 flex flex-col items-start justify-between gap-12 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <h2 className="text-balance text-[30px] font-bold leading-[1.08] tracking-[-0.03em] sm:text-[48px]">
              Coba dengan repo yang sudah kamu miliki.
            </h2>
            <p className="mb-8 mt-4 text-[17px] leading-relaxed text-night-80">
              Masuk dengan Google, tempel link GitHub, dan lihat hasil pemeriksaannya dalam hitungan detik.
            </p>
            <DashboardLink href="/dashboard" className="btn-lime inline-flex w-full items-center justify-center gap-2 whitespace-nowrap px-8 py-4 text-[16px] sm:w-auto">
              Buka dashboard
              <ArrowRight size={18} />
            </DashboardLink>
            <p className="mt-5 text-[14px] text-night-80">
              Mau ikut kabar terbarunya?{" "}
              <a href={WA_CHANNEL_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-white underline underline-offset-4">
                Ikuti saluran WhatsApp
              </a>
            </p>
          </div>

          <ul className="flex w-full flex-col gap-3 lg:mt-24 lg:w-auto lg:min-w-[260px]">
            {[
              ["3", "platform dalam satu dashboard"],
              ["Private", "repo pun bisa, lewat GitHub Token"],
              ["Google", "masuk tanpa membuat akun baru"],
            ].map(([big, small]) => (
              <li key={big} className="flex items-center justify-between gap-4 rounded-2xl bg-night-15 p-4 sm:gap-6">
                <span className="shrink-0 text-[22px] font-bold tracking-[-0.02em]">{big}</span>
                <span className="min-w-0 text-right text-[13px] leading-snug text-night-80">{small}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
