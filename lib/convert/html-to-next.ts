/**
 * Konversi proyek HTML statis → proyek Next.js 16 (App Router, TypeScript).
 *
 * Seluruhnya deterministik dan jalan di browser (tanpa AI, tanpa server, tanpa kuota):
 *  - tiap halaman .html jadi app/<rute>/page.tsx (index.html → app/page.tsx, 404.html → app/not-found.tsx)
 *  - <title>/<meta>/<link rel=icon> jadi `export const metadata`
 *  - <style> jadi file CSS, <link rel=stylesheet> tetap jadi stylesheet, tautan antarhalaman jadi <Link>
 *  - <script> (inline maupun src) dijalankan ulang tiap halaman dibuka lewat komponen PageScripts,
 *    jadi perilaku JavaScript lama tetap hidup walau Next berpindah halaman tanpa reload
 *  - aset (gambar, font, css, js) disalin ke public/ dengan path yang sama, jadi URL lama tetap valid
 *
 * File ini sengaja mandiri (tanpa import) supaya bisa dites langsung dengan Node.
 */

/* ================================================================== */
/*  Tipe publik                                                        */
/* ================================================================== */

export interface SourceFile {
  /** Path relatif memakai "/", tanpa folder pembungkus. */
  path: string;
  data: Uint8Array;
}

export interface OutputFile {
  path: string;
  data: Uint8Array | string;
}

export interface ConvertedPage {
  from: string;
  route: string;
  out: string;
}

export interface HtmlToNextResult {
  files: OutputFile[];
  pages: ConvertedPage[];
  warnings: string[];
}

/* ================================================================== */
/*  Parser HTML (toleran, tanpa DOM supaya bisa dites di Node)          */
/* ================================================================== */

type Attr = [name: string, value: string | null];

interface ElNode {
  t: "el";
  tag: string;
  attrs: Attr[];
  kids: HNode[];
  selfClosed: boolean;
}
interface TextNode {
  t: "text";
  text: string;
}
interface CommentNode {
  t: "comment";
  text: string;
}
type HNode = ElNode | TextNode | CommentNode;

const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr", "command", "keygen"]);
const RAW_TEXT = new Set(["script", "style", "textarea", "title"]);

const P_CLOSERS = new Set([
  "address", "article", "aside", "blockquote", "details", "div", "dl", "fieldset", "figcaption", "figure", "footer", "form",
  "h1", "h2", "h3", "h4", "h5", "h6", "header", "hgroup", "hr", "main", "menu", "nav", "ol", "p", "pre", "section", "table", "ul",
]);

/** Tag pembuka `open` otomatis menutup tag `cur` yang sedang terbuka (aturan "implied end tag" HTML). */
function impliedClose(cur: string, open: string): boolean {
  switch (cur) {
    case "p":
      return P_CLOSERS.has(open);
    case "li":
      return open === "li";
    case "dt":
    case "dd":
      return open === "dt" || open === "dd";
    case "option":
      return open === "option" || open === "optgroup";
    case "optgroup":
      return open === "optgroup";
    case "tr":
      return open === "tr" || open === "tbody" || open === "thead" || open === "tfoot";
    case "td":
    case "th":
      return open === "td" || open === "th" || open === "tr" || open === "tbody" || open === "thead" || open === "tfoot";
    case "thead":
    case "tbody":
    case "tfoot":
      return open === "tbody" || open === "thead" || open === "tfoot";
    default:
      return false;
  }
}

const lc = (s: string): string => s.toLowerCase();

function readAttrs(src: string, start: number): { attrs: Attr[]; end: number; selfClosed: boolean } {
  const attrs: Attr[] = [];
  const n = src.length;
  let i = start;
  const nameRe = /[^\s"'<>\/=]+/y;
  while (i < n) {
    while (i < n && /\s/.test(src[i])) i++;
    if (i >= n) break;
    const ch = src[i];
    if (ch === ">") return { attrs, end: i + 1, selfClosed: false };
    if (ch === "/") {
      if (src[i + 1] === ">") return { attrs, end: i + 2, selfClosed: true };
      i++;
      continue;
    }
    nameRe.lastIndex = i;
    const m = nameRe.exec(src);
    if (!m) {
      i++; // karakter aneh (mis. kutip nyasar): lewati
      continue;
    }
    const name = m[0];
    i += name.length;
    let j = i;
    while (j < n && /\s/.test(src[j])) j++;
    if (src[j] === "=") {
      j++;
      while (j < n && /\s/.test(src[j])) j++;
      const q = src[j];
      if (q === '"' || q === "'") {
        const close = src.indexOf(q, j + 1);
        const stop = close === -1 ? n : close;
        attrs.push([name, src.slice(j + 1, stop)]);
        i = close === -1 ? n : close + 1;
      } else {
        const m2 = /[^\s>]+/y;
        m2.lastIndex = j;
        const v = m2.exec(src);
        let val = v ? v[0] : "";
        // <a href=foo/> : "/" penutup bukan bagian nilai
        if (src[j + val.length] === ">" && val.endsWith("/") && val.length > 1) {
          val = val.slice(0, -1);
          attrs.push([name, val]);
          return { attrs, end: j + val.length + 2, selfClosed: true };
        }
        attrs.push([name, val]);
        i = j + val.length;
      }
    } else {
      attrs.push([name, null]);
    }
  }
  return { attrs, end: n, selfClosed: false };
}

export function parseHtml(src: string): ElNode {
  const n = src.length;
  const root: ElNode = { t: "el", tag: "#root", attrs: [], kids: [], selfClosed: false };
  const stack: ElNode[] = [root];
  const top = (): ElNode => stack[stack.length - 1];
  const pushText = (text: string): void => {
    if (!text) return;
    const kids = top().kids;
    const last = kids[kids.length - 1];
    if (last && last.t === "text") last.text += text;
    else kids.push({ t: "text", text });
  };

  let i = 0;
  const closeRe = /<\/([A-Za-z][^\s>\/]*)[^>]*>/y;
  const nameRe = /<([A-Za-z][^\s\/>]*)/y;
  while (i < n) {
    const lt = src.indexOf("<", i);
    if (lt === -1) {
      pushText(src.slice(i));
      break;
    }
    if (lt > i) pushText(src.slice(i, lt));
    i = lt;
    const next = src[i + 1] ?? "";
    if (src.startsWith("<!--", i)) {
      const end = src.indexOf("-->", i + 4);
      top().kids.push({ t: "comment", text: src.slice(i + 4, end === -1 ? n : end) });
      i = end === -1 ? n : end + 3;
      continue;
    }
    if (next === "!" || next === "?") {
      const end = src.indexOf(">", i);
      i = end === -1 ? n : end + 1;
      continue;
    }
    if (next === "/") {
      closeRe.lastIndex = i;
      const m = closeRe.exec(src);
      if (!m) {
        pushText("<");
        i++;
        continue;
      }
      const want = lc(m[1]);
      for (let k = stack.length - 1; k > 0; k--) {
        if (lc(stack[k].tag) === want) {
          stack.length = k;
          break;
        }
      }
      i += m[0].length;
      continue;
    }
    if (/[A-Za-z]/.test(next)) {
      nameRe.lastIndex = i;
      const m = nameRe.exec(src)!;
      const tag = m[1];
      const ltag = lc(tag);
      const { attrs, end, selfClosed } = readAttrs(src, i + m[0].length);
      while (stack.length > 1 && impliedClose(lc(top().tag), ltag)) stack.pop();
      const el: ElNode = { t: "el", tag, attrs, kids: [], selfClosed };
      top().kids.push(el);
      i = end;
      if (selfClosed || VOID.has(ltag)) continue;
      if (RAW_TEXT.has(ltag)) {
        const re = new RegExp(`</${ltag}\\s*>`, "i");
        const rest = src.slice(i);
        const found = re.exec(rest);
        const body = found ? rest.slice(0, found.index) : rest;
        if (body) el.kids.push({ t: "text", text: body });
        i += found ? found.index + found[0].length : rest.length;
        continue;
      }
      stack.push(el);
      continue;
    }
    pushText("<");
    i++;
  }
  return root;
}

/* ================================================================== */
/*  Utilitas umum                                                      */
/* ================================================================== */

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", copy: "©", reg: "®", trade: "™", hellip: "…", mdash: "—", ndash: "–",
  lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”", bull: "•", middot: "·", laquo: "«", raquo: "»", times: "×", rarr: "→", larr: "←",
};

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|[A-Za-z][A-Za-z0-9]*);/g, (all, body: string) => {
    if (body[0] === "#") {
      const code = body[1] === "x" || body[1] === "X" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff) return all;
      try {
        return String.fromCodePoint(code);
      } catch {
        return all;
      }
    }
    return NAMED_ENTITIES[body] ?? all;
  });
}

