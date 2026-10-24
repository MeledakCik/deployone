export const metadata = { title: "Panel Database — Depup", robots: { index: false, follow: false } };

export default function DbLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">{children}</div>;
}
