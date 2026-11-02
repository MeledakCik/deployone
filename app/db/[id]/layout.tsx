export const metadata = { title: "Panel Database — Depup", robots: { index: false, follow: false } };

export default function DbLayout({ children }: { children: React.ReactNode }) {
  return <div className="app-canvas">{children}</div>;
}
