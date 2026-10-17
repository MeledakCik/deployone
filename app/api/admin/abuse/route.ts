import type { NextRequest } from "next/server";
import { fail, ok, withErrorHandling } from "@/app/api/_lib/response";
import { adminFromReq, audit } from "@/app/api/_lib/admin";
import { dropStatsCache, linkUrl } from "@/app/api/_lib/admin-data";
import { performTakedown } from "@/app/api/_lib/takedown";
import { loadSite } from "@/app/api/_lib/sites";
import { loadMeta } from "@/app/api/_lib/tunnel";
import { db, must } from "@/app/api/_lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 30;


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

interface ReportRow {
  id: string; slug: string; kind: "site" | "tunnel"; owner: string | null; reason: string; contact: string | null;
  created_at: string; status: Status; resolved_at: number | null; resolved_by: string | null; note: string | null;
}

const fromRow = (r: ReportRow): Report => ({
  id: r.id,
  slug: r.slug,
  kind: r.kind,
  owner: r.owner,
  reason: r.reason,
  contact: r.contact,
  createdAt: r.created_at,
  status: r.status,
  resolvedAt: r.resolved_at ?? undefined,
  resolvedBy: r.resolved_by ?? undefined,
  note: r.note ?? undefined,
});

const toPatch = (r: Report) => ({
  status: r.status ?? "open",
  resolved_at: r.resolvedAt ?? null,
  resolved_by: r.resolvedBy ?? null,
  note: r.note ?? null,
});

async function loadReports(): Promise<Report[]> {
  const res = await db().from("abuse_reports").select("*").order("created_at", { ascending: false }).limit(200);
  return ((must(res, "baca abuse_reports") ?? []) as ReportRow[]).map(fromRow);
}

/** GET /api/admin/abuse[?status=open|actioned|dismissed|all] */
export const GET = withErrorHandling(async (req: NextRequest) => {
  if (!adminFromReq(req)) return fail("Tidak ditemukan.", 404, "not_found");
  const filter = req.nextUrl.searchParams.get("status") ?? "open";
  const host = req.headers.get("host");

  const all = await loadReports();
  const counts = { open: 0, actioned: 0, dismissed: 0 };
  for (const r of all) counts[r.status ?? "open"]++;
  // ?countOnly=1 → hanya hitungan (dipakai badge menu admin; murah, tanpa pengecekan link satu per satu)
  if (req.nextUrl.searchParams.get("countOnly") === "1") return ok({ counts });
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

  const found = must(await db().from("abuse_reports").select("*").eq("id", id).maybeSingle<ReportRow>(), "baca laporan");
  if (!found) return fail("Laporan tidak ditemukan (mungkin sudah kedaluwarsa).", 404, "not_found");
  const report = fromRow(found);

  let status: Status;
  let detail = "";
  if (action === "takedown" || action === "takedown_ban") {
    const res = await performTakedown(report.slug, { ban: action === "takedown_ban" });
    status = "actioned";
    detail = `${report.slug} (situs: ${res.removedSite}, ban: ${res.banned})`;
    // Laporan lain untuk slug yang sama otomatis ikut selesai.
    for (const other of await loadReports()) {
      if (other.slug === report.slug && other.id !== id && (other.status ?? "open") === "open") {
        must(
          await db().from("abuse_reports").update(toPatch({ ...other, status, resolvedAt: Date.now(), resolvedBy: admin, note: "Link sudah dimatikan" })).eq("id", other.id),
          "update laporan terkait"
        );
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
  must(await db().from("abuse_reports").update(toPatch(updated)).eq("id", id), "update laporan");
  await audit(admin, `abuse.${String(action)}`, `${id} → ${detail}${note ? ` — ${note}` : ""}`);
  return ok({ id, status });
});
