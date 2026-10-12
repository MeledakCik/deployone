"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

/**
 * Tombol "buka dashboard" di landing page.
 * - Sudah login      -> masuk ke /dashboard.
 * - Belum login      -> langsung diarahkan ke login Google (tanpa mampir ke dashboard dulu).
 * - Session belum selesai dicek -> tunggu sebentar, lalu salah satu di atas.
 * Klik dengan Ctrl/Cmd/Shift atau klik tengah tetap membuka /dashboard di tab baru;
 * AuthGuard di sana yang mengarahkan ke login bila belum masuk.
 */
export function DashboardLink({
  href = "/dashboard",
  className,
  children,
  onClick,
}: {
  href?: string;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  const { user, ready, login } = useAuth();
  const router = useRouter();
  const [waiting, setWaiting] = React.useState(false);

  const go = React.useCallback(() => {
    if (user) router.push(href);
    else login();
  }, [user, router, href, login]);

  // Klik terjadi sebelum /api/auth/session selesai: lanjutkan begitu hasilnya ada.
  React.useEffect(() => {
    if (!waiting || !ready) return;
    setWaiting(false);
    go();
  }, [waiting, ready, go]);

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    onClick?.();
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    if (!ready) setWaiting(true);
    else go();
  }

  return (
    <Link
      href={href}
      onClick={handleClick}
      aria-busy={waiting || undefined}
      className={`${className ?? ""}${waiting ? " pointer-events-none opacity-70" : ""}`}
    >
      {children}
    </Link>
  );
}
