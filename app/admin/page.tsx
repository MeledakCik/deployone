import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { SESSION_COOKIE, verifySession } from "@/app/api/_lib/session";
import { isAdminEmail } from "@/app/api/_lib/admin-config";
import { AdminApp } from "@/components/admin/AdminApp";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false, nocache: true },
};

/**
 * Halaman admin — dijaga di SERVER sebelum HTML apa pun dikirim:
 *  - belum login  -> diarahkan ke login Google (lalu kembali ke /admin)
 *  - login tapi bukan admin -> 404 biasa (tidak membocorkan bahwa halaman ini ada)
 * Setiap API /api/admin/* tetap memeriksa ulang di sisi server.
 */
export default function AdminPage() {
  const session = verifySession(cookies().get(SESSION_COOKIE)?.value);
  if (!session) redirect("/api/auth/google?next=/admin");
  if (!isAdminEmail(session.email)) notFound();
  return <AdminApp name={session.name} email={session.email} />;
}
