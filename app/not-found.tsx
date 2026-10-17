import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-[100dvh] place-items-center p-4 text-[var(--text)]">
      <div className="surface-solid flex w-full max-w-md flex-col items-center gap-3 px-8 py-14 text-center">
        <span className="rounded-lg bg-tone-lilac px-2.5 py-1 text-[12px] font-semibold tabular-nums">404</span>
        <h1 className="mt-2 text-[28px] font-bold tracking-[-0.035em]">Halaman tidak ditemukan</h1>
        <p className="max-w-sm text-[13.5px] text-text-muted">
          Halaman yang kamu cari tidak ada, atau mungkin sudah dipindahkan.
        </p>
        <Link
          href="/"
          className="btn-primary mt-3 inline-flex items-center gap-2 px-5 py-3 text-[13px]"
        >
          Kembali ke beranda
        </Link>
      </div>
    </main>
  );
}
