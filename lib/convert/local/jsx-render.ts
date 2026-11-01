/**
 * Render statis JSX → HTML untuk konversi Next.js → situs HTML, tanpa AI dan tanpa menjalankan kode.
 *
 * Kode proyek dibaca sebagai AST (@babel/parser) lalu "dijalankan" oleh interpreter kecil yang hanya
 * mengenal sebagian JavaScript yang aman: literal, template, objek/array, ekspresi, if, map/filter,
 * destructuring, fungsi/komponen lokal, dan hook sebagai nilai awal. Tidak ada eval/new Function,
 * tidak ada akses jaringan atau DOM; semua method dibatasi daftar putih. Yang tidak dikenali dilewati
 * dengan catatan (peringatan), bukan menggagalkan seluruh halaman.
 */

/* eslint-disable */
type Any = any;

export interface RenderJob {
  router: "app" | "pages";
  route: string;
  page: { path: string; code: string };
  /** Path layout/_app (terluar dulu); kodenya ada di `files`. */
  layouts: string[];
  files: { path: string; code: string }[];
  /** path file → (spec import → path hasil resolve) untuk import lokal. */
  resolved: Record<string, Record<string, string>>;
  routeMap: Record<string, string>;
  assetPrefix: string;
  cssLinks: string[];
  /** Baris "spec" (di file) → href, dari analisis. */
  imageImports: string[];
  tailwind: boolean;
}

export interface RenderOut {
  html: string;
  warnings: string[];
}

/* ------------------------------------------------------------------ */
/* nilai & scope                                                       */
/* ------------------------------------------------------------------ */

class Unsupported extends Error {}

/** HTML yang sudah di-escape. */
class Raw {
  constructor(public html: string) {}
}

class Native {
  props?: Record<string, Any>;
  constructor(
    public fn: (...args: Any[]) => Any,
    public name = "fungsi",
  ) {}
}

class Fn {
  constructor(
    public node: Any,
    public scope: Scope,
    public name = "",
  ) {}
}

class Scope {
  vars = new Map<string, Any>();
  constructor(
    public parent?: Scope,
    public mod?: Mod,
  ) {}
  find(name: string): Scope | undefined {
    for (let s: Scope | undefined = this; s; s = s.parent) if (s.vars.has(name)) return s;
    return undefined;
  }
  moduleOf(): Mod | undefined {
    for (let s: Scope | undefined = this; s; s = s.parent) if (s.mod) return s.mod;
    return undefined;
  }
}

interface Mod {
  path: string;
  scope: Scope;
  imports: Map<string, { spec: string; imported: string }>;
  /** nama ekspor → nama lokal di scope modul, atau nilai langsung. */
  exports: Map<string, { local: string } | { value: Any }>;
  done: boolean;
}

type Completion = { type: "return"; value: Any } | { type: "break" } | { type: "continue" };

const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype", "__defineGetter__", "__defineSetter__"]);
const VOID_TAGS = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);
const MAX_STEPS = 3_000_000;
const MAX_DEPTH = 120;
const MAX_OUT = 6_000_000;

const escText = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escAttr = (s: string): string => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const dirname = (p: string): string => (p.includes("/") ? p.slice(0, p.lastIndexOf("/")) : "");

/* ------------------------------------------------------------------ */
/* atribut                                                             */
/* ------------------------------------------------------------------ */

const ATTR_MAP: Record<string, string> = {
  className: "class", htmlFor: "for", tabIndex: "tabindex", readOnly: "readonly", maxLength: "maxlength", minLength: "minlength",
  colSpan: "colspan", rowSpan: "rowspan", cellPadding: "cellpadding", cellSpacing: "cellspacing", crossOrigin: "crossorigin",
  srcSet: "srcset", charSet: "charset", httpEquiv: "http-equiv", acceptCharset: "accept-charset", autoComplete: "autocomplete",
  autoFocus: "autofocus", autoPlay: "autoplay", spellCheck: "spellcheck", contentEditable: "contenteditable", playsInline: "playsinline",
  allowFullScreen: "allowfullscreen", frameBorder: "frameborder", noValidate: "novalidate", defaultValue: "value", defaultChecked: "checked",
  referrerPolicy: "referrerpolicy", fetchPriority: "fetchpriority", enterKeyHint: "enterkeyhint", inputMode: "inputmode", useMap: "usemap",
  dateTime: "datetime", hrefLang: "hreflang", srcDoc: "srcdoc", encType: "enctype", formAction: "formaction", formMethod: "formmethod",
  formTarget: "formtarget", formNoValidate: "formnovalidate", marginHeight: "marginheight", marginWidth: "marginwidth", itemProp: "itemprop",
  itemScope: "itemscope", itemType: "itemtype", itemID: "itemid", itemRef: "itemref", accessKey: "accesskey", autoCapitalize: "autocapitalize",
  controlsList: "controlslist", disablePictureInPicture: "disablepictureinpicture", isMap: "ismap", radioGroup: "radiogroup",
  xlinkHref: "xlink:href", xmlnsXlink: "xmlns:xlink", xmlSpace: "xml:space", xmlLang: "xml:lang", dirName: "dirname",
};
const KEBAB_ATTRS = new Set([
  "strokeWidth", "strokeLinecap", "strokeLinejoin", "strokeDasharray", "strokeDashoffset", "strokeMiterlimit", "strokeOpacity", "fillOpacity",
  "fillRule", "clipRule", "clipPath", "textAnchor", "fontFamily", "fontSize", "fontWeight", "fontStyle", "fontVariant", "fontStretch", "stopColor",
  "stopOpacity", "floodColor", "floodOpacity", "lightingColor", "vectorEffect", "shapeRendering", "textRendering", "imageRendering",
  "pointerEvents", "dominantBaseline", "alignmentBaseline", "baselineShift", "colorInterpolation", "colorInterpolationFilters", "markerStart",
  "markerMid", "markerEnd", "letterSpacing", "wordSpacing", "textDecoration", "writingMode", "glyphOrientationVertical", "paintOrder",
  "unicodeBidi", "enableBackground", "overlinePosition", "overlineThickness", "underlinePosition", "underlineThickness", "strikethroughPosition",
  "strikethroughThickness", "accentHeight", "capHeight", "horizAdvX", "horizOriginX", "vertAdvY", "vertOriginX", "vertOriginY", "xHeight",
]);
const STRING_BOOL_ATTRS = new Set(["draggable", "spellcheck", "contenteditable", "translate"]);
const UNITLESS = new Set([
  "animationIterationCount", "aspectRatio", "borderImageOutset", "borderImageSlice", "borderImageWidth", "boxFlex", "boxFlexGroup", "boxOrdinalGroup",
  "columnCount", "columns", "flex", "flexGrow", "flexPositive", "flexShrink", "flexNegative", "flexOrder", "gridArea", "gridRow", "gridRowEnd",
  "gridRowSpan", "gridRowStart", "gridColumn", "gridColumnEnd", "gridColumnSpan", "gridColumnStart", "fontWeight", "lineClamp", "lineHeight",
  "opacity", "order", "orphans", "scale", "tabSize", "widows", "zIndex", "zoom", "fillOpacity", "floodOpacity", "stopOpacity", "strokeDasharray",
  "strokeDashoffset", "strokeMiterlimit", "strokeOpacity", "strokeWidth",
]);

function kebab(s: string): string {
  return s.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase());
}

function styleToCss(obj: Any): string {
  if (typeof obj === "string") return obj;
  if (!obj || typeof obj !== "object") return "";
  const parts: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined || v === false || v === "") continue;
    let prop: string;
    if (k.startsWith("--")) prop = k;
    else if (/^ms[A-Z]/.test(k)) prop = "-" + kebab(k);
    else if (/^(Webkit|Moz|O)[A-Z]/.test(k)) prop = "-" + kebab(k).replace(/^-/, "");
    else prop = kebab(k);
    let val = typeof v === "number" && v !== 0 && !UNITLESS.has(k) && !k.startsWith("--") ? `${v}px` : String(v);
    val = val.replace(/;+\s*$/, "");
    parts.push(`${prop}: ${val}`);
  }
  return parts.join("; ");
}

/* ------------------------------------------------------------------ */
/* clsx / classnames                                                   */
/* ------------------------------------------------------------------ */

function clsx(...args: Any[]): string {
  const out: string[] = [];
  const walk = (a: Any): void => {
    if (!a) return;
    if (typeof a === "string" || typeof a === "number") out.push(String(a));
    else if (Array.isArray(a)) a.forEach(walk);
    else if (typeof a === "object" && !(a instanceof Raw) && !(a instanceof Fn) && !(a instanceof Native)) {
      for (const [k, v] of Object.entries(a)) if (v) out.push(k);
    }
  };
  args.forEach(walk);
  return out.join(" ");
}

/* ------------------------------------------------------------------ */
/* renderer                                                            */
/* ------------------------------------------------------------------ */

const EXT_RESOLVE = ["", ".tsx", ".ts", ".jsx", ".js", ".mjs", ".json", "/index.tsx", "/index.ts", "/index.jsx", "/index.js"];

export async function renderPage(job: RenderJob): Promise<RenderOut> {
  const { parse } = await import("@babel/parser");
  return new Renderer(job, parse as Any).run();
}

class Renderer {
  warnings: string[] = [];
  private warned = new Set<string>();
  private steps = 0;
  private depth = 0;
  private mods = new Map<string, Mod>();
  private files = new Map<string, string>();
  private head: string[] = [];
  private cssModules: string[] = [];
  private fontLinks: string[] = [];
  private rootVars: string[] = [];
  private droppedHandlers = new Set<string>();
  private imageMap = new Map<string, string>(); // `${file}\n${spec}` → href
  private idCounter = 0;
  private globals = new Map<string, Any>();

