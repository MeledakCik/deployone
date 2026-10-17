import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { escapeHtml, setUnsubscribed, verifyUnsubToken } from "@/app/api/_lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Berhenti berlangganan email promosi (PUBLIK, tanpa login — dilindungi token HMAC per-email).
 *  GET  -> halaman konfirmasi (sengaja TIDAK langsung berhenti, supaya pemindai link email tidak ikut membatalkan).
 *  POST -> eksekusi. Dipakai tombol di halaman ini DAN klien email (header List-Unsubscribe-Post one-click).
 */
function page(title: string, msg: string, form?: { e: string; t: string }, status = 200): NextResponse {
  const f = form
    ? `<form method="post" action="/api/unsubscribe?e=${encodeURIComponent(form.e)}&t=${encodeURIComponent(form.t)}"><button type="submit" style="background:#7c3aed;color:#fff;border:0;border-radius:8px;padding:11px 22px;font-size:14px;font-weight:600;cursor:pointer">Ya, berhenti berlangganan</button></form>`
    : "";
  const html = `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#f5f5f7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#222">
<main style="max-width:420px;margin:24px;background:#fff;border-radius:12px;padding:28px;text-align:center"><h1 style="font-size:19px;margin:0 0 10px">${escapeHtml(title)}</h1><p style="font-size:14.5px;line-height:1.6;color:#555;margin:0 0 20px">${escapeHtml(msg)}</p>${f}</main></body></html>`;
  return new NextResponse(html, { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}

function parse(req: NextRequest): { e: string; t: string } | null {
  const e = (req.nextUrl.searchParams.get("e") ?? "").trim().toLowerCase();
  const t = req.nextUrl.searchParams.get("t") ?? "";
  if (!e || !t || e.length > 200 || !verifyUnsubToken(e, t)) return null;
  return { e, t };
}

export async function GET(req: NextRequest) {
  const p = parse(req);
  if (!p) return page("Link tidak valid", "Link berhenti berlangganan ini tidak valid atau sudah rusak.", undefined, 400);
  return page("Berhenti berlangganan?", `${p.e} tidak akan menerima email promosi dari Depup lagi. Email penting soal akun/laporan tetap dikirim.`, p);
}

export async function POST(req: NextRequest) {
  const p = parse(req);
  if (!p) return page("Link tidak valid", "Link berhenti berlangganan ini tidak valid atau sudah rusak.", undefined, 400);
  await setUnsubscribed(p.e, true);
  return page("Berhasil", "Kamu sudah berhenti berlangganan email promosi Depup.");
}
