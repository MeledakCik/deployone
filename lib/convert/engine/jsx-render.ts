/**
 * Penerjemah JSX statis milik Depup: komponen React / halaman Next.js → HTML, TANPA AI dan tanpa menjalankan
 * kode pengguna. Kode dibaca sebagai AST (@babel/parser) lalu dievaluasi oleh interpreter kecil yang hanya
 * mengenal bagian bahasa yang aman dan bisa dihitung saat konversi:
 *   - literal, template string, objek/array (termasuk spread), operator aritmetika/logika/perbandingan, ternary;
 *   - const/let, fungsi & arrow function lokal (dengan parameter, destrukturisasi, nilai bawaan);
 *   - method array/string umum (map, filter, slice, join, find, includes, toUpperCase, ...), Object.keys/values/entries;
 *   - komponen lokal (di file yang sama atau yang di-import), props & children, fragment;
 *   - hook React diperlakukan statis (useState → nilai awal, useMemo → dihitung sekali, efek diabaikan);
 *   - komponen Next.js: Link → <a>, Image → <img>, Script → <script>, metadata → <title>/<meta>.
 * Bagian yang tidak bisa dihitung tanpa menjalankan aplikasi (fetch, state dari klik, library pihak ketiga) dicatat
 * sebagai peringatan dan dilewati, bukan ditebak.
 */
import { parse } from "@babel/parser";

type Node = any;

export interface RenderModule {
  path: string;
  code: string;
}

export interface RenderInput {
  /** Halaman atau komponen yang dirender (export default). */
  entry: RenderModule;
  /** Layout (terluar dulu). Masing-masing menerima children = hasil halaman. */
  layouts?: RenderModule[];
  /** File lain yang bisa di-import (komponen, data). */
  modules?: RenderModule[];
  /** Rute internal → href hasil (mis. "/about" → "about/index.html"). */
  routeMap?: Record<string, string>;
  /** Import gambar: spec → href. */
  images?: Record<string, string>;
  cssLinks?: string[];
  tailwind?: boolean;
  /** Bungkus jadi dokumen HTML lengkap (default true). */
  document?: boolean;
  title?: string;
}

export interface RenderResult {
  html: string;
  warnings: string[];
}

/* ---------------- nilai khusus ---------------- */

const UNKNOWN = Symbol("tidak-diketahui");
const SKIP = Symbol("lewati");

class Html {
  readonly s: string;
  constructor(s: string) {
    this.s = s;
  }
}

interface Fn {
  __fn: true;
  name: string;
  call: (args: unknown[]) => unknown;
}

const isFn = (v: unknown): v is Fn => !!v && typeof v === "object" && (v as Fn).__fn === true;

function mkFn(name: string, call: (args: unknown[]) => unknown): Fn {
  return { __fn: true, name, call };
}

/* ---------------- lingkup ---------------- */

class Scope {
  vars = new Map<string, unknown>();
  parent: Scope | null;
  constructor(parent: Scope | null = null) {
    this.parent = parent;
  }
  get(name: string): unknown {
    let s: Scope | null = this;
    while (s) {
      if (s.vars.has(name)) return s.vars.get(name);
      s = s.parent;
    }
    return UNKNOWN;
  }
  has(name: string): boolean {
    let s: Scope | null = this;
    while (s) {
      if (s.vars.has(name)) return true;
      s = s.parent;
    }
    return false;
  }
  set(name: string, v: unknown) {
    this.vars.set(name, v);
  }
}

class Return {
  value: unknown;
  constructor(value: unknown) {
    this.value = value;
  }
}

/* ---------------- HTML ---------------- */

const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);
const BOOL_ATTR = new Set(["disabled", "checked", "readonly", "required", "autofocus", "autoplay", "controls", "loop", "muted", "playsinline", "multiple", "selected", "hidden", "open", "novalidate", "defer", "async", "allowfullscreen", "default", "reversed", "itemscope", "nomodule"]);
const ATTR_MAP: Record<string, string> = {
  className: "class", htmlFor: "for", tabIndex: "tabindex", readOnly: "readonly", maxLength: "maxlength", minLength: "minlength",
  autoComplete: "autocomplete", autoFocus: "autofocus", autoPlay: "autoplay", playsInline: "playsinline", crossOrigin: "crossorigin",
  srcSet: "srcset", encType: "enctype", noValidate: "novalidate", colSpan: "colspan", rowSpan: "rowspan", acceptCharset: "accept-charset",
  httpEquiv: "http-equiv", charSet: "charset", contentEditable: "contenteditable", spellCheck: "spellcheck", dateTime: "datetime",
  frameBorder: "frameborder", allowFullScreen: "allowfullscreen", referrerPolicy: "referrerpolicy", fetchPriority: "fetchpriority",
  strokeWidth: "stroke-width", strokeLinecap: "stroke-linecap", strokeLinejoin: "stroke-linejoin", fillRule: "fill-rule", clipRule: "clip-rule",
  viewBox: "viewBox", xmlnsXlink: "xmlns:xlink", xlinkHref: "xlink:href", stopColor: "stop-color", stopOpacity: "stop-opacity",
  strokeDasharray: "stroke-dasharray", strokeDashoffset: "stroke-dashoffset", strokeOpacity: "stroke-opacity", fillOpacity: "fill-opacity",
  textAnchor: "text-anchor", dominantBaseline: "dominant-baseline", fontSize: "font-size", fontWeight: "font-weight", fontFamily: "font-family",
};
const UNITLESS = new Set(["opacity", "zIndex", "fontWeight", "lineHeight", "flex", "flexGrow", "flexShrink", "order", "zoom", "gridRow", "gridColumn", "aspectRatio", "scale"]);

const escText = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escAttr = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

