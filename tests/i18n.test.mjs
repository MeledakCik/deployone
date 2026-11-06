// Jalankan: node --experimental-strip-types --test tests/i18n.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { detectLang, translate, translateLoose, registerEn, tDeep, makeT } from "../lib/i18n/core.ts";
import { generateSite, editSite, extractEn, classify } from "../lib/site-engine/core.ts";
import { detectSiteLang, formatMoney, localizeRuntime } from "../lib/ai-site-i18n.ts";

const model = JSON.parse(fs.readFileSync(new URL("../lib/site-engine/model.json", import.meta.url), "utf8"));

test("bahasa awal: Indonesia untuk IP Indonesia, Inggris untuk negara lain, bot tetap Indonesia", () => {
  assert.equal(detectLang("ID", "en-US"), "id");
  assert.equal(detectLang("US", "id-ID"), "en");
  assert.equal(detectLang("SG", null), "en");
  assert.equal(detectLang(null, "id-ID,id;q=0.9,en;q=0.8"), "id");
  assert.equal(detectLang(null, "en-GB,en;q=0.9"), "en");
  assert.equal(detectLang(null, null), "id");
  assert.equal(detectLang("US", "en-US", "Mozilla/5.0 (compatible; Googlebot/2.1)"), "id");
});

test("terjemahan: kunci = teks Indonesia, variabel diisi, pesan berisi angka dikenali", () => {
  registerEn({ "Simpan": "Save", "Hapus {name}?": "Delete {name}?", "Coba lagi {v0} menit lagi.": "Try again in {v0} minutes." });
  assert.equal(translate("en", "Simpan"), "Save");
  assert.equal(translate("id", "Simpan"), "Simpan");
  assert.equal(translate("en", "Hapus {name}?", { name: "Kopi" }), "Delete Kopi?");
  assert.equal(translate("en", "Teks yang belum diterjemahkan"), "Teks yang belum diterjemahkan");
  assert.equal(translateLoose("en", "Coba lagi 7 menit lagi."), "Try again in 7 minutes.");
  const data = tDeep({ title: "Simpan", slug: "Simpan", list: ["Simpan"] }, makeT("en"));
  assert.deepEqual(data, { title: "Save", slug: "Simpan", list: ["Save"] });
});

test("mesin AI: deskripsi bahasa Inggris → website bahasa Inggris dengan dolar", () => {
  const r = generateSite(model, "Sam's Noodle Bar in Austin, open 10am–9pm. Menu: beef noodles $9, egg noodles $8.50, iced tea $3. Order on WhatsApp +1 512 555 0134.");
  assert.equal(r.raw.lang, "en");
  assert.equal(r.raw.currency, "USD");
  assert.equal(r.raw.brand, "Sam's Noodle Bar");
  assert.equal(r.extracted.city, "Austin");
  assert.equal(r.raw.hours, "10:00–21:00");
  assert.equal(r.raw.whatsapp, "15125550134");
  assert.deepEqual(r.raw.items.slice(0, 3).map((i) => [i.name, i.price]), [["Beef Noodles", 9], ["Egg Noodles", 8.5], ["Iced Tea", 3]]);
  assert.ok(!/\b(yang|dan|untuk|kami)\b/i.test(`${r.raw.headline} ${r.raw.subheadline} ${r.raw.about}`), "teks paket harus bahasa Inggris");
});

test("mesin AI: deskripsi Indonesia tetap Indonesia dan rupiah", () => {
  const r = generateSite(model, "Warung bakso Pak Slamet di Banjar, menu bakso urat 15rb, es teh 4rb");
  assert.equal(r.raw.lang, undefined);
  assert.equal(r.raw.currency, undefined);
  assert.equal(r.raw.items[0].price, 15000);
});

test("bahasa ragu ikut bahasa tampilan", () => {
  assert.equal(detectSiteLang("Kopi Senja", "en"), "en");
  assert.equal(detectSiteLang("Kopi Senja", "id"), "id");
  assert.equal(detectSiteLang("a small bakery in Portland with cakes and cookies"), "en");
  assert.equal(detectSiteLang("toko kue di Bandung yang jual brownies"), "id");
});

test("klasifikasi deskripsi bahasa Inggris", () => {
  const cases = [
    ["a coffee shop with pour over and lattes", "umkm-kopi"],
    ["laundry with pickup and delivery", "jasa-laundry"],
    ["web developer portfolio with react projects", "portofolio-developer"],
    ["birthday cakes and cookies home bakery", "umkm-kue-roti"],
    ["car repair and oil change garage", "jasa-bengkel"],
  ];
  for (const [p, want] of cases) assert.equal(classify(model, p)[0].id, want, p);
});

test("perintah ubah bahasa Inggris", () => {
  let c = generateSite(model, "Sunset Coffee in Denver. Menu: latte $5, americano $4.").raw;
  let r = editSite(model, c, "add menu Lemonade $4.50");
  assert.match(r.note, /^Changed: 1 item added/);
  assert.ok(r.raw.items.some((i) => i.name === "Lemonade" && i.price === 4.5));
  r = editSite(model, r.raw, "change the name to Moonrise Coffee");
  assert.equal(r.raw.brand, "Moonrise Coffee");
  r = editSite(model, r.raw, "change the color to green");
  assert.equal(r.raw.accent, "#16a34a");
});

test("harga & skrip keranjang mengikuti mata uang dan bahasa", () => {
  assert.equal(formatMoney(15000), "Rp 15.000");
  assert.equal(formatMoney(9, "USD"), "$9");
  assert.equal(formatMoney(8.5, "USD"), "$8.50");
  assert.equal(formatMoney(1299, "EUR"), "€1,299");
  const js = 'function rp(n){return"Rp "+String(Math.round(n)).replace(/\\B(?=(\\d{3})+(?!\\d))/g,".")}\nfunction price(it){return it.price>0?rp(it.price):"Tanya harga"}';
  const en = localizeRuntime(js, "en", "USD");
  assert.ok(en.includes('"Ask for price"') && en.includes('"$"'), en);
  assert.equal(localizeRuntime(js, undefined, "IDR"), js);
  const ex = extractEn("Bloom Florist in Seattle, open 9am-6pm daily, flowers from $25");
  assert.equal(ex.hours, "Daily 09:00–18:00");
});
