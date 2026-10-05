const STEPS = [
  {
    n: "01",
    num: "text-obs-violet",
    badge: "Tempel",
    title: "Tempel link repo",
    body: "Masukkan link GitHub. Repo private juga bisa dengan GitHub Token. Depup langsung membaca isinya.",
    label: "Repo",
    lines: [
      ["text-white", "github.com/dimas/api-toko"],
      ["text-obs-mint", "✓ repo terbaca"],
    ],
  },
  {
    n: "02",
    num: "text-obs-purple",
    badge: "Periksa",
    title: "Lihat hasil pengecekan",
    body: "Kamu tahu jenis repo-nya, platform yang cocok, dan env var yang kemungkinan dibutuhkan, sebelum deploy dimulai.",
    label: "Hasil",
    lines: [
      ["text-white", "Express (server Node.js)"],
      ["text-obs-violet", "✓ Cocok: Railway"],
    ],
  },
  {
    n: "03",
    num: "text-obs-pink",
    badge: "Deploy",
    title: "Deploy dan pantau",
    body: "Progres tampil langsung. Kalau gagal, pesan error menjelaskan masalahnya dan apa yang harus dilakukan.",
    label: "Progres",
    lines: [
      ["text-white", "Build → Deploy → Live"],
      ["text-obs-ok", "● Online"],
    ],
  },
];

export function HowItWorks() {
  return (
    <section id="cara-kerja" className="mx-auto w-full max-w-7xl scroll-mt-20 px-4 py-20 sm:px-8">
      <div className="mx-auto mb-14 max-w-3xl text-center">
        <h2 className="f-display text-[28px] font-bold leading-tight tracking-[-0.03em] text-white sm:text-[40px] sm:leading-[48px]">
          Tiga langkah, dari repo ke link.
        </h2>
        <p className="mt-4 text-[17px] leading-relaxed text-obs-sec">
          Tidak ada YAML ribet. Cukup tempel link dan biarkan Depup menangani sisanya.
        </p>
      </div>

      <ol className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {STEPS.map((s) => (
          <li key={s.n} className="obs-card flex flex-col justify-between rounded-2xl p-7 transition-colors hover:bg-obs-elevated">
            <div>
              <div className="mb-8 flex items-center justify-between">
                <span className={`f-display text-4xl font-bold opacity-80 ${s.num}`}>{s.n}</span>
                <span className="f-mono rounded-md bg-obs-container px-2.5 py-1 text-[11px] font-semibold text-obs-sec">{s.badge}</span>
              </div>
              <h3 className="f-display mb-3 text-[24px] font-semibold tracking-[-0.02em] text-white">{s.title}</h3>
              <p className="mb-6 text-[15px] leading-relaxed text-obs-sec">{s.body}</p>
            </div>
            <div className="f-mono rounded-xl bg-obs-base p-3.5 text-[12px] leading-[18px]">
              <div className="mb-1 text-[10px] font-bold text-obs-mute">{s.label}</div>
              {s.lines.map(([cls, t]) => (
                <div key={t} className={cls}>
                  {t}
                </div>
              ))}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
