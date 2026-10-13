"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

/** Wraps /dashboard so it's only reachable with a real Google session. */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, ready, login } = useAuth();
  const router = useRouter();
  // Pernah login di halaman ini? Bedakan "baru datang tanpa login" dari "baru saja logout".
  const hadUser = React.useRef(false);

  React.useEffect(() => {
    if (user) {
      hadUser.current = true;
      return;
    }
    if (!ready) return;
    // Logout / sesi habis saat dashboard terbuka -> kembali ke beranda (Sidebar juga melakukan ini).
    if (hadUser.current) router.replace("/");
    // Buka /dashboard tanpa login (link langsung, tab baru, bookmark) -> langsung ke login Google.
    else login();
  }, [ready, user, router, login]);

  if (!ready || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 size={28} className="animate-spin text-text-faint" />
      </div>
    );
  }

  return <>{children}</>;
}
