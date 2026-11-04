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

/* ---------------- paket ikon & elemen ---------------- */
import { sanitizeSvg, validateIconPack, validateElementPack } from "../lib/site-assets.ts";
import { attachIcons } from "../lib/site-engine/core.ts";

const ICONS = JSON.parse(fs.readFileSync(new URL("./fixtures/icons-nusantara.json", import.meta.url), "utf8"));
const ELEMENTS = JSON.parse(fs.readFileSync(new URL("./fixtures/elements-dekor.json", import.meta.url), "utf8"));

test("svg: bentuk yang sah lolos dan dibangun ulang dengan rapi", () => {
  const r = sanitizeSvg(`<path d="M3 21 21 3"/><circle cx='8.5' cy='15.5' r='2'></circle><g transform="rotate(45 12 12)"><rect x="1" y="2" width="3" height="4" fill="var(--a)"/></g>`);
  assert.deepEqual(r.errors, []);
  assert.equal(r.svg, `<path d="M3 21 21 3"/><circle cx="8.5" cy="15.5" r="2"/><g transform="rotate(45 12 12)"><rect x="1" y="2" width="3" height="4" fill="var(--a)"/></g>`);
});

test("svg: semua bentuk serangan ditolak", () => {
  const bad = [
    `<script>alert(1)</script>`,
    `<path d="M0 0" onload="alert(1)"/>`,
    `<a href="javascript:alert(1)"><path d="M0 0"/></a>`,
    `<image href="https://jahat.example/x.png"/>`,
    `<path d="M0 0" style="background:url(https://jahat.example)"/>`,
    `<path d="M0 0" fill="url(https://jahat.example#x)"/>`,
    `<path d="M0 0" fill="red;onload=alert(1)"/>`,
    `<foreignObject><div>x</div></foreignObject>`,
    `<text>halo</text>`,
    `halo <path d="M0 0"/>`,
    `<path d="M0 0" xlink:href="#x"/>`,
    `<path d="M0 0\\" onload=\\"alert(1)"/>`,
    `<use href="#a"/>`,
    `<path d="javascript:alert(1)"/>`,
    `<g><path d="M0 0"/>`,
    `<svg onload="alert(1)"><path d="M0 0"/></svg>`,
    `<path d="M0 0" transform="translate(1) url(x)"/>`,
  ];
  for (const b of bad) {
    const r = sanitizeSvg(b);
    assert.ok(r.errors.length > 0, `harus ditolak: ${b}`);
    assert.equal(r.svg, "");
  }
});

test("ikon & elemen: paket contoh lolos validasi, nama bawaan dilindungi", () => {
  for (const p of ICONS) assert.deepEqual(validateIconPack(p, RULES.icons), []);
  for (const p of ELEMENTS) assert.deepEqual(validateElementPack(p), []);
  const hijack = { type: "icons", id: "jahat", label: "x", icons: [{ name: "store", svg: '<path d="M0 0h24"/>', keywords: ["toko"] }] };
  assert.match(validateIconPack(hijack, RULES.icons).join(), /ikon bawaan/);
  const kwOnly = { type: "icons", id: "kata", label: "x", icons: [{ name: "store", keywords: ["kelontong"] }] };
  assert.deepEqual(validateIconPack(kwOnly, RULES.icons), []);
});

