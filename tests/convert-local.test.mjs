// Menjaga konverter lokal (tanpa AI) tetap benar: file sederhana + render statis Next.js → HTML.
// Jalankan: npm run test:convert
import test from "node:test";
import assert from "node:assert/strict";
import { convertFileLocal, canConvertLocal, localTargets, whyNotLocal } from "../lib/convert/local/simple.ts";
import { renderPage, renderComponentFile, prettyHtml } from "../lib/convert/local/jsx-render.ts";
import { analyzeNextProject } from "../lib/convert/next-to-html.ts";

const enc = new TextEncoder();
const f = (path, text) => ({ path, data: enc.encode(text) });
const conv = (from, to, code, path = `x.${from}`) => convertFileLocal({ from, to, code, path });

/* ---------------- konverter file ---------------- */

test("pasangan yang didukung dan yang tidak", () => {
  assert.ok(canConvertLocal("ts", "js"));
  assert.ok(canConvertLocal("json", "yaml"));
  assert.ok(!canConvertLocal("py", "js"));
  assert.ok(!canConvertLocal("js", "py"));
  assert.deepEqual(localTargets("md"), ["html"]);
  assert.deepEqual(localTargets("py"), []);
  assert.match(whyNotLocal("py", "js"), /tanpa AI/);
  assert.match(whyNotLocal("scss", "css"), /Sass/);
});

test("pasangan tak didukung ditolak dengan pesan jelas", async () => {
  await assert.rejects(conv("py", "js", "print(1)"), /Tidak ada konverter lokal/);
});

test("ts → js membuang tipe, interface, dan import type", async () => {
  const { code } = await conv("ts", "js", `import type { A } from "./a";\ninterface P { n: number }\nexport function f(p: P, x?: string): number { return p.n as number; }\nconst y = <T,>(v: T) => v;`);
  assert.ok(!/interface|: number|import type|<T/.test(code), code);
  assert.match(code, /export function f\(p, x\)/);
  assert.ok(!code.startsWith("\n"));
});

test("tsx → jsx mempertahankan JSX", async () => {
  const { code } = await conv("tsx", "jsx", `import type { FC } from "react";\nexport const Card: FC<{ title: string }> = ({ title }) => <div className="c">{title as string}</div>;`);
  assert.match(code, /<div className="c">/);
  assert.ok(!/FC|as string/.test(code), code);
});

test("jsx → js memakai React.createElement", async () => {
  const { code, warnings } = await conv("jsx", "js", `export const A = () => <b>hi</b>;`);
  assert.match(code, /React\.createElement/);
  assert.ok(warnings.length > 0);
});

test("js → ts hanya ganti ekstensi dengan peringatan", async () => {
  const { code, warnings } = await conv("js", "ts", `const a = 1;\n`);
  assert.equal(code, "const a = 1;\n");
  assert.match(warnings[0], /tipe/i);
});

test("json ↔ yaml ↔ toml bolak-balik tetap sama", async () => {
  const data = { name: "depup", list: [1, 2, { a: true }], nested: { k: "v" } };
  const yaml = (await conv("json", "yaml", JSON.stringify(data))).code;
  assert.match(yaml, /name: depup/);
  const back = JSON.parse((await conv("yaml", "json", yaml)).code);
  assert.deepEqual(back, data);
  const toml = (await conv("json", "toml", JSON.stringify({ title: "x", owner: { name: "Ival" } }))).code;
  assert.match(toml, /\[owner\]/);
  assert.deepEqual(JSON.parse((await conv("toml", "json", toml)).code), { title: "x", owner: { name: "Ival" } });
});

test("TOML menolak array di level atas; JSON rusak memberi pesan", async () => {
  await assert.rejects(conv("json", "toml", "[1,2]"), /TOML butuh objek/);
  await assert.rejects(conv("json", "yaml", "{bad"), /tidak valid/);
});

test("xml ↔ json menjaga atribut dan teks", async () => {
  const json = JSON.parse((await conv("xml", "json", `<?xml version="1.0"?><site lang="id"><title>Halo</title><item>a</item><item>b</item></site>`)).code);
  assert.equal(json.site["@_lang"], "id");
  assert.equal(json.site.title, "Halo");
  assert.deepEqual(json.site.item, ["a", "b"]);
  const xml = (await conv("json", "xml", JSON.stringify(json))).code;
  assert.match(xml, /<site lang="id">/);
  assert.match(xml, /<title>Halo<\/title>/);
});

