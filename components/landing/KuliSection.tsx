import { KuliProyekDemo } from "@/components/dashboard/KuliProyekDemo";

export function KuliSection() {
  return (
    <section id="demo-kuli" className="mx-auto w-full max-w-6xl scroll-mt-24 px-4 pb-16 pt-4 sm:px-8 sm:pb-20">
      <div className="mx-auto mb-10 max-w-3xl text-center">
        <h2 className="lp-h2">Selagi deploy jalan, ada yang kerja keras.</h2>
        <p className="lp-lead">
          Kuli dan mandor kami siap membangun gedung kecil. Coba tekan Mulai, atau Gagalkan kalau mau lihat drama proyek mangkrak.
        </p>
      </div>
      <div className="mx-auto max-w-2xl">
        <KuliProyekDemo />
      </div>
    </section>
  );
}
