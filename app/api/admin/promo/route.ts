import type { NextRequest } from "next/server";
import { fail, ok, withErrorHandling } from "@/app/api/_lib/response";
import { adminFromReq, audit } from "@/app/api/_lib/admin";
import { isTemplateId } from "@/lib/email-template";
import { buildPromoMail, emailConfigured, emailFrom, safeUrl, sendBatch, sendMail, type MailContent } from "@/app/api/_lib/email";
import { createCampaign, listCampaigns, loadAudience, newCampaignId, saveCampaign, type Campaign } from "@/app/api/_lib/campaigns";
import { rateLimit } from "@/app/api/_lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 60;

/** Maks penerima per kampanye. Plan gratis Resend hanya 100 email/hari — cek kuota plan kamu sebelum kirim massal. */
const MAX_RECIPIENTS = 2000;
const BATCH = 100;

/** GET /api/admin/promo — riwayat kampanye + jumlah audiens + status Resend. */
export const GET = withErrorHandling(async (req: NextRequest) => {
  if (!adminFromReq(req)) return fail("Tidak ditemukan.", 404, "not_found");
  const [campaigns, aud] = await Promise.all([listCampaigns(30), loadAudience()]);
  return ok({
    configured: emailConfigured(),
    from: emailFrom(),
    audience: { eligible: aud.eligible.length, total: aud.total, unsubscribed: aud.unsubscribed, blocked: aud.blocked },
    maxRecipients: MAX_RECIPIENTS,
    campaigns,
  });
});

function parseDraft(b: Record<string, unknown>): { subject: string; content: MailContent } | string {
  const subject = typeof b.subject === "string" ? b.subject.trim().slice(0, 120) : "";
  const body = typeof b.body === "string" ? b.body.trim().slice(0, 5000) : "";
  const preheader = typeof b.preheader === "string" ? b.preheader.trim().slice(0, 140) : "";
  const ctaLabel = typeof b.ctaLabel === "string" ? b.ctaLabel.trim().slice(0, 60) : "";
  const ctaUrlRaw = typeof b.ctaUrl === "string" ? b.ctaUrl.trim() : "";
  const badge = typeof b.badge === "string" ? b.badge.trim().slice(0, 30) : "";
  const headline = typeof b.headline === "string" ? b.headline.trim().slice(0, 90) : "";
  const features = (Array.isArray(b.features) ? b.features : [])
    .slice(0, 3)
    .map((f) => {
      const r = (f ?? {}) as { title?: unknown; desc?: unknown };
      return { title: typeof r.title === "string" ? r.title.trim().slice(0, 60) : "", desc: typeof r.desc === "string" ? r.desc.trim().slice(0, 200) : "" };
    })
    .filter((f) => f.title);
  if (!subject) return "Subjek wajib diisi.";
  if (body.length < 10) return "Isi pesan terlalu pendek.";
  let cta: MailContent["cta"] = null;
  if (ctaLabel || ctaUrlRaw) {
    const url = safeUrl(ctaUrlRaw);
    if (!ctaLabel || !url) return "Tombol butuh label dan URL http(s) yang valid (atau kosongkan keduanya).";
    cta = { label: ctaLabel, url };
  }
  return { subject, content: { body, preheader, cta, badge, headline, features, template: isTemplateId(b.template) ? b.template : "depup" } };
}

/**
 * POST /api/admin/promo
 *  { action: "test", to?, subject, body, ... }  -> kirim 1 email tes (default ke admin sendiri)
 *  { action: "send", confirm: true, subject, body, ... } -> kirim ke semua akun yang eligible
 */
export const POST = withErrorHandling(async (req: NextRequest) => {
  const admin = adminFromReq(req);
  if (!admin) return fail("Tidak ditemukan.", 404, "not_found");
  if (!emailConfigured()) return fail("RESEND_API_KEY belum diisi di environment server.", 503, "bad_request");

  let b: Record<string, unknown> = {};
  try {
    b = await req.json();
  } catch {
    return fail("Body harus berupa JSON.", 400, "bad_request");
  }
  const draft = parseDraft(b);
  if (typeof draft === "string") return fail(draft, 400, "bad_request");

  if (b.action === "test") {
    const to = typeof b.to === "string" && b.to.trim() ? b.to.trim().toLowerCase() : admin;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return fail("Alamat tujuan tes tidak valid.", 400, "bad_request");
    const r = await sendMail(buildPromoMail(to, `[TES] ${draft.subject}`, draft.content));
    if (!r.ok) return fail(r.error ?? "Gagal mengirim.", 502, "bad_request");
    await audit(admin, "promo.test", `${to}: ${draft.subject}`.slice(0, 200));
    return ok({ sentTo: to });
  }

  if (b.action !== "send") return fail("Aksi tidak dikenal.", 400, "bad_request");
  if (b.confirm !== true) return fail("Konfirmasi pengiriman diperlukan.", 400, "bad_request");

  // Cegah klik ganda / kampanye beruntun: 1 pengiriman massal per 2 menit.
  const rl = await rateLimit("promo-send", `u:${admin}`, 1, 120);
  if (!rl.allowed) return fail("Tunggu sebentar sebelum mengirim kampanye lagi.", 429, "rate_limited");

  const aud = await loadAudience();
  if (aud.eligible.length === 0) return fail("Tidak ada penerima yang memenuhi syarat.", 400, "bad_request");
  const recipients = aud.eligible.slice(0, MAX_RECIPIENTS);

  const campaign: Campaign = {
    id: newCampaignId(),
    createdAt: Date.now(),
    by: admin,
    subject: draft.subject,
    body: draft.content.body,
    preheader: draft.content.preheader ?? "",
    ctaLabel: draft.content.cta?.label ?? "",
    ctaUrl: draft.content.cta?.url ?? "",
    status: "sending",
    total: recipients.length,
    sent: 0,
    failed: 0,
    lastError: null,
  };
  await createCampaign(campaign);

  for (let i = 0; i < recipients.length; i += BATCH) {
    const chunk = recipients.slice(i, i + BATCH);
    const results = await sendBatch(
      chunk.map((to) => buildPromoMail(to, draft.subject, draft.content)),
      `${campaign.id}-${i / BATCH}`
    );
    for (const r of results) {
      if (r.ok) campaign.sent++;
      else {
        campaign.failed++;
        campaign.lastError = r.error ?? campaign.lastError;
      }
    }
    // Berhenti lebih awal kalau gagal total (mis. API key salah / kuota habis) — jangan membakar sisa kuota.
    if (results.every((r) => !r.ok)) break;
    await saveCampaign(campaign);
    if (i + BATCH < recipients.length) await new Promise((r) => setTimeout(r, 600)); // batas 2 req/detik Resend
  }

  const attempted = campaign.sent + campaign.failed;
  campaign.failed += recipients.length - attempted; // yang tidak sempat dicoba dihitung gagal
  campaign.status = campaign.sent === 0 ? "failed" : campaign.failed > 0 ? "partial" : "done";
  await saveCampaign(campaign);
  await audit(admin, "promo.send", `${campaign.id} "${campaign.subject}" terkirim ${campaign.sent}/${campaign.total}`.slice(0, 280));
  return ok({ campaign });
});
