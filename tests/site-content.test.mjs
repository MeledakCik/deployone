// Menjaga konten SEO/ringkasan AI tetap konsisten.
// Jalankan: node --experimental-strip-types --test tests/site-content.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import {
  FEATURES, HOME_FAQS, PLATFORMS, SITE_URL, buildLlmsTxt, buildLlmsFullTxt, getFeature,
} from "../lib/site-content.ts";

test("slug fitur unik dan aman untuk URL", () => {
  const slugs = FEATURES.map((f) => f.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  for (const s of slugs) assert.match(s, /^[a-z0-9]+(-[a-z0-9]+)*$/);
});

test("judul dan deskripsi SEO dalam batas wajar", () => {
  for (const f of FEATURES) {
    assert.ok(f.seoTitle.length <= 60, `${f.slug}: judul ${f.seoTitle.length} karakter`);
    assert.ok(f.seoDescription.length >= 110 && f.seoDescription.length <= 165, `${f.slug}: deskripsi ${f.seoDescription.length} karakter`);
  }
  const titles = FEATURES.map((f) => f.seoTitle);
  assert.equal(new Set(titles).size, titles.length, "judul harus unik");
});

test("tiap fitur lengkap dan tautan terkait valid", () => {
  for (const f of FEATURES) {
    assert.ok(f.points.length >= 3, `${f.slug}: poin kurang`);
    assert.ok(f.limits.length >= 1, `${f.slug}: batas kosong`);
    assert.ok(f.steps.length >= 3, `${f.slug}: langkah kurang`);
    for (const r of f.related) {
      assert.ok(getFeature(r), `${f.slug}: related "${r}" tidak ada`);
      assert.notEqual(r, f.slug);
    }
  }
});

test("llms.txt dan llms-full.txt memuat semua fitur dan memakai domain situs", () => {
  const short = buildLlmsTxt();
  const full = buildLlmsFullTxt();
  assert.ok(short.startsWith("# Depup"));
  for (const f of FEATURES) {
    assert.ok(short.includes(`${SITE_URL}/fitur/${f.slug}`), `llms.txt tanpa ${f.slug}`);
    assert.ok(full.includes(f.name), `llms-full tanpa ${f.name}`);
  }
  for (const p of PLATFORMS) assert.ok(short.includes(p.name));
  for (const q of HOME_FAQS) assert.ok(full.includes(q.q));
});

test("FAQ beranda tidak duplikat", () => {
  const qs = HOME_FAQS.map((q) => q.q);
  assert.equal(new Set(qs).size, qs.length);
});