const getAttr = (el: ElNode, name: string): string | null | undefined => {
  for (const [k, v] of el.attrs) if (lc(k) === name) return v;
  return undefined;
};
const hasAttr = (el: ElNode, name: string): boolean => getAttr(el, name) !== undefined;

const textOf = (el: ElNode): string => el.kids.map((k) => (k.t === "text" ? k.text : k.t === "el" ? textOf(k) : "")).join("");

function findChild(el: ElNode, tag: string): ElNode | undefined {
  for (const k of el.kids) if (k.t === "el" && lc(k.tag) === tag) return k;
  return undefined;
}

/** Serialisasi node kembali ke HTML (dipakai untuk <noscript>). */
function serialize(nodes: HNode[]): string {
  let out = "";
  for (const nd of nodes) {
    if (nd.t === "text") out += nd.text;
    else if (nd.t === "comment") out += `<!--${nd.text}-->`;
    else {
      const attrs = nd.attrs.map(([k, v]) => (v === null ? ` ${k}` : ` ${k}="${v.replace(/"/g, "&quot;")}"`)).join("");
      if (VOID.has(lc(nd.tag))) out += `<${nd.tag}${attrs}>`;
      else out += `<${nd.tag}${attrs}>${serialize(nd.kids)}</${nd.tag}>`;
    }
  }
  return out;
}

/* ---------- path & URL ---------- */

function dirOf(path: string): string {
  const i = path.lastIndexOf("/");
  return i === -1 ? "" : path.slice(0, i);
}

/** Gabungkan dir + rel, selesaikan ./ dan ../ (".." di root diabaikan, sama seperti browser). */
function resolvePath(dir: string, rel: string): string {
  const parts = (rel.startsWith("/") ? [] : dir ? dir.split("/") : []).concat(rel.split("/"));
  const out: string[] = [];
  for (const p of parts) {
    if (p === "" || p === ".") continue;
    if (p === "..") out.pop();
    else out.push(p);
  }
  return out.join("/");
}

const isHtmlPath = (p: string): boolean => /\.html?$/i.test(p);

function slugSeg(s: string): string {
  return (
    s
      .replace(/\.html?$/i, "")
      .replace(/[^A-Za-z0-9._-]+/g, "-")
      .replace(/^[._-]+/, "")
      .replace(/-+$/g, "") || "page"
  );
}

/** "index.html" → "/", "a/b.html" → "/a/b", "a/index.html" → "/a". */
export function routeOfHtml(path: string): string {
  const parts = path.split("/").filter(Boolean);
  const last = parts.pop() ?? "index.html";
  const segs = parts.map(slugSeg);
  if (!/^index\.html?$/i.test(last)) segs.push(slugSeg(last));
  return "/" + segs.join("/");
}

const SKIP_NAME = /(^|\/)(\.DS_Store|Thumbs\.db|__MACOSX)(\/|$)/;
const RESERVED_ROOT = /^(package\.json|package-lock\.json|yarn\.lock|pnpm-lock\.yaml|tsconfig\.json|next\.config\.(js|mjs|ts)|next-env\.d\.ts|\.gitignore)$/;

/* ================================================================== */
/*  CSS: tulis ulang url() relatif jadi absolut-dari-root               */
/* ================================================================== */

