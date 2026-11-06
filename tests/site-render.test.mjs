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
  // Di atas gaya latihan urutannya [aksen, aksen kedua, ...warna kartu], jadi warna ke-3 menjadi kartu pertama.
  assert.match(h, /--a:#ff0000;/);
  assert.match(h, /--s1:#0000ff;--s1t:#[0-9a-f]{6};--s2:#ff0000/);
  const plain = html(normalizeContent({ ...sampleContent("jasa"), template: "bersih" }), "bersih", { palette: ["#ff0000", "#00aa00", "#0000ff"] });
  assert.match(plain, /--s1:#00aa00;--s1t:#[0-9a-f]{6};--s2:#0000ff;--s2t:#[0-9a-f]{6};--s3:#ff0000/, "tanpa gaya: urutan lama");
});

test("svg: warna swatch --s1..--s5 lolos sanitasi dan diselesaikan untuk data-URI", () => {
  assert.deepEqual(sanitizeSvg('<rect x="0" y="0" width="4" height="4" fill="var(--s3)" stroke="var(--s5)"/>').errors, []);
  assert.ok(sanitizeSvg('<rect x="0" y="0" width="4" height="4" fill="var(--s9)"/>').errors.length > 0);
  const pal = { fg: "#111111", bg: "#ffffff", a: "#ff0000", a2: "#00ff00", ink: "#000000", on: "#ffffff" };
  assert.equal(resolveSvgColors('<rect fill="var(--s1)"/><rect fill="var(--s2)"/>', pal), '<rect fill="#ff0000"/><rect fill="#00ff00"/>', "tanpa swatch → aksen");
  assert.equal(resolveSvgColors('<rect fill="var(--s4)" stroke="var(--a2)"/>', { ...pal, s4: "#123456" }), '<rect fill="#123456" stroke="#00ff00"/>');
});

/* ---------------- editor kanvas ala Canva ---------------- */
const { setContentField, isEditableField } = await import(new URL("lib/ai-site-edit.ts", ROOT).href);

test("kanvas: mode editable menandai teks, bagian, dan gambar; publish tetap bersih", () => {
  const c = normalizeContent({ ...sampleContent("jasa"), template: "bersih", whatsapp: "6281234567890" });
  const plain = html(c, "bersih");
  const ed = html(c, "bersih", { editable: true });
  assert.ok(!/data-f=|data-sec=|data-img=/.test(plain), "HTML publish tanpa penanda editor");
  for (const f of ["brand", "headline", "featuresTitle", "features.0.title", "features.0.text", "closing"]) assert.ok(ed.includes(`data-f="${f}"`), f);
  assert.match(ed, /<div class="hero h-[a-z-]+" data-sec="hero">/);
  assert.match(ed, /<section data-sec="fitur" id="fitur">/);
  assert.match(ed, /<i[^>]* data-img="logo">/);
  for (const m of ed.matchAll(/data-f="([^"]+)"/g)) assert.ok(isEditableField(m[1]), `bidang ${m[1]} dikenali setContentField`);
});

test("kanvas: urutan & sembunyi bagian ikut ke HTML dan menu", () => {
  const c = normalizeContent({ ...sampleContent("jasa"), template: "bersih", whatsapp: "6281234567890", sections: { order: ["cara", "fitur", "bukan"], hidden: ["testimoni", "fitur"] } });
  assert.deepEqual(c.sections, { order: ["cara", "fitur"], hidden: ["testimoni", "fitur"] });
  const h = html(c, "bersih");
  assert.ok(!h.includes('<section id="fitur"') && !h.includes('href="#fitur"'), "keunggulan tersembunyi, termasuk di menu");
  assert.ok(!h.includes('id="testimoni"'));
  if (c.steps.length && c.items.length) assert.ok(h.indexOf('id="cara"') < h.indexOf('id="layanan"'), "langkah dipindah ke atas");
});

test("kanvas: setContentField hanya mengubah bidang yang dikenal, merapikan, dan menolak kosong untuk bidang wajib", () => {
  const c = normalizeContent({ ...sampleContent("umkm"), template: "hangat" });
  const a = setContentField(c, "headline", "  Judul   baru\nkita ");
  assert.equal(a.headline, "Judul baru kita");
  assert.equal(setContentField(c, "headline", "   "), null, "judul wajib");
  assert.equal(setContentField(c, "headline", c.headline), null, "tidak berubah");
  assert.equal(setContentField(c, "look", "x"), null);
  assert.equal(setContentField(c, "features.0.icon", "x"), null);
  assert.equal(setContentField(c, "__proto__.x", "x"), null);
  const b = setContentField(c, "features.1.text", "Teks fitur kedua");
  assert.equal(b.features[1].text, "Teks fitur kedua");
  assert.equal(c.features[1].text !== "Teks fitur kedua", true, "isi lama tidak ikut berubah");
  const t = setContentField(c, "testimonial.text", "Enak sekali");
  assert.equal(t.testimonial.text, "Enak sekali");
  assert.equal(setContentField(c, "items.99.name", "x"), null);
  assert.equal(a.items[0].id, c.items[0].id, "id produk tetap (gambar tetap terpasang)");
});

test("warna: palet panel (aksen, aksen kedua, swatch) di atas gaya latihan menjaga gaya & warna kartu", () => {
  const c = neoContent();
  const L = c.look;
  const pal = [...new Set([c.accent || L.accent, L.accent2, ...L.swatches])].slice(0, 6);
  const base = html(c);
  const same = html(c, c.template, { palette: pal });
  const v = (h, k) => new RegExp(`--${k}:(#[0-9a-f]{6})`).exec(h)[1];
  for (const k of ["a", "a2", "s1", "s2", "s3", "s4"]) assert.equal(v(same, k), v(base, k), k);
  assert.match(same, /<body class="lk lk-neo-brutal[^"]* lkn/, "gaya tetap aktif");
  const changed = html(c, c.template, { palette: ["#e11d48", ...pal.slice(1)] });
  assert.equal(v(changed, "a"), "#e11d48");
  assert.equal(v(changed, "s1"), v(base, "s1"), "warna kartu tidak bergeser");
});