  constructor(
    private job: RenderJob,
    private parse: (code: string, opts: Any) => Any,
  ) {
    for (const f of job.files) this.files.set(f.path, f.code);
    this.files.set(job.page.path, job.page.code);
    for (const line of job.imageImports) {
      const m = /^"([^"]+)" \(di ([^)]+)\) → (.+)$/.exec(line);
      if (m) this.imageMap.set(`${m[2]}\n${m[1]}`, m[3]);
    }
    this.setupGlobals();
  }

  warn(msg: string): void {
    if (this.warned.has(msg)) return;
    this.warned.add(msg);
    this.warnings.push(msg);
  }

  /* ---------- global & pustaka yang dikenal ---------- */

  private native(fn: (...a: Any[]) => Any, name?: string): Native {
    return new Native(fn, name);
  }

  private setupGlobals(): void {
    const g = this.globals;
    const N = (fn: (...a: Any[]) => Any, name?: string) => this.native(fn, name);
    g.set("undefined", undefined);
    g.set("NaN", NaN);
    g.set("Infinity", Infinity);
    g.set("Math", {
      floor: N(Math.floor), ceil: N(Math.ceil), round: N(Math.round), max: N(Math.max), min: N(Math.min), abs: N(Math.abs), pow: N(Math.pow),
      sqrt: N(Math.sqrt), trunc: N(Math.trunc), sign: N(Math.sign), random: N(() => 0.5), PI: Math.PI,
    });
    const withProps = (n: Native, props: Record<string, Any>): Native => {
      n.props = props;
      return n;
    };
    g.set("Number", withProps(N((v: Any) => Number(v)), {
      isInteger: N((v: Any) => Number.isInteger(v)), isFinite: N((v: Any) => Number.isFinite(v)), isNaN: N((v: Any) => Number.isNaN(v)),
      parseFloat: N((s: Any) => parseFloat(String(s))), parseInt: N((s: Any, r?: number) => parseInt(String(s), r)), MAX_SAFE_INTEGER: Number.MAX_SAFE_INTEGER,
    }));
    g.set("String", N((v: Any) => (v === undefined ? "" : String(v))));
    g.set("Boolean", N((v: Any) => Boolean(v)));
    g.set("parseInt", N((s: Any, r?: number) => parseInt(String(s), r)));
    g.set("parseFloat", N((s: Any) => parseFloat(String(s))));
    g.set("isNaN", N((v: Any) => Number.isNaN(Number(v))));
    g.set("Object", {
      keys: N((o: Any) => (o && typeof o === "object" ? Object.keys(o) : [])),
      values: N((o: Any) => (o && typeof o === "object" ? Object.values(o) : [])),
      entries: N((o: Any) => (o && typeof o === "object" ? Object.entries(o) : [])),
      assign: N((t: Any, ...s: Any[]) => Object.assign(t ?? {}, ...s)),
      fromEntries: N((e: Any) => Object.fromEntries(e ?? [])),
      freeze: N((o: Any) => o),
    });
    g.set("Array", withProps(N((n?: Any) => (typeof n === "number" ? new Array(Math.min(n, 10_000)).fill(undefined) : [])), {
      isArray: N((v: Any) => Array.isArray(v)),
      from: N((v: Any, f?: Any) => {
        let arr: Any[];
        if (typeof v === "string") arr = [...v];
        else if (Array.isArray(v)) arr = [...v];
        else if (v && typeof v === "object" && typeof v.length === "number") arr = Array.from({ length: Math.min(v.length, 10_000) }, (_, i) => v[i]);
        else arr = [];
        return f ? arr.map((x, i) => this.callValue(f, [x, i])) : arr;
      }),
      of: N((...a: Any[]) => a),
    }));
    g.set("JSON", {
      stringify: N((v: Any, _r?: Any, s?: Any) => JSON.stringify(v, (_k, x) => (x instanceof Fn || x instanceof Native || x instanceof Raw ? undefined : x), s)),
      parse: N((s: Any) => JSON.parse(String(s))),
    });
    g.set("Date", withProps(N((...a: Any[]) => (a.length ? new Date(a[0]) : new Date()), "Date"), { now: N(() => Date.now()) }));
    g.set("process", { env: { NODE_ENV: "production" } });
    g.set("console", { log: N(() => undefined), error: N(() => undefined), warn: N(() => undefined), info: N(() => undefined) });
    for (const n of ["setTimeout", "setInterval", "clearTimeout", "clearInterval", "requestAnimationFrame"]) g.set(n, N(() => undefined));
    g.set("Symbol", N(() => "symbol"));
    g.set("Promise", { resolve: N((v: Any) => v), all: N((v: Any) => v) });
  }

  private reactLib(): Record<string, Any> {
    const N = (fn: (...a: Any[]) => Any, name?: string) => this.native(fn, name);
    const Fragment = N((p: Any) => this.childrenToRaw(p?.children), "Fragment");
    const passthrough = N((p: Any) => this.childrenToRaw(p?.children), "Suspense");
    return {
      Fragment,
      Suspense: passthrough,
      StrictMode: passthrough,
      useState: N((init: Any) => [typeof init === "function" || init instanceof Fn ? this.callValue(init, []) : init, N(() => undefined)]),
      useReducer: N((_r: Any, init: Any, initFn?: Any) => [initFn ? this.callValue(initFn, [init]) : init, N(() => undefined)]),
      useRef: N((v: Any) => ({ current: v })),
      useMemo: N((f: Any) => this.callValue(f, [])),
      useCallback: N((f: Any) => f),
      useEffect: N(() => undefined),
      useLayoutEffect: N(() => undefined),
      useInsertionEffect: N(() => undefined),
      useImperativeHandle: N(() => undefined),
      useDebugValue: N(() => undefined),
      useContext: N(() => undefined),
      useId: N(() => `id-${++this.idCounter}`),
      useTransition: N(() => [false, N(() => undefined)]),
      useDeferredValue: N((v: Any) => v),
      useSyncExternalStore: N(() => undefined),
      startTransition: N(() => undefined),
      createContext: N((def: Any) => ({ Provider: N((p: Any) => this.childrenToRaw(p?.children), "Provider"), Consumer: N(() => new Raw(""), "Consumer"), _def: def })),
      forwardRef: N((f: Any) => N((props: Any) => this.callValue(f, [props, null]), "forwardRef")),
      memo: N((c: Any) => c),
      lazy: N(() => N(() => new Raw(""), "lazy")),
      Children: { toArray: N((c: Any) => (c === undefined || c === null ? [] : Array.isArray(c) ? c.flat() : [c])), count: N((c: Any) => (Array.isArray(c) ? c.length : c ? 1 : 0)) },
    };
  }

  /** Paket npm yang dikenal. Mengembalikan namespace (objek) atau undefined bila tidak dikenal. */
  private externalModule(spec: string, fromPath: string): Record<string, Any> | undefined {
    const N = (fn: (...a: Any[]) => Any, name?: string) => this.native(fn, name);
    switch (spec) {
      case "react":
      case "react/jsx-runtime":
      case "react/jsx-dev-runtime": {
        const lib = this.reactLib();
        return { ...lib, default: lib, React: lib };
      }
      case "next/link": {
        const Link = N((p: Any) => this.renderLink(p), "Link");
        return { default: Link };
      }
      case "next/image": {
        const Image = N((p: Any) => this.renderImage(p), "Image");
        return { default: Image };
      }
      case "next/script": {
        const Script = N((p: Any) => this.renderScript(p), "Script");
        return { default: Script };
      }
      case "next/head": {
        const Head = N((p: Any) => {
          const html = this.toHtml(p?.children);
          this.head.push(html);
          return new Raw("");
        }, "Head");
        return { default: Head };
      }
      case "next/navigation":
      case "next/router": {
        const router = { push: N(() => undefined), replace: N(() => undefined), back: N(() => undefined), forward: N(() => undefined), refresh: N(() => undefined), prefetch: N(() => undefined), pathname: this.job.route, asPath: this.job.route, query: {} };
        const params = { get: N(() => null), getAll: N(() => []), has: N(() => false), toString: N(() => "") };
        return {
          useRouter: N(() => router), usePathname: N(() => this.job.route), useSearchParams: N(() => params), useParams: N(() => ({})),
          redirect: N(() => { throw new Unsupported("redirect()"); }), notFound: N(() => { throw new Unsupported("notFound()"); }),
          useSelectedLayoutSegment: N(() => null), default: { push: N(() => undefined) },
        };
      }
      case "next/dynamic":
        return { default: N(() => { this.warn("Komponen dynamic() tidak bisa dirender statis — dilewati."); return N(() => new Raw(""), "dynamic"); }) };
      case "next/font/google":
        return new Proxy({}, {
          get: (_t, name: string) => (name === "__esModule" ? false : N((opts: Any) => this.googleFont(String(name), opts), String(name))),
          has: () => true,
        });
      case "next/font/local":
        return { default: N(() => { this.warn("next/font/local tidak ikut — pasang @font-face di CSS bila perlu."); return { className: "", style: {}, variable: "" }; }) };
      case "clsx":
      case "classnames":
        return { default: N(clsx, "clsx"), clsx: N(clsx, "clsx"), classNames: N(clsx, "clsx") };
      case "tailwind-merge":
        return { twMerge: N(clsx, "twMerge"), twJoin: N(clsx, "twJoin") };
      default:
        break;
    }
    void fromPath;
    return undefined;
  }

  private googleFont(importName: string, opts: Any): Any {
    const family = importName.replace(/_/g, " ");
    const weights: string[] = Array.isArray(opts?.weight) ? opts.weight.map(String) : opts?.weight && opts.weight !== "variable" ? [String(opts.weight)] : ["400", "500", "600", "700"];
    const italic = Array.isArray(opts?.style) ? opts.style.includes("italic") : opts?.style === "italic";
    void italic;
    const href = `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}:wght@${[...new Set(weights)].sort().join(";")}&display=swap`;
    if (!this.fontLinks.includes(href)) this.fontLinks.push(href);
    const stack = `'${family}', sans-serif`;
    if (typeof opts?.variable === "string" && opts.variable.startsWith("--")) this.rootVars.push(`${opts.variable}: ${stack}`);
    return { className: "", style: { fontFamily: stack }, variable: "" };
  }

  /* ---------- modul ---------- */

  private resolve(from: string, spec: string): string | undefined {
    const direct = this.job.resolved[from]?.[spec];
    if (direct) return direct;
    if (spec.startsWith(".")) {
      const parts = (dirname(from) ? dirname(from).split("/") : []).concat(spec.split("/"));
      const out: string[] = [];
      for (const p of parts) {
        if (!p || p === ".") continue;
        if (p === "..") out.pop();
        else out.push(p);
      }
      const base = out.join("/");
      for (const e of EXT_RESOLVE) if (this.files.has(base + e) && (e !== "" || /\.[A-Za-z0-9]+$/.test(base))) return base + e;
    }
    return undefined;
  }

  private loadModule(path: string): Mod {
    const have = this.mods.get(path);
    if (have) return have;
    const mod: Mod = { path, scope: new Scope(undefined, undefined), imports: new Map(), exports: new Map(), done: false };
    mod.scope.mod = mod;
    this.mods.set(path, mod);
    const code = this.files.get(path);
    if (code === undefined) throw new Unsupported(`file ${path} tidak ada`);
    if (path.endsWith(".json")) {
      try {
        mod.exports.set("default", { value: JSON.parse(code) });
      } catch {
        throw new Unsupported(`JSON ${path} tidak valid`);
      }
      mod.done = true;
      return mod;
    }
    let ast: Any;
    try {
      ast = this.parse(code, { sourceType: "module", plugins: ["jsx", "typescript"], errorRecovery: true, allowReturnOutsideFunction: true });
    } catch (e) {
      throw new Unsupported(`gagal membaca ${path}: ${e instanceof Error ? e.message.split("\n")[0] : "sintaks tidak valid"}`);
    }
    const body: Any[] = ast.program.body;
    // 1) import & hoist fungsi
    for (const st of body) {
      if (st.type === "ImportDeclaration") {
        if (st.importKind === "type") continue;
        for (const sp of st.specifiers) {
          if (sp.importKind === "type") continue;
          const imported = sp.type === "ImportDefaultSpecifier" ? "default" : sp.type === "ImportNamespaceSpecifier" ? "*" : sp.imported.name ?? sp.imported.value;
          mod.imports.set(sp.local.name, { spec: st.source.value, imported });
        }
      }
    }
    this.hoist(body, mod.scope);
    // 2) eksekusi top-level
    for (const st of body) {
      try {
        this.execTop(st, mod);
      } catch (e) {
        if (e instanceof Unsupported) this.warn(`${path}: ${e.message} — dilewati.`);
        else throw e;
      }
    }
    mod.done = true;
    return mod;
  }

  private execTop(st: Any, mod: Mod): void {
    const scope = mod.scope;
    switch (st.type) {
      case "ExportNamedDeclaration": {
        if (st.exportKind === "type") return;
        if (st.declaration) {
          this.execTop(st.declaration, mod);
          const d = st.declaration;
          if (d.type === "FunctionDeclaration" || d.type === "ClassDeclaration") mod.exports.set(d.id.name, { local: d.id.name });
          else if (d.type === "VariableDeclaration") for (const dc of d.declarations) for (const n of this.patternNames(dc.id)) mod.exports.set(n, { local: n });
        } else if (st.specifiers && !st.source) {
          for (const sp of st.specifiers) mod.exports.set(sp.exported.name ?? sp.exported.value, { local: sp.local.name });
        } else if (st.source) {
          for (const sp of st.specifiers) {
            const spec = st.source.value;
            const exported = sp.exported.name ?? sp.exported.value;
            const local = `__re_${exported}`;
            mod.imports.set(local, { spec, imported: sp.local?.name ?? "default" });
            mod.exports.set(exported, { local });
          }
        }
        return;
      }
      case "ExportDefaultDeclaration": {
        const d = st.declaration;
        if ((d.type === "FunctionDeclaration" || d.type === "ClassDeclaration") && d.id) {
          this.execTop(d, mod);
          mod.exports.set("default", { local: d.id.name });
        } else if (d.type === "FunctionDeclaration") {
          mod.exports.set("default", { value: new Fn(d, scope, "default") });
        } else {
          mod.exports.set("default", { value: this.evalExpr(d, scope) });
        }
        return;
      }
      case "ExportAllDeclaration":
        this.warn(`${mod.path}: "export * from" tidak diikuti.`);
        return;
      case "ImportDeclaration":
      case "FunctionDeclaration":
        return; // sudah di-hoist
      default: {
        const c = this.execStmt(st, scope);
        void c;
      }
    }
  }

  private patternNames(p: Any): string[] {
    if (!p) return [];
    switch (p.type) {
      case "Identifier": return [p.name];
      case "ObjectPattern": return p.properties.flatMap((x: Any) => (x.type === "RestElement" ? this.patternNames(x.argument) : this.patternNames(x.value)));
      case "ArrayPattern": return p.elements.flatMap((x: Any) => this.patternNames(x));
      case "AssignmentPattern": return this.patternNames(p.left);
      case "RestElement": return this.patternNames(p.argument);
      default: return [];
    }
  }

  private hoist(stmts: Any[], scope: Scope): void {
    for (const st of stmts) {
      const d = st.type === "ExportNamedDeclaration" || st.type === "ExportDefaultDeclaration" ? st.declaration : st;
      if (d && d.type === "FunctionDeclaration" && d.id) scope.vars.set(d.id.name, new Fn(d, scope, d.id.name));
    }
  }

  /** Ambil nilai ekspor modul. */
  private moduleExport(mod: Mod, name: string): Any {
    const e = mod.exports.get(name);
    if (!e) return undefined;
    if ("value" in e) return e.value;
    return this.lookup(e.local, mod.scope);
  }

  private importValue(mod: Mod, local: string, imp: { spec: string; imported: string }): Any {
    const ext = this.externalModule(imp.spec, mod.path);
    if (ext) {
      if (imp.imported === "*") return ext;
      return imp.imported === "default" ? (ext as Any).default ?? ext : (ext as Any)[imp.imported];
    }
    const img = this.imageMap.get(`${mod.path}\n${imp.spec}`);
    if (img !== undefined) return { src: img, width: undefined, height: undefined, __img: true };
    if (/\.module\.(css|scss)$/i.test(imp.spec)) {
      const p = this.resolve(mod.path, imp.spec);
      if (p) this.addCssModule(p);
      return new Proxy({}, { get: (_t, k) => (typeof k === "string" ? k : undefined) });
    }
    if (/\.(css|scss|sass)$/i.test(imp.spec)) return undefined;
    const target = this.resolve(mod.path, imp.spec);
    if (!target) {
      if (imp.spec.startsWith(".") || imp.spec.startsWith("@/") || imp.spec.startsWith("~/")) {
        this.warn(`${mod.path}: import "${imp.spec}" tidak ditemukan di proyek.`);
      } else if (imp.imported !== "default" || /^[A-Z]/.test(local)) {
        this.warn(`Paket "${imp.spec}" (${local}) tidak bisa dirender statis — dilewati.`);
      }
      return this.stubFor(imp.spec, local);
    }
    if (/\.(png|jpe?g|gif|webp|avif|svg|ico)$/i.test(target)) return { src: target, __img: true };
    const m = this.loadModule(target);
    return imp.imported === "*"
      ? new Proxy({}, { get: (_t, k) => (typeof k === "string" ? this.moduleExport(m, k) : undefined) })
      : this.moduleExport(m, imp.imported);
  }

  private stubFor(spec: string, local: string): Any {
    // komponen tak dikenal: render anaknya saja; fungsi tak dikenal: undefined
    if (/^[A-Z]/.test(local)) return this.native((p: Any) => this.childrenToRaw(p?.children), `${spec}:${local}`);
    return this.native(() => undefined, `${spec}:${local}`);
  }

  private lookup(name: string, scope: Scope): Any {
    const s = scope.find(name);
    if (s) return s.vars.get(name);
    const mod = scope.moduleOf();
    const imp = mod?.imports.get(name);
    if (mod && imp) {
      const cacheKey = `__imp_${name}`;
      if (mod.scope.vars.has(cacheKey)) return mod.scope.vars.get(cacheKey);
      const v = this.importValue(mod, name, imp);
      mod.scope.vars.set(cacheKey, v);
      return v;
    }
    if (this.globals.has(name)) return this.globals.get(name);
    if (name === "React") return this.reactLib();
    if (name === "fetch") throw new Unsupported("fetch() tidak dijalankan — HTML statis tidak punya data server");
    if (name === "window" || name === "document" || name === "localStorage" || name === "sessionStorage" || name === "navigator") throw new Unsupported(`${name} hanya ada di browser`);
    throw new Unsupported(`"${name}" tidak dikenali`);
  }

  /* ---------- statement ---------- */

  private tick(): void {
    if (++this.steps > MAX_STEPS) throw new Unsupported("terlalu banyak langkah komputasi");
  }

  private execBlock(stmts: Any[], scope: Scope): Completion | undefined {
    this.hoist(stmts, scope);
    for (const st of stmts) {
      const c = this.execStmt(st, scope);
      if (c) return c;
    }
    return undefined;
  }

  private execStmt(st: Any, scope: Scope): Completion | undefined {
    this.tick();
    switch (st.type) {
      case "VariableDeclaration":
        for (const d of st.declarations) {
          let v: Any;
          try {
            v = d.init ? this.evalExpr(d.init, scope) : undefined;
          } catch (e) {
            if (e instanceof Unsupported) {
              this.warn(`Dilewati: ${e.message}`);
              v = undefined;
            } else throw e;
          }
          this.bindPattern(d.id, v, scope, true);
        }
        return undefined;
      case "FunctionDeclaration":
        if (st.id && !scope.vars.has(st.id.name)) scope.vars.set(st.id.name, new Fn(st, scope, st.id.name));
        return undefined;
      case "ReturnStatement":
        return { type: "return", value: st.argument ? this.evalExpr(st.argument, scope) : undefined };
      case "ExpressionStatement": {
        if (st.directive) return undefined;
        const e = st.expression;
        try {
          this.evalExpr(e, scope, true);
        } catch (err) {
          if (!(err instanceof Unsupported)) throw err;
        }
        return undefined;
      }
      case "IfStatement": {
        const t = this.evalExpr(st.test, scope);
        if (t) return this.execStmt(st.consequent, scope);
        return st.alternate ? this.execStmt(st.alternate, scope) : undefined;
      }
      case "BlockStatement":
        return this.execBlock(st.body, new Scope(scope));
      case "ForOfStatement": {
        const iter = this.evalExpr(st.right, scope);
        if (!Array.isArray(iter) && typeof iter !== "string") throw new Unsupported("for-of pada nilai bukan array");
        let n = 0;
        for (const item of iter as Any[]) {
          if (++n > 5000) throw new Unsupported("loop terlalu panjang");
          const inner = new Scope(scope);
          if (st.left.type === "VariableDeclaration") this.bindPattern(st.left.declarations[0].id, item, inner, true);
          else this.bindPattern(st.left, item, inner, false);
          const c = this.execStmt(st.body, inner);
          if (c?.type === "return") return c;
          if (c?.type === "break") break;
        }
        return undefined;
      }
      case "ForInStatement": {
        const obj = this.evalExpr(st.right, scope);
        for (const k of obj && typeof obj === "object" ? Object.keys(obj) : []) {
          const inner = new Scope(scope);
          if (st.left.type === "VariableDeclaration") this.bindPattern(st.left.declarations[0].id, k, inner, true);
          const c = this.execStmt(st.body, inner);
          if (c?.type === "return") return c;
          if (c?.type === "break") break;
        }
        return undefined;
      }
      case "ForStatement": {
        const inner = new Scope(scope);
        if (st.init) {
          if (st.init.type === "VariableDeclaration") this.execStmt(st.init, inner);
          else this.evalExpr(st.init, inner);
        }
        let n = 0;
        while (!st.test || this.evalExpr(st.test, inner)) {
          if (++n > 5000) throw new Unsupported("loop terlalu panjang");
          const c = this.execStmt(st.body, new Scope(inner));
          if (c?.type === "return") return c;
          if (c?.type === "break") break;
          if (st.update) this.evalExpr(st.update, inner);
        }
        return undefined;
      }
      case "WhileStatement": {
        let n = 0;
        while (this.evalExpr(st.test, scope)) {
          if (++n > 5000) throw new Unsupported("loop terlalu panjang");
          const c = this.execStmt(st.body, new Scope(scope));
          if (c?.type === "return") return c;
          if (c?.type === "break") break;
        }
        return undefined;
      }
      case "BreakStatement": return { type: "break" };
      case "ContinueStatement": return { type: "continue" };
      case "SwitchStatement": {
        const d = this.evalExpr(st.discriminant, scope);
        let matched = false;
        const inner = new Scope(scope);
        for (const cs of st.cases) {
          if (!matched && (cs.test === null || this.evalExpr(cs.test, inner) === d)) matched = true;
          if (matched) {
            const c = this.execBlock(cs.consequent, inner);
            if (c?.type === "return") return c;
            if (c?.type === "break") return undefined;
          }
        }
        return undefined;
      }
      case "TryStatement": {
        try {
          return this.execStmt(st.block, scope);
        } catch (e) {
          if (e instanceof Unsupported && st.handler) {
            const inner = new Scope(scope);
            if (st.handler.param) this.bindPattern(st.handler.param, { message: e.message }, inner, true);
            return this.execStmt(st.handler.body, inner);
          }
          throw e;
        } finally {
          if (st.finalizer) this.execStmt(st.finalizer, scope);
        }
      }
      case "ThrowStatement":
        throw new Unsupported("throw");
      case "ClassDeclaration":
        throw new Unsupported("class tidak didukung");
      case "EmptyStatement":
      case "TSInterfaceDeclaration":
      case "TSTypeAliasDeclaration":
      case "TSEnumDeclaration":
      case "TSModuleDeclaration":
      case "TSDeclareFunction":
      case "ImportDeclaration":
        return undefined;
      default:
        throw new Unsupported(`pernyataan ${st.type}`);
    }
  }

  private bindPattern(p: Any, value: Any, scope: Scope, declare: boolean): void {
    switch (p.type) {
      case "Identifier":
        if (declare) scope.vars.set(p.name, value);
        else {
          const s = scope.find(p.name) ?? scope;
          s.vars.set(p.name, value);
        }
        return;
      case "AssignmentPattern": {
        const v = value === undefined ? this.evalExpr(p.right, scope) : value;
        this.bindPattern(p.left, v, scope, declare);
        return;
      }
      case "ObjectPattern": {
        const src = value ?? {};
        const used: string[] = [];
        for (const prop of p.properties) {
          if (prop.type === "RestElement") {
            const rest: Any = {};
            for (const [k, v] of Object.entries(src)) if (!used.includes(k)) rest[k] = v;
            this.bindPattern(prop.argument, rest, scope, declare);
          } else {
            const key = prop.computed ? String(this.evalExpr(prop.key, scope)) : prop.key.name ?? String(prop.key.value);
            used.push(key);
            this.bindPattern(prop.value, this.getMember(src, key), scope, declare);
          }
        }
        return;
      }
      case "ArrayPattern": {
        const arr = Array.isArray(value) ? value : [];
        p.elements.forEach((el: Any, i: number) => {
          if (!el) return;
          if (el.type === "RestElement") this.bindPattern(el.argument, arr.slice(i), scope, declare);
          else this.bindPattern(el, arr[i], scope, declare);
        });
        return;
      }
      case "MemberExpression": {
        const obj = this.evalExpr(p.object, scope);
        const key = p.computed ? String(this.evalExpr(p.property, scope)) : p.property.name;
        if (obj && typeof obj === "object" && !FORBIDDEN_KEYS.has(key)) obj[key] = value;
        return;
      }
      default:
        throw new Unsupported(`pola ${p.type}`);
    }
  }

  /* ---------- fungsi ---------- */

  callValue(f: Any, args: Any[]): Any {
    if (f instanceof Native) return f.fn(...args);
    if (f instanceof Fn) return this.callFn(f, args);
    if (typeof f === "function") throw new Unsupported("fungsi host tidak diizinkan");
    throw new Unsupported(`${typeof f === "undefined" ? "nilai kosong" : "nilai"} bukan fungsi`);
  }

  private callFn(fn: Fn, args: Any[]): Any {
    if (++this.depth > MAX_DEPTH) {
      this.depth--;
      throw new Unsupported("rekursi terlalu dalam");
    }
    try {
      this.tick();
      const node = fn.node;
      const scope = new Scope(fn.scope);
      node.params.forEach((p: Any, i: number) => {
        if (p.type === "RestElement") this.bindPattern(p.argument, args.slice(i), scope, true);
        else this.bindPattern(p.type === "TSParameterProperty" ? p.parameter : p, args[i], scope, true);
      });
      if (node.body.type !== "BlockStatement") return this.evalExpr(node.body, scope);
      const c = this.execBlock(node.body.body, scope);
      return c?.type === "return" ? c.value : undefined;
    } finally {
      this.depth--;
    }
  }

  /* ---------- ekspresi ---------- */

  getMember(obj: Any, key: Any): Any {
    if (obj === null || obj === undefined) return undefined;
    if (typeof key === "string" && FORBIDDEN_KEYS.has(key)) return undefined;
    if (obj instanceof Native) return obj.props ? obj.props[String(key)] : undefined;
    if (obj instanceof Fn || obj instanceof Raw) return undefined;
    if (typeof obj === "string" || typeof obj === "number" || Array.isArray(obj) || obj instanceof Date) {
      if (typeof key === "number" || /^\d+$/.test(String(key))) return (obj as Any)[key as Any];
      if (key === "length") return (obj as Any).length;
      return this.hostMethod(obj, String(key));
    }
    if (typeof obj === "object") {
      const k = String(key);
      if (Object.prototype.hasOwnProperty.call(obj, k)) return obj[k];
      try {
        const v = obj[k];
        return typeof v === "function" ? undefined : v;
      } catch {
        return undefined;
      }
    }
    return undefined;
  }

  private hostMethod(obj: Any, name: string): Any {
    const N = (fn: (...a: Any[]) => Any) => this.native(fn, name);
    if (Array.isArray(obj)) {
      switch (name) {
        case "map": return N((f) => obj.map((x, i) => this.callValue(f, [x, i, obj])));
        case "filter": return N((f) => obj.filter((x, i) => this.callValue(f, [x, i, obj])));
        case "find": return N((f) => obj.find((x, i) => this.callValue(f, [x, i, obj])));
        case "findIndex": return N((f) => obj.findIndex((x, i) => this.callValue(f, [x, i, obj])));
        case "some": return N((f) => obj.some((x, i) => this.callValue(f, [x, i, obj])));
        case "every": return N((f) => obj.every((x, i) => this.callValue(f, [x, i, obj])));
        case "flatMap": return N((f) => obj.flatMap((x, i) => this.callValue(f, [x, i, obj])));
        case "forEach": return N((f) => { obj.forEach((x, i) => this.callValue(f, [x, i, obj])); });
        case "reduce": return N((...a: Any[]) => (a.length < 2 ? obj.reduce((acc, x, i) => this.callValue(a[0], [acc, x, i, obj])) : obj.reduce((acc, x, i) => this.callValue(a[0], [acc, x, i, obj]), a[1])));
        case "join": return N((s) => obj.map((x) => (x === null || x === undefined ? "" : typeof x === "object" ? "" : String(x))).join(s === undefined ? "," : String(s)));
        case "slice": return N((a, b) => obj.slice(a, b));
        case "concat": return N((...a) => obj.concat(...a));
        case "includes": return N((v) => obj.includes(v));
        case "indexOf": return N((v) => obj.indexOf(v));
        case "reverse": return N(() => [...obj].reverse());
        case "toReversed": return N(() => [...obj].reverse());
        case "sort":
        case "toSorted": return N((f) => [...obj].sort(f ? (a, b) => Number(this.callValue(f, [a, b])) : undefined));
        case "flat": return N((d) => obj.flat(d ?? 1));
        case "at": return N((i) => obj.at(i));
        case "fill": return N((v) => obj.map(() => v));
        case "keys": return N(() => obj.map((_, i) => i));
        case "entries": return N(() => obj.map((x, i) => [i, x]));
        case "push": case "unshift": return N(() => obj.length);
        default: return undefined;
      }
    }
    if (typeof obj === "string") {
      switch (name) {
        case "toUpperCase": return N(() => obj.toUpperCase());
        case "toLowerCase": return N(() => obj.toLowerCase());
        case "trim": return N(() => obj.trim());
        case "trimStart": return N(() => obj.trimStart());
        case "trimEnd": return N(() => obj.trimEnd());
        case "split": return N((s, l) => obj.split(typeof s === "string" ? s : "", l));
        case "slice": return N((a, b) => obj.slice(a, b));
        case "substring": return N((a, b) => obj.substring(a, b));
        case "substr": return N((a, b) => obj.substr(a, b));
        case "charAt": return N((i) => obj.charAt(i));
        case "startsWith": return N((s) => obj.startsWith(String(s)));
        case "endsWith": return N((s) => obj.endsWith(String(s)));
        case "includes": return N((s) => obj.includes(String(s)));
        case "indexOf": return N((s) => obj.indexOf(String(s)));
        case "replace": return N((a, b) => (typeof a === "string" ? obj.replace(a, typeof b === "string" ? b : "") : obj));
        case "replaceAll": return N((a, b) => (typeof a === "string" ? obj.split(a).join(typeof b === "string" ? b : "") : obj));
        case "padStart": return N((n, s) => obj.padStart(n, s));
        case "padEnd": return N((n, s) => obj.padEnd(n, s));
        case "repeat": return N((n) => obj.repeat(Math.min(Number(n) || 0, 1000)));
        case "toString": return N(() => obj);
        case "concat": return N((...a) => obj.concat(...a.map(String)));
        case "localeCompare": return N((s) => obj.localeCompare(String(s)));
        case "at": return N((i) => obj.at(i));
        default: return undefined;
      }
    }
    if (typeof obj === "number") {
      switch (name) {
        case "toFixed": return N((d) => obj.toFixed(d));
        case "toString": return N((r) => obj.toString(r));
        case "toLocaleString": return N((loc, o) => obj.toLocaleString(typeof loc === "string" ? loc : "id-ID", o && typeof o === "object" ? o : undefined));
        default: return undefined;
      }
    }
    if (obj instanceof Date) {
      switch (name) {
        case "getFullYear": return N(() => obj.getFullYear());
        case "getMonth": return N(() => obj.getMonth());
        case "getDate": return N(() => obj.getDate());
        case "getDay": return N(() => obj.getDay());
        case "getHours": return N(() => obj.getHours());
        case "getMinutes": return N(() => obj.getMinutes());
        case "getTime": return N(() => obj.getTime());
        case "toISOString": return N(() => obj.toISOString());
        case "toLocaleDateString": return N((l, o) => obj.toLocaleDateString(typeof l === "string" ? l : "id-ID", o && typeof o === "object" ? o : undefined));
        case "toLocaleTimeString": return N((l, o) => obj.toLocaleTimeString(typeof l === "string" ? l : "id-ID", o && typeof o === "object" ? o : undefined));
        case "toDateString": return N(() => obj.toDateString());
        default: return undefined;
      }
    }
    return undefined;
  }

  evalExpr(node: Any, scope: Scope, asStatement = false): Any {
    this.tick();
    switch (node.type) {
      case "StringLiteral": case "NumericLiteral": case "BooleanLiteral": return node.value;
      case "NullLiteral": return null;
      case "BigIntLiteral": return Number(node.value);
      case "RegExpLiteral": throw new Unsupported("regex");
      case "TemplateLiteral": {
        let out = "";
        node.quasis.forEach((q: Any, i: number) => {
          out += q.value.cooked ?? q.value.raw;
          if (i < node.expressions.length) {
            const v = this.evalExpr(node.expressions[i], scope);
            out += v === undefined || v === null ? "" : typeof v === "object" ? "[object Object]" : String(v);
          }
        });
        return out;
      }
      case "Identifier": {
        if (node.name === "undefined") return undefined;
        return this.lookup(node.name, scope);
      }
      case "ArrayExpression": {
        const out: Any[] = [];
        for (const el of node.elements) {
          if (!el) out.push(undefined);
          else if (el.type === "SpreadElement") {
            const v = this.evalExpr(el.argument, scope);
            if (Array.isArray(v)) out.push(...v);
            else if (typeof v === "string") out.push(...v);
          } else out.push(this.evalExpr(el, scope));
        }
        return out;
      }
      case "ObjectExpression": {
        const out: Any = {};
        for (const p of node.properties) {
          if (p.type === "SpreadElement") {
            const v = this.evalExpr(p.argument, scope);
            if (v && typeof v === "object" && !Array.isArray(v) && !(v instanceof Raw)) Object.assign(out, v);
          } else if (p.type === "ObjectMethod") {
            const key = p.computed ? String(this.evalExpr(p.key, scope)) : p.key.name ?? String(p.key.value);
            if (!FORBIDDEN_KEYS.has(key)) out[key] = new Fn(p, scope, key);
          } else {
            const key = p.computed ? String(this.evalExpr(p.key, scope)) : p.key.name ?? String(p.key.value);
            if (FORBIDDEN_KEYS.has(key)) continue;
            out[key] = this.evalExpr(p.value, scope);
          }
        }
        return out;
      }
      case "FunctionExpression": case "ArrowFunctionExpression": return new Fn(node, scope, node.id?.name ?? "");
      case "UnaryExpression": {
        if (node.operator === "typeof" && node.argument.type === "Identifier") {
          try {
            const v = this.lookup(node.argument.name, scope);
            return v instanceof Fn || v instanceof Native ? "function" : typeof v;
          } catch {
            return "undefined";
          }
        }
        const v = this.evalExpr(node.argument, scope);
        switch (node.operator) {
          case "!": return !v;
          case "-": return -v;
          case "+": return +v;
          case "typeof": return v instanceof Fn || v instanceof Native ? "function" : typeof v;
          case "void": return undefined;
          case "~": return ~v;
          default: throw new Unsupported(`operator ${node.operator}`);
        }
      }
      case "BinaryExpression": {
        const l = this.evalExpr(node.left, scope);
        const r = this.evalExpr(node.right, scope);
        switch (node.operator) {
          case "+": return l + r;
          case "-": return l - r;
          case "*": return l * r;
          case "/": return l / r;
          case "%": return l % r;
          case "**": return l ** r;
          case "==": return l == r; // eslint-disable-line eqeqeq
          case "!=": return l != r; // eslint-disable-line eqeqeq
          case "===": return l === r;
          case "!==": return l !== r;
          case "<": return l < r;
          case "<=": return l <= r;
          case ">": return l > r;
          case ">=": return l >= r;
          case "in": return r && typeof r === "object" ? String(l) in r : false;
          case "&": return l & r;
          case "|": return l | r;
          case "^": return l ^ r;
          case "<<": return l << r;
          case ">>": return l >> r;
          default: throw new Unsupported(`operator ${node.operator}`);
        }
      }
      case "LogicalExpression": {
        const l = this.evalExpr(node.left, scope);
        if (node.operator === "&&") return l ? this.evalExpr(node.right, scope) : l;
        if (node.operator === "||") return l ? l : this.evalExpr(node.right, scope);
        return l !== null && l !== undefined ? l : this.evalExpr(node.right, scope);
      }
      case "ConditionalExpression":
        return this.evalExpr(node.test, scope) ? this.evalExpr(node.consequent, scope) : this.evalExpr(node.alternate, scope);
      case "AssignmentExpression": {
        const op = node.operator;
        let v = this.evalExpr(node.right, scope);
        if (op !== "=") {
          const cur = this.evalExpr(node.left, scope);
          switch (op) {
            case "+=": v = cur + v; break;
            case "-=": v = cur - v; break;
            case "*=": v = cur * v; break;
            case "/=": v = cur / v; break;
            case "||=": v = cur || v; break;
            case "&&=": v = cur && v; break;
            case "??=": v = cur ?? v; break;
            default: throw new Unsupported(`operator ${op}`);
          }
        }
        this.bindPattern(node.left, v, scope, false);
        return v;
      }
      case "UpdateExpression": {
        const cur = Number(this.evalExpr(node.argument, scope));
        const next = node.operator === "++" ? cur + 1 : cur - 1;
        this.bindPattern(node.argument, next, scope, false);
        return node.prefix ? next : cur;
      }
      case "SequenceExpression": {
        let v: Any;
        for (const e of node.expressions) v = this.evalExpr(e, scope);
        return v;
      }
      case "MemberExpression": case "OptionalMemberExpression": {
        const obj = this.evalExpr(node.object, scope);
        if ((node.optional || node.type === "OptionalMemberExpression") && (obj === null || obj === undefined)) return undefined;
        if (obj === null || obj === undefined) throw new Unsupported("membaca properti dari nilai kosong");
        const key = node.computed ? this.evalExpr(node.property, scope) : node.property.name ?? node.property.id?.name;
        return this.getMember(obj, key);
      }
      case "CallExpression": case "OptionalCallExpression": return this.evalCall(node, scope, asStatement);
      case "NewExpression": {
        const callee = node.callee;
        if (callee.type === "Identifier" && callee.name === "Date") return node.arguments.length ? new Date(this.evalExpr(node.arguments[0], scope)) : new Date();
        if (callee.type === "Identifier" && callee.name === "Array") {
          const n = node.arguments.length ? Number(this.evalExpr(node.arguments[0], scope)) : 0;
          return new Array(Math.min(n, 10_000)).fill(undefined);
        }
        throw new Unsupported("new pada kelas tak dikenal");
      }
      case "AwaitExpression": return this.evalExpr(node.argument, scope);
      case "TSAsExpression": case "TSNonNullExpression": case "TSSatisfiesExpression": case "TSTypeAssertion": case "TSInstantiationExpression": case "ParenthesizedExpression":
        return this.evalExpr(node.expression, scope);
      case "JSXElement": case "JSXFragment": return this.renderJsx(node, scope);
      case "SpreadElement": return this.evalExpr(node.argument, scope);
      case "ThisExpression": throw new Unsupported("this");
      case "TaggedTemplateExpression": throw new Unsupported("tagged template");
      case "ClassExpression": throw new Unsupported("class");
      case "Import": throw new Unsupported("import()");
      default:
        throw new Unsupported(`ekspresi ${node.type}`);
    }
  }

  private evalCall(node: Any, scope: Scope, asStatement: boolean): Any {
    const callee = node.callee;
    if (callee.type === "Import") throw new Unsupported("import()");
    if (callee.type === "Identifier" && callee.name === "require") throw new Unsupported("require()");
    const args: Any[] = [];
    for (const a of node.arguments) {
      if (a.type === "SpreadElement") {
        const v = this.evalExpr(a.argument, scope);
        if (Array.isArray(v)) args.push(...v);
      } else args.push(this.evalExpr(a, scope));
    }
    let fnVal: Any;
    if (callee.type === "MemberExpression" || callee.type === "OptionalMemberExpression") {
      const obj = this.evalExpr(callee.object, scope);
      if ((callee.optional || callee.type === "OptionalMemberExpression") && (obj === null || obj === undefined)) return undefined;
      if (obj === null || obj === undefined) throw new Unsupported("memanggil method dari nilai kosong");
      const key = callee.computed ? this.evalExpr(callee.property, scope) : callee.property.name;
      fnVal = this.getMember(obj, key);
      if (fnVal === undefined) {
        if (node.optional) return undefined;
        if (asStatement) return undefined;
        throw new Unsupported(`method ${String(key)}() tidak didukung`);
      }
    } else {
      fnVal = this.evalExpr(callee, scope);
      if ((fnVal === undefined || fnVal === null) && node.optional) return undefined;
    }
    return this.callValue(fnVal, args);
  }

  /* ---------- JSX ---------- */

  private childrenToRaw(children: Any): Raw {
    return new Raw(this.toHtml(children));
  }

  toHtml(v: Any): string {
    if (v === null || v === undefined || typeof v === "boolean") return "";
    if (v instanceof Raw) return v.html;
    if (typeof v === "string") return escText(v);
    if (typeof v === "number") return String(v);
    if (Array.isArray(v)) return v.map((x) => this.toHtml(x)).join("");
    if (v instanceof Fn || v instanceof Native) return "";
    this.warn("Ada nilai objek yang dipakai sebagai isi halaman — dilewati.");
    return "";
  }

  private jsxText(raw: string): string {
    const lines = raw.split(/\r\n|\n|\r/);
    let lastNonEmpty = 0;
    lines.forEach((l, i) => {
      if (/[^ \t]/.test(l)) lastNonEmpty = i;
    });
    let out = "";
    lines.forEach((l, i) => {
      let line = l.replace(/\t/g, " ");
      if (i !== 0) line = line.replace(/^ +/, "");
      if (i !== lines.length - 1) line = line.replace(/ +$/, "");
      if (line) {
        if (i !== lastNonEmpty) line += " ";
        out += line;
      }
    });
    return out;
  }

  private jsxName(n: Any): { kind: "host"; tag: string } | { kind: "expr"; node: Any } {
    if (n.type === "JSXIdentifier") {
      if (/^[a-z]/.test(n.name) || n.name.includes("-")) return { kind: "host", tag: n.name };
      return { kind: "expr", node: { type: "Identifier", name: n.name } };
    }
    if (n.type === "JSXMemberExpression") {
      const toExpr = (m: Any): Any => (m.type === "JSXIdentifier" ? { type: "Identifier", name: m.name } : { type: "MemberExpression", object: toExpr(m.object), property: { type: "Identifier", name: m.property.name }, computed: false });
      return { kind: "expr", node: toExpr(n) };
    }
    if (n.type === "JSXNamespacedName") return { kind: "host", tag: `${n.namespace.name}:${n.name.name}` };
    throw new Unsupported("nama tag JSX");
  }

  private evalAttrs(attrs: Any[], scope: Scope): Record<string, Any> {
    const props: Record<string, Any> = {};
    for (const a of attrs) {
      if (a.type === "JSXSpreadAttribute") {
        const v = this.evalExpr(a.argument, scope);
        if (v && typeof v === "object" && !Array.isArray(v)) Object.assign(props, v);
        continue;
      }
      const name = a.name.type === "JSXNamespacedName" ? `${a.name.namespace.name}:${a.name.name.name}` : a.name.name;
      let v: Any;
      if (a.value === null) v = true;
      else if (a.value.type === "StringLiteral") v = a.value.value;
      else if (a.value.type === "JSXExpressionContainer") {
        if (a.value.expression.type === "JSXEmptyExpression") continue;
        try {
          v = this.evalExpr(a.value.expression, scope);
        } catch (e) {
          if (e instanceof Unsupported) {
            if (!/^on[A-Z]/.test(name)) this.warn(`Atribut ${name} dilewati: ${e.message}`);
            continue;
          }
          throw e;
        }
      } else v = this.evalExpr(a.value, scope);
      props[name] = v;
    }
    return props;
  }

  private evalChildren(children: Any[], scope: Scope): Any[] {
    const out: Any[] = [];
    for (const c of children) {
      switch (c.type) {
        case "JSXText": {
          const t = this.jsxText(c.value);
          if (t) out.push(t);
          break;
        }
        case "JSXExpressionContainer":
          if (c.expression.type === "JSXEmptyExpression") break;
          try {
            const v = this.evalExpr(c.expression, scope);
            if (Array.isArray(v)) out.push(...v.flat(Infinity));
            else out.push(v);
          } catch (e) {
            if (e instanceof Unsupported) this.warn(`Ada ekspresi yang dilewati: ${e.message}`);
            else throw e;
          }
          break;
        case "JSXElement": case "JSXFragment": out.push(this.renderJsx(c, scope)); break;
        case "JSXSpreadChild": break;
        default: break;
      }
    }
    return out;
  }

  renderJsx(node: Any, scope: Scope): Raw {
    this.tick();
    if (node.type === "JSXFragment") return new Raw(this.toHtml(this.evalChildren(node.children, scope)));
    const opening = node.openingElement;
    const nm = this.jsxName(opening.name);
    const props = this.evalAttrs(opening.attributes, scope);
    const kids = this.evalChildren(node.children, scope);
    if (nm.kind === "expr") {
      let comp: Any;
      try {
        comp = this.evalExpr(nm.node, scope);
      } catch (e) {
        if (e instanceof Unsupported) {
          this.warn(`Komponen tidak ditemukan: ${e.message}`);
          return new Raw(this.toHtml(kids));
        }
        throw e;
      }
      const p = { ...props, children: kids.length === 0 ? undefined : kids.length === 1 ? kids[0] : kids };
      if (comp instanceof Fn || comp instanceof Native) {
        try {
          const r = this.callValue(comp, [p]);
          return r instanceof Raw ? r : new Raw(this.toHtml(r));
        } catch (e) {
          if (e instanceof Unsupported) {
            const label = comp instanceof Fn ? comp.name || "komponen" : comp.name;
            this.warn(`Komponen ${label} dilewati: ${e.message}`);
            return new Raw("");
          }
          throw e;
        }
      }
      if (comp === undefined) return new Raw(this.toHtml(kids));
      this.warn("Ada komponen yang tidak bisa dirender — dilewati.");
      return new Raw("");
    }
    return this.renderHost(nm.tag, props, kids);
  }

  private renderHost(tag: string, props: Record<string, Any>, kids: Any[]): Raw {
    if (this.out > MAX_OUT) throw new Unsupported("hasil terlalu besar");
    const a = this.attrsToHtml(tag, props);
    if (VOID_TAGS.has(tag)) return new Raw(`<${tag}${a}>`);
    let inner: string;
    if (props.dangerouslySetInnerHTML && typeof props.dangerouslySetInnerHTML === "object") inner = String((props.dangerouslySetInnerHTML as Any).__html ?? "");
    else if (tag === "script" || tag === "style") inner = kids.map((k) => (typeof k === "string" || typeof k === "number" ? String(k) : this.toHtml(k))).join("");
    else inner = this.toHtml(kids);
    const html = `<${tag}${a}>${inner}</${tag}>`;
    this.out += html.length;
    return new Raw(html);
  }

  private out = 0;

  private attrsToHtml(tag: string, props: Record<string, Any>): string {
    let s = "";
    for (const [k0, v0] of Object.entries(props)) {
      if (k0 === "children" || k0 === "key" || k0 === "ref" || k0 === "dangerouslySetInnerHTML" || k0 === "suppressHydrationWarning" || k0 === "suppressContentEditableWarning") continue;
      if (/^on[A-Z]/.test(k0)) {
        this.droppedHandlers.add(k0);
        continue;
      }
      let k = k0;
      let v = v0;
      if (v === undefined || v === null || v === false) continue;
      if (v instanceof Fn || v instanceof Native) continue;
      if (k === "style") {
        const css = styleToCss(v);
        if (css) s += ` style="${escAttr(css)}"`;
        continue;
      }
      if (KEBAB_ATTRS.has(k)) k = kebab(k);
      else if (ATTR_MAP[k]) k = ATTR_MAP[k];
      else if (k.startsWith("aria") && /^aria[A-Z]/.test(k)) k = kebab(k);
      if (k === "class" || k === "className") {
        v = clsx(v).replace(/\s+/g, " ").trim();
        if (!v) continue;
      }
      if ((k === "src" || k === "poster" || k === "data") && typeof v === "string") v = this.mapAsset(v);
      if (k === "srcset" && typeof v === "string") v = v.split(",").map((p) => { const [u, ...r] = p.trim().split(/\s+/); return [this.mapAsset(u), ...r].join(" "); }).join(", ");
      if ((k === "href") && typeof v === "string") v = tag === "a" || tag === "area" ? this.mapHref(v) : this.mapAsset(v);
      if (v === true) {
        s += STRING_BOOL_ATTRS.has(k) || k.startsWith("aria-") || k.startsWith("data-") ? ` ${k}="true"` : ` ${k}`;
        continue;
      }
      if (typeof v === "object") continue;
      s += ` ${k}="${escAttr(String(v))}"`;
    }
    return s;
  }

  /* ---------- tautan & aset ---------- */

  mapAsset(u: string): string {
    if (!u || /^(?:[a-z][a-z0-9+.-]*:|\/\/|#|data:)/i.test(u)) return u;
    if (u.startsWith("/")) return this.job.assetPrefix + u.slice(1);
    return u;
  }

  mapHref(h: string): string {
    if (!h || /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(h)) return h;
    const m = /^([^?#]*)([?#].*)?$/.exec(h);
    const path = m?.[1] ?? h;
    const rest = m?.[2] ?? "";
    if (path.startsWith("/")) {
      const key = path.length > 1 ? path.replace(/\/+$/, "") : path;
      const to = this.job.routeMap[key];
      if (to !== undefined) return to + (rest.startsWith("#") ? rest : "");
      return this.job.assetPrefix + path.slice(1) + rest;
    }
    return h;
  }

  private renderLink(p: Any): Raw {
    let href = p?.href;
    if (href && typeof href === "object") href = String(href.pathname ?? "") + (href.hash ? `#${href.hash}` : "");
    const { href: _h, prefetch, replace, scroll, shallow, passHref, legacyBehavior, locale, children, as, ...rest } = p ?? {};
    void _h; void prefetch; void replace; void scroll; void shallow; void passHref; void locale; void as;
    if (legacyBehavior) {
      this.warn("Link legacyBehavior: tautan tanpa elemen <a> sendiri mungkin perlu dicek.");
      return new Raw(this.toHtml(children));
    }
    const attrs = this.attrsToHtml("a", { ...rest, href: href ?? "#" });
    return new Raw(`<a${attrs}>${this.toHtml(children)}</a>`);
  }

  private renderImage(p: Any): Raw {
    const { src, alt, width, height, fill, priority, loading, quality, placeholder, blurDataURL, unoptimized, loader, onLoad, onError, sizes, style, className, ...rest } = p ?? {};
    void quality; void placeholder; void blurDataURL; void unoptimized; void loader; void onLoad; void onError;
    let url = src && typeof src === "object" ? String((src as Any).src ?? "") : String(src ?? "");
    url = this.mapAsset(url);
    const w = width ?? (src && typeof src === "object" ? (src as Any).width : undefined);
    const h = height ?? (src && typeof src === "object" ? (src as Any).height : undefined);
    const st = fill ? { position: "absolute", height: "100%", width: "100%", inset: 0, ...(style && typeof style === "object" ? style : {}) } : style;
    const attrs = this.attrsToHtml("img", { ...rest, src: url, alt: alt ?? "", width: w, height: h, sizes, className, style: st, loading: priority ? undefined : loading ?? "lazy" });
    return new Raw(`<img${attrs}>`);
  }

  private renderScript(p: Any): Raw {
    const { src, strategy, children, onLoad, onReady, onError, id, type, ...rest } = p ?? {};
    void strategy; void onLoad; void onReady; void onError;
    const attrs = this.attrsToHtml("script", { ...rest, id, type, src: typeof src === "string" ? this.mapAsset(src) : undefined });
    const inner = typeof children === "string" ? children : Array.isArray(children) ? children.filter((c: Any) => typeof c === "string").join("") : "";
    return new Raw(`<script${attrs}>${inner}</script>`);
  }

  private addCssModule(path: string): void {
    const code = this.files.get(path);
    if (!code || this.cssModules.some((c) => c.startsWith(`/* ${path} */`))) return;
    this.cssModules.push(`/* ${path} */\n${code.replace(/:global\(([^)]+)\)/g, "$1").replace(/^\s*composes:[^;]*;\s*$/gm, "")}`);
  }

  /* ---------- metadata & tailwind ---------- */

  private metadataOf(path: string): Any {
    try {
      const m = this.loadModule(path);
      const meta = this.moduleExport(m, "metadata");
      if (m.exports.has("generateMetadata")) this.warn(`${path}: generateMetadata() tidak dijalankan — judul/meta dari metadata statis saja.`);
      return meta && typeof meta === "object" ? meta : undefined;
    } catch {
      return undefined;
    }
  }

  private buildMeta(chain: string[]): string[] {
    let title: string | undefined;
    let template: string | undefined;
    const metas: string[] = [];
    const set = (name: string, v: Any, attr = "name") => {
      if (typeof v === "string" && v) {
        const i = metas.findIndex((x) => x.includes(`${attr}="${name}"`));
        const tag = `<meta ${attr}="${name}" content="${escAttr(v)}">`;
        if (i >= 0) metas[i] = tag;
        else metas.push(tag);
      }
    };
    for (const p of chain) {
      const md = this.metadataOf(p);
      if (!md) continue;
      const t = md.title;
      if (typeof t === "string") title = template ? template.replace("%s", t) : t;
      else if (t && typeof t === "object") {
        if (typeof t.template === "string") template = t.template;
        if (typeof t.default === "string") title = t.default;
        else if (typeof t.absolute === "string") title = t.absolute;
      }
      set("description", md.description);
      if (Array.isArray(md.keywords)) set("keywords", md.keywords.join(", "));
      else set("keywords", md.keywords);
      const og = md.openGraph;
      if (og && typeof og === "object") {
        set("og:title", typeof og.title === "string" ? og.title : title, "property");
        set("og:description", og.description ?? md.description, "property");
      }
    }
    return [...(title ? [`<title>${escText(title)}</title>`] : []), ...metas];
  }

  private tailwindConfigScript(): string {
    const cfgPath = this.job.files.find((f) => /(^|\/)tailwind\.config\.(js|ts|mjs|cjs)$/.test(f.path))?.path;
    if (!cfgPath) return "";
    try {
      const code = this.files.get(cfgPath) ?? "";
      const ast = this.parse(code, { sourceType: "module", plugins: ["typescript"], errorRecovery: true });
      let obj: Any;
      const scope = new Scope();
      for (const st of ast.program.body as Any[]) {
        if (st.type === "VariableDeclaration") {
          for (const d of st.declarations) if (d.init && d.id.type === "Identifier") {
            try { scope.vars.set(d.id.name, this.evalExpr(d.init, scope)); } catch { /* abaikan */ }
          }
        }
        if (st.type === "ExportDefaultDeclaration") obj = this.evalExpr(st.declaration, scope);
        if (st.type === "ExpressionStatement" && st.expression.type === "AssignmentExpression" && /module\.exports/.test(code.slice(st.start, st.start + 20))) obj = this.evalExpr(st.expression.right, scope);
      }
      if (!obj || typeof obj !== "object") return "";
      const keep: Any = {};
      for (const k of ["darkMode", "theme", "prefix"]) if (obj[k] !== undefined) keep[k] = obj[k];
      if (Object.keys(keep).length === 0) return "";
      const json = JSON.stringify(keep, (_k, v) => (v instanceof Fn || v instanceof Native ? undefined : v));
      return `<script>tailwind.config = ${json.replace(/</g, "\\u003c")}</script>`;
    } catch {
      this.warn("tailwind.config tidak bisa dibaca — tema kustom Tailwind tidak ikut.");
      return "";
    }
  }

  /* ---------- perakitan ---------- */

  run(): Promise<RenderOut> {
    return Promise.resolve().then(() => this.runSync());
  }

  private runSync(): RenderOut {
    const { job } = this;
    const pageMod = this.loadModule(job.page.path);
    let pageFn = this.moduleExport(pageMod, "default");
    if (pageFn === undefined) throw new Unsupported(`${job.page.path} tidak punya export default`);
    if (pageMod.exports.has("getServerSideProps") || pageMod.exports.has("getStaticProps")) {
      this.warn("getServerSideProps/getStaticProps tidak dijalankan — data diganti nilai kosong.");
    }
    const props = { params: {}, searchParams: {} };
    let tree: Any;
    try {
      tree = pageFn instanceof Fn || pageFn instanceof Native ? this.callValue(pageFn, [props]) : pageFn;
    } catch (e) {
      if (e instanceof Unsupported) throw new Unsupported(`halaman tidak bisa dirender: ${e.message}`);
      throw e;
    }
    let result: Raw = tree instanceof Raw ? tree : new Raw(this.toHtml(tree));

    if (job.router === "app") {
      for (const lp of [...job.layouts].reverse()) {
        try {
          const lm = this.loadModule(lp);
          const lf = this.moduleExport(lm, "default");
          const r = this.callValue(lf, [{ children: result, params: {} }]);
          result = r instanceof Raw ? r : new Raw(this.toHtml(r));
        } catch (e) {
          if (e instanceof Unsupported) this.warn(`Layout ${lp} dilewati: ${e.message}`);
          else throw e;
        }
      }
    } else {
      const appPath = job.layouts[0];
      if (appPath) {
        try {
          const am = this.loadModule(appPath);
          const af = this.moduleExport(am, "default");
          const Component = this.native(() => result, "Component");
          const r = this.callValue(af, [{ Component, pageProps: {}, router: {} }]);
          result = r instanceof Raw ? r : new Raw(this.toHtml(r));
        } catch (e) {
          if (e instanceof Unsupported) this.warn(`_app dilewati: ${e.message}`);
          else throw e;
        }
      }
    }

    // <Head> dari komponen & metadata
    const meta = job.router === "app" ? this.buildMeta([...job.layouts, job.page.path]) : [];
    const headParts: string[] = ['<meta charset="utf-8">', '<meta name="viewport" content="width=device-width, initial-scale=1">', ...meta];
    for (const h of this.head) if (h.trim()) headParts.push(h);
    for (const href of this.fontLinks) headParts.push(`<link rel="preconnect" href="https://fonts.googleapis.com">`, `<link href="${href}" rel="stylesheet">`);
    for (const href of job.cssLinks) headParts.push(`<link rel="stylesheet" href="${escAttr(href)}">`);
    if (job.tailwind) {
      headParts.push('<script src="https://cdn.tailwindcss.com"></script>');
      const cfg = this.tailwindConfigScript();
      if (cfg) headParts.push(cfg);
    }
    if (this.rootVars.length) headParts.push(`<style>:root { ${this.rootVars.join("; ")} }</style>`);
    if (this.cssModules.length) headParts.push(`<style>\n${this.cssModules.join("\n")}\n</style>`);

    let html = result.html;
    const headStr = headParts.join("\n");
    if (/^\s*<html[\s>]/i.test(html)) {
      // hapus meta/title duplikat bawaan layout bila sudah ada di <head> hasil render
      if (/<head[\s>]/i.test(html)) html = html.replace(/<head([^>]*)>/i, (m) => `${m}\n${headStr}\n`);
      else html = html.replace(/(<html[^>]*>)/i, `$1<head>\n${headStr}\n</head>`);
      if (!/^\s*<!doctype/i.test(html)) html = `<!DOCTYPE html>\n${html}`;
    } else {
      html = `<!DOCTYPE html>\n<html lang="id">\n<head>\n${headStr}\n</head>\n<body>\n${html}\n</body>\n</html>`;
    }

    if (this.droppedHandlers.size) {
      this.warn(`Interaksi (${[...this.droppedHandlers].slice(0, 4).join(", ")}${this.droppedHandlers.size > 4 ? ", …" : ""}) tidak ikut: hasilnya HTML statis dengan nilai awal state.`);
    }
    return { html: prettyHtml(html), warnings: this.warnings };
  }
}

/* ------------------------------------------------------------------ */
/* pemformat HTML sederhana                                            */
/* ------------------------------------------------------------------ */

const INLINE = new Set(["a", "abbr", "b", "bdi", "bdo", "br", "cite", "code", "data", "dfn", "em", "i", "kbd", "label", "mark", "q", "s", "samp", "small", "span", "strong", "sub", "sup", "time", "u", "var", "wbr", "img", "svg", "path", "button", "select", "input", "textarea"]);
const RAW_TEXT = new Set(["script", "style", "pre", "textarea"]);

interface HNode {
  tag?: string;
  attrs?: string;
  text?: string;
  kids?: HNode[];
  raw?: string;
}

function parseLoose(html: string): HNode[] {
  const root: HNode = { kids: [] };
  const stack: HNode[] = [root];
  const re = /<!--[\s\S]*?-->|<!doctype[^>]*>|<\/?([a-zA-Z][\w:-]*)([^>]*)>|[^<]+|</gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const tok = m[0];
    const top = stack[stack.length - 1];
    if (tok.startsWith("<!--") || /^<!doctype/i.test(tok)) {
      (top.kids ??= []).push({ raw: tok });
    } else if (tok.startsWith("</")) {
      const name = m[1].toLowerCase();
      for (let i = stack.length - 1; i > 0; i--) {
        if (stack[i].tag === name) {
          stack.length = i;
          break;
        }
      }
    } else if (tok.startsWith("<") && m[1]) {
      const name = m[1].toLowerCase();
      const el: HNode = { tag: name, attrs: m[2].replace(/\/\s*$/, ""), kids: [] };
      (top.kids ??= []).push(el);
      const selfClose = /\/\s*$/.test(m[2]) && !VOID_TAGS.has(name);
      if (VOID_TAGS.has(name) || selfClose) continue;
      if (RAW_TEXT.has(name)) {
        const close = new RegExp(`</${name}\\s*>`, "i");
        const rest = html.slice(re.lastIndex);
        const cm = close.exec(rest);
        const body = cm ? rest.slice(0, cm.index) : rest;
        if (body) el.kids!.push({ raw: body });
        re.lastIndex += body.length + (cm ? cm[0].length : 0);
        continue;
      }
      stack.push(el);
    } else {
      const text = tok.replace(/\s+/g, " ");
      if (text.trim() || (top.tag && INLINE.has(top.tag))) (top.kids ??= []).push({ text });
    }
  }
  return root.kids ?? [];
}

function flatInline(n: HNode): boolean {
  if (n.text !== undefined) return true;
  if (n.raw !== undefined) return !n.raw.includes("\n");
  if (!n.tag) return false;
  if (RAW_TEXT.has(n.tag) && n.tag !== "textarea") return false;
  if (!INLINE.has(n.tag) && n.tag !== "li" && n.tag !== "p" && !/^h[1-6]$/.test(n.tag) && n.tag !== "td" && n.tag !== "th" && n.tag !== "title" && n.tag !== "option" && n.tag !== "summary" && n.tag !== "figcaption" && n.tag !== "dt" && n.tag !== "dd" && n.tag !== "blockquote") return false;
  return (n.kids ?? []).every(flatInline);
}

function flatText(n: HNode): string {
  if (n.text !== undefined) return n.text;
  if (n.raw !== undefined) return n.raw;
  const inner = (n.kids ?? []).map(flatText).join("");
  return VOID_TAGS.has(n.tag!) ? `<${n.tag}${n.attrs}>` : `<${n.tag}${n.attrs}>${inner}</${n.tag}>`;
}

function printNode(n: HNode, ind: string, out: string[]): void {
  if (n.text !== undefined) {
    const t = n.text.trim();
    if (t) out.push(ind + t);
    return;
  }
  if (n.raw !== undefined) {
    out.push(ind + n.raw.trim());
    return;
  }
  const tag = n.tag!;
  if (VOID_TAGS.has(tag)) {
    out.push(`${ind}<${tag}${n.attrs}>`);
    return;
  }
  if (RAW_TEXT.has(tag)) {
    const body = (n.kids ?? []).map((k) => k.raw ?? "").join("");
    if (tag === "pre" || tag === "textarea") out.push(`${ind}<${tag}${n.attrs}>${body}</${tag}>`);
    else if (!body.trim()) out.push(`${ind}<${tag}${n.attrs}></${tag}>`);
    else out.push(`${ind}<${tag}${n.attrs}>`, ...body.replace(/^\n+|\s+$/g, "").split("\n").map((l) => (l.trim() ? `${ind}  ${l.replace(/^\s{0,}/, (s) => s)}` : "")), `${ind}</${tag}>`);
    return;
  }
  const kids = n.kids ?? [];
  if (kids.length === 0) {
    out.push(`${ind}<${tag}${n.attrs}></${tag}>`);
    return;
  }
  if (flatInline(n)) {
    const one = flatText(n).replace(/\s+/g, " ");
    if (ind.length + one.length <= 120) {
      out.push(ind + one);
      return;
    }
  }
  out.push(`${ind}<${tag}${n.attrs}>`);
  const childInd = tag === "html" || tag === "body" && false ? ind : ind + "  ";
  // kelompokkan anak inline berurutan jadi satu baris
  let buf: HNode[] = [];
  const flush = () => {
    if (!buf.length) return;
    const line = buf.map(flatText).join("").replace(/\s+/g, " ").trim();
    const hasText = buf.some((b) => b.text !== undefined);
    if (line && (hasText || childInd.length + line.length <= 110 || buf.length === 1)) out.push(childInd + line);
    else for (const b of buf) out.push(childInd + flatText(b).replace(/\s+/g, " ").trim());
    buf = [];
  };
  for (const k of kids) {
    if (flatInline(k) && (k.text !== undefined || (k.tag && INLINE.has(k.tag)))) buf.push(k);
    else {
      flush();
      printNode(k, childInd, out);
    }
  }
  flush();
  out.push(`${ind}</${tag}>`);
}

export function prettyHtml(html: string): string {
  const nodes = parseLoose(html);
  const out: string[] = [];
  for (const n of nodes) printNode(n, "", out);
  return out.join("\n") + "\n";
}

/** Render satu file komponen (JSX/TSX) tanpa konteks Next: dipakai untuk konversi JSX → HTML. */
export async function renderComponentFile(path: string, code: string, extraFiles: { path: string; code: string }[] = []): Promise<RenderOut> {
  return renderPage({
    router: "pages",
    route: "/",
    page: { path, code },
    layouts: [],
    files: extraFiles,
    resolved: {},
    routeMap: { "/": "index.html" },
    assetPrefix: "",
    cssLinks: [],
    imageImports: [],
    tailwind: false,
  });
}
