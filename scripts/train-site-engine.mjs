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
 *   data/site-engine/styles/*.json         paket gaya visual (opsional), mis. brutalism
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
import { validatePack } from "../lib/site-engine/import.ts";
import { validateStyle } from "../lib/site-look.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packDir = path.join(root, "data/site-engine/packs");
const fbDir = path.join(root, "data/site-engine/feedback");
const out = path.join(root, "lib/site-engine/model.json");

const packs = fs
  .readdirSync(packDir)
  .filter((f) => f.endsWith(".json"))
  .flatMap((f) => JSON.parse(fs.readFileSync(path.join(packDir, f), "utf8")));

const styleDir = path.join(root, "data/site-engine/styles");
const styles = fs.existsSync(styleDir)
  ? fs.readdirSync(styleDir).filter((f) => f.endsWith(".json")).flatMap((f) => [].concat(JSON.parse(fs.readFileSync(path.join(styleDir, f), "utf8"))))
  : [];

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

/* ---- validasi paket (aturan yang sama dengan Impor di Panel Admin) ---- */
const icons = new Set([...fs.readFileSync(path.join(root, "lib/lucide-icons.ts"), "utf8").matchAll(/^\s*"?([a-z0-9-]+)"?\s*:/gm)].map((m) => m[1]));
const prompts = fs.readFileSync(path.join(root, "lib/ai-site-prompts.ts"), "utf8");
const banned = JSON.parse(/BANNED_PHRASES: string\[\] = (\[[\s\S]*?\]);/.exec(prompts)[1].replace(/,\s*\]/, "]"));
const tpl = fs.readFileSync(path.join(root, "lib/ai-site-templates.ts"), "utf8");
const union = (name) => new Set([...(new RegExp(`export type ${name} = ([^;]+);`).exec(tpl)?.[1].matchAll(/"([^"]+)"/g) ?? [])].map((m) => m[1]));
const rules = { icons, banned, templates: union("TemplateId"), heroes: union("HeroLayout"), feats: union("FeatLayout") };
let problems = 0;
const ids = new Set();
for (const p of packs) {
  for (const e of validatePack(p, rules)) (console.error(`  x ${e}`), problems++);
  if (ids.has(p.id)) (console.error(`  x Paket "${p.id}": id ganda`), problems++);
  ids.add(p.id);
}
for (const st of styles) for (const e of validateStyle(st, { heroes: rules.heroes, feats: rules.feats, banned })) (console.error(`  x ${e}`), problems++);
if (problems) {
  console.error(`\n${problems} masalah pada paket. Perbaiki dulu, lalu jalankan lagi.`);
  process.exit(1);
}

/* ---- training ---- */
const model = trainModel(packs, feedback, styles);
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
