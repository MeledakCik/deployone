import { DocsView } from "@/components/dashboard/DocsView";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dokumentasi Depup",
  description:
    "Panduan penggunaan Depup: men-deploy website statis, mengelola Link Instan, dan menghubungkan Claude (MCP) ke platform deploy.",
  alternates: { canonical: "/docs" },
};

export default function DocsPage() {
  return <DocsView />;
}