const EXTERNAL_RE = /^(?:[a-z][a-z0-9+.-]*:|\/\/|#|\{|<%|\$\{)/i;

interface Project {
  /** path (huruf asli) semua file proyek. */
  paths: Set<string>;
  /** path halaman HTML → rute. */
  routes: Map<string, string>;
  warnings: Set<string>;
}

function fixUrl(raw: string, pageDir: string, proj: Project): { url: string; internalRoute: boolean } {
  const v = raw.trim();
  if (!v || EXTERNAL_RE.test(v)) return { url: raw, internalRoute: false };
  const m = /^([^?#]*)([?#].*)?$/.exec(v)!;
  const pathPart = decodeURI(m[1]);
  const tail = m[2] ?? "";
  if (!pathPart) return { url: raw, internalRoute: false };
  const resolved = resolvePath(pageDir, pathPart);
  // Folder ("blog/") → blog/index.html
  const asFolder = pathPart.endsWith("/") || (!/\.[A-Za-z0-9]+$/.test(pathPart) && proj.routes.has(`${resolved ? resolved + "/" : ""}index.html`));
  const candidates = asFolder ? [`${resolved ? resolved + "/" : ""}index.html`, `${resolved ? resolved + "/" : ""}index.htm`] : [resolved];
  for (const c of candidates) {
    const route = proj.routes.get(c);
    if (route !== undefined) return { url: route + tail, internalRoute: true };
  }
  if (isHtmlPath(resolved)) {
    proj.warnings.add(`Tautan ke halaman "${resolved}" tidak ditemukan di proyek.`);
    return { url: "/" + resolved + tail, internalRoute: false };
  }
  return { url: "/" + resolved + tail, internalRoute: false };
}

function fixCssUrls(css: string, pageDir: string, proj: Project): string {
  return css.replace(/url\(\s*(["']?)([^"')]+)\1\s*\)/gi, (all, q: string, u: string) => {
    const t = u.trim();
    if (!t || EXTERNAL_RE.test(t) || t.startsWith("/")) return all;
    const { url } = fixUrl(t, pageDir, proj);
    return `url(${q}${url}${q})`;
  });
}

/* ================================================================== */
/*  Atribut → JSX                                                      */
/* ================================================================== */

const ATTR_MAP: Record<string, string> = {
  class: "className", for: "htmlFor", tabindex: "tabIndex", readonly: "readOnly", maxlength: "maxLength", minlength: "minLength",
  colspan: "colSpan", rowspan: "rowSpan", cellpadding: "cellPadding", cellspacing: "cellSpacing", frameborder: "frameBorder",
  allowfullscreen: "allowFullScreen", autoplay: "autoPlay", autofocus: "autoFocus", autocomplete: "autoComplete",
  autocapitalize: "autoCapitalize", autocorrect: "autoCorrect", contenteditable: "contentEditable", crossorigin: "crossOrigin",
  srcset: "srcSet", datetime: "dateTime", enctype: "encType", novalidate: "noValidate", accesskey: "accessKey", charset: "charSet",
  "http-equiv": "httpEquiv", usemap: "useMap", playsinline: "playsInline", spellcheck: "spellCheck", srclang: "srcLang",
  hreflang: "hrefLang", itemscope: "itemScope", itemprop: "itemProp", itemtype: "itemType", itemid: "itemID", itemref: "itemRef",
  referrerpolicy: "referrerPolicy", fetchpriority: "fetchPriority", formaction: "formAction", formenctype: "formEncType",
  formmethod: "formMethod", formnovalidate: "formNoValidate", formtarget: "formTarget", inputmode: "inputMode", ismap: "isMap",
  nomodule: "noModule", marginheight: "marginHeight", marginwidth: "marginWidth", controlslist: "controlsList",
  disablepictureinpicture: "disablePictureInPicture", enterkeyhint: "enterKeyHint", viewbox: "viewBox",
  preserveaspectratio: "preserveAspectRatio",
};

const BOOLEAN_ATTRS = new Set([
  "disabled", "checked", "selected", "readonly", "required", "multiple", "autofocus", "autoplay", "controls", "loop", "muted",
  "playsinline", "hidden", "open", "novalidate", "async", "defer", "reversed", "default", "ismap", "itemscope", "allowfullscreen",
  "formnovalidate", "nomodule", "inert",
]);

const NUMBER_ATTRS = new Set(["tabindex", "colspan", "rowspan", "span", "size", "maxlength", "minlength", "rows", "cols", "start"]);

const EVENT_MAP: Record<string, string> = {
  onclick: "onClick", ondblclick: "onDoubleClick", onchange: "onChange", oninput: "onInput", onsubmit: "onSubmit", onfocus: "onFocus",
  onblur: "onBlur", onkeydown: "onKeyDown", onkeyup: "onKeyUp", onkeypress: "onKeyPress", onmouseover: "onMouseOver",
  onmouseout: "onMouseOut", onmouseenter: "onMouseEnter", onmouseleave: "onMouseLeave", onmousedown: "onMouseDown",
  onmouseup: "onMouseUp", onmousemove: "onMouseMove", onload: "onLoad", onerror: "onError", onscroll: "onScroll",
  oncontextmenu: "onContextMenu", ontouchstart: "onTouchStart", ontouchend: "onTouchEnd", ontouchmove: "onTouchMove",
  onreset: "onReset", onselect: "onSelect", onwheel: "onWheel", oncopy: "onCopy", onpaste: "onPaste", oncut: "onCut",
  onplay: "onPlay", onpause: "onPause", onended: "onEnded", ondrag: "onDrag", ondrop: "onDrop", ondragover: "onDragOver",
};

/** Properti CSS "kebab-case" → camelCase untuk objek style React. */
function cssProp(name: string): string {
  if (name.startsWith("--")) return name;
  const n = name.trim().toLowerCase();
  if (n.startsWith("-ms-")) return "ms" + n.slice(4).replace(/-([a-z])/g, (_, c: string) => c.toUpperCase()).replace(/^./, (c) => c.toUpperCase());
  return n.replace(/^-/, "").replace(/-([a-z])/g, (_, c: string) => c.toUpperCase()).replace(/^(webkit|moz|o)(?=[A-Z])/, (m) => m[0].toUpperCase() + m.slice(1));
}

/** Pecah deklarasi CSS pada ";" yang berada di luar kurung dan kutip. */
function splitDecls(css: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let quote = "";
  let cur = "";
  for (const ch of css) {
    if (quote) {
      if (ch === quote) quote = "";
    } else if (ch === '"' || ch === "'") quote = ch;
    else if (ch === "(") depth++;
    else if (ch === ")") depth = Math.max(0, depth - 1);
    else if (ch === ";" && depth === 0) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out;
}

function styleToObject(css: string): string | null {
  const entries: string[] = [];
  for (const decl of splitDecls(css)) {
    const idx = decl.indexOf(":");
    if (idx === -1) continue;
    const prop = decl.slice(0, idx).trim();
    let val = decl.slice(idx + 1).trim().replace(/\s*!important\s*$/i, "");
    if (!prop || !val) continue;
    val = decodeEntities(val);
    const key = /^[A-Za-z_$][\w$]*$/.test(cssProp(prop)) ? cssProp(prop) : JSON.stringify(cssProp(prop));
    entries.push(`${key}: ${JSON.stringify(val)}`);
  }
  return entries.length ? `{{ ${entries.join(", ")} }}` : null;
}

interface EmitCtx {
  pageDir: string;
  proj: Project;
  /** Objek bersama (tidak ikut tersalin saat ctx di-spread) supaya penanda dari elemen anak sampai ke halaman. */
  state: { usesLink: boolean };
  /** Dipakai untuk membedakan SVG (atribut camelCase, <style> tetap). */
  inSvg: boolean;
  inPre: boolean;
}

function jsString(v: string): string {
  return v.includes('"') ? `{${JSON.stringify(decodeEntities(v))}}` : `"${v}"`;
}

function handlerFor(attr: string, value: string, tag: string, ctx: EmitCtx): string {
  const code = decodeEntities(value).trim().replace(/;+$/, "");
  const jsx = EVENT_MAP[lc(attr)];
  if (!jsx) {
    ctx.proj.warnings.add(`Atribut ${attr} pada <${tag}> tidak dikenali dan dihapus.`);
    return "";
  }
  if (/^return\s+false$/.test(code) || /^event\.preventDefault\(\)$/.test(code)) return `${jsx}={(e) => { e.preventDefault(); }}`;
  const fix = (a: string): string => a.replace(/\bthis\b/g, "e.currentTarget").replace(/\bevent\b/g, "e.nativeEvent");
  const GLOBALS = /^(this|event|document|window|console|alert|confirm|prompt|history|location|navigator)\b/;
  const m = /^(return\s+)?([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\(([^()]*)\)$/.exec(code);
  // Fungsi buatan sendiri (didefinisikan di skrip lama) → dipanggil lewat window.
  if (m && !GLOBALS.test(m[2])) {
    const call = `(window as any).${m[2]}(${fix(m[3])})`;
    return m[1] ? `${jsx}={(e) => { if (${call} === false) e.preventDefault(); }}` : `${jsx}={(e) => { ${call}; }}`;
  }
  // Perintah bawaan browser: kodenya sah apa adanya di TypeScript.
  const plain = code.replace(/^return\s+/, "");
  if (GLOBALS.test(plain) && !/=>|\bfunction\b/.test(plain)) return `${jsx}={(e) => { ${fix(plain)}; }}`;
  ctx.proj.warnings.add(`${attr}="${code.slice(0, 60)}${code.length > 60 ? "…" : ""}" pada <${tag}> perlu ditulis ulang sebagai handler React (ditandai TODO).`);
  return `${jsx}={() => { /* TODO dari ${attr}: ${code.replace(/\*\//g, "* /").replace(/\s+/g, " ").slice(0, 160)} */ }}`;
}

/** Satu atribut HTML → potongan JSX ("" bila dihapus). */
function jsxAttr(el: ElNode, name: string, value: string | null, ctx: EmitCtx): string {
  const ln = lc(name);
  const tag = lc(el.tag);

  if (/^on[a-z]+$/.test(ln)) return value === null ? "" : handlerFor(name, value, tag, ctx);
  if (ln === "style") {
    if (value === null) return "";
    const obj = styleToObject(fixCssUrls(value, ctx.pageDir, ctx.proj));
    return obj ? `style=${obj}` : "";
  }

  // Nama yang tidak sah sebagai atribut JSX (@click, :class, [prop], x.y) → lewat spread.
  if (!/^[A-Za-z_][\w.:-]*$/.test(name) || /\./.test(name)) {
    return `{...{ ${JSON.stringify(name)}: ${value === null ? '""' : JSON.stringify(decodeEntities(value))} }}`;
  }

  let out = name;
  if (ctx.inSvg) {
    if (ln === "class") out = "className";
    else if (/^xlink:/.test(ln)) out = "xlink" + ln.slice(6).replace(/^./, (c) => c.toUpperCase());
    else if (/^xml:/.test(ln)) out = "xml" + ln.slice(4).replace(/^./, (c) => c.toUpperCase());
    else if (ln === "xmlns:xlink") out = "xmlnsXlink";
    else if (ATTR_MAP[ln] && ln !== "for") out = ATTR_MAP[ln];
    else if (!/^(data|aria)-/.test(ln) && name.includes("-")) out = name.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
  } else {
    out = ATTR_MAP[ln] ?? (/^(data|aria)-/.test(ln) ? ln : name);
  }

  // value/checked pada input → defaultValue/defaultChecked supaya tidak dianggap "controlled".
  if (tag === "input" || tag === "textarea") {
    const type = lc(String(getAttr(el, "type") ?? "text"));
    const readOnlyTypes = new Set(["checkbox", "radio", "hidden", "submit", "button", "reset", "image"]);
    if (ln === "value" && !readOnlyTypes.has(type)) out = "defaultValue";
    if (ln === "checked") out = "defaultChecked";
  }

  if (value === null) {
    if (BOOLEAN_ATTRS.has(ln) || ln === "contenteditable") return out;
    return `${out}=""`;
  }
  if (BOOLEAN_ATTRS.has(ln) && (value === "" || lc(value) === ln || lc(value) === "true" || lc(value) === "false")) return out;
  if (NUMBER_ATTRS.has(ln) && /^-?\d+$/.test(value.trim())) return `${out}={${Number(value.trim())}}`;

  let v = value;
  if (ln === "src" || ln === "href" || ln === "poster" || ln === "data-src" || ln === "action") {
    v = fixUrl(decodeEntities(v), ctx.pageDir, ctx.proj).url.replace(/&/g, "&amp;");
  } else if (ln === "srcset") {
    v = decodeEntities(v)
      .split(",")
      .map((part) => {
        const [u, ...rest] = part.trim().split(/\s+/);
        return [fixUrl(u, ctx.pageDir, ctx.proj).url, ...rest].join(" ");
      })
      .join(", ")
      .replace(/&/g, "&amp;");
  }
  if (tag === "button" && ln === "type") v = lc(v);
  return `${out}=${jsString(v)}`;
}

/* ================================================================== */
/*  Node → JSX                                                         */
/* ================================================================== */

const INLINE = new Set([
  "a", "abbr", "b", "bdi", "bdo", "big", "button", "cite", "code", "data", "dfn", "em", "font", "i", "img", "input", "kbd", "label",
  "mark", "q", "s", "samp", "select", "small", "span", "strike", "strong", "sub", "sup", "svg", "textarea", "time", "tt", "u", "var",
]);

const isInlineNode = (nd: HNode | undefined): boolean => !!nd && (nd.t === "text" || (nd.t === "el" && INLINE.has(lc(nd.tag))));

function escapeJsxText(s: string): string {
  return s.replace(/\{/g, "&#123;").replace(/\}/g, "&#125;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Hasil pemrosesan satu dokumen; elemen yang dipindahkan (script/style/link) tidak ikut di JSX. */
interface Collected {
  styles: string[];
  stylesheets: { href: string; extra: string }[];
  scripts: { src?: string; code?: string; module?: boolean }[];
}

function hoistable(el: ElNode, ctx: EmitCtx, col: Collected): boolean {
  const tag = lc(el.tag);
  if (ctx.inSvg) return false;
  if (tag === "style") {
    col.styles.push(fixCssUrls(textOf(el), ctx.pageDir, ctx.proj));
    return true;
  }
  if (tag === "script") {
    const type = lc(String(getAttr(el, "type") ?? ""));
    if (type && type !== "text/javascript" && type !== "application/javascript" && type !== "module") return false; // JSON-LD, template, dsb.
    const src = getAttr(el, "src");
    if (src) col.scripts.push({ src: fixUrl(decodeEntities(src), ctx.pageDir, ctx.proj).url, module: type === "module" });
    else if (textOf(el).trim()) col.scripts.push({ code: textOf(el), module: type === "module" });
    return true;
  }
  if (tag === "link" && lc(String(getAttr(el, "rel") ?? "")) === "stylesheet") {
    const href = getAttr(el, "href");
    if (!href) return true;
    // atribut selain rel/href/type/media dipertahankan (integrity, crossorigin, ...)
    const extra = el.attrs
      .filter(([k]) => !["rel", "href", "type"].includes(lc(k)))
      .map(([k, v]) => jsxAttr(el, k, v, ctx))
      .filter(Boolean)
      .join(" ");
    col.stylesheets.push({ href: fixUrl(decodeEntities(href), ctx.pageDir, ctx.proj).url, extra });
    return true;
  }
  return false;
}

const isInlineEl = (nd: HNode | undefined): boolean => !!nd && nd.t === "el" && INLINE.has(lc(nd.tag));

function emitNodes(kids: HNode[], ctx: EmitCtx, col: Collected, indent: string): string[] {
  const lines: string[] = [];
  for (let idx = 0; idx < kids.length; idx++) {
    const nd = kids[idx];
    const prev = kids[idx - 1];
    const next = kids[idx + 1];
    if (nd.t === "comment") continue;
    if (nd.t === "text") {
      if (ctx.inPre) {
        lines.push(`${indent}{${JSON.stringify(decodeEntities(nd.text))}}`);
        continue;
      }
      if (!nd.text.trim()) {
        // spasi di antara dua elemen/teks sebaris bermakna; JSX membuangnya, jadi tulis eksplisit
        if (isInlineNode(prev) && isInlineNode(next)) lines.push(`${indent}{" "}`);
        continue;
      }
      if (/^\s/.test(nd.text) && isInlineEl(prev)) lines.push(`${indent}{" "}`);
      for (const l of nd.text.split("\n").map((x) => x.trim()).filter(Boolean)) lines.push(`${indent}${escapeJsxText(l)}`);
      if (/\s$/.test(nd.text) && isInlineEl(next)) lines.push(`${indent}{" "}`);
      continue;
    }
    if (hoistable(nd, ctx, col)) continue;
    lines.push(...emitElement(nd, ctx, col, indent));
  }
  return lines;
}

function emitElement(el: ElNode, ctx: EmitCtx, col: Collected, indent: string): string[] {
  const ltag = lc(el.tag);
  const inSvg = ctx.inSvg || ltag === "svg";
  const tag = inSvg ? el.tag : ltag;
  const sub: EmitCtx = { ...ctx, inSvg, inPre: ctx.inPre || ltag === "pre" || ltag === "textarea" };

  // <a href="halaman.html"> → <Link href="/halaman">
  let isLink = false;
  if (ltag === "a" && !inSvg) {
    const href = getAttr(el, "href");
    if (typeof href === "string" && fixUrl(decodeEntities(href), ctx.pageDir, ctx.proj).internalRoute) isLink = true;
  }

  // <select><option selected> → defaultValue pada <select> (selected pada <option> memicu peringatan React)
  let extraAttr = "";
  if (ltag === "select" && !inSvg && !hasAttr(el, "multiple")) {
    const opts: ElNode[] = [];
    const walk = (nodes: HNode[]): void => {
      for (const k of nodes) {
        if (k.t !== "el") continue;
        if (lc(k.tag) === "option") opts.push(k);
        else if (lc(k.tag) === "optgroup") walk(k.kids);
      }
    };
    walk(el.kids);
    const chosen = opts.find((o) => hasAttr(o, "selected"));
    if (chosen) {
      const val = getAttr(chosen, "value");
      extraAttr = `defaultValue=${jsString(typeof val === "string" ? val : decodeEntities(textOf(chosen)).trim())}`;
      chosen.attrs = chosen.attrs.filter(([k]) => lc(k) !== "selected");
    }
  }

  const parts: string[] = [];
  for (const [k, v] of el.attrs) {
    const a = jsxAttr(el, k, v, sub);
    if (a) parts.push(a);
  }
  if (extraAttr) parts.push(extraAttr);

  const jsxTag = isLink ? "Link" : tag;
  if (isLink) ctx.state.usesLink = true;
  const open = (selfClose: boolean): string => {
    const a = parts.join(" ");
    const oneLine = `<${jsxTag}${a ? " " + a : ""}${selfClose ? " /" : ""}>`;
    if (indent.length + oneLine.length <= 110 || parts.length < 2) return `${indent}${oneLine}`;
    return `${indent}<${jsxTag}\n${parts.map((p) => `${indent}  ${p}`).join("\n")}\n${indent}${selfClose ? "/" : ""}>`;
  };

  if (VOID.has(ltag) && !inSvg) return [open(true)];

  if (ltag === "textarea") {
    const content = decodeEntities(textOf(el)).replace(/^\n/, "");
    if (content) parts.push(`defaultValue=${JSON.stringify(content)}`);
    return [open(true)];
  }

  // <noscript>, <script> non-JS (JSON-LD), <style> di dalam SVG → isi mentah
  if (ltag === "noscript" || ltag === "script" || (ltag === "style" && inSvg)) {
    const inner = ltag === "noscript" ? serialize(el.kids) : textOf(el);
    if (inner.trim()) parts.push(`dangerouslySetInnerHTML={{ __html: ${JSON.stringify(inner)} }}`);
    return [open(true)];
  }

  // <table><tr> langsung → bungkus <tbody> (browser menyisipkannya sendiri; tanpa ini hydration gagal)
  let kids = el.kids;
  if (ltag === "table") {
    const wrapped: HNode[] = [];
    let run: HNode[] = [];
    const flush = (): void => {
      if (!run.length) return;
      wrapped.push({ t: "el", tag: "tbody", attrs: [], kids: run, selfClosed: false });
      run = [];
    };
    for (const k of kids) {
      if (k.t === "el" && lc(k.tag) === "tr") run.push(k);
      else if (k.t === "text" && !k.text.trim() && run.length) run.push(k);
      else {
        flush();
        wrapped.push(k);
      }
    }
    flush();
    kids = wrapped;
  }

  const childLines = emitNodes(kids, sub, col, indent + "  ");
  if (childLines.length === 0) return [`${open(false)}</${jsxTag}>`];
  // Satu anak pendek (teks atau elemen sebaris satu baris) → tulis di satu baris; maknanya sama di JSX.
  if (childLines.length === 1 && !childLines[0].includes("\n") && !ctx.inPre) {
    const head = open(false);
    const joined = `${head}${childLines[0].trim()}</${jsxTag}>`;
    if (!head.includes("\n") && joined.length <= 110) return [joined];
  }
  return [open(false), ...childLines, `${indent}</${jsxTag}>`];
}

/* ================================================================== */
/*  Metadata (<head>)                                                  */
/* ================================================================== */

type Meta = Record<string, unknown>;

const OG_TYPES = new Set(["website", "article"]);
const TW_CARDS = new Set(["summary", "summary_large_image", "player", "app"]);

interface HeadResult {
  metadata: Meta;
  links: string[]; // JSX <link>/<meta> yang tidak dipetakan ke metadata
}

function processHead(head: ElNode | undefined, ctx: EmitCtx, col: Collected): HeadResult {
  const metadata: Meta = {};
  const og: Meta = {};
  const tw: Meta = {};
  const icons: string[] = [];
  const links: string[] = [];
  if (!head) return { metadata, links };
  for (const k of head.kids) {
    if (k.t !== "el") continue;
    const tag = lc(k.tag);
    if (tag === "title") {
      const t = decodeEntities(textOf(k)).trim();
      if (t) metadata.title = t;
    } else if (tag === "meta") {
      const name = lc(String(getAttr(k, "name") ?? ""));
      const prop = lc(String(getAttr(k, "property") ?? ""));
      const content = getAttr(k, "content");
      const c = typeof content === "string" ? decodeEntities(content) : undefined;
      if (hasAttr(k, "charset") || lc(String(getAttr(k, "http-equiv") ?? "")) === "content-type" || name === "viewport") continue;
      if (c === undefined) continue;
      if (name === "description") metadata.description = c;
      else if (name === "keywords") metadata.keywords = c.split(",").map((s) => s.trim()).filter(Boolean);
      else if (name === "author") metadata.authors = [{ name: c }];
      else if (name === "robots") metadata.robots = c;
      else if (prop === "og:title") og.title = c;
      else if (prop === "og:description") og.description = c;
      else if (prop === "og:site_name") og.siteName = c;
      else if (prop === "og:locale") og.locale = c;
      else if (prop === "og:url") og.url = c;
      else if (prop === "og:type" && OG_TYPES.has(c)) og.type = c;
      else if (prop === "og:image") og.images = [fixUrl(c, ctx.pageDir, ctx.proj).url];
      else if (name === "twitter:card" && TW_CARDS.has(c)) tw.card = c;
      else if (name === "twitter:title") tw.title = c;
      else if (name === "twitter:description") tw.description = c;
      else if (name === "twitter:image") tw.images = [fixUrl(c, ctx.pageDir, ctx.proj).url];
      else {
        const attrs = k.attrs.map(([a, v]) => jsxAttr(k, a, v, ctx)).filter(Boolean).join(" ");
        links.push(`<meta ${attrs} />`);
      }
    } else if (tag === "link") {
      const rel = lc(String(getAttr(k, "rel") ?? ""));
      const href = getAttr(k, "href");
      if (rel === "stylesheet") {
        hoistable(k, ctx, col);
      } else if ((rel === "icon" || rel === "shortcut icon" || rel === "apple-touch-icon") && typeof href === "string") {
        icons.push(fixUrl(decodeEntities(href), ctx.pageDir, ctx.proj).url);
      } else if (rel === "canonical" && typeof href === "string") {
        metadata.alternates = { canonical: decodeEntities(href) };
      } else {
        const attrs = k.attrs.map(([a, v]) => jsxAttr(k, a, v, ctx)).filter(Boolean).join(" ");
        links.push(`<link ${attrs} />`);
      }
    } else if (tag === "style") {
      hoistable(k, ctx, col);
    } else if (tag === "script") {
      // Skrip JS dipindah ke PageScripts; yang bukan JS (JSON-LD, template) tetap ada sebagai elemen.
      if (!hoistable(k, ctx, col)) links.push(...emitElement(k, ctx, col, ""));
    } else if (tag === "noscript") {
      const lines = emitElement(k, ctx, col, "");
      links.push(...lines);
    } else if (tag === "base") {
      ctx.proj.warnings.add("<base> dihapus; pastikan tautan relatif tetap benar.");
    }
  }
  if (Object.keys(og).length) metadata.openGraph = og;
  if (Object.keys(tw).length) metadata.twitter = tw;
  if (icons.length) metadata.icons = { icon: icons[0], ...(icons.length > 1 ? { apple: icons.slice(1) } : {}) };
  return { metadata, links };
}

/* ================================================================== */
/*  Satu halaman                                                       */
/* ================================================================== */

interface PageParts {
  from: string;
  route: string;
  out: string;
  isNotFound: boolean;
  htmlAttrs: string;
  /** Atribut <body> selain class (style, data-*, id, ...). */
  bodyAttrs: string;
  bodyClass?: string;
  metadata: Meta;
  headLinks: string[];
  bodyLines: string[];
  col: Collected;
  usesLink: boolean;
}

function parsePage(from: string, source: string, route: string, out: string, isNotFound: boolean, proj: Project): PageParts {
  const doc = parseHtml(source);
  const htmlEl = findChild(doc, "html");
  const container = htmlEl ?? doc;
  const head = findChild(container, "head");
  const body = findChild(container, "body");
  const ctx: EmitCtx = { pageDir: dirOf(from), proj, state: { usesLink: false }, inSvg: false, inPre: false };
  const col: Collected = { styles: [], stylesheets: [], scripts: [] };

  const { metadata, links } = processHead(head, ctx, col);

  let bodyNodes: HNode[];
  if (body) bodyNodes = body.kids;
  else bodyNodes = container.kids.filter((k) => !(k.t === "el" && lc(k.tag) === "head"));

  const bodyLines = emitNodes(bodyNodes, ctx, col, "      ");

  const attrString = (el: ElNode | undefined, skip: string[] = []): string =>
    el
      ? el.attrs
          .filter(([k]) => !skip.includes(lc(k)))
          .map(([k, v]) => jsxAttr(el, k, v, ctx))
          .filter(Boolean)
          .join(" ")
      : "";
  const cls = body ? getAttr(body, "class") : undefined;

  return {
    from,
    route,
    out,
    isNotFound,
    htmlAttrs: attrString(htmlEl),
    bodyAttrs: attrString(body, ["class"]),
    bodyClass: typeof cls === "string" ? decodeEntities(cls) : undefined,
    metadata,
    headLinks: links,
    bodyLines,
    col,
    usesLink: ctx.state.usesLink,
  };
}

/* ================================================================== */
/*  Skrip lama: perbaiki DOMContentLoaded / load                       */
/* ================================================================== */

const LEGACY_HEADER =
  'var __depupReady=function(f){document.readyState==="loading"?document.addEventListener("DOMContentLoaded",f):f()};' +
  'var __depupLoad=function(f){document.readyState==="complete"?f():window.addEventListener("load",f)};\n';

/** Skrip dijalankan setelah halaman sudah siap, jadi listener DOMContentLoaded/load harus langsung jalan. */
export function patchLegacyScript(code: string): { code: string; changed: boolean; usesOnload: boolean } {
  let changed = false;
  const a = code.replace(/\b(?:document|window)\.addEventListener\(\s*(["'])DOMContentLoaded\1\s*,\s*/g, () => {
    changed = true;
    return "__depupReady(";
  });
  const b = a.replace(/\bwindow\.addEventListener\(\s*(["'])load\1\s*,\s*/g, () => {
    changed = true;
    return "__depupLoad(";
  });
  return { code: changed ? LEGACY_HEADER + b : code, changed, usesOnload: /\b(?:window\.)?onload\s*=/.test(code) };
}

/* ================================================================== */
/*  Perakitan proyek                                                   */
/* ================================================================== */

const enc = new TextEncoder();
const dec = new TextDecoder();

const PAGE_SCRIPTS_TSX = `"use client";

import { useEffect } from "react";

type ScriptSpec = { src: string; module?: boolean };

/**
 * Menjalankan skrip bawaan situs HTML lama setiap halaman dibuka — termasuk saat berpindah halaman
 * lewat <Link> (Next tidak memuat ulang halaman, jadi skrip biasa tidak akan jalan lagi).
 * Skrip dimuat berurutan dan dibersihkan saat halaman ditinggalkan.
 */
export default function PageScripts({ scripts = [], bodyClass }: { scripts?: ScriptSpec[]; bodyClass?: string }) {
  const key = scripts.map((s) => (s.module ? "m:" : "") + s.src).join("|");

  useEffect(() => {
    const prevClass = document.body.className;
    if (bodyClass !== undefined) document.body.className = bodyClass;

    let cancelled = false;
    const added: HTMLScriptElement[] = [];
    (async () => {
      for (const spec of scripts) {
        if (cancelled) return;
        await new Promise<void>((resolve) => {
          const el = document.createElement("script");
          el.src = spec.src;
          if (spec.module) el.type = "module";
          else el.async = false;
          el.onload = () => resolve();
          el.onerror = () => resolve();
          document.body.appendChild(el);
          added.push(el);
        });
      }
    })();

    return () => {
      cancelled = true;
      added.forEach((el) => el.remove());
      if (bodyClass !== undefined) document.body.className = prevClass;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, bodyClass]);

  return null;
}
`;

function tsLiteral(obj: unknown): string {
  return JSON.stringify(obj, null, 2).replace(/^(\s*)"([A-Za-z_$][\w$]*)":/gm, "$1$2:");
}

function normCss(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function guessName(fallback: string): string {
  const base = fallback
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "situs-next";
}

export function convertHtmlProject(input: { files: SourceFile[]; projectName?: string }): HtmlToNextResult {
  const warnings = new Set<string>();
  const files = input.files.filter((f) => !SKIP_NAME.test(f.path));

  /* --- 1. petakan halaman → rute --- */
  const routes = new Map<string, string>();
  const outOf = new Map<string, { out: string; notFound: boolean }>();
  const usedRoutes = new Map<string, string>();
  const pagesSrc: SourceFile[] = [];
  for (const f of files) {
    if (!isHtmlPath(f.path)) continue;
    const isNotFound = /^404\.html?$/i.test(f.path);
    const route = isNotFound ? "/404" : routeOfHtml(f.path);
    if (!isNotFound && usedRoutes.has(route)) {
      warnings.add(`"${f.path}" bentrok rute ${route} dengan "${usedRoutes.get(route)}" — dilewati.`);
      continue;
    }
    if (!isNotFound) usedRoutes.set(route, f.path);
    const out = isNotFound ? "app/not-found.tsx" : route === "/" ? "app/page.tsx" : `app${route}/page.tsx`;
    routes.set(f.path, isNotFound ? "/" : route);
    outOf.set(f.path, { out, notFound: isNotFound });
    pagesSrc.push(f);
  }

  const paths = new Set(files.map((f) => f.path));
  const proj: Project = { paths, routes, warnings };

  if (pagesSrc.length === 0) {
    warnings.add("Tidak ada file .html di proyek ini.");
    return { files: [], pages: [], warnings: [...warnings] };
  }

  /* --- 2. parse tiap halaman --- */
  const parts: PageParts[] = pagesSrc.map((f) => {
    const info = outOf.get(f.path)!;
    return parsePage(f.path, dec.decode(f.data), routes.get(f.path)!, info.out, info.notFound, proj);
  });

  /* --- 3. hoist CSS & stylesheet yang sama di semua halaman ke layout --- */
  const multi = parts.length > 1;
  const commonStyles: string[] = [];
  const commonSheets: { href: string; extra: string }[] = [];
  if (multi) {
    const first = parts[0];
    for (const s of first.col.styles) {
      if (parts.every((p) => p.col.styles.some((x) => normCss(x) === normCss(s)))) commonStyles.push(s);
    }
    for (const sh of first.col.stylesheets) {
      if (parts.every((p) => p.col.stylesheets.some((x) => x.href === sh.href && x.extra === sh.extra))) commonSheets.push(sh);
    }
    for (const p of parts) {
      p.col.styles = p.col.styles.filter((s) => !commonStyles.some((c) => normCss(c) === normCss(s)));
      p.col.stylesheets = p.col.stylesheets.filter((s) => !commonSheets.some((c) => c.href === s.href && c.extra === s.extra));
    }
  }

  const outFiles: OutputFile[] = [];
  const addFile = (path: string, data: string | Uint8Array): void => {
    outFiles.push({ path, data });
  };

  /* --- 4. CSS global & per halaman --- */
  const globalCss: string[] = [];
  if (!multi) globalCss.push(...parts[0].col.styles);
  else globalCss.push(...commonStyles);

  /* --- 5. skrip inline → public/_legacy/*.js --- */
  const legacyFiles = new Map<string, string>();
  const slugFor = (r: string): string => (r === "/" ? "home" : r.slice(1).replace(/\//g, "-"));
  const pageScriptSpecs = new Map<PageParts, { src: string; module?: boolean }[]>();
  for (const p of parts) {
    const specs: { src: string; module?: boolean }[] = [];
    let n = 0;
    for (const s of p.col.scripts) {
      if (s.src) specs.push({ src: s.src, ...(s.module ? { module: true } : {}) });
      else if (s.code) {
        n++;
        const patched = patchLegacyScript(s.code);
        if (patched.usesOnload) warnings.add(`Skrip di "${p.from}" memakai window.onload — tidak akan terpanggil karena halaman sudah termuat; ganti ke fungsi yang dipanggil langsung.`);
        const name = `_legacy/${p.isNotFound ? "404" : slugFor(p.route)}-${n}.js`;
        legacyFiles.set(name, patched.code);
        specs.push({ src: `/${name}`, ...(s.module ? { module: true } : {}) });
      }
    }
    pageScriptSpecs.set(p, specs);
  }

  /* --- 6. salin aset ke public/ (+ perbaiki skrip lokal) --- */
  const localScripts = new Set<string>();
  for (const specs of pageScriptSpecs.values()) for (const s of specs) if (s.src.startsWith("/") && !s.src.startsWith("/_legacy/")) localScripts.add(s.src.slice(1));
  for (const f of files) {
    if (isHtmlPath(f.path)) continue;
    if (RESERVED_ROOT.test(f.path)) {
      warnings.add(`"${f.path}" dilewati (bentrok dengan file konfigurasi proyek Next.js).`);
      continue;
    }
    if (/^(node_modules|\.git|\.next)\//.test(f.path)) continue;
    if (localScripts.has(f.path)) {
      const patched = patchLegacyScript(dec.decode(f.data));
      if (patched.usesOnload) warnings.add(`"${f.path}" memakai window.onload — tidak akan terpanggil; ganti ke fungsi yang dipanggil langsung.`);
      addFile(`public/${f.path}`, patched.changed ? patched.code : f.data);
    } else addFile(`public/${f.path}`, f.data);
  }
  for (const [name, code] of legacyFiles) addFile(`public/${name}`, code);

  /* --- 7. layout --- */
  const index = parts.find((p) => p.route === "/" && !p.isNotFound) ?? parts[0];
  const sameBodyAttrs = new Set(parts.map((p) => p.bodyAttrs)).size === 1;
  const classSet = new Set(parts.map((p) => p.bodyClass ?? ""));
  const sameClass = classSet.size === 1;
  if (!sameBodyAttrs) warnings.add("Atribut <body> (style/data-*) berbeda antar halaman, jadi tidak dipasang di layout. Pasang manual bila perlu.");
  if (!sameClass) warnings.add("Class <body> berbeda antar halaman — diterapkan per halaman lewat PageScripts (baru aktif setelah halaman termuat).");
  const layoutBodyAttrs = [
    sameBodyAttrs ? index.bodyAttrs : "",
    sameClass && index.bodyClass ? `className=${jsString(index.bodyClass)}` : "",
  ]
    .filter(Boolean)
    .join(" ");
  const langMatch = /lang="([^"]+)"/.exec(index.htmlAttrs);
  const htmlAttrs = index.htmlAttrs || (langMatch ? "" : 'lang="en"');
  const needsGlobalCss = globalCss.length > 0;
  if (needsGlobalCss) addFile("app/globals.css", globalCss.map((c) => c.trim()).join("\n\n") + "\n");

  const layoutHeadLinks = commonSheets.map((s) => `<link rel="stylesheet" href="${s.href}" precedence="default"${s.extra ? " " + s.extra : ""} />`);
  const layoutLines: string[] = [];
  if (needsGlobalCss) layoutLines.push('import "./globals.css";');
  layoutLines.push('import type { ReactNode } from "react";', "");
  layoutLines.push("export default function RootLayout({ children }: { children: ReactNode }) {");
  layoutLines.push("  return (");
  layoutLines.push(`    <html${htmlAttrs ? " " + htmlAttrs : ""}>`);
  if (layoutHeadLinks.length) layoutLines.push("      <head>", ...layoutHeadLinks.map((l) => "        " + l), "      </head>");
  layoutLines.push(`      <body${layoutBodyAttrs ? " " + layoutBodyAttrs : ""}>{children}</body>`);
  layoutLines.push("    </html>", "  );", "}", "");
  addFile("app/layout.tsx", layoutLines.join("\n"));

  const needsScripts = parts.some((p) => (pageScriptSpecs.get(p)?.length ?? 0) > 0 || (!sameClass && p.bodyClass !== undefined));
  if (needsScripts) addFile("components/PageScripts.tsx", PAGE_SCRIPTS_TSX);

  /* --- 8. tiap halaman --- */
  const pageList: ConvertedPage[] = [];
  for (const p of parts) {
    const specs = pageScriptSpecs.get(p) ?? [];
    const usePerPageClass = !sameClass && p.bodyClass !== undefined;
    const usesScripts = specs.length > 0 || usePerPageClass;
    const pageCss = multi ? p.col.styles : [];
    const cssName = "page.css";
    const dirOut = p.out.replace(/\/[^/]+$/, "");
    if (pageCss.length) addFile(`${dirOut}/${cssName}`, pageCss.map((c) => c.trim()).join("\n\n") + "\n");

    const headJsx = [
      ...p.col.stylesheets.map((s) => `<link rel="stylesheet" href="${s.href}" precedence="default"${s.extra ? " " + s.extra : ""} />`),
      ...p.headLinks,
    ];

    const imports: string[] = [];
    const hasMeta = Object.keys(p.metadata).length > 0 && !p.isNotFound;
    if (hasMeta) imports.push('import type { Metadata } from "next";');
    if (p.usesLink) imports.push('import Link from "next/link";');
    if (usesScripts) imports.push('import PageScripts from "@/components/PageScripts";');
    if (pageCss.length) imports.push(`import "./${cssName}";`);

    const comp = p.isNotFound ? "NotFound" : "Page";
    const body: string[] = [];
    for (const h of headJsx) body.push(`      ${h}`);
    body.push(...p.bodyLines);
    if (usesScripts) {
      const scriptProp = specs.length ? ` scripts={${JSON.stringify(specs)}}` : "";
      const classProp = usePerPageClass ? ` bodyClass=${JSON.stringify(p.bodyClass)}` : "";
      body.push(`      <PageScripts${scriptProp}${classProp} />`);
    }

    const src = [
      ...imports,
      imports.length ? "" : null,
      hasMeta ? `export const metadata: Metadata = ${tsLiteral(p.metadata)};\n` : null,
      `export default function ${comp}() {`,
      "  return (",
      "    <>",
      ...body,
      "    </>",
      "  );",
      "}",
      "",
    ]
      .filter((l): l is string => l !== null)
      .join("\n");
    addFile(p.out, src);
    pageList.push({ from: p.from, route: p.isNotFound ? "/404" : p.route, out: p.out });
  }

  /* --- 9. scaffold proyek --- */
  const name = guessName(input.projectName ?? "situs-next");
  addFile(
    "package.json",
    JSON.stringify(
      {
        name,
        version: "0.1.0",
        private: true,
        scripts: { dev: "next dev", build: "next build", start: "next start" },
        dependencies: { next: "^16.0.0", react: "^19.2.0", "react-dom": "^19.2.0" },
        devDependencies: { "@types/node": "^22.0.0", "@types/react": "^19.2.0", "@types/react-dom": "^19.2.0", typescript: "^5.9.0" },
      },
      null,
      2,
    ) + "\n",
  );
  addFile(
    "tsconfig.json",
    JSON.stringify(
      {
        compilerOptions: {
          target: "ES2017",
          lib: ["dom", "dom.iterable", "esnext"],
          allowJs: true,
          skipLibCheck: true,
          strict: true,
          noEmit: true,
          esModuleInterop: true,
          module: "esnext",
          moduleResolution: "bundler",
          resolveJsonModule: true,
          isolatedModules: true,
          jsx: "react-jsx",
          incremental: true,
          plugins: [{ name: "next" }],
          paths: { "@/*": ["./*"] },
        },
        include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts", ".next/dev/types/**/*.ts"],
        exclude: ["node_modules"],
      },
      null,
      2,
    ) + "\n",
  );
  addFile(
    "next.config.mjs",
    [
      "/** @type {import('next').NextConfig} */",
      "const nextConfig = {",
      "  reactStrictMode: true,",
      "  // Hasil konversi otomatis bisa punya tipe atribut yang belum rapi (mis. atribut HTML lama).",
      "  // Hapus baris ini setelah `npx tsc --noEmit` bersih.",
      "  typescript: { ignoreBuildErrors: true },",
      "};",
      "",
      "export default nextConfig;",
      "",
    ].join("\n"),
  );
  addFile(".gitignore", ["node_modules", ".next", "out", ".env*.local", "*.tsbuildinfo", "next-env.d.ts", ".DS_Store", ""].join("\n"));

  if (files.some((f) => /\.(php|asp|aspx|jsp)$/i.test(f.path))) {
    warnings.add("Ada file server-side (.php/.asp/.jsp). Itu tidak ikut dikonversi; hanya halaman .html.");
  }

  addFile("README.md", buildReadme(name, pageList, [...warnings], needsScripts));

  return { files: outFiles, pages: pageList, warnings: [...warnings] };
}

function buildReadme(name: string, pages: ConvertedPage[], warnings: string[], hasScripts: boolean): string {
  const lines = [
    `# ${name}`,
    "",
    "Proyek ini dikonversi dari situs HTML statis ke **Next.js 16** (App Router + TypeScript) oleh Depup.",
    "",
    "## Menjalankan",
    "",
    "```bash",
    "npm install",
    "npm run dev      # http://localhost:3000",
    "npm run build && npm start",
    "```",
    "",
    "Butuh Node.js 20.9 atau lebih baru.",
    "",
    "## Halaman",
    "",
    ...pages.map((p) => `- \`${p.from}\` → \`${p.route}\` (\`${p.out}\`)`),
    "",
    "## Yang perlu diketahui",
    "",
    "- Aset (gambar, font, CSS, JS) ada di `public/` dengan path yang sama seperti situs lama, jadi URL lama tetap valid.",
    hasScripts
      ? "- Skrip bawaan situs lama dijalankan lewat `components/PageScripts.tsx` setiap halaman dibuka. Kalau kamu menulis ulang bagian itu sebagai komponen React, hapus skripnya dari `public/` dan dari `<PageScripts />`."
      : "- Situs ini tidak memakai skrip sendiri, jadi tidak ada `PageScripts`.",
    "- `next.config.mjs` memuat `typescript.ignoreBuildErrors` supaya build tidak berhenti di tipe atribut HTML lama. Hapus setelah `npx tsc --noEmit` bersih.",
    "- Untuk gambar Open Graph dengan path relatif, isi `metadataBase` di `app/layout.tsx` (mis. `metadataBase: new URL(\"https://domainmu.com\")`).",
    "- Tautan antarhalaman memakai `<Link>` dari `next/link`; tautan ke luar tetap `<a>`.",
  ];
  if (warnings.length) lines.push("", "## Catatan konversi", "", ...warnings.map((w) => `- ${w}`));
  lines.push("");
  return lines.join("\n");
}

/** Hanya untuk tes: konversi satu potongan HTML ke JSX tanpa scaffold. */
export function htmlToJsx(html: string): { jsx: string; warnings: string[] } {
  const proj: Project = { paths: new Set(), routes: new Map(), warnings: new Set() };
  const ctx: EmitCtx = { pageDir: "", proj, state: { usesLink: false }, inSvg: false, inPre: false };
  const col: Collected = { styles: [], stylesheets: [], scripts: [] };
  const doc = parseHtml(html);
  const lines = emitNodes(doc.kids, ctx, col, "");
  return { jsx: lines.join("\n"), warnings: [...proj.warnings] };
}
