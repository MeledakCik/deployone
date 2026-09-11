const STEPS = [
  {
    n: "01",
    t: "Connect Repository",
    d: "Hubungkan GitHub. Depush auto-detect framework Next.js, Astro, Vite, dan lainnya.",
  },
  {
    n: "02",
    t: "Pilih Platform",
    d: "Pilih Vercel untuk edge, Cloudflare untuk global CDN, atau deploy ke keduanya sekaligus.",
  },
  {
    n: "03",
    t: "Live dalam Detik",
    d: "Build logs realtime, preview URL instant, dan rollback kapan saja tanpa downtime.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative mx-auto max-w-[1200px] px-6 py-20">
      <div
        className="rounded-[28px] backdrop-blur-sm overflow-hidden"
        style={{ border: "1px solid var(--line)", background: "var(--row-hover)" }}
      >
        <div className="px-6 md:px-10 pt-10 md:pt-14 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <h2 className="text-[28px] md:text-[40px] leading-[1.05] tracking-[-0.03em] font-bold max-w-[520px] text-[var(--text)]">
            Tiga langkah, dari repo ke live URL.
          </h2>
          <p className="text-[13px] text-[var(--text-faint)] max-w-[320px]">
            Tidak ada YAML ribet. Tidak ada config yang bikin pusing. Cukup connect dan deploy.
          </p>
        </div>

        <div className="relative px-6 md:px-10 pb-10">
          <div
            className="hidden md:block absolute top-[72px] left-[72px] right-[72px] h-px"
            style={{ background: "linear-gradient(to right, transparent, var(--line-strong), transparent)" }}
          />

          <div className="grid md:grid-cols-3 gap-6">
            {STEPS.map((step) => (
              <div
                key={step.n}
                className="relative group rounded-[20px] p-6 transition"
                style={{ background: "var(--card-hover)", border: "1px solid var(--line)" }}
              >
                <span
                  className="absolute -top-2 -right-1 text-[64px] font-[900] leading-none tracking-tighter transition select-none"
                  style={{ color: "var(--line-strong)" }}
                >
                  {step.n}
                </span>

                <div className="relative">
                  <div className="w-9 h-9 rounded-full bg-white text-black text-[12px] font-bold flex items-center justify-center shadow-[0_0_0_1px_rgba(15,23,42,0.08)]">
                    {step.n}
                  </div>
                  <h3 className="mt-5 text-[16px] font-semibold text-[var(--text)]">{step.t}</h3>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--text-muted)]">{step.d}</p>

                  <div
                    className="mt-6 h-[88px] rounded-[12px] p-3 font-mono text-[11px] text-[var(--text-muted)] overflow-hidden"
                    style={{ background: "var(--surface-solid)", border: "1px solid var(--surface-line)" }}
                  >
                    <div className="flex items-center gap-2 text-[var(--text-faint)]">
                      <div className="w-2 h-2 rounded-full bg-emerald-400" />
                      depush CLI
                    </div>
                    <div className="mt-2 space-y-1">
                      <div>
                        <span className="text-violet-400">$</span> depush connect
                      </div>
                      <div className="text-[var(--text-faint)]">✓ repo linked</div>
                      <div>
                        <span className="text-violet-400">$</span> depush deploy --prod
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
