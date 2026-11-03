// Jalankan: node --experimental-strip-types --test tests/convert-engine.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { renderJsx } from "../lib/convert/engine/jsx-render.ts";
import { convertFile, canConvert } from "../lib/convert/engine/convert-file.ts";

const LAYOUT = `
import "./globals.css";
import { Inter } from "next/font/google";
const inter = Inter({ subsets: ["latin"] });
export const metadata = { title: "Kopi Senja", description: "Kedai kopi di Bandung" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className={inter.className}>
        <nav><Link href="/">Beranda</Link> <Link href="/menu">Menu</Link></nav>
        {children}
      </body>
    </html>
  );
}
import Link from "next/link";
`;

const DATA = `export const MENU = [
  { name: "Kopi Susu", price: 18000, best: true },
  { name: "Americano", price: 15000 },
];
export const rupiah = (n: number) => "Rp" + n.toLocaleString("id-ID");`;

const CARD = `import { cn } from "@/lib/utils";
type Props = { title: string; price: string; best?: boolean; children?: React.ReactNode };
export function Card({ title, price, best = false, children }: Props) {
  return (
    <div className={cn("card", best && "card-best", { hidden: false })} style={{ padding: 16, borderRadius: 8, zIndex: 2 }}>
      <h3>{title}</h3>
      <p>{price}</p>
      {best ? <span className="tag">Terlaris</span> : null}
      {children}
    </div>
  );
}`;

const PAGE = `"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import hero from "../public/hero.jpg";
import { MENU, rupiah } from "@/lib/data";
import { Card } from "@/components/Card";

export default function Home() {
  const [open, setOpen] = useState(false);
  const total = MENU.length;
  return (
    <main>
      <h1>Ada {total} menu &amp; semuanya enak</h1>
      <Image src={hero} alt="Kedai" width={800} height={400} priority />
      <ul>
        {MENU.map((m) => (
          <li key={m.name}>
            <Card title={m.name} price={rupiah(m.price)} best={m.best}>
              <button onClick={() => setOpen(!open)}>Pesan</button>
            </Card>
          </li>
        ))}
      </ul>
      {open && <p>tidak tampil</p>}
      <Link href="/menu?x=1" className="btn">Lihat menu</Link>
      <input type="checkbox" defaultChecked readOnly />
    </main>
  );
}`;

test("halaman Next.js → HTML statis", () => {
  const r = renderJsx({
    entry: { path: "app/page.tsx", code: PAGE },
    layouts: [{ path: "app/layout.tsx", code: LAYOUT }],
    modules: [
      { path: "lib/data.ts", code: DATA },
      { path: "components/Card.tsx", code: CARD },
    ],
    routeMap: { "/": "index.html", "/menu": "menu/index.html" },
    images: { "../public/hero.jpg": "assets/img/hero.jpg" },
    cssLinks: ["assets/css/globals.css"],
  });
  const h = r.html;
  assert.match(h, /^<!doctype html>/);
  assert.match(h, /<html lang="id">/);
  assert.match(h, /<title>Kopi Senja<\/title>/);
  assert.match(h, /<meta name="description" content="Kedai kopi di Bandung">/);
  assert.match(h, /<link rel="stylesheet" href="assets\/css\/globals.css">/);
  assert.match(h, /<a href="menu\/index.html">Menu<\/a>/);
  assert.match(h, /<h1>Ada 2 menu &amp; semuanya enak<\/h1>/);
  assert.match(h, /<img alt="Kedai" width="800" height="400" src="assets\/img\/hero.jpg"/);
  assert.match(h, /<div class="card card-best" style="padding:16px;border-radius:8px;z-index:2"><h3>Kopi Susu<\/h3><p>Rp18.000<\/p><span class="tag">Terlaris<\/span><button>Pesan<\/button><\/div>/);
  assert.match(h, /<h3>Americano<\/h3><p>Rp15.000<\/p><button>/);
  assert.doesNotMatch(h, /tidak tampil/);
  assert.match(h, /<a class="btn" href="menu\/index.html\?x=1">Lihat menu<\/a>/);
  assert.match(h, /<input type="checkbox" checked readonly>/);
  assert.ok(r.warnings.some((w) => /Event handler/.test(w)));
  assert.ok(r.warnings.some((w) => /next\/font/.test(w)));
});

test("pasangan yang didukung", () => {
  assert.ok(canConvert("json", "yaml"));
  assert.ok(canConvert("tsx", "html"));
  assert.ok(!canConvert("py", "rs"));
});