test("ikon: mesin belajar frasa → ikon dan menyertakan SVG-nya di isi website", () => {
  const m = trainModel(BUNDLED, [], [], { icons: ICONS, elements: ELEMENTS });
  const r = generateSite(m, "Warung bakso Pak Kumis. Menu: bakso urat 18rb, mie ayam 15rb, es teh manis 5rb", {});
  const icon = Object.fromEntries(r.raw.items.map((i) => [i.name, i.icon]));
  assert.equal(icon["Bakso Urat"], "bakso-mangkuk");
  assert.equal(icon["Mie Ayam"], "mie");
  assert.equal(icon["Es Teh Manis"], "es-teh");
  assert.equal(r.raw.brandIcon, "bakso-mangkuk");
  for (const n of ["bakso-mangkuk", "mie", "es-teh"]) assert.ok(r.raw.icons[n], `SVG ${n} ikut`);
  // frasa utuh: "kaki lima" tidak membuat kata "lima" sendirian memicu gerobak
  const r2 = generateSite(m, "toko roti lima rasa", {});
  assert.notEqual(r2.raw.brandIcon, "gerobak");
  const raw = { brandIcon: "store", features: [], items: [{ icon: "galon" }] };
  attachIcons(m, raw);
  assert.deepEqual(Object.keys(raw.icons), ["galon"]);
});

test("elemen: satu keluarga per website, maks. satu per slot, tidak berlebihan", () => {
  const m = trainModel(BUNDLED, [], [], { icons: ICONS, elements: ELEMENTS });
  let seen = 0;
  for (let v = 0; v < 20; v++) {
    const r = generateSite(m, "toko batik tulis di Solo namanya Batik Sekar", { variant: v });
    const o = r.raw.ornaments ?? [];
    seen += o.length;
    assert.ok(o.length <= 4, "tanpa gaya maks. 4");
    assert.equal(new Set(o.map((x) => x.slot)).size, o.length);
    assert.ok(!(o.some((x) => x.slot === "art") && o.some((x) => x.slot === "badge")), "art & badge sama-sama di blok ajakan");
    const fams = new Set(o.map((x) => m.elements[x.id].family));
    assert.ok(fams.size <= 1, `satu keluarga, dapat ${[...fams]}`);
    if (o.length) assert.equal(r.raw.ornFamily, [...fams][0]);
  }
  assert.ok(seen > 0, "batik mendapat ornamen");
});

/* ---------------- gaya ikon, paket varian, keluarga elemen ---------------- */
import { ICON_STYLES, ICON_STYLE_IDS, TEMPLATE_ICON_STYLES, treatIcon, isIconStyle } from "../lib/site-assets.ts";
import { LOOK_ICON_STYLES } from "../lib/site-look.ts";
import { pickOrnaments, pickIconStyle, familyFromText, iconStyleFromText } from "../lib/site-engine/core.ts";

const PIKSEL = JSON.parse(fs.readFileSync(new URL("./fixtures/icons-piksel.json", import.meta.url), "utf8"));
const lucideInner = (n) => JSON.parse(`"${new RegExp(`^ "${n}": "(.*)",?$`, "m").exec(iconsSrc)[1]}"`);
const assetModel = trainModel(BUNDLED, [], STYLE, { icons: [...ICONS, ...PIKSEL], elements: ELEMENTS });

test("gaya ikon: daftar sama di site-assets & site-look, tiap Template punya gaya yang valid", () => {
  assert.deepEqual([...LOOK_ICON_STYLES], [...ICON_STYLE_IDS]);
  assert.equal(ICON_STYLES.length, 8);
  for (const t of RULES.templates) {
    const list = TEMPLATE_ICON_STYLES[t];
    assert.ok(list?.length, `template ${t} punya gaya ikon`);
    for (const x of list) assert.ok(isIconStyle(x));
  }
});

test("gaya ikon: semua perlakuan menghasilkan SVG yang lolos sanitasi", () => {
  for (const n of ["store", "heart", "message-circle", "shopping-cart", "map-pin"]) {
    const inner = lucideInner(n);
    for (const st of ICON_STYLE_IDS) {
      const out = treatIcon(inner, st);
      assert.deepEqual(sanitizeSvg(out, { maxLen: 20000 }).errors, [], `${n}/${st}`);
    }
    assert.equal(treatIcon(inner, "garis"), inner, "garis tidak mengubah apa pun");
    assert.equal(treatIcon(inner, undefined), inner);
  }
  const alt = '<path fill="currentColor" stroke="none" d="M0 0h2v2H0z"/>';
  assert.equal(treatIcon(lucideInner("store"), "piksel", alt), alt, "gambar alternatif dipakai apa adanya");
  assert.match(treatIcon(lucideInner("store"), "piksel"), /stroke-linecap="square"/, "piksel tanpa gambar → tegas");
  assert.equal(treatIcon(lucideInner("store"), "garis", alt), lucideInner("store"), "garis mengabaikan gambar alternatif");
});

