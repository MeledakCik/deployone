import { DeployProvider } from "@/lib/deploy-context";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DeployProvider>{children}</DeployProvider>;
}
