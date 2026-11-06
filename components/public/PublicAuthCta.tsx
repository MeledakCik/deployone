"use client";

import { useT } from "@/lib/i18n";
import "@/lib/i18n/dict/public";
import * as React from "react";
import { ArrowUpRight } from "@/components/ui/icons";
import { useAuth } from "@/lib/auth-context";
import { GoogleLoginModal, GoogleMark } from "@/components/landing/GoogleLoginModal";
import { DashboardLink } from "@/components/landing/DashboardLink";

/**
 * Aksi di header publik yang tahu status login: "Buka dashboard" bila sudah masuk, "Masuk" (Google) bila belum.
 * Dipisah dari PublicNav supaya halaman yang tidak butuh sesi (privasi, dokumentasi konektor) tidak ikut memuatnya.
 */
export function PublicAuthCta() {
  const t = useT();
  const { user, ready } = useAuth();
  const [loginOpen, setLoginOpen] = React.useState(false);
  const loggedIn = ready && !!user;

  return (
    <>
      {loggedIn ? (
        <DashboardLink href="/dashboard" className="btn-primary btn-md">
          {t("Buka dashboard")}{" "}<ArrowUpRight size={14} />
        </DashboardLink>
      ) : (
        <button type="button" onClick={() => setLoginOpen(true)} className="pill btn-md font-medium">
          <GoogleMark size={14} />
          {t("Masuk")}
        </button>
      )}
      <GoogleLoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  );
}