test("xml tidak valid ditolak; json banyak kunci dibungkus <root>", async () => {
  await assert.rejects(conv("xml", "json", "<a><b></a>"), /XML tidak valid/);
  const r = await conv("json", "xml", `{"a":1,"b":2}`);
  assert.match(r.code, /<root>/);
  assert.ok(r.warnings.some((w) => /akar/.test(w)));
});

test("markdown → html dan html → markdown", async () => {
  const html = (await conv("md", "html", "# Judul\n\nIni **tebal** dan [link](https://x.id)\n\n- a\n- b\n")).code;
  assert.match(html, /<title>Judul<\/title>/);
  assert.match(html, /<strong>tebal<\/strong>/);
  assert.match(html, /<li>a<\/li>/);
  const md = (await conv("html", "md", `<html><head><title>T</title><style>a{}</style></head><body><h1>Halo</h1><p>Teks <b>tebal</b> <a href="/x">link</a></p><ul><li>a</li></ul><script>1</script></body></html>`)).code;
  assert.match(md, /^# Halo/);
  assert.match(md, /\*\*tebal\*\*/);
  assert.match(md, /\[link\]\(\/x\)/);
  assert.match(md, /^- a$/m);
  assert.ok(!/script|a\{\}/.test(md));
});

test("html → tsx menghasilkan komponen yang valid", async () => {
  const { code } = await conv("html", "tsx", `<html><body><div class="a" style="color:red"><h1>Halo</h1><img src="a.png" alt="x"><br></div></body></html>`);
  assert.match(code, /export default function Page\(\)/);
  assert.match(code, /className="a"/);
  assert.match(code, /style=\{\{ color: "red" \}\}/);
  assert.match(code, /<br \/>/);
});

test("html → vue / svelte / astro / blade", async () => {
  const html = `<html><head><style>.a{color:red}</style></head><body><div class="a">Hai</div></body></html>`;
  const vue = (await conv("html", "vue", html)).code;
  assert.match(vue, /^<template>\n {2}<div class="a">Hai<\/div>\n<\/template>/);
  assert.match(vue, /<style>\.a\{color:red\}<\/style>/);
  assert.match((await conv("html", "svelte", html)).code, /<div class="a">Hai<\/div>/);
  assert.match((await conv("html", "astro", html)).code, /^---\n---\n/);
  assert.equal((await conv("html", "blade", html)).code, html);
  const warn = (await conv("html", "blade", `<p>@if x {{ y }}</p>`)).warnings;
  assert.ok(warn.length > 0);
});

/* ---------------- render statis ---------------- */

const renderAll = async (files) => {
  const a = analyzeNextProject(files);
  const out = {};
  for (const j of a.jobs) {
    out[j.outPath] = await renderPage({
      router: j.router, route: j.route, page: { path: j.sourcePath, code: j.code }, layouts: j.layouts, files: j.context, resolved: j.resolved,
      routeMap: j.routeMap, assetPrefix: j.assetPrefix, cssLinks: j.cssLinks, imageImports: j.imageImports, tailwind: j.tailwind,
    });
  }
  return { a, out };
};

const appProject = () => [
  f("package.json", `{"dependencies":{"next":"15.0.0","react":"19","tailwindcss":"3"}}`),
  f("tsconfig.json", `{"compilerOptions":{"paths":{"@/*":["./*"]}}}`),
  f("tailwind.config.ts", `import type { Config } from "tailwindcss";\nconst config: Config = { content: ["./app/**/*.tsx"], theme: { extend: { colors: { brand: "#7b50ff" } } }, plugins: [] };\nexport default config;`),
  f("app/globals.css", `@tailwind base;\n@tailwind components;\n@tailwind utilities;\nbody{margin:0}`),
  f("app/layout.tsx", `import "./globals.css";\nimport type { Metadata } from "next";\nimport { Inter } from "next/font/google";\nimport Navbar from "@/components/Navbar";\nconst inter = Inter({ subsets: ["latin"], variable: "--font-inter" });\nexport const metadata: Metadata = { title: { default: "Depup Demo", template: "%s | Depup" }, description: "Situs contoh" };\nexport default function RootLayout({ children }: { children: React.ReactNode }) {\n  return (\n    <html lang="id" className={inter.variable}>\n      <body className={\`\${inter.className} bg-white\`}>\n        <Navbar />\n        <main>{children}</main>\n        <footer>© {new Date().getFullYear()} Depup</footer>\n      </body>\n    </html>\n  );\n}`),
  f("components/Navbar.tsx", `import Link from "next/link";\nimport Image from "next/image";\nimport logo from "@/public/logo.png";\nconst links = [{ href: "/", label: "Beranda" }, { href: "/about", label: "Tentang" }, { href: "https://github.com/x", label: "GitHub" }];\nexport default function Navbar() {\n  return (\n    <nav className="flex gap-4">\n      <Image src={logo} alt="Logo" width={32} height={32} priority />\n      {links.map((l) => (\n        <Link key={l.href} href={l.href} className="hover:underline">{l.label}</Link>\n      ))}\n    </nav>\n  );\n}`),
  f("app/page.tsx", `"use client";\nimport { useState } from "react";\nimport Hero from "@/components/Hero";\nimport Features from "@/components/Features";\nexport const metadata = { title: "Beranda" };\nexport default function Home() {\n  const [count, setCount] = useState(3);\n  const show = count > 2;\n  return (\n    <>\n      <Hero title="Selamat datang" subtitle={\`Sudah \${count} kali dilihat\`} cta={{ href: "/about", text: "Pelajari" }} />\n      {show && <p className="note">Banner tampil</p>}\n      {!show ? <span>sembunyi</span> : <span>terlihat</span>}\n      <button onClick={() => setCount(count + 1)} className="btn" disabled={false} style={{ marginTop: 8, opacity: 0.5, backgroundColor: "red" }}>Tambah</button>\n      <Features />\n    </>\n  );\n}`),
  f("components/Hero.tsx", `import Link from "next/link";\nimport styles from "./Hero.module.css";\ninterface Props { title: string; subtitle?: string; cta?: { href: string; text: string }; }\nexport default function Hero({ title, subtitle = "default", cta }: Props) {\n  return (\n    <section className={styles.hero}>\n      <h1 className={styles.title}>{title}</h1>\n      {subtitle && <p>{subtitle}</p>}\n      {cta ? <Link href={cta.href}>{cta.text}</Link> : null}\n    </section>\n  );\n}`),
  f("components/Hero.module.css", `.hero { padding: 40px; }\n.title { font-size: 40px; }`),
  f("components/Features.tsx", `import clsx from "clsx";\nimport { features } from "@/lib/data";\nexport default function Features() {\n  const active = features.filter((x) => x.on);\n  return (\n    <ul>\n      {active.map((x, i) => (\n        <li key={x.id} className={clsx("item", { first: i === 0, last: i === active.length - 1 })}>\n          <strong>{x.name.toUpperCase()}</strong> — {x.desc}\n          {x.tags.length > 0 && <em> ({x.tags.join(", ")})</em>}\n        </li>\n      ))}\n      <li>Total: {active.length} fitur &amp; lainnya</li>\n    </ul>\n  );\n}`),
  f("lib/data.ts", `export const features = [\n  { id: 1, name: "Deploy", desc: "Cepat", on: true, tags: ["web", "cdn"] },\n  { id: 2, name: "Domain", desc: "Mudah", on: false, tags: [] },\n  { id: 3, name: "Upload", desc: "Zip & folder", on: true, tags: [] },\n];`),
  f("app/about/page.tsx", `export default async function About() {\n  const data = await fetch("https://api.example.com/x").then((r) => r.json());\n  return <div><h1>Tentang</h1><p>{data.title}</p><a href="/">Kembali</a><img src="/logo.png" alt="l" /></div>;\n}`),
  f("public/logo.png", "PNGDATA"),
];

test("App Router: layout, komponen, data, metadata, tautan, aset", async () => {
  const { out } = await renderAll(appProject());
  assert.deepEqual(Object.keys(out).sort(), ["about/index.html", "index.html"]);
  const h = out["index.html"].html;
  assert.match(h, /^<!DOCTYPE html>/);
  assert.match(h, /<html lang="id">/);
  assert.match(h, /<title>Beranda \| Depup<\/title>/);
  assert.match(h, /<meta name="description" content="Situs contoh">/);
  assert.match(h, /<body class="bg-white">/);
  // komponen + props + default value + template literal
  assert.match(h, /<h1 class="title">Selamat datang<\/h1>/);
  assert.match(h, /<p>Sudah 3 kali dilihat<\/p>/);
  // && dan ternary memakai nilai awal state
  assert.match(h, /<p class="note">Banner tampil<\/p>/);
  assert.match(h, /<span>terlihat<\/span>/);
  assert.ok(!h.includes("sembunyi"));
  // map + filter + clsx + method string/array
  assert.match(h, /<li class="item first"><strong>DEPLOY<\/strong> — Cepat<em> \(web, cdn\)<\/em><\/li>/);
  assert.match(h, /<li class="item last"><strong>UPLOAD<\/strong>/);
  assert.ok(!h.includes("DOMAIN"));
  assert.match(h, /Total: 2 fitur &amp; lainnya/);
  // tautan internal → file, eksternal tetap, gambar statis → aset
  assert.match(h, /<a class="hover:underline" href="about\/index\.html">Tentang<\/a>/);
  assert.match(h, /href="https:\/\/github\.com\/x"/);
  assert.match(h, /<img src="assets\/img\/logo\.png" alt="Logo" width="32" height="32">/);
  // handler dibuang, style objek jadi CSS, atribut boolean false hilang
  assert.ok(!/onClick|disabled/.test(h));
  assert.match(h, /style="margin-top: 8px; opacity: 0\.5; background-color: red"/);
  // CSS module, font, tailwind
  assert.match(h, /\.hero \{ padding: 40px; \}/);
  assert.match(h, /fonts\.googleapis\.com\/css2\?family=Inter/);
  assert.match(h, /--font-inter: 'Inter', sans-serif/);
  assert.match(h, /cdn\.tailwindcss\.com/);
  assert.match(h, /tailwind\.config = \{"theme":\{"extend":\{"colors":\{"brand":"#7b50ff"\}\}\}\}/);
  assert.match(h, /<link rel="stylesheet" href="assets\/css\/globals\.css">/);
  assert.match(h, new RegExp(`© ${new Date().getFullYear()} Depup`));
  assert.ok(out["index.html"].warnings.some((w) => /Interaksi/.test(w)));
});

test("halaman bersarang: path relatif benar dan data fetch dilewati dengan catatan", async () => {
  const { out } = await renderAll(appProject());
  const h = out["about/index.html"].html;
  assert.match(h, /<title>Depup Demo<\/title>/);
  assert.match(h, /href="\.\.\/assets\/css\/globals\.css"/);
  assert.match(h, /<a href="\.\.\/index\.html">Kembali<\/a>/);
  assert.match(h, /<img src="\.\.\/logo\.png" alt="l">/);
  assert.match(h, /<h1>Tentang<\/h1>/);
  assert.ok(out["about/index.html"].warnings.some((w) => /fetch/.test(w)));
});

test("Pages Router: _app, next/head, getStaticProps", async () => {
  const { out } = await renderAll([
    f("package.json", `{"dependencies":{"next":"14.2.0","react":"18"}}`),
    f("pages/_app.tsx", `import type { AppProps } from "next/app";\nimport "../styles/g.css";\nexport default function App({ Component, pageProps }: AppProps) { return <div id="app"><Component {...pageProps} /></div>; }`),
    f("styles/g.css", `body{margin:0}`),
    f("pages/index.tsx", `import Head from "next/head";\nexport async function getStaticProps() { return { props: {} }; }\nexport default function Home() { return (<><Head><title>Hai</title></Head><h1>Halo</h1></>); }`),
  ]);
  const h = out["index.html"].html;
  assert.match(h, /<title>Hai<\/title>/);
  assert.match(h, /<div id="app">\s*<h1>Halo<\/h1>\s*<\/div>/);
  assert.ok(out["index.html"].warnings.some((w) => /getStaticProps/.test(w)));
});

test("atribut & JSX: className/htmlFor/svg, spasi JSX, escape, dangerouslySetInnerHTML", async () => {
  const code = `export default function C() {
  const items = ["a", "<b>"];
  return (
    <div className={"x " + (1 > 0 ? "on" : "off")} data-id={7} aria-hidden>
      <label htmlFor="n" tabIndex={0}>Nama</label>
      <input id="n" defaultValue="v" readOnly />
      <svg viewBox="0 0 10 10" strokeWidth={2} fillRule="evenodd"><path d="M0 0" strokeLinecap="round" /></svg>
      <p>
        baris satu
        baris dua {" "}
        <b>tebal</b>
      </p>
      <ul>{items.map((t, i) => <li key={i}>{i}: {t}</li>)}</ul>
      <div dangerouslySetInnerHTML={{ __html: "<i>raw</i>" }} />
      {false}{null}{undefined}{0}
    </div>
  );
}`;
  const r = await renderComponentFile("c.tsx", code);
  const h = r.html;
  assert.match(h, /<div class="x on" data-id="7" aria-hidden="true">/);
  assert.match(h, /<label for="n" tabindex="0">Nama<\/label>/);
  assert.match(h, /<input id="n" value="v" readonly>/);
  assert.match(h, /stroke-width="2"/);
  assert.match(h, /fill-rule="evenodd"/);
  assert.match(h, /stroke-linecap="round"/);
  assert.match(h, /viewBox="0 0 10 10"/);
  assert.match(h, /baris satu baris dua <b>tebal<\/b>/);
  assert.match(h, /<li>1: &lt;b&gt;<\/li>/);
  assert.match(h, /<i>raw<\/i>/);
  assert.match(h, /0\s*<\/div>/);
});

test("kode jahat tidak dieksekusi dan tidak membuat render macet", async () => {
  globalThis.__pwned = undefined;
  const bad = `
import fs from "fs";
export default function X() {
  const a = [].constructor.constructor("globalThis.__pwned = 1")();
  const b = globalThis;
  const c = process.exit;
  eval("globalThis.__pwned = 2");
  while (true) {}
}`;
  const r = await renderComponentFile("x.tsx", bad).catch((e) => ({ error: e.message }));
  assert.equal(globalThis.__pwned, undefined);
  assert.ok(r.error || r.warnings.length >= 0);
  const rec = await renderComponentFile("y.tsx", `function f() { return f(); }\nexport default function Y() { return <p>ok{f()}</p>; }`).catch((e) => ({ error: e.message }));
  assert.ok(rec.error || /<p>ok<\/p>/.test(rec.html));
  const loop = await renderComponentFile("z.tsx", `export default function Z() { let i = 0; while (true) { i++; } return <p>x</p>; }`).catch((e) => ({ error: e.message }));
  assert.ok(loop.error, "loop tak terbatas harus berhenti dengan error");
  assert.equal(globalThis.__pwned, undefined);
});

test("komponen/paket tak dikenal dilewati dengan catatan, bukan menggagalkan halaman", async () => {
  const r = await renderComponentFile("p.tsx", `import { Rocket } from "lucide-react";\nimport Missing from "./nope";\nexport default function P() { return <main><h1>Judul</h1><Rocket className="i" /><Missing /><p>sisa</p></main>; }`);
  assert.match(r.html, /<h1>Judul<\/h1>/);
  assert.match(r.html, /<p>sisa<\/p>/);
  assert.ok(r.warnings.some((w) => /lucide-react/.test(w)));
  assert.ok(r.warnings.some((w) => /nope/.test(w)));
});

test("prettyHtml: indentasi, elemen pendek satu baris, script/style/pre utuh", () => {
  const out = prettyHtml(`<div><ul><li>a</li><li>b <b>x</b></li></ul><pre>  a\n b</pre><script>var a = 1;</script></div>`);
  assert.match(out, /<ul>\n\s+<li>a<\/li>\n\s+<li>b <b>x<\/b><\/li>\n\s+<\/ul>/);
  assert.match(out, /<pre>  a\n b<\/pre>/);
  assert.match(out, /<script>\n\s+var a = 1;\n\s*<\/script>/);
});
