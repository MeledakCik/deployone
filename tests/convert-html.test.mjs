// Menjaga mesin konversi HTML → Next.js 16 tetap benar.
// Jalankan: node --experimental-strip-types --test tests/convert-html.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { convertHtmlProject, htmlToJsx, routeOfHtml, patchLegacyScript, decodeEntities } from "../lib/convert/html-to-next.ts";

const enc = new TextEncoder();
const f = (path, text) => ({ path, data: enc.encode(text) });
const text = (out, path) => {
  const file = out.files.find((x) => x.path === path);
  assert.ok(file, `file ${path} harus ada (ada: ${out.files.map((x) => x.path).join(", ")})`);
  return typeof file.data === "string" ? file.data : new TextDecoder().decode(file.data);
};

test("rute dari path html", () => {
  assert.equal(routeOfHtml("index.html"), "/");
  assert.equal(routeOfHtml("about.html"), "/about");
  assert.equal(routeOfHtml("blog/index.html"), "/blog");
  assert.equal(routeOfHtml("blog/post 1.html"), "/blog/post-1");
  assert.equal(routeOfHtml("_hidden/(x)/a.html"), "/hidden/x/a");
});

test("atribut dasar: class, for, style, boolean, angka", () => {
  const { jsx } = htmlToJsx(
    `<div class="a b" style="color:red; background-color: #fff; --gap: 4px"><label for="x" tabindex="0">Nama</label><input id="x" disabled="disabled" value="hi"><td colspan="2"></td></div>`,
  );
  assert.match(jsx, /className="a b"/);
  assert.match(jsx, /style=\{\{ color: "red", backgroundColor: "#fff", "--gap": "4px" \}\}/);
  assert.match(jsx, /htmlFor="x"/);
  assert.match(jsx, /tabIndex=\{0\}/);
  assert.match(jsx, /<input id="x" disabled defaultValue="hi" \/>/);
  assert.match(jsx, /colSpan=\{2\}/);
});

