// Jalankan: node --experimental-strip-types --test tests/site-engine.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { generateSite, editSite, extract, classify, trainModel } from "../lib/site-engine/core.ts";

const model = JSON.parse(fs.readFileSync(new URL("../lib/site-engine/model.json", import.meta.url), "utf8"));

test("ekstraksi entitas: nama, kota, produk + harga, WA, jam", () => {
  const e = extract('Buatkan website warung bakso bernama Bakso Pak Kumis di Malang. Menu: bakso urat 18rb, mie ayam 15rb, es teh 4rb. WA 0812-3456-7890, buka setiap hari jam 10-21');
  assert.equal(e.brand, "Bakso Pak Kumis");
  assert.equal(e.city, "Malang");
  assert.equal(e.whatsapp, "6281234567890");
  assert.equal(e.hours, "Setiap hari 10.00–21.00");
  assert.deepEqual(e.products.map((p) => [p.name, p.price]), [["Bakso Urat", 18000], ["Mie Ayam", 15000], ["Es Teh", 4000]]);
});

test("klasifikasi memilih domain yang masuk akal", () => {
  const cases = [
    ["kedai kopi susu gula aren di Bandung", "umkm-kopi"],
    ["laundry kiloan antar jemput untuk anak kos", "jasa-laundry"],
    ["portofolio frontend developer react", "portofolio-developer"],
    ["blog tutorial coding untuk pemula", "artikel-teknologi"],
    ["festival musik dan bazar umkm akhir pekan", "event-musik"],
  ];
  for (const [p, want] of cases) assert.equal(classify(model, p)[0].id, want, p);
});

test("generate: produk pengguna dipakai, kontak terisi, deterministik", () => {
  const p = "Toko kue bernama Oven Ibu di Depok, jual brownies 85rb dan nastar 120rb. Email halo@ovenibu.id";
  const a = generateSite(model, p);
  const b = generateSite(model, p);
  assert.deepEqual(a.raw, b.raw, "hasil sama untuk input sama");
  assert.equal(a.raw.brand, "Oven Ibu");
  assert.equal(a.raw.email, "halo@ovenibu.id");
  assert.equal(a.raw.items[0].name, "Brownies");
  assert.equal(a.raw.items[0].price, 85000);
  assert.ok(a.raw.features.length >= 3);
  const c = generateSite(model, p, { variant: 3 });
  assert.notDeepEqual(a.raw, c.raw, "variasi berbeda");
});

test("generate artikel memenuhi jumlah yang diminta", () => {
  const r = generateSite(model, "blog teknologi tentang keamanan internet", { kind: "artikel", wantArticles: 8 });
  assert.equal(r.raw.kind, "artikel");
  assert.equal(r.raw.articles.length, 8);
  assert.ok(r.raw.articles.every((x) => x.title && x.body.length > 0 && !/\{|\}/.test(x.title)));
});

test("tidak ada slot {..} yang tersisa di teks", () => {
  for (const p of ["jual keripik pisang", "jasa pindahan rumah", "profil koperasi desa", "acara reuni alumni", "portofolio penulis lepas", "blog tentang berkebun"]) {
    const r = generateSite(model, p);
    assert.ok(!/\{\w+\}/.test(JSON.stringify(r.raw)), `${p}: ${JSON.stringify(r.raw).match(/.{20}\{\w+\}.{10}/)?.[0]}`);
  }
});

test("edit: perintah umum", () => {
  const base = generateSite(model, "kedai kopi bernama Kopi Senja di Bandung").raw;
  let r = editSite(model, base, "ganti nama jadi Kopi Fajar");
  assert.equal(r.raw.brand, "Kopi Fajar");
  r = editSite(model, base, "tambah menu Es Teh Lemon 12rb, Croissant 20rb");
  assert.ok(r.raw.items.some((i) => i.name === "Es Teh Lemon" && i.price === 12000));
  r = editSite(model, base, "ganti warna jadi hijau lalu hapus testimoni");
  assert.equal(r.raw.accent, "#16a34a");
  assert.equal(r.raw.testimonial.text, "");
  r = editSite(model, base, "ubah nomor wa jadi 0812 1111 2222");
  assert.equal(r.raw.whatsapp, "6281211112222");
  r = editSite(model, base, "buat jadi lebih keren");
  assert.equal(r.raw, null);
});

