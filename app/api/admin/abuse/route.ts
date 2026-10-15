import type { NextRequest } from "next/server";
import { kv } from "@vercel/kv";
import { fail, ok, withErrorHandling } from "@/app/api/_lib/response";
import { adminFromReq, audit } from "@/app/api/_lib/admin";
import { dropStatsCache, linkUrl } from "@/app/api/_lib/admin-data";
import { performTakedown } from "@/app/api/_lib/takedown";
import { loadSite } from "@/app/api/_lib/sites";
import { loadMeta, parseKv } from "@/app/api/_lib/tunnel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 30;

const LIST_KEY = "abuse:reports";
const REPORT_TTL_SECONDS = 60 * 60 * 24 * 90;
const kReport = (id: string) => `abuse:report:${id}`;

type Status = "open" | "actioned" | "dismissed";

interface Report {
  id: string;
  slug: string;
  kind: "site" | "tunnel";
  owner: string | null;
  reason: string;
  contact: string | null;
  createdAt: string;
  status?: Status;
  resolvedAt?: number;
  resolvedBy?: string;
  note?: string;
}

async function loadReports(): Promise<Report[]> {
  const ids = (await kv.lrange<string>(LIST_KEY, 0, 199)) ?? [];
  if (ids.length === 0) return [];
  const rows = await kv.mget<unknown[]>(...ids.map(kReport));
  return rows.map((r) => parseKv<Report>(r)).filter((r): r is Report => !!r && typeof r.slug === "string");
}

/** GET /api/admin/abuse[?status=open|actioned|dismissed|all] */
export const GET = withErrorHandling(async (req: NextRequest) => {
  if (!adminFromReq(req)) return fail("Tidak ditemukan.", 404, "not_found");
  const filter = req.nextUrl.searchParams.get("status") ?? "open";
  const host = req.headers.get("host");

  const all = await loadReports();
  const counts = { open: 0, actioned: 0, dismissed: 0 };
  for (const r of all) counts[r.status ?? "open"]++;
  const shown = (filter === "all" ? all : all.filter((r) => (r.status ?? "open") === filter)).slice(0, 100);

  // Apakah link yang dilaporkan MASIH hidup? (laporan bisa masuk lalu link kedaluwarsa sendiri.)
  const enriched = await Promise.all(
    shown.map(async (r) => {
      const [site, tunnel] = await Promise.all([loadSite(r.slug, { includePending: true }), loadMeta(r.slug)]);
      const live = !!site || !!tunnel;
      const kind = site ? "site" : tunnel ? "tunnel" : r.kind;
      return { ...r, status: r.status ?? "open", live, owner: site?.owner ?? r.owner, url: live ? linkUrl(r.slug, kind, host) : null };
    })
  );
  return ok({ counts, reports: enriched });
});

/** POST /api/admin/abuse — body: { id, action: "takedown" | "takedown_ban" | "dismiss" | "reopen", note? } */
export const POST = withErrorHandling(async (req: NextRequest) => {
  const admin = adminFromReq(req);
  if (!admin) return fail("Tidak ditemukan.", 404, "not_found");

  let body: { id?: unknown; action?: unknown; note?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return fail("Body harus berupa JSON.", 400, "bad_request");
  }
  const id = typeof body.id === "string" && /^AB-[A-Z0-9]{3,20}$/.test(body.id) ? body.id : null;
  const action = body.action;
  if (!id || !["takedown", "takedown_ban", "dismiss", "reopen"].includes(String(action))) {
    return fail("Permintaan tidak valid.", 400, "bad_request");
  }
  const note = typeof body.note === "string" ? body.note.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 200) : "";

  const report = parseKv<Report>(await kv.get(kReport(id)));
  if (!report) return fail("Laporan tidak ditemukan (mungkin sudah kedaluwarsa).", 404, "not_found");

  let status: Status;
  let detail = "";
  if (action === "takedown" || action === "takedown_ban") {
    const res = await performTakedown(report.slug, { ban: action === "takedown_ban" });
    status = "actioned";
    detail = `${report.slug} (situs: ${res.removedSite}, ban: ${res.banned})`;
    // Laporan lain untuk slug yang sama otomatis ikut selesai.
    for (const other of await loadReports()) {
      if (other.slug === report.slug && other.id !== id && (other.status ?? "open") === "open") {
        await kv.set(kReport(other.id), { ...other, status, resolvedAt: Date.now(), resolvedBy: admin, note: "Link sudah di-takedown" }, { ex: REPORT_TTL_SECONDS });
      }
    }
    await dropStatsCache();
  } else if (action === "dismiss") {
    status = "dismissed";
    detail = report.slug;
  } else {
    status = "open";
    detail = report.slug;
  }

  const updated: Report = { ...report, status, resolvedAt: status === "open" ? undefined : Date.now(), resolvedBy: status === "open" ? undefined : admin, note: note || undefined };
  await kv.set(kReport(id), updated, { ex: REPORT_TTL_SECONDS });
  await audit(admin, `abuse.${String(action)}`, `${id} → ${detail}${note ? ` — ${note}` : ""}`);
  return ok({ id, status });
});
