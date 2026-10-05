const STEPS = [
  {
    title: "Tempel link repo",
    body: "Masukkan link GitHub. Repo private juga bisa dengan GitHub Token. Depup langsung membaca isinya.",
  },
  {
    title: "Lihat hasil pengecekan",
    body: "Kamu tahu jenis repo-nya, platform yang cocok, dan env var yang kemungkinan dibutuhkan, sebelum deploy dimulai.",
  },
  {
    title: "Deploy dan pantau",
    body: "Progres tampil langsung. Kalau gagal, pesan error menjelaskan masalahnya dan apa yang harus dilakukan.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto max-w-[1200px] px-6 py-20 scroll-mt-20">
      <h2 className="font-display text-[34px] md:text-[46px] leading-[1.05] tracking-[-0.03em] font-bold max-w-[620px]">
        Tiga langkah dari repo ke link
      </h2>
      <ol className="mt-12 grid md:grid-cols-3 gap-x-10 gap-y-10">
        {STEPS.map((s, idx) => (
          <li key={s.title} className="pt-5" style={{ borderTop: "2px solid var(--text)" }}>
            <div className="font-display text-[15px] text-[var(--text-faint)]">Langkah {idx + 1}</div>
            <h3 className="mt-2 font-display text-[22px] font-semibold tracking-[-0.02em]">{s.title}</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-[var(--text-muted)] max-w-[340px]">{s.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
