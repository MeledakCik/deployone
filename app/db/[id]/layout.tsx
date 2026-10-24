export const metadata = { title: "Panel Database — Depup", robots: { index: false, follow: false } };

export default function DbLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-[100dvh] bg-[#f4f1ff] text-slate-900 dark:bg-[#120b2e] dark:text-slate-100">{children}</div>;
}
