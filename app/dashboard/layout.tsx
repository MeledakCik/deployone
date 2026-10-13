"use client";

import { DeployProvider } from "@/lib/deploy-context";
import { AuthGuard } from "@/components/dashboard/AuthGuard";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <DeployProvider>{children}</DeployProvider>
    </AuthGuard>
  );
}
