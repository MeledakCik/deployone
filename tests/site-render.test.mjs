// Renderer AI Web Builder: gaya ikon, gambar alternatif, ornamen sudut, dan normalisasi isi.
// Jalankan: node --experimental-strip-types --no-warnings --test tests/site-render.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

// Alias "@/..." → file .ts di repo (sama seperti tsconfig), supaya renderer bisa dimuat tanpa bundler.
const ROOT = new URL("../", import.meta.url);
register("data:text/javascript," + encodeURIComponent(`export async function resolve(s, c, n) { if (s.startsWith("@/")) return n(new URL(s.slice(2) + ".ts", ${JSON.stringify(ROOT.href)}).href, c); return n(s, c); }`));
const { buildSite, renderSite, normalizeContent, sampleContent } = await import(new URL("lib/ai-site-templates.ts", ROOT).href);
const { LUCIDE } = await import(new URL("lib/lucide-icons.ts", ROOT).href);
const { pixelIcon } = await import(new URL("lib/lucide-pixel.ts", ROOT).href);
const { ICON_NAMES } = await import(new URL("lib/lucide-icons.ts", ROOT).href);
const { sanitizeSvg } = await import(new URL("lib/site-assets.ts", ROOT).href);

const base = () => normalizeContent({ ...sampleContent("umkm"), template: "hangat" });
const html = (c, tpl = c.template, opts = {}) => buildSite(c, tpl, undefined, opts).single;
const shopIcons = (h) => JSON.parse(/<script type="application\/json" id="wb-data">([\s\S]*?)<\/script>/.exec(h)[1].replace(/\\u003c/g, "<")).icons;

test("isi lama tanpa gaya ikon dirender persis seperti dulu (garis Lucide apa adanya)", () => {
  const c = base();
  assert.equal(c.iconStyle, undefined);
  const h = html(c);
  assert.ok(h.includes(`stroke-linejoin="round" aria-hidden="true">${LUCIDE.search}</svg>`), "ikon cari tanpa pembungkus tambahan");
  assert.ok(!/<g stroke-width="(1\.25|2\.5)"/.test(h));
  assert.equal(shopIcons(h).plus, LUCIDE.plus);
});

test("gaya ikon pilihan mesin dipakai di halaman dan di data katalog yang digambar ulang skrip", () => {
  const c = { ...base(), iconStyle: "piksel" };
  const h = html(c);
  assert.ok(h.includes(pixelIcon("search")), "ikon bawaan memakai versi piksel");
  assert.equal(shopIcons(h).plus, pixelIcon("plus"), "katalog toko ikut piksel");
  const t = html({ ...base(), iconStyle: "tipis" });
  assert.ok(t.includes(`<g stroke-width="1.25">${LUCIDE.search}</g>`));
  assert.equal(shopIcons(t).plus, `<g stroke-width="1.25">${LUCIDE.plus}</g>`);
});

test("urutan gaya ikon: pilihan manual > pilihan mesin > ciri khas Template saat Template diganti", () => {
  const c = { ...base(), iconStyle: "sketsa" };
  assert.ok(html(c, "hangat").includes('rotate(-6 12 12)'), "Template sama → sketsa");
  assert.ok(html(c, "elegan").includes(`<g stroke-width="1.25">${LUCIDE.search}</g>`), "Template elegan → tipis");
  assert.ok(html(c, "elegan", { iconStyle: "tegas" }).includes('stroke-linecap="square"'), "manual menang");
});

test("ikon impor: gambar alternatif gaya dipakai bila ada, selain itu perlakuan umum", () => {
  const custom = '<path d="M3 3h18v18H3z"/>';
  const alt = '<path transform="translate(.75 .75) scale(1.5)" fill="currentColor" stroke="none" d="M1 1h4v4H1z"/>';
  const c = normalizeContent({ ...sampleContent("umkm"), template: "hangat", icons: { "kotak-saya": custom }, iconAlt: { piksel: { "kotak-saya": alt } }, iconStyle: "piksel", brandIcon: "kotak-saya" });
  assert.equal(c.brandIcon, "kotak-saya");
  const h = html(c);
  assert.ok(h.includes(alt));
  const d = html({ ...c, iconStyle: "duotone" });
  assert.ok(d.includes(`<g fill="currentColor" fill-opacity=".2" stroke="none">${custom}</g>${custom}`));
});

test("semua ikon bawaan punya versi piksel yang lolos sanitasi", () => {
  for (const n of ICON_NAMES) {
    const px = pixelIcon(n);
    assert.ok(px, `piksel ${n}`);
    assert.deepEqual(sanitizeSvg(px, { maxLen: 4000 }).errors, [], n);
  }
  assert.equal(pixelIcon("tidak-ada"), undefined);
});

