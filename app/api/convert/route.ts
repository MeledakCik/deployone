import type { NextRequest } from "next/server";
import { ok, fail, withErrorHandling } from "@/app/api/_lib/response";
import { getSessionEmail } from "@/app/api/_lib/session";
import { LANGS } from "@/lib/convert/languages";
import { canConvert, convertFile } from "@/lib/convert/engine/convert-file";
import { renderJsx, type RenderModule } from "@/lib/convert/engine/jsx-render";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const MAX_CODE = 36_000;
const MAX_CTX_TOTAL = 80_000;

const str = (v: unknown, max: number): string => (typeof v === "string" ? v.slice(0, max) : "");

function ctxFiles(v: unknown): RenderModule[] {
  if (!Array.isArray(v)) return [];
  const out: RenderModule[] = [];
  let total = 0;
  for (const x of v.slice(0, 40)) {
    const path = str((x as { path?: unknown })?.path, 300);
    const code = str((x as { code?: unknown })?.code, 24_000);
    if (!path || total + code.length > MAX_CTX_TOTAL) continue;
    total += code.length;
    out.push({ path, code });
  }
  return out;
}

/** Klien lama mengirim nama bahasa versi prompt ("TypeScript (strict)"); terima id maupun nama itu. */
function langId(v: string): string | null {
  const t = v.trim();
  return LANGS.find((l) => l.id === t || l.prompt === t || l.label === t)?.id ?? null;
}

/**
 * POST /api/convert — dikerjakan MESIN DEPUP SENDIRI (lib/convert/engine), tanpa AI luar.
 *  { mode: "file", path, code, from, to }      → konversi satu file untuk pasangan yang didukung
 *  { mode: "page", path, code, context, routeMap, assetPrefix, cssLinks, imageImports, tailwind }
 *                                              → satu halaman Next.js → satu file HTML statis
 * Mengembalikan { code, truncated: false, source: "engine", warnings }.
 */
export const POST = withErrorHandling(async (req: NextRequest) => {
  const email = getSessionEmail(req);
  if (!email) return fail("Sesi login habis. Silakan login lagi.", 401, "unauthorized");

  let body: Record<string, unknown> | null = null;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    body = null;
  }
  if (!body) return fail("Permintaan tidak valid.", 400, "bad_request");

  const mode = body.mode === "page" ? "page" : "file";
  const path = str(body.path, 300);
  const code = str(body.code, MAX_CODE + 1);
  if (!code.trim()) return fail("Isi file kosong.", 400, "bad_request");
  if (code.length > MAX_CODE) return fail(`File terlalu besar (batas ${MAX_CODE / 1000} KB per file). Pecah dulu jadi bagian lebih kecil.`, 413, "bad_request");

  if (mode === "page") {
    const context = ctxFiles(body.context);
    const isLayout = (p: string) => /(^|\/)(layout|_app)\.(tsx|ts|jsx|js)$/.test(p);
    const images: Record<string, string> = {};
    if (Array.isArray(body.imageImports)) {
      for (const line of body.imageImports.slice(0, 40)) {
        const m = /^"([^"]+)"\s+\(di [^)]*\)\s+→\s+(.+)$/.exec(str(line, 400));
        if (m) images[m[1]] = m[2].trim();
      }
    }
    const routeMap = Object.fromEntries(
      Object.entries((body.routeMap as Record<string, unknown>) ?? {})
        .slice(0, 80)
        .map(([k, v]) => [str(k, 200), str(v, 200)]),
    );
    const assetPrefix = /^(\.\.\/)*$/.test(str(body.assetPrefix, 40)) ? str(body.assetPrefix, 40) : "";
    try {
      const r = renderJsx({
        entry: { path, code },
        layouts: context.filter((c) => isLayout(c.path)),
        modules: context.filter((c) => !isLayout(c.path)),
        routeMap,
        images,
        cssLinks: Array.isArray(body.cssLinks) ? body.cssLinks.slice(0, 20).map((x) => str(x, 200)) : [],
        tailwind: body.tailwind === true,
      });
      // Aset publik ("/logo.png") dibuat relatif terhadap lokasi halaman.
      const html = assetPrefix ? r.html.replace(/(\s(?:src|href|poster)=")\/(?!\/)/g, `$1${assetPrefix}`) : r.html;
      return ok({ code: html, truncated: false, source: "engine", warnings: r.warnings });
    } catch (e) {
      return fail(`Halaman ini belum bisa dikonversi: ${e instanceof Error ? e.message : "kesalahan tak terduga"}.`, 422, "bad_request");
    }
  }

  const from = langId(str(body.from, 80));
  const to = langId(str(body.to, 80));
  if (!from || !to) return fail("Bahasa asal dan tujuan wajib diisi.", 400, "bad_request");
  if (!canConvert(from, to)) return fail(`Konversi ${from} → ${to} belum didukung mesin Depup.`, 422, "bad_request");
  try {
    const r = await convertFile(from, to, code, path);
    return ok({ code: r.code, truncated: false, source: "engine", warnings: r.warnings });
  } catch (e) {
    return fail(`${path || "File"} gagal dikonversi: ${e instanceof Error ? e.message : "isi tidak valid"}.`, 422, "bad_request");
  }
});
