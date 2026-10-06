import type { NextRequest } from "next/server";
import { ok, fail, withErrorHandling } from "@/app/api/_lib/response";
import { getDonationState, SaweriaError, UUID_RE } from "@/app/api/_lib/saweria";

export const runtime = "nodejs";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const id = req.nextUrl.searchParams.get("id") ?? "";
  if (!UUID_RE.test(id)) return fail("ID transaksi tidak valid.", 400, "bad_request");

  try {
    return ok({ state: await getDonationState(id) });
  } catch (e) {
    if (e instanceof SaweriaError) {
      console.error("[donate/status]", e.kind, e.message);
      return fail("Status belum bisa dicek. Coba lagi sebentar lagi.", 502, "donate_unavailable");
    }
    throw e;
  }
});
