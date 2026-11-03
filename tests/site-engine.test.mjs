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