test("normalisasi: gaya ikon & gambar alternatif disaring", () => {
  const c = normalizeContent({
    ...sampleContent("jasa"),
    iconStyle: "emas",
    iconAlt: { piksel: { ok: '<path d="M1 1h2v2H1z"/>', jahat: "<script>alert(1)</script>", "Nama Salah": '<path d="M1 1h2"/>' }, garis: { a: '<path d="M1 1h2"/>' }, palsu: { a: '<path d="M1 1h2"/>' } },
    ornFamily: "Bukan Id!",
  });
  assert.equal(c.iconStyle, undefined);
  assert.deepEqual(Object.keys(c.iconAlt), ["piksel"]);
  assert.deepEqual(Object.keys(c.iconAlt.piksel), ["ok"]);
  assert.equal(c.ornFamily, undefined);
});

test("ornamen sudut: tampil di hero tanpa gaya visual, bisa disembunyikan, maks. satu per slot", () => {
  const orn = (slot, id = slot) => ({ id, slot, vb: "0 0 200 200", svg: '<circle cx="150" cy="50" r="40" fill="var(--a)"/>' });
  const c = normalizeContent({ ...sampleContent("jasa"), template: "bersih", ornaments: [orn("corner"), orn("corner", "dua"), orn("divider"), orn("pattern"), orn("badge"), orn("art")], ornFamily: "minimal" });
  assert.deepEqual(c.ornaments.map((o) => o.slot), ["corner", "divider", "pattern", "badge", "art"]);
  assert.equal(c.ornFamily, "minimal");
  const h = html(c, "bersih");
  assert.match(h, /<div class="orcw" aria-hidden="true"><div class="orc"><svg viewBox="0 0 200 200"/);
  assert.ok(!html(c, "bersih", { ornaments: false }).includes('class="orcw"'), "disembunyikan lewat opsi");
  // blok ajakan: aksen ⇄ warna teks ditukar untuk stiker & gambar
  const withWa = { ...c, whatsapp: "6281234567890" };
  assert.match(html(withWa, "bersih"), /\.band \.bd-badge,\.band \.bd-art\{--a:#[0-9a-f]{6};--a2:#[0-9a-f]{6};--on:#[0-9a-f]{6}\}\.band \.bd-art\{--bg:#[0-9a-f]{6}\}/);
});

test("renderSite tetap menghasilkan HTML utuh untuk semua gaya ikon", () => {
  for (const st of ["garis", "tipis", "tegas", "duotone", "bayangan", "sketsa", "neon", "piksel"]) {
    const out = renderSite({ ...base(), iconStyle: st }, "hangat");
    assert.match(out, /^<!doctype html>/i);
    assert.ok(out.includes("</html>"));
  }
});

/* ---------------- neo brutalism ---------------- */
const { normalizeLook } = await import(new URL("lib/site-look.ts", ROOT).href);
const { resolveSvgColors } = await import(new URL("lib/site-assets.ts", ROOT).href);
const neoLook = (over = {}) =>
  normalizeLook({
    style: "neo-brutal",
    name: "Neo Brutal Klasik",
    bg: "#fdfbf6",
    fg: "#111111",
    ink: "#111111",
    accent: "#6439f2",
    accent2: "#d3eb06",
    fonts: { title: { family: "grotesk", weight: 900 }, body: { family: "sans", weight: 400 }, label: { family: "mono", weight: 700, upper: true } },
    shape: { radius: 14, border: 3, shadow: "hard", gap: 22, pad: 24, width: 1180, section: 92, pill: 12, offset: 6 },
    elements: ["tiles", "marker", "checks", "stickers", "tones", "stats", "topbar", "shapes", "paper", "pillnav", "tabs", "tilt", "dotgrid"],
    meta: [],
    kicker: "Tanya dulu juga boleh.",
    ticker: "Kopi Langit · Bandung",
    num: "2026",
    hl: 0,
    base: "neo",
    swatches: ["#d4f03c", "#ff8f3f", "#b8a4ff", "#fff06a"],
    stickers: ["Gas!", "Cek!"],
    ...over,
  });
const neoContent = (over = {}) => normalizeContent({ ...sampleContent("umkm"), template: "hangat", hours: "Setiap hari 08.00–21.00", look: neoLook(), hero: "neo", feat: "grid", ...over });

test("neo: dasar neo memberi kelas body, variabel swatch, CSS neo, dan hero neo lengkap", () => {
  const c = neoContent();
  assert.equal(c.look.base, "neo");
  const h = html(c);
  assert.match(h, /<body class="lk lk-neo-brutal[^"]* lkn lk-tone lk-tiles lk-tabs lk-paper lk-dots lk-pill lk-tilt">/);
  assert.match(h, /--s1:#d4f03c;--s1t:#[0-9a-f]{6};--s2:#ff8f3f/);
  assert.match(h, /--a2t:#[0-9a-f]{6};--off:6px;--grid:#[0-9a-f]{6}/);
  assert.ok(h.includes(".lk.lkn .card{") && h.includes(".nh{display:grid"), "CSS neo & hero neo");
  assert.match(h, /<div class="ntop"><div class="wrap"><span>Kopi Langit · Bandung<\/span><span>Setiap hari 08\.00–21\.00<\/span>/);
  assert.match(h, /<h1 class="nh-h" style="font-size:clamp\(\d+px,[\d.]+vw,\d+px\)">/);
  assert.match(h, /<span class="mk">[^<]+<\/span>/, "kata judul distabilo");
  assert.match(h, /<ul class="nchk"><li><svg/);
  assert.match(h, /<span class="nst nst-b" aria-hidden="true"><svg viewBox="0 0 128 128">/, "stiker ledakan");
  assert.match(h, /<p class="nv-lbl"><i aria-hidden="true">/);
  assert.match(h, /<div class="nshp" aria-hidden="true">/);
  assert.match(h, /<div class="nstat"><div class="stats">/);
  assert.ok(!/undefined|NaN/.test(h), "tidak ada nilai kosong di HTML/CSS");
});

test("neo: hero kolase menyusun kartu miring dari isi website, foto hero ikut, teks stiker di-escape", () => {
  const img = "data:image/png;base64,iVBORw0KGgo=";
  const c = neoContent({ hero: "collage", look: neoLook({ stickers: ['<b>"x"</b>', "Oke!"] }) });
  const h = buildSite(c, c.template, undefined, { images: { hero: img } }).single;
  assert.match(h, /<div class="nc-row">/);
  const cards = h.match(/<div style="--rt:-?\d+deg" class="ncc[^"]*">/g) ?? [];
  assert.ok(cards.length >= 3 && cards.length <= 4, `kartu ${cards.length}`);
  assert.ok(h.includes(`class="ncc ncc-img"><img src="${img}"`), "foto hero jadi kartu kolase");
  assert.ok(!h.includes("<b>&quot;x"), "teks stiker sudah dinormalisasi");
  assert.ok(!/<b>"x"<\/b>/.test(h));
});

test("neo: hero neo & kolase bisa dipakai tanpa gaya latihan (warna dari Template)", () => {
  for (const hero of ["neo", "collage"]) {
    const c = normalizeContent({ ...sampleContent("jasa"), template: "pastel", hero });
    assert.equal(c.hero, hero);
    const h = html(c, "pastel");
    assert.ok(h.includes(hero === "neo" ? '<div class="nh">' : '<div class="nc">'), hero);
    assert.match(h, /--s1:#[0-9a-f]{6};--s1t:#[0-9a-f]{6}/);
    assert.ok(h.includes(".nst-l{") && !/undefined|NaN/.test(h), hero);
    assert.ok(!h.includes('class="lk'), "tanpa kelas gaya latihan");
  }
});

test("neo: palet kustom pengguna menjadi warna swatch", () => {
  const h = html(neoContent(), "hangat", { palette: ["#ff0000", "#00aa00", "#0000ff"] });
  assert.match(h, /--s1:#00aa00;--s1t:#[0-9a-f]{6};--s2:#0000ff;--s2t:#[0-9a-f]{6};--s3:#ff0000/);
});

test("svg: warna swatch --s1..--s5 lolos sanitasi dan diselesaikan untuk data-URI", () => {
  assert.deepEqual(sanitizeSvg('<rect x="0" y="0" width="4" height="4" fill="var(--s3)" stroke="var(--s5)"/>').errors, []);
  assert.ok(sanitizeSvg('<rect x="0" y="0" width="4" height="4" fill="var(--s9)"/>').errors.length > 0);
  const pal = { fg: "#111111", bg: "#ffffff", a: "#ff0000", a2: "#00ff00", ink: "#000000", on: "#ffffff" };
  assert.equal(resolveSvgColors('<rect fill="var(--s1)"/><rect fill="var(--s2)"/>', pal), '<rect fill="#ff0000"/><rect fill="#00ff00"/>', "tanpa swatch → aksen");
  assert.equal(resolveSvgColors('<rect fill="var(--s4)" stroke="var(--a2)"/>', { ...pal, s4: "#123456" }), '<rect fill="#123456" stroke="#00ff00"/>');
});
