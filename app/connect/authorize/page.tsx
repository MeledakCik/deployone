import type { Metadata } from "next";
import AuthorizeClient from "@/components/connect/AuthorizeClient";

// Halaman izin OAuth: jangan diindeks mesin pencari.
export const metadata: Metadata = {
  title: "Izinkan akses ke Depup",
  robots: { index: false, follow: false },
};

export default function AuthorizePage() {
  return <AuthorizeClient />;
}
