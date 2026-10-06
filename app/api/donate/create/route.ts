import type { NextRequest } from "next/server";
import QRCode from "qrcode";
import { ok, fail, withErrorHandling } from "@/app/api/_lib/response";
import { getSessionEmail } from "@/app/api/_lib/session";
import { createDonation, getDonateConfig, SaweriaError, MIN_AMOUNT, MAX_AMOUNT } from "@/app/api/_lib/saweria";

export const runtime = "nodejs";
export const maxDuration = 30;

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;

/** Buang karakter kontrol; batasi panjang. */
function clean(v: unknown, max: number): string {
  return typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max) : "";
}

export const POST = withErrorHandling(async (req: NextRequest) => {
  const sessionEmail = getSessionEmail(req);
  if (!sessionEmail) return fail("Belum login.", 401, "unauthorized");

  const cfg = getDonateConfig();
  if (!cfg.configured) return fail("Donasi belum diaktifkan di server ini.", 503, "donate_not_configured");

  const raw = await req.text().catch(() => "");
  if (raw.length > 5_000) return fail("Data terlalu besar.", 413, "bad_request");
  let body: Record<string, unknown> = {};
  try {
    body = JSON.parse(raw);
  } catch {
    return fail("Data tidak valid.", 400, "bad_request");
  }

  const amount = Number(body.amount);
  if (!Number.isInteger(amount) || amount < MIN_AMOUNT || amount > MAX_AMOUNT) {
    return fail(
      `Nominal harus bilangan bulat antara Rp${MIN_AMOUNT.toLocaleString("id-ID")} dan Rp${MAX_AMOUNT.toLocaleString("id-ID")}.`,
      400,
      "bad_request"
    );
  }
  const email = clean(body.email, 254) || sessionEmail;
  if (!EMAIL_RE.test(email)) return fail("Format email tidak valid.", 400, "bad_request");
  const name = clean(body.name, 30) || "Pengguna Depup";
  const message = clean(body.message, 150);

  try {
    const d = await createDonation({ amount, name, email, message });
    const qrImage = await QRCode.toDataURL(d.qrString, { errorCorrectionLevel: "M", margin: 2, width: 360 });
    return ok({
      id: d.id,
      amount: d.amount,
      totalPaid: d.totalPaid,
      qrImage,
      invoiceUrl: d.invoiceUrl,
      pageUrl: cfg.pageUrl,
    });
  } catch (e) {
    if (e instanceof SaweriaError) {
      if (e.kind === "bad_request") return fail(e.message, 400, "bad_request");
      console.error("[donate/create]", e.kind, e.message);
      return fail(
        "Tidak bisa membuat QRIS sekarang. Kamu masih bisa berdonasi lewat halaman Saweria.",
        502,
        "donate_unavailable"
      );
    }
    throw e;
  }
});
