import { KuliProyekDemo } from "@/components/dashboard/KuliProyekDemo";

export function KuliSection() {
  return (
    <section id="demo-kuli" className="mx-auto w-full max-w-7xl scroll-mt-20 px-4 py-16 sm:px-8">
      <div className="mx-auto mb-8 max-w-2xl text-center">
        <h2 className="f-display text-[28px] font-bold leading-tight tracking-[-0.03em] text-white sm:text-[36px] sm:leading-[44px]">
          Selagi deploy jalan, ada yang <span className="obs-gradient-text">kerja keras.</span>
        </h2>
        <p className="mt-3 text-[16px] leading-relaxed text-obs-sec">
          Kuli dan mandor kami siap membangun gedung kecil. Coba tekan Mulai, atau Gagalkan kalau mau lihat drama proyek mangkrak.
        </p>
      </div>
      <div className="mx-auto max-w-2xl">
        <KuliProyekDemo />
      </div>
    </section>
  );
}
