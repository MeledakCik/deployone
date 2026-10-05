const ITEMS = [
  { title: "Domain sendiri", body: "Tambahkan domain dan dapatkan record DNS persis yang perlu dipasang di registrar." },
  { title: "Environment variables", body: "Simpan per project dan kirim ke platform tujuan. Env var yang dibutuhkan repo terdeteksi otomatis." },
  { title: "Satu daftar project", body: "Project dari Vercel, Cloudflare Pages, dan Railway tampil bersama, lengkap dengan status dan tombol redeploy." },
  { title: "Riwayat deploy", body: "Lihat deploy terakhir, hasilnya, dan buka lagi dengan satu klik." },
  { title: "Mode gelap dan terang", body: "Ikuti pengaturan perangkat atau pilih sendiri." },
  { title: "Token tetap milikmu", body: "Token platform dikirim hanya saat dipakai. Login memakai akun Google." },
];

export function FeaturesGrid() {
  return (
    <section id="features" className="mx-auto max-w-[1200px] px-6 py-20 scroll-mt-20">
      <h2 className="font-display text-[34px] md:text-[46px] leading-[1.05] tracking-[-0.03em] font-bold max-w-[620px]">
        Setelah website live, semuanya tetap di satu tempat
      </h2>
      <dl className="mt-12 grid md:grid-cols-2 lg:grid-cols-3" style={{ borderTop: "1px solid var(--line)" }}>
        {ITEMS.map((f) => (
          <div key={f.title} className="py-7 md:pr-10" style={{ borderBottom: "1px solid var(--line)" }}>
            <dt className="font-display text-[19px] font-semibold tracking-[-0.01em]">{f.title}</dt>
            <dd className="mt-2 text-[14.5px] leading-relaxed text-[var(--text-muted)] max-w-[360px]">{f.body}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