test("paket varian: nama bawaan boleh, kata kunci opsional, gaya varian divalidasi", () => {
  for (const p of PIKSEL) assert.deepEqual(validateIconPack(p, RULES.icons), []);
  const ok = { type: "icons", id: "piksel-toko", label: "x", variant: "piksel", icons: [{ name: "store", svg: '<path fill="currentColor" d="M2 2h4v4H2z"/>' }] };
  assert.deepEqual(validateIconPack(ok, RULES.icons), []);
  assert.match(validateIconPack({ ...ok, variant: "garis" }, RULES.icons).join(), /variant/);
  assert.match(validateIconPack({ ...ok, variant: "emas" }, RULES.icons).join(), /variant/);
  const evil = { ...ok, icons: [{ name: "store", svg: '<script>alert(1)</script>' }] };
  assert.ok(validateIconPack(evil, RULES.icons).length > 0);
  // ikon biasa tetap wajib kata kunci
  assert.match(validateIconPack({ type: "icons", id: "a-b", label: "x", icons: [{ name: "abc", svg: '<path d="M1 1h2"/>' }] }, RULES.icons).join(), /keywords/);
});

test("paket varian: disimpan sebagai gambar alternatif, tidak menambah kata kunci, ikut ke isi website", () => {
  const plain = trainModel(BUNDLED, [], [], { icons: ICONS, elements: ELEMENTS });
  assert.equal(assetModel.iconPhrases.length, plain.iconPhrases.length, "varian tidak menambah frasa");
  assert.ok(assetModel.iconAlts.piksel.gerobak, "gambar piksel tersimpan");
  const r = generateSite(assetModel, "Warung bakso Pak Kumis. Menu: bakso urat 18rb, mie ayam 15rb", {});
  assert.ok(r.raw.iconAlt?.piksel?.["bakso-mangkuk"], "gambar piksel ikon yang dipakai ikut");
  assert.ok(!r.raw.iconAlt.piksel.gerobak, "yang tidak dipakai tidak ikut");
});

test("keluarga: kata kunci memilih keluarga, Template, dan gaya ikon yang serasi", () => {
  assert.equal(familyFromText(assetModel, "rental ps 8-bit"), "piksel");
  assert.equal(familyFromText(assetModel, "kedai kopi jadul"), "retro");
  assert.equal(familyFromText(assetModel, "toko kue biasa"), null);
  for (let v = 0; v < 4; v++) {
    const r = generateSite(assetModel, "Rental PS dan game center 8-bit di Depok", { variant: v });
    assert.equal(r.raw.iconStyle, "piksel");
    assert.ok(["neon", "gelap"].includes(r.raw.template), `template ${r.raw.template}`);
    if (r.raw.ornaments) assert.equal(r.raw.ornFamily, "piksel");
  }
  const kopi = generateSite(assetModel, "Kedai kopi jadul Kopi Tubruk Mbah di Jogja", {});
  assert.equal(kopi.raw.ornFamily, "retro");
});

test("keluarga: domain yang cocok paling sering menang, tapi tetap bervariasi", () => {
  const count = {};
  for (let v = 0; v < 30; v++) {
    const f = generateSite(assetModel, "Laundry kiloan dan cuci sepatu di Depok, antar jemput", { variant: v }).raw.ornFamily ?? "-";
    count[f] = (count[f] ?? 0) + 1;
  }
  const top = Object.entries(count).sort((a, b) => b[1] - a[1])[0][0];
  assert.equal(top, "organik", JSON.stringify(count));
  assert.ok(Object.keys(count).length >= 2, `tetap bervariasi: ${JSON.stringify(count)}`);
});