test("data: JSON ↔ YAML ↔ TOML ↔ XML", async () => {
  const json = '{"name":"depup","port":3000,"tags":["a","b"],"db":{"host":"localhost"}}';
  const y = (await convertFile("json", "yaml", json, "c.json")).code;
  assert.match(y, /name: depup\nport: 3000\ntags:\n  - a\n  - b\ndb:\n  host: localhost/);
  const t = (await convertFile("yaml", "toml", y, "c.yaml")).code;
  assert.match(t, /name = "depup"/);
  assert.match(t, /\[db\]\nhost = "localhost"/);
  const back = JSON.parse((await convertFile("toml", "json", t, "c.toml")).code);
  assert.deepEqual(back, JSON.parse(json));
  const x = (await convertFile("json", "xml", '{"config":{"name":"depup"}}', "c.json")).code;
  assert.match(x, /<config>\s*<name>depup<\/name>\s*<\/config>/);
  await assert.rejects(() => convertFile("json", "yaml", "{rusak", "c.json"));
});

test("TS → JS dan JS → TS", async () => {
  const js = (await convertFile("ts", "js", "interface A { x: number }\nexport const f = (a: number): number => a * 2;\nenum E { A }\n", "a.ts")).code;
  assert.doesNotMatch(js, /interface|: number/);
  assert.match(js, /export const f = \(a\) => a \* 2;/);
  const tsx = (await convertFile("tsx", "jsx", "export default function A({ n }: { n: number }) { return <b>{n}</b>; }", "a.tsx")).code;
  assert.match(tsx, /export default function A\(\{ n \}\) \{ return <b>\{n\}<\/b>; \}/);
  const ts = (await convertFile("js", "ts", "export function add(a, b = 1, ...rest) { return a + b; }\nconst sq = x => x * x;", "a.js")).code;
  assert.match(ts, /add\(a: any, b: any = 1, \.\.\.rest: any\[\]\)/);
  assert.match(ts, /const sq = \(x: any\) => x \* x;/);
});

test("SCSS → CSS, Markdown ↔ HTML, HTML → JSX", async () => {
  const css = (await convertFile("scss", "css", "$c: red;\n.a { color: $c; .b { margin: 0; } }", "s.scss")).code;
  assert.match(css, /\.a \{\n  color: red;\n\}\n\.a \.b \{\n  margin: 0;\n\}/);
  const html = (await convertFile("md", "html", "# Judul\n\nHalo **dunia**", "r.md")).code;
  assert.match(html, /<title>Judul<\/title>/);
  assert.match(html, /<p>Halo <strong>dunia<\/strong><\/p>/);
  const md = (await convertFile("html", "md", "<body><h2>Sub</h2><p>Teks <em>miring</em></p><script>x()</script></body>", "a.html")).code;
  assert.equal(md, "## Sub\n\nTeks _miring_\n");
  const jsx = (await convertFile("html", "jsx", '<div class="a" style="color: red"><label for="x">X</label><br></div>', "tentang-kami.html")).code;
  assert.match(jsx, /export default function TentangKami\(\)/);
  assert.match(jsx, /className="a"/);
  assert.match(jsx, /htmlFor="x"/);
});

test("alur proyek lengkap: analyzeNextProject → renderJsx", async () => {
  const { analyzeNextProject } = await import("../lib/convert/next-to-html.ts");
  const enc = new TextEncoder();
  const f = (path, text) => ({ path, data: enc.encode(text) });
  const a = analyzeNextProject([
    f("package.json", `{"dependencies":{"next":"14.0.0"}}`),
    f("app/layout.tsx", `import "./globals.css";\nimport Nav from "@/components/Nav";\nexport default function L({children}){return <html><body><Nav/>{children}</body></html>}`),
    f("app/globals.css", `body{margin:0}`),
    f("app/page.tsx", `import Link from "next/link";\nimport {items} from "@/data/items";\nexport default function Home(){return <main>{items.map(i => <p key={i}>Item {i}</p>)}<Link href="/about">About</Link></main>}`),
    f("app/about/page.tsx", `export default function A(){return <h1>About</h1>}`),
    f("components/Nav.tsx", `import styles from "./nav.module.css";\nexport default function Nav(){return <nav className={styles.nav}>Nav</nav>}`),
    f("components/nav.module.css", `.nav{display:flex}`),
    f("data/items.ts", `export const items=[1,2]`),
  ]);
  const home = a.jobs.find((j) => j.route === "/");
  const isLayout = (p) => /(^|\/)layout\.tsx$/.test(p);
  const r = renderJsx({
    entry: { path: home.sourcePath, code: home.code },
    layouts: home.context.filter((c) => isLayout(c.path)),
    modules: home.context.filter((c) => !isLayout(c.path)),
    routeMap: home.routeMap,
    cssLinks: home.cssLinks,
  });
  assert.match(r.html, /<nav class="nav">Nav<\/nav><main><p>Item 1<\/p><p>Item 2<\/p><a href="about\/index.html">About<\/a><\/main>/);
  assert.match(r.html, /<style>\.nav\{display:flex\}<\/style>/);
});
