// Loader uji: memetakan alias "@/..." dan mengganti @vercel/kv, next/server, admin (Supabase) dengan stub di ./stubs.
// Dipakai oleh tests/mcp-e2e/mcp.e2e.test.mjs — tidak ikut ke build produksi.
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import fs from "node:fs";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");
const STUBS = {
  "@vercel/kv": path.join(HERE, "stubs/kv.mjs"),
  "next/server": path.join(HERE, "stubs/next-server.mjs"),
  "@/app/api/_lib/admin": path.join(HERE, "stubs/admin.mjs"),
  "@/app/api/_lib/error-log": path.join(HERE, "stubs/error-log.mjs"),
};
export async function resolve(spec, ctx, next) {
  if (STUBS[spec]) return { url: pathToFileURL(STUBS[spec]).href, shortCircuit: true };
  if (spec.startsWith("@/")) {
    let p = path.join(ROOT, spec.slice(2));
    for (const c of [p + ".ts", p + ".tsx", path.join(p, "index.ts"), p]) {
      if (fs.existsSync(c) && fs.statSync(c).isFile()) return { url: pathToFileURL(c).href, shortCircuit: true };
    }
  }
  return next(spec, ctx);
}