test("gaya ikon: dari Template, dari gaya visual, dan dari kata 'ikon …' di deskripsi", () => {
  assert.equal(iconStyleFromText("pakai ikon tipis ya"), "tipis");
  assert.equal(iconStyleFromText("ganti ikonnya jadi pixel"), "piksel");
  assert.equal(iconStyleFromText("ikon gambar tangan"), "sketsa");
  assert.equal(iconStyleFromText("template neon"), null, "tanpa kata ikon bukan perintah gaya ikon");
  const st = (t) => pickIconStyle(assetModel, { template: t, seed: 1, variant: 0 });
  assert.equal(st("elegan"), "tipis");
  for (const t of RULES.templates) assert.ok(TEMPLATE_ICON_STYLES[t].includes(st(t)));
  const cyber = STYLE.find((x) => x.id === "brutal-cyber");
  for (let v = 0; v < 6; v++) assert.ok(cyber.iconStyles.includes(pickIconStyle(assetModel, { template: "bersih", style: cyber, family: "nusantara", seed: 3, variant: v })));
  const r = generateSite(assetModel, "Toko kue rumahan di Bandung dengan ikon sketsa", {});
  assert.equal(r.raw.iconStyle, "sketsa");
});

test("edit: gaya ikon, ornamen, dan Template mengatur gaya ikon", () => {
  const base = generateSite(assetModel, "Warung bakso Pak Kumis di Malang", {}).raw;
  let r = editSite(assetModel, base, "ikon tipis");
  assert.equal(r.raw.iconStyle, "tipis");
  r = editSite(assetModel, base, "ganti template jadi elegan");
  assert.equal(r.raw.template, "elegan");
  assert.equal(r.raw.iconStyle, "tipis", "Template baru membawa gaya ikon ciri khasnya");
  r = editSite(assetModel, base, "hiasan memphis");
  assert.equal(r.raw.ornFamily, "memphis");
  for (const o of r.raw.ornaments) assert.equal(assetModel.elements[o.id].family, "memphis");
  const lain = editSite(assetModel, r.raw, "ganti hiasan lain");
  assert.ok(lain.raw, lain.note);
  assert.notEqual(lain.raw.ornFamily, "memphis");
  r = editSite(assetModel, r.raw, "hapus ornamen");
  assert.equal(r.raw.ornaments, undefined);
  assert.equal(r.raw.ornFamily, undefined);
  // "gaya ikon neon" bukan template neon
  r = editSite(assetModel, base, "ganti gaya ikon jadi neon");
  assert.equal(r.raw.iconStyle, "neon");
  assert.equal(r.raw.template, base.template);
});

test("ornamen: tanpa paket elemen kosong, keluarga paksa & pengecualian dihormati", () => {
  const plain = trainModel(BUNDLED, [], []);
  assert.deepEqual(pickOrnaments(plain, { domain: "umkm-kopi", kind: "umkm", template: "hangat", seed: 1, variant: 0 }), { family: null, ornaments: [] });
  const ctx = { domain: "umkm-kopi", kind: "umkm", template: "hangat", seed: 7, variant: 0 };
  const forced = pickOrnaments(assetModel, { ...ctx, family: "kertas" });
  assert.equal(forced.family, "kertas");
  assert.ok(forced.ornaments.length > 0);
  for (let v = 0; v < 10; v++) assert.notEqual(pickOrnaments(assetModel, { ...ctx, variant: v, exclude: "retro" }).family, "retro");
  const styled = pickOrnaments(assetModel, { ...ctx, style: STYLE[0], family: "grafis" });
  assert.ok(!styled.ornaments.some((o) => o.slot === "corner"), "hero gaya visual tidak diberi ornamen sudut");
});