test("tag void ditutup, kurung kurawal dan < di teks aman", () => {
  const { jsx } = htmlToJsx(`<p>1 < 2 {x} &amp; Q&A<br>baris<hr></p>`);
  assert.match(jsx, /<br \/>/);
  assert.match(jsx, /<hr \/>/);
  assert.match(jsx, /&lt; 2 &#123;x&#125; &amp; Q&A/);
});

test("spasi antar elemen sebaris dipertahankan", () => {
  const { jsx } = htmlToJsx(`<p><b>a</b> <i>b</i> teks <u>c</u></p>`);
  const lines = jsx.split("\n").map((l) => l.trim());
  assert.ok(lines.filter((l) => l === '{" "}').length >= 3, jsx);
});

test("style berisi ; di dalam url() tidak terpotong", () => {
  const { jsx } = htmlToJsx(`<div style="background:url(data:image/png;base64,AAA=);color:blue"></div>`);
  assert.match(jsx, /background: "url\(data:image\/png;base64,AAA=\)"/);
  assert.match(jsx, /color: "blue"/);
});

test("event handler inline", () => {
  const a = htmlToJsx(`<button onclick="toggleMenu()">x</button>`);
  assert.match(a.jsx, /onClick=\{\(e\) => \{ \(window as any\)\.toggleMenu\(\); \}\}/);
  const b = htmlToJsx(`<form onsubmit="return false"></form>`);
  assert.match(b.jsx, /onSubmit=\{\(e\) => \{ e\.preventDefault\(\); \}\}/);
  const c = htmlToJsx(`<a href="#" onclick="alert('hi')">x</a>`);
  assert.match(c.jsx, /onClick=\{\(e\) => \{ alert\('hi'\); \}\}/);
  const d = htmlToJsx(`<button onclick="a = 1; foo(a)">x</button>`);
  assert.match(d.jsx, /TODO dari onclick/);
  assert.ok(d.warnings.length > 0);
});

test("SVG: atribut camelCase dan xlink", () => {
  const { jsx } = htmlToJsx(`<svg viewBox="0 0 10 10" class="i"><path stroke-width="2" fill-rule="evenodd" d="M0 0"/><use xlink:href="#a"/></svg>`);
  assert.match(jsx, /className="i"/);
  assert.match(jsx, /strokeWidth="2"/);
  assert.match(jsx, /fillRule="evenodd"/);
  assert.match(jsx, /xlinkHref="#a"/);
});

test("select option selected → defaultValue; tabel tanpa tbody dibungkus", () => {
  const a = htmlToJsx(`<select name="k"><option value="1">A</option><option value="2" selected>B</option></select>`);
  assert.match(a.jsx, /<select name="k" defaultValue="2">/);
  assert.doesNotMatch(a.jsx, /selected/);
  const b = htmlToJsx(`<table><tr><td>1</td></tr></table>`);
  assert.match(b.jsx, /<tbody>/);
});

test("pre dan textarea menjaga spasi", () => {
  const a = htmlToJsx(`<pre>a\n  b</pre>`);
  assert.match(a.jsx, /\{"a\\n {2}b"\}/);
  const b = htmlToJsx(`<textarea name="t">halo\ndunia</textarea>`);
  assert.match(b.jsx, /defaultValue="halo\\ndunia"/);
});

test("li dan p ditutup otomatis seperti browser", () => {
  const { jsx } = htmlToJsx(`<ul><li>a<li>b</ul><p>x<div>y</div>`);
  assert.equal((jsx.match(/<li>/g) ?? []).length, 2);
  assert.equal((jsx.match(/<\/li>/g) ?? []).length, 2);
});

test("decodeEntities", () => {
  assert.equal(decodeEntities("a&nbsp;b &#169; &#x41; &unknown;"), "a b © A &unknown;");
});

test("patchLegacyScript mengganti DOMContentLoaded dan load", () => {
  const r = patchLegacyScript(`document.addEventListener('DOMContentLoaded', function(){ init(); });\nwindow.addEventListener("load", go);`);
  assert.ok(r.changed);
  assert.match(r.code, /__depupReady\(function/);
  assert.match(r.code, /__depupLoad\(go\)/);
  assert.ok(r.code.startsWith("var __depupReady"));
  assert.equal(patchLegacyScript("var a = 1;").changed, false);
});

const SITE = [
  f(
    "index.html",
    `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Beranda — Toko</title>
<meta name="description" content="Toko kue &amp; roti">
<meta property="og:title" content="Toko Kue">
<meta property="og:image" content="img/og.png">
<link rel="icon" href="favicon.png">
<link rel="stylesheet" href="css/style.css">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter&display=swap">
<style>body{margin:0;background:url(img/bg.png)}</style>
</head>
<body class="home">
<nav><a href="index.html">Beranda</a> <a href="about.html#tim">Tentang</a> <a href="blog/">Blog</a> <a href="https://example.com" target="_blank">Luar</a> <a href="#kontak">Kontak</a></nav>
<img src="img/hero.png" alt="Hero" srcset="img/hero.png 1x, img/hero@2x.png 2x">
<button onclick="openModal('a')">Buka</button>
<script src="js/app.js"></script>
<script>document.addEventListener("DOMContentLoaded", function(){ console.log("siap"); });</script>
</body>
</html>`,
  ),
  f(
    "about.html",
    `<html><head><title>Tentang</title><link rel="stylesheet" href="css/style.css"><style>body{margin:0;background:url(img/bg.png)}</style></head>
<body class="about"><h1 id="tim">Tim</h1><a href="index.html">Kembali</a><img src="../img/x.png"></body></html>`,
  ),
  f("blog/index.html", `<html><head><title>Blog</title></head><body><a href="../about.html">Tentang</a><img src="cover.png"></body></html>`),
  f("404.html", `<html><head><title>Hilang</title></head><body><h1>404</h1></body></html>`),
  f("css/style.css", `body{font-family:Inter}`),
  f("js/app.js", `window.addEventListener("load", function(){ window.openModal = function(){}; });`),
  f("img/hero.png", "PNG"),
  f("package.json", `{"name":"x"}`),
  f(".DS_Store", "junk"),
];

test("proyek multi halaman → struktur Next.js 16", () => {
  const out = convertHtmlProject({ files: SITE, projectName: "Toko Kue" });
  const paths = out.files.map((x) => x.path);
  for (const p of [
    "app/layout.tsx", "app/page.tsx", "app/about/page.tsx", "app/blog/page.tsx", "app/not-found.tsx",
    "components/PageScripts.tsx", "package.json", "tsconfig.json", "next.config.mjs", "README.md",
    "public/css/style.css", "public/img/hero.png", "public/js/app.js", "public/_legacy/home-1.js",
  ]) assert.ok(paths.includes(p), `harus ada ${p}`);
  assert.ok(!paths.some((p) => p.includes(".DS_Store")));
  assert.equal(out.files.filter((x) => x.path === "package.json").length, 1, "package.json bawaan proyek tidak boleh menimpa scaffold");
  assert.ok(out.warnings.some((w) => w.includes("package.json")));

  const home = text(out, "app/page.tsx");
  assert.match(home, /import type \{ Metadata \} from "next";/);
  assert.match(home, /title: "Beranda — Toko"/);
  assert.match(home, /description: "Toko kue & roti"/);
  assert.match(home, /images: \[\s*"\/img\/og.png"\s*\]/);
  assert.match(home, /<Link href="\/">Beranda<\/Link>/);
  assert.match(home, /<Link href="\/about#tim">Tentang<\/Link>/);
  assert.match(home, /<Link href="\/blog">Blog<\/Link>/);
  assert.match(home, /<a href="https:\/\/example.com" target="_blank">Luar<\/a>/);
  assert.match(home, /<a href="#kontak">Kontak<\/a>/);
  assert.match(home, /src="\/img\/hero.png"/);
  assert.match(home, /srcSet="\/img\/hero.png 1x, \/img\/hero@2x.png 2x"/);
  assert.match(home, /onClick=\{\(e\) => \{ \(window as any\)\.openModal\('a'\); \}\}/);
  assert.match(home, /<link rel="stylesheet" href="\/css\/style.css" precedence="default" \/>/);
  assert.match(home, /scripts=\{\[\{"src":"\/js\/app.js"\},\{"src":"\/_legacy\/home-1.js"\}\]\}/);
  assert.match(home, /bodyClass="home"/);
  assert.doesNotMatch(home, /<script/);
  assert.doesNotMatch(home, /<style/);

  const about = text(out, "app/about/page.tsx");
  assert.match(about, /src="\/img\/x.png"/);
  assert.match(about, /bodyClass="about"/);
  const blog = text(out, "app/blog/page.tsx");
  assert.match(blog, /<Link href="\/about">Tentang<\/Link>/);
  assert.match(blog, /src="\/blog\/cover.png"/);

  // CSS & stylesheet yang sama di halaman pertama dan kedua naik ke layout, tapi blog/404 tidak punya → tetap per halaman
  const layout = text(out, "app/layout.tsx");
  assert.match(layout, /<html lang="id">/);

  const legacy = text(out, "public/_legacy/home-1.js");
  assert.match(legacy, /__depupReady\(function/);
  const appJs = text(out, "public/js/app.js");
  assert.match(appJs, /__depupLoad\(function/);

  const pkg = JSON.parse(text(out, "package.json"));
  assert.equal(pkg.name, "toko-kue");
  assert.match(pkg.dependencies.next, /16/);
  assert.match(text(out, "app/not-found.tsx"), /export default function NotFound\(\)/);
});

test("proyek satu halaman: CSS inline masuk globals.css yang diimpor layout", () => {
  const out = convertHtmlProject({
    files: [f("index.html", `<html lang="en"><head><title>Hi</title><style>h1{color:red;background:url(a.png)}</style></head><body class="x"><h1>Hai</h1></body></html>`), f("a.png", "x")],
  });
  assert.equal(text(out, "app/globals.css").trim(), "h1{color:red;background:url(/a.png)}");
  const layout = text(out, "app/layout.tsx");
  assert.match(layout, /import "\.\/globals\.css";/);
  assert.match(layout, /<body className="x">\{children\}<\/body>/);
  assert.ok(!out.files.some((x) => x.path === "components/PageScripts.tsx"), "tanpa skrip tidak perlu PageScripts");
});

test("tanpa file html → peringatan, tanpa keluaran", () => {
  const out = convertHtmlProject({ files: [f("a.txt", "x")] });
  assert.equal(out.files.length, 0);
  assert.ok(out.warnings.length > 0);
});

test("rute bentrok dilewati dengan peringatan", () => {
  const out = convertHtmlProject({
    files: [f("about.html", "<body>1</body>"), f("about/index.html", "<body>2</body>")],
  });
  assert.equal(out.pages.length, 1);
  assert.ok(out.warnings.some((w) => w.includes("bentrok")));
});
