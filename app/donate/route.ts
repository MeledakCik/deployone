import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Donasi: tidak ada halaman sendiri, langsung diarahkan ke Saweria.
 * Isi SAWERIA_USERNAME di env supaya mengarah ke halaman donasi kamu;
 * kalau kosong, diarahkan ke beranda Saweria.
 */
export function GET() {
  const u = process.env.SAWERIA_USERNAME?.trim().replace(/^@/, "");
  const target = u && /^[A-Za-z0-9_.-]{2,40}$/.test(u) ? `https://saweria.co/${u}` : "https://saweria.co";
  return NextResponse.redirect(target, 307);
}
