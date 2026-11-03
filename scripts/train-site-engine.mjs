#!/usr/bin/env node
/**
 * Latih mesin AI Web Builder Depup.
 *
 *   npm run engine:train
 *
 * Masukan:
 *   data/site-engine/packs/*.json          paket domain (pengetahuan per jenis usaha)
 *   data/site-engine/feedback/*.jsonl      contoh dari pengguna: satu baris = {"prompt": "...", "content": {...}}
 *                                          (ekspor dari Panel Admin → Mesin AI, atau tulis sendiri)
 * Keluaran:
 *   lib/site-engine/model.json             model yang dibundel ke aplikasi
 *
 * Skrip ini juga memeriksa paket (ikon valid, ungkapan generik terlarang, kolom wajib) dan
 * mengukur akurasi klasifikasi dengan leave-one-out pada contoh deskripsi.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { trainModel, classify } from "../lib/site-engine/core.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packDir = path.join(root, "data/site-engine/packs");
const fbDir = path.join(root, "data/site-engine/feedback");
const out = path.join(root, "lib/site-engine/model.json");

const packs = fs
  .readdirSync(packDir)
  .filter((f) => f.endsWith(".json"))
  .flatMap((f) => JSON.parse(fs.readFileSync(path.join(packDir, f), "utf8")));

const feedback = fs.existsSync(fbDir)
  ? fs
      .readdirSync(fbDir)
      .filter((f) => f.endsWith(".jsonl"))
      .flatMap((f) =>
        fs
          .readFileSync(path.join(fbDir, f), "utf8")
          .split("\n")
          .filter((l) => l.trim())
          .map((l, i) => {
            try {
              return JSON.parse(l);
            } catch {
              console.warn(`  ! ${f}:${i + 1} bukan JSON, dilewati`);
              return null;
            }
          })
          .filter(Boolean),
      )
  : [];

/* ---- validasi paket ---- */
const icons = new Set([...fs.readFileSync(path.join(root, "lib/lucide-icons.ts"), "utf8").matchAll(/^\s*"?([a-z0-9-]+)"?\s*:/gm)].map((m) => m[1]));
const prompts = fs.readFileSync(path.join(root, "lib/ai-site-prompts.ts"), "utf8");
const banned = JSON.parse(/BANNED_PHRASES: string\[\] = (\[[\s\S]*?\]);/.exec(prompts)[1].replace(/,\s*\]/, "]"));
const REQUIRED = ["id", "kind", "label", "prompts", "keywords", "brandIcon", "templates", "heroes", "feats", "headlines", "features"];
let problems = 0;
const ids = new Set();
for (const p of packs) {
  const where = `paket ${p.id ?? "?"}`;
  for (const k of REQUIRED) if (!p[k] || (Array.isArray(p[k]) && !p[k].length)) (console.error(`  x ${where}: kolom "${k}" kosong`), problems++);
  if (ids.has(p.id)) (console.error(`  x ${where}: id ganda`), problems++);
  ids.add(p.id);
  const iconUses = [p.brandIcon, ...(p.features ?? []).map((f) => f.icon), ...(p.items ?? []).map((i) => i.icon)].filter(Boolean);
  for (const ic of iconUses) if (!icons.has(ic)) (console.error(`  x ${where}: ikon "${ic}" tidak ada di lib/lucide-icons.ts`), problems++);
  const text = JSON.stringify(p).toLowerCase();
  for (const w of banned) if (new RegExp(`(?<![\\p{L}])${w.replace(/ /g, "\\s+")}(?![\\p{L}])`, "iu").test(text)) (console.error(`  x ${where}: memakai ungkapan terlarang "${w}"`), problems++);
}
if (problems) {
  console.error(`\n${problems} masalah pada paket. Perbaiki dulu, lalu jalankan lagi.`);
  process.exit(1);
}

/* ---- training ---- */
const model = trainModel(packs, feedback);
fs.writeFileSync(out, JSON.stringify(model));

/* ---- evaluasi leave-one-out (domain) ---- */
let correct = 0, total = 0;
const misses = [];
for (const p of packs) {
  for (const pr of p.prompts) {
    const others = packs.map((q) => (q.id === p.id ? { ...q, prompts: q.prompts.filter((x) => x !== pr) } : q));
    const m = trainModel(others, []);
    const top = classify(m, pr)[0];
    total++;
    // Paket umum dihitung benar bila jenisnya sama.
    const ok = top.id === p.id || (p.generic && top.kind === p.kind);
    if (ok) correct++;
    else misses.push(`"${pr}" → ${top.id} (harusnya ${p.id})`);
  }
}

const kb = (fs.statSync(out).size / 1024).toFixed(0);
console.log(`Model tersimpan: lib/site-engine/model.json (${kb} KB)`);
console.log(`  paket: ${model.stats.packs} · contoh pengguna dipakai: ${model.stats.feedback} · kosakata: ${model.stats.vocab}`);
console.log(`  akurasi klasifikasi (leave-one-out): ${((correct / total) * 100).toFixed(1)}% (${correct}/${total})`);
if (misses.length) console.log("  meleset:\n    " + misses.slice(0, 12).join("\n    "));
