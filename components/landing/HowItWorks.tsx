import { Reveal } from "@/components/ui/Reveal";

const STEPS = [
  {
    n: "1",
    tint: "tint-lav",
    badge: "Tempel",
    title: "Tempel link repo",
    body: "Masukkan link GitHub. Repo private juga bisa dengan GitHub Token. Depup langsung membaca isinya.",
    label: "Repo",
    lines: [
      ["text-ink font-medium", "github.com/dimas/api-toko"],
      ["text-ok", "✓ repo terbaca"],
    ],
  },
  {
    n: "2",
    tint: "tint-sky",
    badge: "Periksa",
    title: "Lihat hasil pengecekan",
    body: "Kamu tahu jenis repo-nya, platform yang cocok, dan env var yang kemungkinan dibutuhkan, sebelum deploy dimulai.",
    label: "Hasil",
    lines: [
      ["text-ink font-medium", "Express (server Node.js)"],
      ["text-accent", "✓ Cocok: Railway"],
    ],
  },
  {
    n: "3",
    tint: "tint-mint",
    badge: "Deploy",
    title: "Deploy dan pantau",
    body: "Progres tampil langsung. Kalau gagal, pesan error menjelaskan masalahnya dan apa yang harus dilakukan.",
    label: "Progres",
    lines: [
      ["text-ink font-medium", "Build → Deploy → Live"],
      ["text-ok", "● Online"],
    ],
  },
];

export function HowItWorks() {
  return (
    <section id="cara-kerja" className="mx-auto w-full max-w-6xl scroll-mt-24 px-4 py-20 sm:px-8">
      <Reveal className="mx-auto mb-14 max-w-3xl text-center">
        <h2 className="display text-[32px] leading-[1.08] text-ink sm:text-[52px]">Tiga langkah, dari repo ke link.</h2>
        <p className="mt-5 text-[17px] leading-relaxed text-ink-2 sm:text-[19px]">
          Tidak ada YAML ribet. Cukup tempel link dan biarkan Depup menangani sisanya.
        </p>
      </Reveal>

      <ol className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {STEPS.map((s, k) => (
          <li key={s.n}>
            <Reveal delay={k * 110} className="h-full">
              <div className={`${s.tint} group lift flex h-full flex-col justify-between rounded-[32px] p-7 shadow-card`}>
                <div>
                  <div className="mb-8 flex items-center justify-between">
                    <span className="grid h-12 w-12 place-items-center rounded-full bg-card/85 text-[20px] font-semibold text-ink shadow-sm transition-transform duration-700 ease-bounce group-hover:scale-110 group-hover:-rotate-6">
                      {s.n}
                    </span>
                    <span className="rounded-full bg-card/70 px-3 py-1 text-[12px] font-semibold text-ink-2">{s.badge}</span>
                  </div>
                  <h3 className="mb-3 text-[26px] font-semibold leading-tight tracking-[-0.03em] text-ink">{s.title}</h3>
                  <p className="mb-7 text-[15.5px] leading-relaxed text-ink-2">{s.body}</p>
                </div>
                <div className="rounded-[22px] bg-card/80 p-4 text-[13px] leading-[20px] backdrop-blur">
                  <div className="mb-1 text-[12px] font-semibold text-ink-3">{s.label}</div>
                  {s.lines.map(([cls, t]) => (
                    <div key={t} className={`mono ${cls}`}>
                      {t}
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </li>
        ))}
      </ol>
    </section>
  );
}
