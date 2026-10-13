import { ok, withErrorHandling } from "@/app/api/_lib/response";
import { getDonateConfig, MIN_AMOUNT, MAX_AMOUNT } from "@/app/api/_lib/saweria";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Konfigurasi publik fitur donasi (apakah aktif + link halaman Saweria). */
export const GET = withErrorHandling(async () => {
  return ok({ ...getDonateConfig(), minAmount: MIN_AMOUNT, maxAmount: MAX_AMOUNT });
});
