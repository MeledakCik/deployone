// Jalankan: node --experimental-strip-types --test tests/convert-next.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { analyzeNextProject, detectNext, relHref, importSpecs } from "../lib/convert/next-to-html.ts";
import { langOfPath, targetPath, customTarget, guessLangFromCode, langById } from "../lib/convert/languages.ts";

const enc = new TextEncoder();
const f = (path, text) => ({ path, data: enc.encode(text) });

const PROJECT = [
  f("package.json", `{"dependencies":{"next":"16.0.0","tailwindcss":"4"}}`),
  f("tsconfig.json", `{ // komentar\n "compilerOptions": {"paths": {"@/*": ["./*"]}} }`),
  f("app/layout.tsx", `import "./globals.css";\nimport Nav from "@/components/Nav";\nexport default function L({children}){return <html><body><Nav/>{children}</body></html>}`),
  f("app/globals.css", `@import "tailwindcss";\nbody{margin:0}`),
  f("app/page.tsx", `import Link from "next/link";\nimport logo from "@/public-src/logo.png";\nimport {items} from "@/data/items";\nexport default function Home(){return <Link href="/about">About</Link>}`),
  f("app/about/page.tsx", `export default function A(){return <h1>About</h1>}`),
  f("app/(shop)/produk/[id]/page.tsx", `export default function P(){return null}`),
  f("app/@modal/page.tsx", `export default function M(){return null}`),
  f("components/Nav.tsx", `import styles from "./nav.module.css";\nexport default function Nav(){return <nav className={styles.nav}/>}`),
  f("components/nav.module.css", `.nav{display:flex}`),
  f("data/items.ts", `export const items=[1,2]`),
  f("public-src/logo.png", "PNG"),
  f("public/robots.txt", "User-agent: *"),
  f("tailwind.config.ts", `export default {content:[]}`),
];

test("deteksi router", () => {
  assert.equal(detectNext(PROJECT), "app");
  assert.equal(detectNext([f("a.html", "x")]), null);
  assert.equal(detectNext([f("next.config.js", ""), f("pages/index.tsx", "")]), "pages");
});

test("analisis proyek app router", () => {
  const a = analyzeNextProject(PROJECT);
  assert.deepEqual(a.jobs.map((j) => j.outPath).sort(), ["about/index.html", "index.html"]);
  assert.equal(a.skipped.length, 2);
  assert.ok(a.skipped.some((s) => s.reason.includes("dinamis")));
  assert.ok(a.tailwind);
  const home = a.jobs.find((j) => j.route === "/");
  assert.deepEqual(home.context.map((c) => c.path).sort(), ["app/layout.tsx", "components/Nav.tsx", "components/nav.module.css", "data/items.ts", "tailwind.config.ts"].sort());
  assert.deepEqual(home.cssLinks, ["assets/css/globals.css"]);
  assert.equal(home.routeMap["/about"], "about/index.html");
  assert.match(home.imageImports[0], /assets\/img\/logo\.png/);
  const about = a.jobs.find((j) => j.route === "/about");
  assert.equal(about.assetPrefix, "../");
  assert.deepEqual(about.cssLinks, ["../assets/css/globals.css"]);
  const paths = a.staticFiles.map((s) => s.path);
  assert.ok(paths.includes("robots.txt") && paths.includes("assets/css/globals.css") && paths.includes("assets/img/logo.png"));
  const css = a.staticFiles.find((s) => s.path === "assets/css/globals.css").data;
  assert.doesNotMatch(css, /tailwindcss/);
  assert.match(css, /margin:0/);
});

test("relHref dan importSpecs", () => {
  assert.equal(relHref("a/index.html", "index.html"), "../index.html");
  assert.equal(relHref("index.html", "a/index.html"), "a/index.html");
  assert.equal(relHref("a/b/index.html", "a/c/index.html"), "../c/index.html");
  assert.deepEqual(importSpecs(`import a from "./a";\nimport "./x.css";\nconst b = require('b');\nexport * from "../c"`), ["./a", "./x.css", "b", "../c"]);
});

test("bahasa: deteksi & nama hasil", () => {
  assert.equal(langOfPath("src/App.tsx").id, "tsx");
  assert.equal(langOfPath("a/x.blade.php").id, "blade");
  assert.equal(langOfPath("types.d.ts"), undefined);
  assert.equal(langOfPath("img.png"), undefined);
  assert.equal(targetPath("src/util.js", { ...customTarget("Python", "py") }), "src/util.py");
  assert.equal(targetPath("a/x.blade.php", customTarget("HTML", "html")), "a/x.html");
  assert.equal(customTarget("Elixir", ".ex").ext, "ex");
  assert.equal(guessLangFromCode("<!DOCTYPE html><html></html>").id, "html");
  assert.equal(guessLangFromCode("def f(x):\n  return x").id, "py");
  assert.equal(guessLangFromCode('{"a":1}').id, "json");
  assert.equal(langById("go").ext, "go");
});
