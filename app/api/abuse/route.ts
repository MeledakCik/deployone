import type { NextRequest } from "next/server";
import { kv } from "@vercel/kv";
import { fail, ok, withErrorHandling } from "@/app/api/_lib/response";
import { clientIp, rateLimit } from "@/app/api/_lib/rate-limit";
import { cleanText, parseAbuseTarget } from "@/app/api/_lib/abuse";
import { loadSite } from "@/app/api/_lib/sites";
import { loadMeta } from "@/app/api/_lib/tunnel";
import { notifyText } from "@/app/api/_lib/support-reports";
import { recordStat } from "@/app/api/_lib/admin";
import { db, must } from "@/app/api/_lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/**
 * POST /api/abuse — PUBLIK (tanpa login; lihat isPublicPath di middleware.ts), dibatasi 5 per 10 menit per IP.
 * Body: { target: string (URL link atau slug), reason: string, contact?: string }
 * Laporan hanya diterima untuk link yang MASIH ADA, supaya Telegram admin tidak dibanjiri slug palsu.
 */
export const POST = withErrorHandling(async (req: NextRequest) => {
  const raw = await req.text().catch(() => "");
  if (raw.length > 4_000) return fail("Data terlalu besar.", 413, "bad_request");
  let body: Record<string, unknown> = {};
  try {
    body = JSON.parse(raw);
  } catch {
    return fail("Data tidak valid.", 400, "bad_request");
  }

  const slug = parseAbuseTarget(body.target);
  if (!slug) {
    return fail("Alamat link tidak dikenali. Tempel alamat lengkapnya, mis. https://nama-link.domain/", 400, "bad_request");
  }
  const reason = cleanText(body.reason, 500);
  if (reason.length < 5) return fail("Tulis alasan laporan (minimal 5 karakter).", 400, "bad_request");
  const contact = cleanText(body.contact, 100);

  // Batas global supaya botnet dengan banyak IP tetap tidak bisa membanjiri notifikasi.
  const global = await rateLimit("abuse-global", "all", 60, 3600);
  if (!global.allowed) return fail("Terlalu banyak laporan masuk. Coba lagi nanti.", 429, "rate_limited");

  const site = await loadSite(slug, { includePending: true });
  const tunnel = site ? null : await loadMeta(slug);
  if (!site && !tunnel) {
    return fail("Link ini tidak ditemukan — mungkin sudah kedaluwarsa atau sudah dihapus.", 404, "not_found");
  }

  // Laporan berulang untuk link yang sama dalam 10 menit tidak diteruskan lagi (tetap dijawab sukses).
  const fresh = await kv.set(`abuse:dedupe:${slug}`, 1, { nx: true, ex: 600 });
  if (fresh) {
    const id = `AB-${Date.now().toString(36).toUpperCase()}`;
    const report = {
      id,
      slug,
      kind: site ? "site" : "tunnel",
      owner: site?.owner ?? null,
      reason,
      contact: contact || null,
      createdAt: new Date().toISOString(),
      status: "open" as const,
    };
    try {
      must(
        await db().from("abuse_reports").insert({
          id: report.id,
          slug: report.slug,
          kind: report.kind,
          owner: report.owner,
          reason: report.reason,
          contact: report.contact,
          created_at: report.createdAt,
          status: "open",
        }),
        "simpan laporan abuse"
      );
      await recordStat("abuse");
    } catch (e) {
      console.error("[abuse] gagal menyimpan", (e as Error)?.message);
    }
    await notifyText(
      [
        `🚩 Laporan abuse Depup ${id}`,
        `Link: ${slug} (${report.kind === "site" ? "situs statis" : "tunnel"})`,
        report.owner ? `Pemilik: ${report.owner}` : "Pemilik: anonim (tunnel CLI)",
        `Alasan: ${reason}`,
        contact ? `Kontak pelapor: ${contact}` : "Kontak pelapor: -",
        `Tindak lanjut: buka panel admin → Abuse & Takedown (/admin)`,
      ].join("\n")
    );
  }
  return ok({ received: true });
});