test("training menyerap contoh pengguna", () => {
  const packs = Object.values(model.packs);
  const m = trainModel(packs, [{ prompt: "warung seblak pedas level 5", content: { kind: "umkm", headline: "Seblak kuah pedas yang bikin nagih", items: [{ name: "Seblak Ceker", price: 15000, icon: "flame" }] } }]);
  assert.equal(m.stats.feedback, 1);
  const pack = Object.values(m.packs).find((p) => p.items.some((i) => i.name === "Seblak Ceker"));
  assert.ok(pack, "item contoh masuk ke salah satu paket");
});

test("edit: ganti nama ikut mengganti nama lama di teks lain", () => {
  const base = generateSite(model, "warung bakso bernama Bakso Pak Kumis di Malang").raw;
  base.aboutTitle = "Tentang Bakso Pak Kumis";
  const r = editSite(model, base, "ganti nama jadi Bakso Mas Joko");
  assert.equal(r.raw.aboutTitle, "Tentang Bakso Mas Joko");
  assert.ok(!JSON.stringify(r.raw).includes("Pak Kumis"));
});

/* ---------------- impor data latihan (Panel Admin → Mesin AI) ---------------- */
import { parseImport, validatePack, completePack, mergePacks } from "../lib/site-engine/import.ts";
import { PACK_TEMPLATE, FEEDBACK_TEMPLATE, packTemplateText, feedbackTemplateText } from "../lib/site-engine/import-template.ts";

