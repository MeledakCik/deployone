import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center text-[var(--text)]">
      <span className="text-[13px] font-medium tracking-wide text-text-faint">404</span>
      <h1 className="text-2xl font-semibold">Halaman tidak ditemukan</h1>
      <p className="max-w-sm text-[13.5px] text-text-muted">
        Halaman yang kamu cari tidak ada atau sudah dipindahkan.
      </p>
      <Link
        href="/"
        className="btn-primary mt-2 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[13px]"
      >
        Kembali ke Beranda
      </Link>
    </main>
  );
}
