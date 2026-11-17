import type { Metadata } from "next";
import CliLoginClient from "@/components/connect/CliLoginClient";

// Layar izin `depup login`: jangan diindeks mesin pencari.
export const metadata: Metadata = {
  title: "Login Depup CLI",
  robots: { index: false, follow: false },
};

export default function CliLoginPage() {
  return <CliLoginClient />;
}