const iconsSrc = fs.readFileSync(new URL("../lib/lucide-icons.ts", import.meta.url), "utf8");
const tplSrc = fs.readFileSync(new URL("../lib/ai-site-templates.ts", import.meta.url), "utf8");
const promptsSrc = fs.readFileSync(new URL("../lib/ai-site-prompts.ts", import.meta.url), "utf8");
const union = (name) => new Set([...(new RegExp(`export type ${name} = ([^;]+);`).exec(tplSrc)?.[1].matchAll(/"([^"]+)"/g) ?? [])].map((m) => m[1]));
const RULES = {
  icons: new Set([...iconsSrc.matchAll(/^\s*"?([a-z0-9-]+)"?\s*:/gm)].map((m) => m[1])),
  banned: JSON.parse(/BANNED_PHRASES: string\[\] = (\[[\s\S]*?\]);/.exec(promptsSrc)[1].replace(/,\s*\]/, "]")),
  templates: union("TemplateId"),
  heroes: union("HeroLayout"),
  feats: union("FeatLayout"),
};
const BUNDLED = ["umkm", "jasa", "lainnya"].flatMap((f) => JSON.parse(fs.readFileSync(new URL(`../data/site-engine/packs/${f}.json`, import.meta.url), "utf8")));

test("impor: contoh format yang diunduh dari panel lolos validasi", () => {
  const packs = parseImport(packTemplateText());
  assert.deepEqual(packs.errors, []);
  assert.equal(packs.packs.length, PACK_TEMPLATE.length);
  for (const p of packs.packs) assert.deepEqual(validatePack(p, RULES), []);
  const fb = parseImport(feedbackTemplateText());
  assert.deepEqual(fb.errors, []);
  assert.equal(fb.feedback.length, FEEDBACK_TEMPLATE.length);
  for (const p of BUNDLED) assert.deepEqual(validatePack(p, RULES), [], p.id);
});

test("impor: menerima satu objek, array, JSONL, dan bentuk {packs, feedback}", () => {
  const one = parseImport(JSON.stringify(PACK_TEMPLATE[0]));
  assert.equal(one.packs.length, 1);
  const mixed = parseImport(JSON.stringify({ packs: PACK_TEMPLATE, feedback: FEEDBACK_TEMPLATE }));
  assert.equal(mixed.packs.length, 1);
  assert.equal(mixed.feedback.length, 1);
  const jsonl = parseImport(feedbackTemplateText() + "\nbukan json\n");
  assert.equal(jsonl.feedback.length, 1);
  assert.match(jsonl.errors[0], /Baris 3/);
  assert.match(parseImport('{"halo": 1}').errors[0], /tidak dikenali/);
});

test("impor: kesalahan paket dijelaskan dengan jelas", () => {
  const bad = { ...PACK_TEMPLATE[0], kind: "toko", brandIcon: "ikon-ngawur", templates: ["merah"], headlines: ["Solusi terbaik untuk kamu"], items: [{ name: "Es", price: "5rb" }] };
  const errs = validatePack(bad, RULES).join("\n");
  assert.match(errs, /"kind" harus salah satu/);
  const bad2 = { ...PACK_TEMPLATE[0], brandIcon: "ikon-ngawur", templates: ["merah"], headlines: ["Solusi terbaik untuk kamu"], items: [{ name: "Es", price: "5rb" }] };
  const errs2 = validatePack(bad2, RULES).join("\n");
  assert.match(errs2, /ikon tidak tersedia: ikon-ngawur/);
  assert.match(errs2, /templates tidak dikenal: merah/);
  assert.match(errs2, /ungkapan generik terlarang "solusi terbaik"/);
  assert.match(errs2, /harus angka/);
  const { prompts, ...noPrompts } = PACK_TEMPLATE[0];
  assert.match(validatePack(noPrompts, RULES).join("\n"), /"prompts" wajib diisi/);
});

test("impor: paket minimal dilengkapi dari paket umum, lalu dikenali dan menghasilkan website utuh", () => {
  const minimal = {
    id: "umkm-tanaman-hias",
    kind: "umkm",
    label: "Tanaman hias",
    prompts: ["toko tanaman hias monstera dan aglonema", "jual bibit tanaman hias di rumah", "florist tanaman pot untuk dekorasi", "tanaman gantung dan kaktus mini", "kebun tanaman hias online"],
    keywords: ["tanaman", "monstera", "aglonema", "kaktus", "pot", "bibit"],
    brandIcon: "leaf",
    templates: ["segar"],
    heroes: ["split"],
    feats: ["grid"],
    headlines: ["Tanaman hias sehat dari kebun {brand}"],
    features: [{ icon: "leaf", title: "Dirawat sendiri", text: "Setiap tanaman dirawat di kebun kami sebelum dikirim." }],
  };
  assert.deepEqual(validatePack(minimal, RULES), []);
  const { pack, filled } = completePack(minimal, BUNDLED);
  assert.ok(filled.includes("steps") && filled.includes("testimonials"));
  assert.ok(pack.items.length > 0 && pack.about.length > 0);
  const merged = mergePacks(BUNDLED, [pack]);
  assert.equal(merged.length, BUNDLED.length + 1);
  const m = trainModel(merged, []);
  assert.equal(classify(m, "toko tanaman hias monstera di Bogor")[0].id, "umkm-tanaman-hias");
  const site = generateSite(m, "toko tanaman hias monstera di Bogor bernama Kebun Hijau", {});
  assert.equal(site.domain, "umkm-tanaman-hias");
  assert.ok(site.raw.headline && !/\{brand\}|undefined/.test(JSON.stringify(site.raw)));
});

test("impor: paket dengan id bawaan menggantikan bawaan, status umum tetap", () => {
  const generic = BUNDLED.find((p) => p.id === "umkm-umum");
  const merged = mergePacks(BUNDLED, [{ ...generic, label: "UMKM (versi admin)", generic: undefined }]);
  assert.equal(merged.length, BUNDLED.length);
  const g = merged.find((p) => p.id === "umkm-umum");
  assert.equal(g.label, "UMKM (versi admin)");
  assert.equal(g.generic, true);
});

/* ---------------- paket gaya visual (mis. brutalism) ---------------- */
import { validateStyle, normalizeLook, isStylePack } from "../lib/site-look.ts";
import { editSite as editSite2, pickStyle } from "../lib/site-engine/core.ts";

const STYLE = JSON.parse(fs.readFileSync(new URL("./fixtures/style-brutalism.json", import.meta.url), "utf8"));
const STYLE_RULES = { heroes: RULES.heroes, feats: RULES.feats, banned: RULES.banned };
const styledModel = trainModel(BUNDLED, [], STYLE);

test("gaya: file brutalism lolos validasi dan dikenali importer", () => {
  for (const s of STYLE) assert.deepEqual(validateStyle(s, STYLE_RULES), []);
  const r = parseImport(JSON.stringify(STYLE));
  assert.equal(r.styles.length, STYLE.length);
  assert.equal(r.packs.length, 0);
  assert.ok(isStylePack(STYLE[0]));
});

test("gaya: kesalahan dijelaskan (warna, kontras, elemen, layout)", () => {
  const bad = structuredClone(STYLE[0]);
  bad.palettes[0].bg = "merah";
  bad.palettes[1].fg = bad.palettes[1].bg;
  bad.elements.pool.push("pelangi");
  bad.layouts.hero = ["poster", "melayang"];
  const e = validateStyle(bad, STYLE_RULES).join("\n");
  assert.match(e, /"bg" harus warna hex/);
  assert.match(e, /kontras teks/);
  assert.match(e, /elemen tidak dikenal: pelangi/);
  assert.match(e, /layouts.hero tidak dikenal: melayang/);
});

test("gaya: dipicu kata kunci, tidak salah picu, dan tidak dipaksakan ke usaha yang tidak cocok", () => {
  const dom = (p) => styledModel.packs[classify(styledModel, p)[0].id];
  const pick = (p, v = 0) => pickStyle(styledModel, p, dom(p), dom(p).kind, v)?.id ?? null;
  const fam = new Set(STYLE.map((x) => x.id));
  assert.ok(fam.has(pick("website brutalism untuk distro")));
  assert.ok(fam.has(pick("landing page ala poster hitam merah untuk studio desain")));
  assert.equal(pick("website cyber brutalism studio digital"), "brutal-cyber");
  assert.equal(pick("toko frozen food gaya label pengiriman"), "brutal-label");
  assert.equal(pick("web gaya misi luar angkasa rental mobil"), "brutal-mission");
  assert.equal(pick("jasa cetak poster dan banner"), null);
  for (let v = 0; v < 6; v++) assert.equal(pick("warung bakso urat dan mie ayam", v), null);
  assert.equal(pick("website brutalism tapi tanpa gaya"), null);
});

test("gaya: satu kata keluarga menghasilkan banyak aliran dan kombinasi", () => {
  const styles = new Set();
  const combos = new Set();
  for (let v = 0; v < 40; v++) {
    const r = generateSite(styledModel, "website brutalism untuk distro Kalcer Supply", { variant: v });
    styles.add(r.style);
    const L = r.raw.look;
    combos.add([L.style, L.bg, L.accent, L.fonts.title.family, r.raw.hero, r.raw.feat, L.elements.join("+")].join("|"));
  }
  assert.equal(styles.size, STYLE.length, "semua aliran keluarga muncul");
  assert.ok(combos.size >= 38, `kombinasi unik ${combos.size}/40`);
});

test("gaya: look lengkap, lolos normalisasi, dan layout ikut gaya", () => {
  const seen = new Set();
  for (let v = 0; v < 6; v++) {
    const r = generateSite(styledModel, "website brutal distro Kalcer Supply di Bandung", { variant: v });
    assert.ok(r.style && r.style.startsWith("brutal"));
    const L = normalizeLook(r.raw.look);
    assert.ok(L, "look valid");
    const st = STYLE.find((x) => x.id === r.style);
    assert.ok(st.layouts.hero.includes(r.raw.hero));
    assert.ok(st.layouts.feat.includes(r.raw.feat));
    for (const e of st.elements.always ?? []) assert.ok(L.elements.includes(e));
    assert.ok(!/\{[a-z]+\}|undefined/i.test(JSON.stringify(L)));
    seen.add(L.bg + L.accent + L.fonts.title.family);
  }
  assert.ok(seen.size >= 3, "buat ulang menghasilkan kombinasi palet/huruf berbeda");
  assert.equal(generateSite(styledModel, "kedai kopi susu di Bandung", {}).raw.look, undefined);
});

test("gaya: perintah ubah bisa memakai, melepas, dan mengganti gaya lewat template", () => {
  const base = generateSite(styledModel, "toko kue ulang tahun Manis Legit", {}).raw;
  assert.equal(base.look, undefined);
  const on = editSite2(styledModel, base, "pakai gaya brutalism");
  assert.ok(on.raw?.look && ["poster", "breaker", "terminal", "dashboard", "label"].includes(on.raw.hero), on.note);
  const off = editSite2(styledModel, on.raw, "hapus gaya");
  assert.equal(off.raw?.look, undefined);
  const tpl = editSite2(styledModel, on.raw, "pakai template elegan");
  assert.equal(tpl.raw?.look, undefined);
  assert.equal(tpl.raw?.template, "elegan");
});
