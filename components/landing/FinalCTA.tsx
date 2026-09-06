import Link from "next/link";

export function FinalCTA() {
  return (
    <section id="pricing" className="relative mx-auto max-w-[1200px] px-6 pt-10 pb-24">
      <div
        className="relative rounded-[32px] overflow-hidden"
        style={{ border: "1px solid var(--line-strong)", background: "var(--surface-solid)" }}
      >
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(124,58,237,0.25),_transparent_55%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(168,85,247,0.18),_transparent_50%)]" />
        </div>

        <div className="relative px-6 md:px-16 py-16 md:py-24 text-center">
          <div className="pill mx-auto inline-flex h-7 px-3 text-[11px] tracking-widest uppercase text-[var(--text-muted)]">
            Gratis untuk personal • Pro untuk tim
          </div>

          <h2 className="mx-auto mt-6 max-w-[720px] text-[32px] md:text-[52px] leading-[1.05] tracking-[-0.04em] font-bold text-[var(--text)]">
            Buat developer yang <span className="text-[var(--text-faint)]">benci ribet.</span> Gratis untuk
            project personal.
          </h2>

          <p className="mx-auto mt-4 max-w-[460px] text-[15px] leading-relaxed text-[var(--text-muted)]">
            Mulai dalam 30 detik. Tidak butuh kartu kredit. Cancel kapan saja.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/dashboard" className="btn-primary h-[48px] px-8 text-[14px] flex items-center gap-2">
              Mulai Gratis <span className="text-[16px]">→</span>
            </Link>
            <span className="text-[12px] text-[var(--text-faint)]">
              ✓ 3 project gratis • ✓ 100 deploys / bulan • ✓ Community support
            </span>
          </div>

          <div
            className="mx-auto mt-12 max-w-[860px] rounded-[20px] backdrop-blur-xl overflow-hidden"
            style={{ border: "1px solid var(--line)", background: "var(--card-hover)" }}
          >
            <div
              className="h-9 flex items-center px-4 text-[11px] text-[var(--text-faint)]"
              style={{ borderBottom: "1px solid var(--line)", background: "var(--row-hover)" }}
            >
              depush.app — live preview
            </div>
            <div className="grid grid-cols-3" style={{ borderColor: "var(--line)" }}>
              <div className="p-5 text-left" style={{ borderRight: "1px solid var(--line)" }}>
                <div className="text-[11px] text-[var(--text-faint)] uppercase tracking-widest">Build Time</div>
                <div className="mt-1 text-[20px] font-bold text-[var(--text)]">32s avg</div>
              </div>
              <div className="p-5 text-left" style={{ borderRight: "1px solid var(--line)" }}>
                <div className="text-[11px] text-[var(--text-faint)] uppercase tracking-widest">Uptime</div>
                <div className="mt-1 text-[20px] font-bold text-[var(--text)]">99.98%</div>
              </div>
              <div className="p-5 text-left">
                <div className="text-[11px] text-[var(--text-faint)] uppercase tracking-widest">Saved</div>
                <div className="mt-1 text-[20px] font-bold text-[var(--text)]">4.2 jam / minggu</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