function styleToCss(v: unknown): string {
  if (!v || typeof v !== "object") return typeof v === "string" ? v : "";
  return Object.entries(v as Record<string, unknown>)
    .filter(([, x]) => x !== null && x !== undefined && x !== false && x !== UNKNOWN)
    .map(([k, x]) => {
      const prop = k.startsWith("--") ? k : k.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase()).replace(/^ms-/, "-ms-");
      const val = typeof x === "number" && x !== 0 && !UNITLESS.has(k) ? `${x}px` : String(x);
      return `${prop}:${val}`;
    })
    .join(";");
}

/** Gabungkan helper className populer (clsx/cn/classnames/twMerge) secara statis. */
function classJoin(args: unknown[]): string {
  const out: string[] = [];
  const add = (v: unknown) => {
    if (!v || v === UNKNOWN) return;
    if (typeof v === "string" || typeof v === "number") out.push(String(v));
    else if (Array.isArray(v)) v.forEach(add);
    else if (typeof v === "object") for (const [k, on] of Object.entries(v as Record<string, unknown>)) if (on && on !== UNKNOWN) out.push(k);
  };
  args.forEach(add);
  return out.join(" ");
}

/* ======================================================================== */

export function renderJsx(input: RenderInput): RenderResult {
  const warnings = new Set<string>();
  const warn = (m: string) => warnings.add(m);
  const routeMap = input.routeMap ?? {};
  const images = input.images ?? {};
  const head: string[] = [];
  const bodyScripts: string[] = [];
  let title = input.title ?? "";
  let metaDesc = "";

  const allModules = [input.entry, ...(input.layouts ?? []), ...(input.modules ?? [])];
  const asts = new Map<string, Node>();
  const exportsCache = new Map<string, Record<string, unknown>>();

  function parseModule(m: RenderModule): Node | null {
    if (asts.has(m.path)) return asts.get(m.path);
    try {
      const ast = parse(m.code, {
        sourceType: "module",
        plugins: ["jsx", "typescript", "decorators-legacy", "classProperties", "topLevelAwait"],
        errorRecovery: true,
      });
      asts.set(m.path, ast);
      return ast;
    } catch (e) {
      warn(`${m.path}: tidak bisa dibaca (${(e as Error).message.split("\n")[0]}).`);
      asts.set(m.path, null);
      return null;
    }
  }

  /** Cari modul untuk spec import (relatif atau alias "@/") di antara file yang tersedia. */
  function resolve(spec: string, from: string): RenderModule | null {
    if (!/^(\.|@\/|~\/|src\/|components\/|app\/|lib\/)/.test(spec)) return null;
    const dir = from.includes("/") ? from.slice(0, from.lastIndexOf("/")) : "";
    let target: string;
    if (spec.startsWith(".")) {
      const parts = (dir ? dir.split("/") : []).concat(spec.split("/"));
      const out: string[] = [];
      for (const p of parts) {
        if (!p || p === ".") continue;
        if (p === "..") out.pop();
        else out.push(p);
      }
      target = out.join("/");
    } else target = spec.replace(/^(@|~)\//, "");
    const strip = (p: string) => p.replace(/\.(tsx|ts|jsx|js|mjs|cjs|css|scss)$/, "").replace(/\/index$/, "");
    const want = strip(target);
    return (
      allModules.find((m) => strip(m.path) === want) ??
      allModules.find((m) => strip(m.path).endsWith("/" + want) || strip(m.path) === "src/" + want) ??
      null
    );
  }

  /* ---------------- modul & ekspor ---------------- */

  function moduleExports(m: RenderModule): Record<string, unknown> {
    if (exportsCache.has(m.path)) return exportsCache.get(m.path)!;
    const exp: Record<string, unknown> = {};
    exportsCache.set(m.path, exp); // cegah siklus
    const ast = parseModule(m);
    if (!ast) return exp;
    const scope = new Scope();
    const ctx = { file: m.path };

    // Fungsi dideklarasikan lebih dulu (hoisting) supaya urutan di file tidak penting.
    for (const st of ast.program.body) {
      const d = st.type === "ExportNamedDeclaration" || st.type === "ExportDefaultDeclaration" ? st.declaration : st;
      if (d?.type === "FunctionDeclaration" && d.id) scope.set(d.id.name, makeFunction(d, scope, ctx));
    }
    for (const st of ast.program.body) {
      if (st.type === "ImportDeclaration") {
        bindImport(st, scope, m.path);
        continue;
      }
      if (st.type === "ExportDefaultDeclaration") {
        const d = st.declaration;
        if (d.type === "FunctionDeclaration") exp.default = d.id ? scope.get(d.id.name) : makeFunction(d, scope, ctx);
        else if (d.type === "ClassDeclaration") (warn(`${m.path}: komponen class belum didukung.`), (exp.default = UNKNOWN));
        else exp.default = evaluate(d, scope, ctx);
        continue;
      }
      if (st.type === "ExportNamedDeclaration") {
        if (st.declaration) {
          execStatement(st.declaration, scope, ctx);
          for (const name of declaredNames(st.declaration)) exp[name] = scope.get(name);
        }
        for (const sp of st.specifiers ?? []) if (sp.exported) exp[sp.exported.name ?? sp.exported.value] = scope.get(sp.local.name);
        continue;
      }
      if (st.type === "VariableDeclaration" || st.type === "FunctionDeclaration") execStatement(st, scope, ctx);
    }
    return exp;
  }

  function declaredNames(d: Node): string[] {
    if (d.type === "FunctionDeclaration" && d.id) return [d.id.name];
    if (d.type === "VariableDeclaration") return d.declarations.flatMap((x: Node) => patternNames(x.id));
    return [];
  }
  function patternNames(p: Node): string[] {
    if (!p) return [];
    if (p.type === "Identifier") return [p.name];
    if (p.type === "ObjectPattern") return p.properties.flatMap((x: Node) => patternNames(x.type === "RestElement" ? x.argument : x.value));
    if (p.type === "ArrayPattern") return p.elements.flatMap((x: Node) => patternNames(x));
    if (p.type === "AssignmentPattern") return patternNames(p.left);
    if (p.type === "RestElement") return patternNames(p.argument);
    return [];
  }

  function bindImport(st: Node, scope: Scope, from: string) {
    const spec: string = st.source.value;
    if (st.importKind === "type") return;
    // Gambar statis
    if (/\.(png|jpe?g|gif|webp|svg|avif|ico)$/i.test(spec)) {
      const href = images[spec] ?? Object.entries(images).find(([k]) => k.endsWith(spec.replace(/^\.\//, "")))?.[1] ?? spec;
      for (const sp of st.specifiers) scope.set(sp.local.name, { src: href, width: undefined, height: undefined });
      return;
    }
    if (/\.module\.(css|scss|sass)$/i.test(spec)) {
      // CSS Modules: nama kelas dipakai apa adanya, dan isi CSS-nya disisipkan ke <head>.
      const mod = resolve(spec.replace(/\.(css|scss|sass)$/i, ""), from) ?? allModules.find((m) => m.path.endsWith(spec.replace(/^.*\//, "")));
      const css = mod?.code ?? "";
      const classes: Record<string, string> = {};
      for (const m of css.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) classes[m[1]] = m[1];
      if (css) head.push(`<style>${css.replace(/<\/style/gi, "<\\/style")}</style>`);
      else warn(`CSS Module "${spec}" tidak ditemukan; nama kelasnya tetap dipakai.`);
      for (const sp of st.specifiers) scope.set(sp.local.name, classes);
      return;
    }
    if (/\.(css|scss|sass)$/i.test(spec)) return;
    if (spec === "next/link") return st.specifiers.forEach((sp: Node) => scope.set(sp.local.name, BUILTIN.Link));
    if (spec === "next/image" || spec === "next/legacy/image") return st.specifiers.forEach((sp: Node) => scope.set(sp.local.name, BUILTIN.Image));
    if (spec === "next/script") return st.specifiers.forEach((sp: Node) => scope.set(sp.local.name, BUILTIN.Script));
    if (spec === "next/head") return st.specifiers.forEach((sp: Node) => scope.set(sp.local.name, BUILTIN.Head));
    if (spec.startsWith("next/font")) {
      warn("next/font tidak ikut dikonversi; tambahkan <link> Google Fonts sendiri bila perlu.");
      return st.specifiers.forEach((sp: Node) => scope.set(sp.local.name, mkFn("font", () => ({ className: "", variable: "", style: {} }))));
    }
    if (spec === "react" || spec === "next/navigation" || spec === "next/router") {
      for (const sp of st.specifiers) {
        const name = sp.imported?.name ?? sp.local.name;
        scope.set(sp.local.name, sp.type === "ImportDefaultSpecifier" || sp.type === "ImportNamespaceSpecifier" ? REACT_NS : (HOOKS[name] ?? UNKNOWN));
      }
      return;
    }
    if (/^(clsx|classnames|tailwind-merge)$/.test(spec)) return st.specifiers.forEach((sp: Node) => scope.set(sp.local.name, mkFn("cn", classJoin)));
    const mod = resolve(spec, from);
    if (!mod) {
      for (const sp of st.specifiers) {
        const nm = sp.local.name;
        // Helper className (cn/clsx/...) dari file utilitas yang tidak ikut terkirim tetap bisa dihitung.
        if (/^(cn|clsx|cx|classNames|classnames|twMerge)$/.test(nm)) scope.set(nm, mkFn("cn", classJoin));
        else scope.set(nm, externalComponent(nm, spec));
      }
      return;
    }
    const exp = moduleExports(mod);
    for (const sp of st.specifiers) {
      if (sp.type === "ImportDefaultSpecifier") scope.set(sp.local.name, exp.default ?? UNKNOWN);
      else if (sp.type === "ImportNamespaceSpecifier") scope.set(sp.local.name, exp);
      else scope.set(sp.local.name, exp[sp.imported.name ?? sp.imported.value] ?? UNKNOWN);
    }
  }

  /** Komponen dari paket luar (mis. lucide-react, framer-motion): render anaknya saja dan beri peringatan. */
  function externalComponent(name: string, spec: string): Fn {
    return mkFn(name, (args) => {
      const props = (args[0] ?? {}) as Record<string, unknown>;
      if (/^lucide-react|react-icons|@heroicons/.test(spec)) {
        warn(`Ikon dari "${spec}" diganti kotak kosong; ganti dengan SVG/ikon sendiri.`);
        return new Html(`<span class="${escAttr(String(props.className ?? ""))}" aria-hidden="true" style="display:inline-block;width:1em;height:1em"></span>`);
      }
      if (/^framer-motion|motion\//.test(spec)) {
        warn("Animasi framer-motion tidak ikut; elemen dirender statis.");
        return renderChildren(props.children);
      }
      warn(`Komponen "${name}" dari paket "${spec}" tidak bisa dikonversi tanpa menjalankannya; hanya isinya yang dipakai.`);
      return renderChildren(props.children);
    });
  }

  /* ---------------- builtin ---------------- */

  const REACT_NS: Record<string, unknown> = {};
  const HOOKS: Record<string, unknown> = {
    useState: mkFn("useState", (a) => [typeof a[0] === "object" && isFn(a[0]) ? (a[0] as Fn).call([]) : a[0], mkFn("setState", () => undefined)]),
    useReducer: mkFn("useReducer", (a) => [a[1], mkFn("dispatch", () => undefined)]),
    useMemo: mkFn("useMemo", (a) => (isFn(a[0]) ? (a[0] as Fn).call([]) : UNKNOWN)),
    useCallback: mkFn("useCallback", (a) => a[0]),
    useRef: mkFn("useRef", (a) => ({ current: a[0] ?? null })),
    useEffect: mkFn("useEffect", () => undefined),
    useLayoutEffect: mkFn("useLayoutEffect", () => undefined),
    useId: mkFn("useId", () => "id"),
    useContext: mkFn("useContext", () => UNKNOWN),
    useTransition: mkFn("useTransition", () => [false, mkFn("start", () => undefined)]),
    usePathname: mkFn("usePathname", () => "/"),
    useSearchParams: mkFn("useSearchParams", () => ({ get: mkFn("get", () => null) })),
    useParams: mkFn("useParams", () => ({})),
    useRouter: mkFn("useRouter", () => ({ push: mkFn("push", () => undefined), pathname: "/", query: {} })),
    Fragment: "__fragment",
  };
  Object.assign(REACT_NS, HOOKS);

  const hrefOf = (h: unknown): string => {
    const raw = typeof h === "string" ? h : h && typeof h === "object" ? String((h as { pathname?: string }).pathname ?? "") : "";
    if (!raw) return "#";
    const [path, rest = ""] = raw.split(/(?=[?#])/);
    const mapped = routeMap[path] ?? routeMap[path.replace(/\/$/, "")] ?? null;
    return mapped !== null ? mapped + rest : raw;
  };

  const BUILTIN = {
    Link: mkFn("Link", (a) => {
      const { href, children, prefetch: _p, replace: _r, scroll: _s, legacyBehavior: _l, passHref: _ph, ...rest } = (a[0] ?? {}) as Record<string, unknown>;
      return element("a", { ...rest, href: hrefOf(href) }, children);
    }),
    Image: mkFn("Image", (a) => {
      const { src, fill, priority: _p, placeholder: _ph, blurDataURL: _b, quality: _q, sizes, loader: _l, unoptimized: _u, style, ...rest } = (a[0] ?? {}) as Record<string, unknown>;
      const s = src && typeof src === "object" ? (src as { src?: string }).src : src;
      const st = fill ? { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", ...(style as object) } : style;
      return element("img", { ...rest, src: s, sizes, style: st, loading: "lazy" }, undefined);
    }),
    Script: mkFn("Script", (a) => {
      const { src, strategy: _s, children, dangerouslySetInnerHTML, ...rest } = (a[0] ?? {}) as Record<string, unknown>;
      const inner = (dangerouslySetInnerHTML as { __html?: string } | undefined)?.__html ?? (typeof children === "string" ? children : "");
      bodyScripts.push(`<script${src ? ` src="${escAttr(String(src))}"` : ""}${attrString(rest)}>${inner}</script>`);
      return new Html("");
    }),
    Head: mkFn("Head", (a) => {
      head.push(toHtml((a[0] as { children?: unknown })?.children));
      return new Html("");
    }),
  };

  /* ---------------- fungsi pengguna ---------------- */

  function makeFunction(fn: Node, scope: Scope, ctx: { file: string }): Fn {
    const name = fn.id?.name ?? "anonim";
    if (fn.async) {
      return mkFn(name, () => {
        warn(`${ctx.file}: fungsi async "${name}" (mis. mengambil data) tidak dijalankan; bagiannya kosong di HTML.`);
        return UNKNOWN;
      });
    }
    return mkFn(name, (args) => {
      const s = new Scope(scope);
      fn.params.forEach((p: Node, i: number) => bindPattern(p, p.type === "RestElement" ? args.slice(i) : args[i], s, ctx));
      if (fn.body.type !== "BlockStatement") return evaluate(fn.body, s, ctx);
      try {
        for (const st of fn.body.body) execStatement(st, s, ctx);
      } catch (e) {
        if (e instanceof Return) return e.value;
        throw e;
      }
      return undefined;
    });
  }

  function bindPattern(p: Node, value: unknown, scope: Scope, ctx: { file: string }) {
    if (!p) return;
    switch (p.type) {
      case "Identifier":
        scope.set(p.name, value);
        return;
      case "AssignmentPattern":
        bindPattern(p.left, value === undefined ? evaluate(p.right, scope, ctx) : value, scope, ctx);
        return;
      case "RestElement":
        bindPattern(p.argument, value, scope, ctx);
        return;
      case "ObjectPattern": {
        const obj = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
        const used = new Set<string>();
        for (const prop of p.properties) {
          if (prop.type === "RestElement") {
            const rest: Record<string, unknown> = {};
            for (const [k, v] of Object.entries(obj)) if (!used.has(k)) rest[k] = v;
            bindPattern(prop.argument, rest, scope, ctx);
            continue;
          }
          const key = prop.computed ? String(evaluate(prop.key, scope, ctx)) : (prop.key.name ?? prop.key.value);
          used.add(key);
          bindPattern(prop.value, value === UNKNOWN ? UNKNOWN : obj[key], scope, ctx);
        }
        return;
      }
      case "ArrayPattern": {
        const arr = Array.isArray(value) ? value : [];
        p.elements.forEach((el: Node, i: number) => el && bindPattern(el, el.type === "RestElement" ? arr.slice(i) : arr[i], scope, ctx));
        return;
      }
      case "TSParameterProperty":
        bindPattern(p.parameter, value, scope, ctx);
        return;
      default:
        return;
    }
  }

  /* ---------------- pernyataan ---------------- */

  function execStatement(st: Node, scope: Scope, ctx: { file: string }): void {
    switch (st.type) {
      case "VariableDeclaration":
        for (const d of st.declarations) bindPattern(d.id, d.init ? evaluate(d.init, scope, ctx) : undefined, scope, ctx);
        return;
      case "FunctionDeclaration":
        if (st.id) scope.set(st.id.name, makeFunction(st, scope, ctx));
        return;
      case "ReturnStatement":
        throw new Return(st.argument ? evaluate(st.argument, scope, ctx) : undefined);
      case "IfStatement": {
        const t = evaluate(st.test, scope, ctx);
        if (t === UNKNOWN) {
          warn(`${ctx.file}: kondisi "if" bergantung pada data saat aplikasi berjalan; cabang pertama yang dipakai.`);
        }
        if (t === UNKNOWN || t) execBlock(st.consequent, scope, ctx);
        else if (st.alternate) execBlock(st.alternate, scope, ctx);
        return;
      }
      case "BlockStatement":
        execBlock(st, scope, ctx);
        return;
      case "ExpressionStatement":
        evaluate(st.expression, scope, ctx);
        return;
      case "ForOfStatement": {
        const it = evaluate(st.right, scope, ctx);
        if (!Array.isArray(it)) return;
        for (const v of it.slice(0, 500)) {
          const s = new Scope(scope);
          bindPattern(st.left.type === "VariableDeclaration" ? st.left.declarations[0].id : st.left, v, s, ctx);
          execBlock(st.body, s, ctx);
        }
        return;
      }
      case "TSTypeAliasDeclaration":
      case "TSInterfaceDeclaration":
      case "TSEnumDeclaration":
      case "ImportDeclaration":
      case "EmptyStatement":
        return;
      default:
        return;
    }
  }

  function execBlock(b: Node, scope: Scope, ctx: { file: string }) {
    if (b.type !== "BlockStatement") return execStatement(b, scope, ctx);
    const s = new Scope(scope);
    for (const st of b.body) if (st.type === "FunctionDeclaration" && st.id) s.set(st.id.name, makeFunction(st, s, ctx));
    for (const st of b.body) execStatement(st, s, ctx);
  }

  /* ---------------- ekspresi ---------------- */

  function callValue(fn: unknown, args: unknown[]): unknown {
    if (isFn(fn)) return fn.call(args);
    if (typeof fn === "function") {
      try {
        return (fn as (...a: unknown[]) => unknown)(...args.map(unwrapForNative));
      } catch {
        return UNKNOWN;
      }
    }
    return UNKNOWN;
  }

  /** Fungsi pengguna yang dioper ke method bawaan (map/filter/...) perlu dibungkus jadi fungsi JS biasa. */
  function unwrapForNative(v: unknown): unknown {
    return isFn(v) ? (...a: unknown[]) => v.call(a) : v;
  }

  const ARRAY_METHODS = new Set(["map", "filter", "slice", "join", "find", "findIndex", "some", "every", "includes", "indexOf", "concat", "flat", "flatMap", "reverse", "at", "reduce", "sort", "toSorted", "toReversed", "keys", "values", "entries", "fill"]);
  const STRING_METHODS = new Set(["toUpperCase", "toLowerCase", "trim", "trimStart", "trimEnd", "slice", "substring", "split", "replace", "replaceAll", "startsWith", "endsWith", "includes", "padStart", "padEnd", "charAt", "repeat", "at", "indexOf", "concat", "toLocaleUpperCase", "toLocaleLowerCase", "normalize"]);
  const NUMBER_METHODS = new Set(["toFixed", "toString", "toLocaleString", "toPrecision"]);

  function member(obj: unknown, key: unknown): unknown {
    if (obj === UNKNOWN || obj === null || obj === undefined) return UNKNOWN;
    const k = String(key);
    if (Array.isArray(obj)) {
      if (k === "length") return obj.length;
      if (/^\d+$/.test(k)) return obj[Number(k)];
      if (ARRAY_METHODS.has(k)) {
        return mkFn(k, (args) => {
          const native = args.map(unwrapForNative);
          const copy = k === "sort" || k === "reverse" || k === "fill" ? [...obj] : obj;
          try {
            const r = (copy as any)[k](...native);
            return k === "keys" || k === "values" || k === "entries" ? [...r] : r;
          } catch {
            return UNKNOWN;
          }
        });
      }
      return UNKNOWN;
    }
    if (typeof obj === "string") {
      if (k === "length") return obj.length;
      if (STRING_METHODS.has(k)) return mkFn(k, (args) => (obj as any)[k](...args.map(unwrapForNative)));
      return UNKNOWN;
    }
    if (typeof obj === "number") {
      if (NUMBER_METHODS.has(k)) return mkFn(k, (args) => (obj as any)[k](...args));
      return UNKNOWN;
    }
    if (typeof obj === "object") {
      const o = obj as Record<string, unknown>;
      return k in o ? o[k] : obj === REACT_NS ? UNKNOWN : undefined;
    }
    return UNKNOWN;
  }

  const GLOBALS: Record<string, unknown> = {
    undefined,
    NaN,
    Infinity,
    Math,
    JSON: { stringify: mkFn("stringify", (a) => JSON.stringify(a[0], null, a[2] as number)), parse: mkFn("parse", (a) => JSON.parse(String(a[0]))) },
    Object: {
      keys: mkFn("keys", (a) => (a[0] && typeof a[0] === "object" ? Object.keys(a[0] as object) : [])),
      values: mkFn("values", (a) => (a[0] && typeof a[0] === "object" ? Object.values(a[0] as object) : [])),
      entries: mkFn("entries", (a) => (a[0] && typeof a[0] === "object" ? Object.entries(a[0] as object) : [])),
      assign: mkFn("assign", (a) => Object.assign({}, ...(a.filter((x) => x && typeof x === "object") as object[]))),
      fromEntries: mkFn("fromEntries", (a) => (Array.isArray(a[0]) ? Object.fromEntries(a[0] as [string, unknown][]) : {})),
    },
    Array: { from: mkFn("from", (a) => (Array.isArray(a[0]) ? (isFn(a[1]) ? (a[0] as unknown[]).map((v, i) => (a[1] as Fn).call([v, i])) : [...(a[0] as unknown[])]) : a[0] && typeof a[0] === "object" && "length" in (a[0] as object) ? Array.from({ length: Number((a[0] as { length: number }).length) }, (_, i) => (isFn(a[1]) ? (a[1] as Fn).call([undefined, i]) : undefined)) : [])), isArray: mkFn("isArray", (a) => Array.isArray(a[0])) },
    String: mkFn("String", (a) => String(a[0] ?? "")),
    Number: mkFn("Number", (a) => Number(a[0])),
    Boolean: mkFn("Boolean", (a) => Boolean(a[0])),
    parseInt: mkFn("parseInt", (a) => parseInt(String(a[0]), a[1] as number)),
    parseFloat: mkFn("parseFloat", (a) => parseFloat(String(a[0]))),
    Date: mkFn("Date", () => UNKNOWN),
    encodeURIComponent: mkFn("encodeURIComponent", (a) => encodeURIComponent(String(a[0]))),
    process: { env: {} },
    console: { log: mkFn("log", () => undefined), error: mkFn("error", () => undefined), warn: mkFn("warn", () => undefined) },
    React: REACT_NS,
    window: UNKNOWN,
    document: UNKNOWN,
  };

  function evaluate(n: Node, scope: Scope, ctx: { file: string }): unknown {
    if (!n) return undefined;
    switch (n.type) {
      case "StringLiteral":
        return n.value;
      case "NumericLiteral":
        return n.value;
      case "BooleanLiteral":
        return n.value;
      case "NullLiteral":
        return null;
      case "BigIntLiteral":
        return Number(n.value);
      case "TemplateLiteral": {
        let s = "";
        for (let i = 0; i < n.quasis.length; i++) {
          s += n.quasis[i].value.cooked ?? n.quasis[i].value.raw;
          if (i < n.expressions.length) {
            const v = evaluate(n.expressions[i], scope, ctx);
            if (v === UNKNOWN) return UNKNOWN;
            s += String(v ?? "");
          }
        }
        return s;
      }
      case "Identifier": {
        if (scope.has(n.name)) return scope.get(n.name);
        if (n.name in GLOBALS) return GLOBALS[n.name];
        return UNKNOWN;
      }
      case "ArrayExpression": {
        const out: unknown[] = [];
        for (const el of n.elements) {
          if (!el) continue;
          if (el.type === "SpreadElement") {
            const v = evaluate(el.argument, scope, ctx);
            if (Array.isArray(v)) out.push(...v);
          } else out.push(evaluate(el, scope, ctx));
        }
        return out;
      }
      case "ObjectExpression": {
        const out: Record<string, unknown> = {};
        for (const p of n.properties) {
          if (p.type === "SpreadElement") {
            const v = evaluate(p.argument, scope, ctx);
            if (v && typeof v === "object") Object.assign(out, v);
            continue;
          }
          const key = p.computed ? String(evaluate(p.key, scope, ctx)) : (p.key.name ?? String(p.key.value));
          if (p.type === "ObjectMethod") out[key] = makeFunction(p, scope, ctx);
          else out[key] = evaluate(p.value, scope, ctx);
        }
        return out;
      }
      case "ArrowFunctionExpression":
      case "FunctionExpression":
        return makeFunction(n, scope, ctx);
      case "TSAsExpression":
      case "TSSatisfiesExpression":
      case "TSNonNullExpression":
      case "TSTypeAssertion":
      case "ParenthesizedExpression":
        return evaluate(n.expression, scope, ctx);
      case "AwaitExpression":
        warn(`${ctx.file}: data yang di-await tidak tersedia saat konversi; bagiannya kosong.`);
        return UNKNOWN;
      case "MemberExpression":
      case "OptionalMemberExpression": {
        const obj = evaluate(n.object, scope, ctx);
        if (n.optional && (obj === null || obj === undefined)) return undefined;
        const key = n.computed ? evaluate(n.property, scope, ctx) : n.property.name;
        return member(obj, key);
      }
      case "CallExpression":
      case "OptionalCallExpression": {
        const callee = evaluate(n.callee, scope, ctx);
        if (n.optional && (callee === null || callee === undefined)) return undefined;
        const args: unknown[] = [];
        for (const a of n.arguments) {
          if (a.type === "SpreadElement") {
            const v = evaluate(a.argument, scope, ctx);
            if (Array.isArray(v)) args.push(...v);
          } else args.push(evaluate(a, scope, ctx));
        }
        if (callee === UNKNOWN) {
          const nm = n.callee.type === "Identifier" ? n.callee.name : n.callee.property?.name;
          if (nm && /^(cn|clsx|classNames|classnames|twMerge|cx)$/.test(nm)) return classJoin(args);
          return UNKNOWN;
        }
        return callValue(callee, args);
      }
      case "NewExpression":
        return UNKNOWN;
      case "UnaryExpression": {
        if (n.operator === "typeof") {
          const v = evaluate(n.argument, scope, ctx);
          return v === UNKNOWN ? UNKNOWN : isFn(v) ? "function" : typeof v;
        }
        const v = evaluate(n.argument, scope, ctx);
        if (v === UNKNOWN) return UNKNOWN;
        switch (n.operator) {
          case "!":
            return !v;
          case "-":
            return -(v as number);
          case "+":
            return +(v as number);
          case "void":
            return undefined;
          default:
            return UNKNOWN;
        }
      }
      case "BinaryExpression": {
        const a = evaluate(n.left, scope, ctx);
        const b = evaluate(n.right, scope, ctx);
        if (a === UNKNOWN || b === UNKNOWN) return UNKNOWN;
        const x = a as any;
        const y = b as any;
        switch (n.operator) {
          case "+": return x + y;
          case "-": return x - y;
          case "*": return x * y;
          case "/": return x / y;
          case "%": return x % y;
          case "**": return x ** y;
          case "===": return x === y;
          case "!==": return x !== y;
          case "==": return x == y; // eslint-disable-line eqeqeq
          case "!=": return x != y; // eslint-disable-line eqeqeq
          case "<": return x < y;
          case "<=": return x <= y;
          case ">": return x > y;
          case ">=": return x >= y;
          case "in": return y && typeof y === "object" ? String(x) in y : false;
          default: return UNKNOWN;
        }
      }
      case "LogicalExpression": {
        const a = evaluate(n.left, scope, ctx);
        if (n.operator === "&&") return a === UNKNOWN ? UNKNOWN : a ? evaluate(n.right, scope, ctx) : a;
        if (n.operator === "||") return a === UNKNOWN ? evaluate(n.right, scope, ctx) : a ? a : evaluate(n.right, scope, ctx);
        if (n.operator === "??") return a === null || a === undefined || a === UNKNOWN ? evaluate(n.right, scope, ctx) : a;
        return UNKNOWN;
      }
      case "ConditionalExpression": {
        const t = evaluate(n.test, scope, ctx);
        if (t === UNKNOWN) {
          warn(`${ctx.file}: tampilan bersyarat bergantung pada data saat aplikasi berjalan; cabang pertama yang dipakai.`);
          return evaluate(n.consequent, scope, ctx);
        }
        return t ? evaluate(n.consequent, scope, ctx) : evaluate(n.alternate, scope, ctx);
      }
      case "SequenceExpression": {
        let v: unknown;
        for (const e of n.expressions) v = evaluate(e, scope, ctx);
        return v;
      }
      case "AssignmentExpression":
        if (n.left.type === "Identifier" && n.operator === "=") {
          const v = evaluate(n.right, scope, ctx);
          // tulis ke lingkup tempat variabel dideklarasikan
          let s: Scope | null = scope;
          while (s && !s.vars.has(n.left.name)) s = s.parent;
          (s ?? scope).set(n.left.name, v);
          return v;
        }
        return UNKNOWN;
      case "JSXElement":
        return jsxElement(n, scope, ctx);
      case "JSXFragment":
        return renderChildren(jsxChildren(n.children, scope, ctx));
      case "TaggedTemplateExpression":
        return UNKNOWN;
      default:
        return UNKNOWN;
    }
  }

  /* ---------------- JSX ---------------- */

  function jsxName(n: Node): string {
    if (n.type === "JSXIdentifier") return n.name;
    if (n.type === "JSXMemberExpression") return jsxName(n.object) + "." + jsxName(n.property);
    if (n.type === "JSXNamespacedName") return n.namespace.name + ":" + n.name.name;
    return "";
  }

  function jsxChildren(children: Node[], scope: Scope, ctx: { file: string }): unknown[] {
    const out: unknown[] = [];
    for (const c of children) {
      if (c.type === "JSXText") {
        // aturan spasi JSX: baris yang hanya spasi/enter dibuang, spasi dalam baris dipertahankan satu
        const lines = c.value.split(/\r?\n/);
        const t = lines
          .map((l: string, i: number) => {
            let x = l.replace(/\t/g, " ");
            if (i > 0) x = x.replace(/^\s+/, "");
            if (i < lines.length - 1) x = x.replace(/\s+$/, "");
            return x;
          })
          .filter((l: string) => l.length > 0)
          .join(" ");
        if (t) out.push(t);
      } else if (c.type === "JSXExpressionContainer") {
        if (c.expression.type === "JSXEmptyExpression") continue;
        out.push(evaluate(c.expression, scope, ctx));
      } else if (c.type === "JSXSpreadChild") {
        const v = evaluate(c.expression, scope, ctx);
        if (Array.isArray(v)) out.push(...v);
      } else out.push(evaluate(c, scope, ctx));
    }
    return out;
  }

  function jsxElement(n: Node, scope: Scope, ctx: { file: string }): unknown {
    const name = jsxName(n.openingElement.name);
    const props: Record<string, unknown> = {};
    for (const a of n.openingElement.attributes) {
      if (a.type === "JSXSpreadAttribute") {
        const v = evaluate(a.argument, scope, ctx);
        if (v && typeof v === "object") Object.assign(props, v);
        continue;
      }
      const key = a.name.type === "JSXNamespacedName" ? `${a.name.namespace.name}:${a.name.name.name}` : a.name.name;
      if (!a.value) props[key] = true;
      else if (a.value.type === "StringLiteral") props[key] = a.value.value;
      else if (a.value.type === "JSXExpressionContainer") props[key] = a.value.expression.type === "JSXEmptyExpression" ? undefined : evaluate(a.value.expression, scope, ctx);
      else props[key] = evaluate(a.value, scope, ctx);
    }
    const kids = jsxChildren(n.children, scope, ctx);
    const children = kids.length === 0 ? undefined : kids.length === 1 ? kids[0] : kids;

    // Elemen HTML biasa (huruf kecil / ada tanda hubung)
    if (/^[a-z]/.test(name) && !name.includes(".")) return element(name, props, children);
    if (name === "Fragment" || name === "React.Fragment") return renderChildren(children);

    const comp = name.includes(".") ? name.split(".").reduce<unknown>((o, k, i) => (i === 0 ? scope.get(k) : member(o, k)), undefined) : scope.get(name);
    if (comp === "__fragment") return renderChildren(children);
    if (isFn(comp)) {
      try {
        return comp.call([{ ...props, children }]);
      } catch (e) {
        if (e instanceof Return) return e.value;
        warn(`${ctx.file}: komponen <${name}> gagal dirender (${(e as Error).message}).`);
        return renderChildren(children);
      }
    }
    if (comp && typeof comp === "object" && "src" in (comp as object)) return element("img", { src: (comp as { src: string }).src, ...props }, undefined);
    warn(`${ctx.file}: komponen <${name}> tidak ditemukan; hanya isinya yang dipakai.`);
    return renderChildren(children);
  }

  let handlersWarned = false;
  function attrString(props: Record<string, unknown>): string {
    let s = "";
    for (const [k, raw] of Object.entries(props)) {
      if (k === "children" || k === "key" || k === "ref" || k === "dangerouslySetInnerHTML" || k === "suppressHydrationWarning" || k === "suppressContentEditableWarning") continue;
      if (/^on[A-Z]/.test(k)) {
        if (!handlersWarned) warn("Event handler React (onClick, onChange, ...) tidak ikut ke HTML statis; tambahkan JavaScript sendiri bila perlu.");
        handlersWarned = true;
        continue;
      }
      let v = raw;
      if (v === UNKNOWN || v === undefined || v === null || v === false || isFn(v)) continue;
      let name = ATTR_MAP[k] ?? (k.startsWith("aria") || k.startsWith("data") ? k.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase() : k);
      if (k === "defaultValue") name = "value";
      if (k === "defaultChecked") name = "checked";
      if (k === "style") {
        v = styleToCss(v);
        if (!v) continue;
      }
      if (k === "className" && typeof v !== "string") v = classJoin([v]);
      if (k === "className" && String(v).trim() === "") continue;
      if (v === true) {
        s += BOOL_ATTR.has(name) || name.startsWith("aria-") ? ` ${name}${name.startsWith("aria-") ? '="true"' : ""}` : ` ${name}`;
        continue;
      }
      if (typeof v === "object") continue;
      s += ` ${name}="${escAttr(String(v))}"`;
    }
    return s;
  }

  function element(tag: string, props: Record<string, unknown>, children: unknown): Html {
    const inner = (props.dangerouslySetInnerHTML as { __html?: string } | undefined)?.__html;
    if (tag === "html" || tag === "body" || tag === "head") {
      // ditangani saat merakit dokumen
      return new Html(`<${tag}${attrString(props)}>${inner ?? toHtml(children)}</${tag}>`);
    }
    if (tag === "title") title = toText(children);
    const attrs = attrString(props);
    if (VOID.has(tag)) return new Html(`<${tag}${attrs}>`);
    if (tag === "textarea" && props.defaultValue !== undefined) return new Html(`<textarea${attrs}>${escText(String(props.defaultValue))}</textarea>`);
    return new Html(`<${tag}${attrs}>${inner ?? toHtml(children)}</${tag}>`);
  }

  function renderChildren(children: unknown): Html {
    return new Html(toHtml(children));
  }

  function toText(v: unknown): string {
    if (v === null || v === undefined || v === false || v === true || v === UNKNOWN || v === SKIP) return "";
    if (Array.isArray(v)) return v.map(toText).join("");
    if (v instanceof Html) return v.s.replace(/<[^>]+>/g, "");
    return typeof v === "object" ? "" : String(v);
  }

  function toHtml(v: unknown): string {
    if (v === null || v === undefined || v === false || v === true || v === SKIP) return "";
    if (v === UNKNOWN) return "";
    if (v instanceof Html) return v.s;
    if (Array.isArray(v)) return v.map(toHtml).join("");
    if (isFn(v)) return "";
    if (typeof v === "object") return "";
    return escText(String(v));
  }

  /* ---------------- rakit ---------------- */

  const entryExp = moduleExports(input.entry);
  const Page = entryExp.default;
  const meta = entryExp.metadata as Record<string, unknown> | undefined;
  if (meta && typeof meta === "object") {
    if (typeof meta.title === "string") title = meta.title;
    else if (meta.title && typeof meta.title === "object" && typeof (meta.title as { default?: string }).default === "string") title = (meta.title as { default: string }).default;
    if (typeof meta.description === "string") metaDesc = meta.description;
  }
  if (entryExp.generateMetadata || entryExp.getServerSideProps || entryExp.getStaticProps)
    warn(`${input.entry.path}: data dari generateMetadata/getServerSideProps/getStaticProps tidak dijalankan.`);

  let body: unknown = isFn(Page) ? callValue(Page, [{ params: {}, searchParams: {} }]) : UNKNOWN;
  if (!isFn(Page)) warn(`${input.entry.path}: tidak ada komponen "export default" yang bisa dirender.`);

  // Layout dari dalam ke luar: layout terdekat membungkus halaman lebih dulu.
  for (const l of [...(input.layouts ?? [])].reverse()) {
    const exp = moduleExports(l);
    const lm = exp.metadata as Record<string, unknown> | undefined;
    if (!title && lm && typeof lm.title === "string") title = lm.title;
    if (!title && lm?.title && typeof lm.title === "object") title = String((lm.title as { default?: string }).default ?? "");
    if (!metaDesc && lm && typeof lm.description === "string") metaDesc = lm.description;
    if (isFn(exp.default)) body = callValue(exp.default, [{ children: new Html(toHtml(body)), params: {} }]);
  }

  let html = toHtml(body);
  if (input.document === false) return { html, warnings: [...warnings] };

  // Dokumen lengkap. Layout akar Next.js biasanya sudah memberi <html><body>.
  const headExtra = [
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    title ? `<title>${escText(title)}</title>` : "",
    metaDesc ? `<meta name="description" content="${escAttr(metaDesc)}">` : "",
    ...(input.cssLinks ?? []).map((h) => `<link rel="stylesheet" href="${escAttr(h)}">`),
    input.tailwind ? '<script src="https://cdn.tailwindcss.com"></script>' : "",
    ...head,
  ]
    .filter(Boolean)
    .join("\n    ");
  const scripts = bodyScripts.join("\n");

  const htmlTag = /^<html\b[^>]*>/.exec(html);
  if (htmlTag) {
    html = html.replace(/<head\b[^>]*>([\s\S]*?)<\/head>/, (_m, inner) => `<head>\n    ${headExtra}\n    ${inner}\n  </head>`);
    if (!/<head\b/.test(html)) html = html.replace(htmlTag[0], `${htmlTag[0]}\n  <head>\n    ${headExtra}\n  </head>`);
    if (scripts) html = html.replace(/<\/body>/, `${scripts}\n</body>`);
    if (!/lang=/.test(htmlTag[0])) html = html.replace(/^<html/, '<html lang="id"');
    return { html: `<!doctype html>\n${html}\n`, warnings: [...warnings] };
  }
  return {
    html: `<!doctype html>\n<html lang="id">\n  <head>\n    ${headExtra}\n  </head>\n  <body>\n${html}\n${scripts}\n  </body>\n</html>\n`,
    warnings: [...warnings],
  };
}