test("optimasi: meta pratinjau tautan, favicon, dan aturan sentuh HP ada di setiap website", () => {
  const h = html(normalizeContent({ ...sampleContent("umkm"), template: "hangat" }));
  assert.match(h, /<meta property="og:title" content="[^"]+">/);
  assert.match(h, /<meta property="og:description" content="[^"]{1,160}">/);
  assert.match(h, /<link rel="icon" href="data:image\/svg\+xml,/);
  assert.match(h, /@media\(max-width:640px\)\{\.btn\{min-height:44px\}/);
  assert.match(h, /\.search input,\.fld input,\.fld textarea,\.fld select\{font-size:16px\}/, "input 16px supaya iPhone tidak zoom");
});

test("HP: menu lipat berisi semua tautan bagian + tombol utama, dan tidak ada bila menu kosong", () => {
  const c = normalizeContent({ ...sampleContent("jasa"), template: "bersih", whatsapp: "6281234567890" });
  const h = html(c, "bersih");
  const links = /<nav class="links"[^>]*>([\s\S]*?)<\/nav>/.exec(h)[1];
  const m = /<details class="mnav"><summary aria-label="Buka menu">[\s\S]*?<nav class="mlinks" aria-label="Menu">([\s\S]*?)<\/nav><\/details>/.exec(h);
  assert.ok(m, "menu HP ada");
  assert.ok(m[1].startsWith(links), "isi menu = tautan menu utama");
  assert.match(m[1], /<a class="btn" href="https:\/\/wa\.me\/6281234567890">/);
  assert.match(h, /\.mlinks a:not\(\.btn\)\{display:flex;align-items:center;min-height:48px/);
  assert.match(h, /@media\(max-width:480px\)\{\.nav \.wrap>\.btn:not\(\.cartbtn\)\{display:none\}/, "tombol menu atas disembunyikan, tombol di menu tetap");
});

/* ---------------- keamanan, SEO, sudut, Google Fonts ---------------- */
const { GOOGLE_FONTS, googleFontsHref } = await import(new URL("lib/ai-site-templates.ts", ROOT).href);

test("keamanan & SEO: CSP, referrer, dan data terstruktur JSON-LD dari isi sendiri", () => {
  const c = normalizeContent({ ...sampleContent("umkm"), template: "hangat", whatsapp: "6281234567890", address: "Jl. Merdeka 1", hours: "Setiap hari 08.00–21.00" });
  const h = html(c, "hangat");
  assert.match(h, /<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline';[^"]*object-src 'none'; base-uri 'none'; form-action 'none'">/);
  assert.match(h, /<meta name="referrer" content="strict-origin-when-cross-origin">/);
  assert.ok(!/<script[^>]+src="https?:/.test(h), "tanpa skrip dari luar");
  const ld = JSON.parse(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(h)[1]);
  assert.equal(ld["@type"], "LocalBusiness");
  assert.equal(ld.name, c.brand);
  assert.equal(ld.telephone, "+6281234567890");
  assert.equal(ld.address.streetAddress, "Jl. Merdeka 1");
  assert.ok(ld.makesOffer.every((o) => !o.price || o.priceCurrency === "IDR"));
  const art = normalizeContent({ ...sampleContent("artikel"), template: "majalah" });
  assert.equal(JSON.parse(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html(art, "majalah"))[1])["@type"], "Blog");
  // nama usaha berisi </script> tidak bisa keluar dari blok JSON-LD
  const evil = normalizeContent({ ...sampleContent("jasa"), template: "bersih", brand: "A</script><script>alert(1)</script>" });
  const he = html(evil, "bersih");
  assert.ok(!he.includes("<script>alert(1)"), "nama usaha tidak bisa menyisipkan skrip");
});

test("sudut & Google Fonts: dipasang dari pilihan, nama di luar daftar diabaikan", () => {
  const c = neoContent();
  const h = html(c, c.template, { radius: 30, pill: 999, gfonts: { title: "Fraunces", body: "Inter" } });
  assert.match(h, /\.lk\.lkn \.card\{border:3px solid var\(--ink\);border-radius:30px/);
  assert.match(h, /\.lk\.lkn \.btn\{border-radius:999px/);
  assert.ok(h.includes(`<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700;800&display=swap">`));
  assert.match(h, /h1,h2,h3,[^{]*\{font-family:'Fraunces',Georgia/);
  const bad = html(c, c.template, { gfonts: { title: "Evil');}body{x", body: "Comic Sans" } });
  assert.ok(!bad.includes("fonts.googleapis.com/css2") && !bad.includes("Evil"), "nama huruf tidak dikenal tidak dipakai");
  assert.equal(googleFontsHref(["Bebas Neue"]), "https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap");
  assert.ok(GOOGLE_FONTS.length >= 20);
  assert.equal(setContentField(c, "ctaLabel", "Pesan sekarang").ctaLabel, "Pesan sekarang");
});

test("gaya teks ala Canva: ukuran, miring, kapital, jarak per peran + font Google untuk sub-judul", async () => {
  const { normTextStyles, textStyleCss } = await import(new URL("lib/ai-site-templates.ts", ROOT).href);
  const st = normTextStyles({ title: { size: 9, italic: true, upper: true, spacing: 2 }, body: { line: 0.1 }, bogus: { size: 1 } });
  assert.equal(st.title.size, 1.8);
  assert.equal(st.title.spacing, 0.4);
  assert.equal(st.body.line, 0.8);
  assert.equal(st.bogus, undefined);
  assert.equal(normTextStyles({}), undefined);
  const css = textStyleCss(st);
  assert.match(css, /h1\{[^}]*font-style:italic/);
  assert.match(css, /text-transform:uppercase/);
  const html = renderSite(base(), "hangat", undefined, { gfonts: { title: "Fraunces", sub: "Caveat", body: "Inter" }, textStyle: st });
  assert.match(html, /family=Fraunces/);
  assert.match(html, /Caveat/);
  assert.match(html, /font-style:italic/);
  assert.doesNotMatch(html, /<\/style>[^]*bogus/);
});
