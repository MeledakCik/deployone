"use client";

import { DeployProvider } from "@/lib/deploy-context";
import { ConfirmProvider } from "@/components/ui/confirm";
import { AuthGuard } from "@/components/dashboard/AuthGuard";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <DeployProvider>
        <ConfirmProvider>{children}</ConfirmProvider>
      </DeployProvider>
    </AuthGuard>
  );
}
