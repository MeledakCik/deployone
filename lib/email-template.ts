/**
 * Template email — MURNI (tanpa import node/KV) supaya dipakai server (pengiriman) dan browser (pratinjau admin).
 * Semua tabel + inline CSS + fallback warna solid, supaya tampil di Gmail/Outlook/Apple Mail.
 * Sengaja TANPA gambar sama sekali (logo digambar dengan HTML): gambar sering diblokir klien email, dan email penuh gambar lebih sering masuk Spam.
 */

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** Hanya http(s) yang boleh jadi link tombol. */
export function safeUrl(u: unknown): string | null {
  if (typeof u !== "string") return null;
  try {
    const p = new URL(u.trim());
    return p.protocol === "https:" || p.protocol === "http:" ? p.toString() : null;
  } catch {
    return null;
  }
}

export interface MailFeature {
  title: string;
  desc: string;
}

export type TemplateId = "depup" | "gradient" | "gelap" | "minimal" | "hangat" | "pop";

export const TEMPLATES: { id: TemplateId; label: string; desc: string; swatch: [string, string] }[] = [
  { id: "depup", label: "Depup", desc: "Gaya utama Depup: banner Midnight, aksen lime", swatch: ["#1e1150", "#c6f432"] },
  { id: "gradient", label: "Ungu Depup", desc: "Banner ungu brand, label lime, tombol Midnight", swatch: ["#7b50ff", "#c6f432"] },
  { id: "gelap", label: "Midnight", desc: "Mode gelap Depup, aksen lime", swatch: ["#1e1150", "#7b50ff"] },
  { id: "minimal", label: "Mist", desc: "Terang & bersih, latar Mist, tipografi besar", swatch: ["#ede8ff", "#7b50ff"] },
  { id: "hangat", label: "Lime", desc: "Banner lime segar, judul di tengah", swatch: ["#c6f432", "#1e1150"] },
  { id: "pop", label: "Pop Depup", desc: "Garis tebal Ink, ungu & lime berani", swatch: ["#7b50ff", "#c6f432"] },
];

export function isTemplateId(v: unknown): v is TemplateId {
  return typeof v === "string" && TEMPLATES.some((t) => t.id === v);
}

export interface MailContent {
  /** Gaya tampilan email promosi (default: depup). */
  template?: TemplateId;
  /** Isi pesan; baris kosong = paragraf baru. */
  body: string;
  /** Teks pratinjau yang tampil di daftar inbox (opsional). */
  preheader?: string;
  cta?: { label: string; url: string } | null;
  /** Label kecil di banner, mis. "Fitur baru". */
  badge?: string;
  /** Judul besar di banner. */
  headline?: string;
  /** Poin-poin (maks 3) yang tampil sebagai kartu bernomor. */
  features?: MailFeature[];
}

export interface RenderOpts {
  footerNote: string;
  unsubUrl?: string;
  siteUrl?: string;
}

/**
 * Font Depup = Inter Tight (sama dengan situs). File di-host sendiri (public/email/inter-tight.woff2) karena CSP situs
 * hanya mengizinkan font dari 'self'. Hanya Apple Mail, iOS Mail, Samsung Mail, dan Thunderbird yang memuat font web;
 * Gmail & Outlook memakai cadangan berikutnya di daftar ini (Inter kalau terpasang, lalu font sistem).
 */
const FONT = "'Inter Tight','Inter','Segoe UI',Roboto,Helvetica,Arial,sans-serif";

/** @font-face untuk head email. Kosong kalau alamat situs tidak diketahui atau tidak aman dipakai di CSS. */
function fontFaceCss(site: string): string {
  if (!/^https?:\/\/[^\s'"<>()\\]+$/.test(site)) return "";
  return `<style type="text/css">@font-face{font-family:'Inter Tight';font-style:normal;font-weight:100 900;font-display:swap;src:url('${site}/email/inter-tight.woff2') format('woff2');}</style>`;
}

function paragraphs(body: string, style: string): string {
  return body
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p style="${style}">${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("\n");
}

function cleanCta(c: MailContent): { label: string; url: string } | null {
  if (!c.cta) return null;
  const url = safeUrl(c.cta.url);
  const label = c.cta.label.trim().slice(0, 60);
  return url && label ? { label, url } : null;
}

function cleanFeatures(c: MailContent): MailFeature[] {
  return (c.features ?? [])
    .map((f) => ({ title: (f.title ?? "").trim().slice(0, 60), desc: (f.desc ?? "").trim().slice(0, 200) }))
    .filter((f) => f.title)
    .slice(0, 3);
}

function textVersion(c: MailContent, o: RenderOpts): string {
  const cta = cleanCta(c);
  const feats = cleanFeatures(c);
  return [
    c.headline?.trim() ? c.headline.trim().toUpperCase() : "",
    c.body.trim(),
    feats.length ? feats.map((f, i) => `${i + 1}. ${f.title}${f.desc ? ` — ${f.desc}` : ""}`).join("\n") : "",
    cta ? `${cta.label}: ${cta.url}` : "",
    "--",
    o.footerNote,
    o.unsubUrl ? `Berhenti berlangganan: ${o.unsubUrl}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** Template sederhana (balasan support, notifikasi admin): terasa seperti email personal. */
export function renderSimple(c: MailContent, o: RenderOpts): { html: string; text: string } {
  const cta = cleanCta(c);
  const pre = c.preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(c.preheader)}</div>` : "";
  const btn = cta
    ? `<p style="margin:24px 0;"><a href="${escapeHtml(cta.url)}" style="background:#7b50ff;color:#ffffff;text-decoration:none;padding:11px 22px;border-radius:999px;font-size:14px;font-weight:600;display:inline-block;">${escapeHtml(cta.label)}</a></p>`
    : "";
  const unsub = o.unsubUrl ? `<br><a href="${escapeHtml(o.unsubUrl)}" style="color:#888;">Berhenti berlangganan email promosi</a>` : "";
  const simpleSite = (o.siteUrl ?? "").replace(/\/+$/, "");
  const simpleMarkStyle = "display:inline-block;width:28px;height:28px;line-height:28px;text-align:center;border-radius:9px;background-color:#7b50ff;color:#ffffff;font-size:17px;font-weight:900;vertical-align:middle;margin-right:8px;border:0;";
  const simpleMark = simpleSite
    ? `<img src="${escapeHtml(simpleSite)}/email/logo.png" width="28" height="28" alt="&uarr;" style="${simpleMarkStyle}">`
    : `<span style="${simpleMarkStyle}">&uarr;</span>`;
  const html = `<!doctype html>
<html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light">${fontFaceCss(simpleSite)}</head>
<body style="margin:0;padding:24px 12px;background:#ede8ff;font-family:${FONT};">
${pre}
<div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:28px 28px 20px;">
<p style="margin:0 0 20px;font-size:17px;font-weight:700;color:#120b2e;">${simpleMark}<span style="vertical-align:middle;">Depup</span></p>
${paragraphs(c.body, "margin:0 0 16px;font-size:15px;line-height:1.6;color:#222;")}
${btn}
<hr style="border:none;border-top:1px solid #eee;margin:24px 0 14px;">
<p style="margin:0;font-size:12px;line-height:1.5;color:#888;">${escapeHtml(o.footerNote)}${unsub}</p>
</div></body></html>`;
  return { html, text: textVersion({ ...c, headline: undefined }, o) };
}

interface Theme {
  page: string;
  card: string;
  cardBorder?: string;
  radius: number;
  hero: "banner" | "plain";
  heroBg?: string;
  heroImage?: string;
  heroPad: string;
  align: "left" | "center";
  accentBar?: { image: string; fallback: string };
  logoBg: string;
  logoFg: string;
  /** Varian logo asli (public/email/<nama>.png) yang kontras dengan latar logo. */
  logoImg: "logo" | "logo-white" | "logo-lime";
  /** Kotak dekorasi panah di kanan banner (hanya banner rata kiri). */
  decoBg?: string;
  decoFg?: string;
  brand: string;
  badge: "pill" | "text";
  badgeBg: string;
  badgeFg: string;
  headColor: string;
  headSize: number;
  headHighlight?: string;
  body: string;
  feat: "card" | "stripe" | "line" | "pop";
  featBg: string;
  featBorder: string;
  numBg: string;
  numFg: string;
  titleC: string;
  descC: string;
  btnBg: string;
  btnImage?: string;
  btnFg: string;
  btnRadius: number;
  btnBorder?: string;
  footBg: string;
  footBorder: string;
  footText: string;
  accent: string;
  muted: string;
}

const THEMES: Record<TemplateId, Theme> = {
  // Banner Midnight, label lime, tombol ungu. Pembuka resmi Depup.
  depup: {
    page: "#ede8ff", card: "#ffffff", radius: 28, hero: "banner", heroBg: "#1e1150",
    heroImage: "linear-gradient(150deg,#1e1150 0%,#2b1b6b 60%,#4a2fb8 100%)", heroPad: "30px 34px 38px", align: "left",
    accentBar: { image: "linear-gradient(90deg,#c6f432 0%,#c6f432 34%,#7b50ff 34%,#7b50ff 100%)", fallback: "#c6f432" },
    logoBg: "#c6f432", logoFg: "#1e1150", logoImg: "logo", decoBg: "#2e2070", decoFg: "#c6f432", brand: "#ffffff",
    badge: "pill", badgeBg: "#c6f432", badgeFg: "#1e1150",
    headColor: "#ffffff", headSize: 32, body: "#120b2e", feat: "card", featBg: "#f4f1ff", featBorder: "#e7e0ff",
    numBg: "#7b50ff", numFg: "#ffffff", titleC: "#1e1150", descC: "#4a4464",
    btnBg: "#7b50ff", btnFg: "#ffffff", btnRadius: 999,
    footBg: "#1e1150", footBorder: "#1e1150", footText: "#b2aec4", accent: "#7b50ff", muted: "#8e88a8",
  },
  // Ungu brand penuh.
  gradient: {
    page: "#ede8ff", card: "#ffffff", radius: 28, hero: "banner", heroBg: "#7b50ff",
    heroImage: "linear-gradient(145deg,#9876ff 0%,#7b50ff 45%,#5a39c0 100%)", heroPad: "30px 34px 38px", align: "left",
    accentBar: { image: "linear-gradient(90deg,#c6f432,#d3f65f)", fallback: "#c6f432" },
    logoBg: "#ffffff", logoFg: "#7b50ff", logoImg: "logo-white", decoBg: "#8f6cff", decoFg: "#ffffff", brand: "#ffffff",
    badge: "pill", badgeBg: "#c6f432", badgeFg: "#1e1150",
    headColor: "#ffffff", headSize: 32, body: "#120b2e", feat: "card", featBg: "#f4f1ff", featBorder: "#e7e0ff",
    numBg: "#7b50ff", numFg: "#ffffff", titleC: "#1e1150", descC: "#4a4464",
    btnBg: "#1e1150", btnFg: "#c6f432", btnRadius: 999,
    footBg: "#f4f1ff", footBorder: "#e7e0ff", footText: "#4a4464", accent: "#5a39c0", muted: "#6d648d",
  },
  // Mode gelap.
  gelap: {
    page: "#120b2e", card: "#1e1150", cardBorder: "1px solid #342962", radius: 28, hero: "banner", heroBg: "#2b1b6b",
    heroImage: "linear-gradient(160deg,#341f86 0%,#1e1150 100%)", heroPad: "30px 34px 36px", align: "left",
    accentBar: { image: "linear-gradient(90deg,#c6f432 0%,#c6f432 34%,#7b50ff 34%,#7b50ff 100%)", fallback: "#c6f432" },
    logoBg: "#c6f432", logoFg: "#1e1150", logoImg: "logo", decoBg: "#3a2a82", decoFg: "#c6f432", brand: "#ffffff",
    badge: "pill", badgeBg: "#c6f432", badgeFg: "#1e1150",
    headColor: "#ffffff", headSize: 32, body: "#d2cfdc", feat: "stripe", featBg: "#271b57", featBorder: "#c6f432",
    numBg: "#c6f432", numFg: "#c6f432", titleC: "#ffffff", descC: "#a5a0b9",
    btnBg: "#c6f432", btnFg: "#1e1150", btnRadius: 999,
    footBg: "#170d3a", footBorder: "#342962", footText: "#a5a0b9", accent: "#c6f432", muted: "#837c9f",
  },
  // Terang & bersih, latar Mist.
  minimal: {
    page: "#ede8ff", card: "#ffffff", radius: 28, hero: "plain", heroPad: "38px 36px 6px", align: "left",
    logoBg: "#7b50ff", logoFg: "#ffffff", logoImg: "logo", brand: "#120b2e",
    badge: "text", badgeBg: "#ffffff", badgeFg: "#5a39c0",
    headColor: "#120b2e", headSize: 34, body: "#3b3556", feat: "line", featBg: "#ffffff", featBorder: "#e7e0ff",
    numBg: "#7b50ff", numFg: "#7b50ff", titleC: "#120b2e", descC: "#4a4464",
    btnBg: "#7b50ff", btnFg: "#ffffff", btnRadius: 999,
    footBg: "#faf8ff", footBorder: "#e7e0ff", footText: "#6d648d", accent: "#5a39c0", muted: "#8e88a8",
  },
  // Banner lime segar, rata tengah.
  hangat: {
    page: "#f5fdda", card: "#ffffff", radius: 28, hero: "banner", heroBg: "#c6f432",
    heroImage: "linear-gradient(135deg,#d3f65f 0%,#c6f432 55%,#aad329 100%)", heroPad: "34px 32px 42px", align: "center",
    logoBg: "#1e1150", logoFg: "#c6f432", logoImg: "logo-lime", brand: "#1e1150",
    badge: "pill", badgeBg: "#1e1150", badgeFg: "#c6f432",
    headColor: "#1e1150", headSize: 33, body: "#120b2e", feat: "card", featBg: "#f5fdda", featBorder: "#ecfbb9",
    numBg: "#1e1150", numFg: "#c6f432", titleC: "#1e1150", descC: "#4a4464",
    btnBg: "#1e1150", btnFg: "#c6f432", btnRadius: 999,
    footBg: "#1e1150", footBorder: "#1e1150", footText: "#b2aec4", accent: "#7b50ff", muted: "#8e88a8",
  },
  // Garis tebal Ink, ungu & lime berani.
  pop: {
    page: "#7b50ff", card: "#ffffff", cardBorder: "3px solid #120b2e", radius: 22, hero: "plain", heroPad: "30px 32px 6px", align: "left",
    logoBg: "#120b2e", logoFg: "#c6f432", logoImg: "logo-lime", brand: "#120b2e",
    badge: "pill", badgeBg: "#7b50ff", badgeFg: "#ffffff",
    headColor: "#120b2e", headSize: 32, headHighlight: "#c6f432", body: "#120b2e", feat: "pop", featBg: "#ffffff", featBorder: "#120b2e",
    numBg: "#7b50ff", numFg: "#ffffff", titleC: "#120b2e", descC: "#4a4464",
    btnBg: "#c6f432", btnFg: "#120b2e", btnRadius: 14, btnBorder: "3px solid #120b2e",
    footBg: "#f4f1ff", footBorder: "#120b2e", footText: "#4a4464", accent: "#5a39c0", muted: "#6d648d",
  },
};

/** Template promosi: 6 gaya (lihat TEMPLATES). Tanpa gambar; logo digambar dengan HTML. */
export function renderRich(c: MailContent, o: RenderOpts): { html: string; text: string } {
  const t = THEMES[isTemplateId(c.template) ? c.template : "depup"];
  const cta = cleanCta(c);
  const feats = cleanFeatures(c);
  const site = (o.siteUrl ?? "").replace(/\/+$/, "");
  const siteLabel = site.replace(/^https?:\/\//, "") || "depup.cloud";
  const center = t.align === "center";
  const pre = c.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;">${escapeHtml(c.preheader)}</div>`
    : "";

  // Logo asli Depup (gambar kecil di /email). Latar & tanda panah ikut tampil sebagai cadangan kalau klien email memblokir gambar.
  const mark = { logo: ["#7b50ff", "#ffffff"], "logo-white": ["#ffffff", "#7b50ff"], "logo-lime": ["#1e1150", "#c6f432"] }[t.logoImg];
  const logoBg = site ? mark[0] : t.logoBg;
  const logoFg = site ? mark[1] : t.logoFg;
  const logoStyle = `display:inline-block;width:32px;height:32px;line-height:32px;text-align:center;border-radius:10px;background-color:${logoBg};color:${logoFg};font-family:${FONT};font-size:20px;font-weight:900;vertical-align:middle;margin-right:10px;border:0;`;
  const logo = site
    ? `<img src="${escapeHtml(site)}/email/${t.logoImg}.png" width="32" height="32" alt="&uarr;" style="${logoStyle}">`
    : `<span style="${logoStyle}">&uarr;</span>`;
  const badgeText = c.badge?.trim().slice(0, 30);
  const badge = badgeText
    ? t.badge === "pill"
      ? `<p style="margin:26px 0 0;"><span style="display:inline-block;font-family:${FONT};background-color:${t.badgeBg};color:${t.badgeFg};font-size:12px;font-weight:700;letter-spacing:.5px;padding:6px 14px;border-radius:999px;">${escapeHtml(badgeText)}</span></p>`
      : `<p style="margin:26px 0 0;font-family:${FONT};font-size:12px;font-weight:800;letter-spacing:1.6px;text-transform:uppercase;color:${t.badgeFg};">${escapeHtml(badgeText)}</p>`
    : "";
  const headText = c.headline?.trim().slice(0, 90);
  const headInner = headText ? escapeHtml(headText) : "";
  const headline = headText
    ? `<h1 style="margin:${badgeText ? "14px" : "26px"} 0 0;font-family:${FONT};font-size:${t.headSize}px;line-height:${t.headHighlight ? "1.5" : "1.15"};font-weight:700;letter-spacing:-0.2px;color:${t.headColor};">${
        t.headHighlight ? `<span style="background-color:${t.headHighlight};padding:0 8px;">${headInner}</span>` : headInner
      }</h1>`
    : "";

  // Banner rata kiri: logo asli besar di kanan (menggantikan logo kecil di kiri). Tanpa siteUrl -> kotak panah HTML.
  const bigLogo = t.decoBg && t.hero === "banner" && !center;
  const logoLeft = bigLogo && site ? "" : logo;
  const heroText = `<p style="margin:0;font-family:${FONT};font-size:18px;font-weight:700;color:${t.brand};">${logoLeft}<span style="vertical-align:middle;">Depup</span></p>
${badge}
${headline}`;
  const deco = bigLogo
    ? `<td width="76" valign="top" align="right" style="padding:0 0 0 12px;">${
        site
          ? `<img src="${escapeHtml(site)}/email/${t.logoImg}.png" width="64" height="64" alt="Depup" style="display:block;width:64px;height:64px;border-radius:20px;border:0;background-color:${mark[0]};">`
          : `<div style="width:64px;height:64px;line-height:64px;text-align:center;border-radius:20px;background-color:${t.decoBg};color:${t.decoFg};font-family:${FONT};font-size:38px;font-weight:900;">&uarr;</div>`
      }</td>`
    : "";
  const heroInner = deco
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td valign="top" style="text-align:left;">${heroText}</td>${deco}</tr></table>`
    : heroText;
  const accentBar = t.accentBar
    ? `<tr><td height="5" bgcolor="${t.accentBar.fallback}" style="height:5px;line-height:5px;font-size:0;background-color:${t.accentBar.fallback};background-image:${t.accentBar.image};">&nbsp;</td></tr>`
    : "";
  const heroRow =
    t.hero === "banner"
      ? `<tr><td align="${t.align}" bgcolor="${t.heroBg}" style="text-align:${t.align};background-color:${t.heroBg};background-image:${t.heroImage};padding:${t.heroPad};">${heroInner}</td></tr>`
      : `<tr><td align="${t.align}" style="text-align:${t.align};padding:${t.heroPad};">${heroInner}</td></tr>`;

  const featRows = feats
    .map((f, i) => {
      const desc = f.desc ? `<p style="margin:4px 0 0;font-size:14px;line-height:1.55;color:${t.descC};">${escapeHtml(f.desc)}</p>` : "";
      const title = `<p style="margin:0;font-size:16px;font-weight:700;color:${t.titleC};">${escapeHtml(f.title)}</p>`;
      const n = i + 1;
      if (t.feat === "stripe") {
        return `<tr><td style="padding:0 0 12px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${t.featBg}" style="background-color:${t.featBg};border-left:3px solid ${t.featBorder};border-radius:10px;"><tr><td style="padding:16px 18px;font-family:${FONT};"><p style="margin:0 0 4px;font-size:12px;font-weight:800;letter-spacing:1.5px;color:${t.numFg};">0${n}</p>${title}${desc}</td></tr></table></td></tr>`;
      }
      if (t.feat === "line") {
        return `<tr><td style="border-top:1px solid ${t.featBorder};padding:16px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td width="48" valign="top" style="font-family:${FONT};font-size:14px;font-weight:800;color:${t.numFg};padding-top:2px;">0${n}</td><td valign="top" style="font-family:${FONT};">${title}${desc}</td></tr></table></td></tr>`;
      }
      const square = t.feat === "pop";
      return `<tr><td style="padding:0 0 12px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${t.featBg}" style="background-color:${t.featBg};border-radius:${square ? 12 : 14}px;${square ? `border:2px solid ${t.featBorder};` : ""}"><tr>
<td width="52" valign="top" style="padding:16px 0 16px 16px;"><div style="width:34px;height:34px;line-height:34px;text-align:center;border-radius:${square ? 8 : 50}${square ? "px" : "%"};background-color:${t.numBg};color:${t.numFg};font-family:${FONT};font-size:15px;font-weight:700;">${n}</div></td>
<td valign="top" style="padding:16px 18px 16px 4px;font-family:${FONT};">${title}${desc}</td></tr></table></td></tr>`;
    })
    .join("\n");

  const btnAlign = center || t.hero === "banner" ? "center" : "left";
  const button = cta
    ? `<table role="presentation" ${btnAlign === "center" ? 'align="center" ' : ""}cellpadding="0" cellspacing="0" border="0" style="margin:8px ${btnAlign === "center" ? "auto" : "0"} 0;"><tr>
<td align="center" bgcolor="${t.btnBg}" style="border-radius:${t.btnRadius}px;background-color:${t.btnBg};${t.btnImage ? `background-image:${t.btnImage};` : ""}${t.btnBorder ? `border:${t.btnBorder};` : ""}"><a href="${escapeHtml(cta.url)}" style="display:inline-block;padding:16px 38px;font-family:${FONT};font-size:16px;font-weight:700;color:${t.btnFg};text-decoration:none;border-radius:${t.btnRadius}px;">${escapeHtml(cta.label)} &rarr;</a></td>
</tr></table>
<p style="margin:14px 0 0;text-align:${btnAlign};font-family:${FONT};font-size:12px;line-height:1.5;color:${t.muted};">Tombol tidak berfungsi? Buka <a href="${escapeHtml(cta.url)}" style="color:${t.accent};text-decoration:underline;">${escapeHtml(cta.url.replace(/^https?:\/\//, "").slice(0, 60))}</a></p>`
    : "";

  const unsub = o.unsubUrl
    ? `<br><a href="${escapeHtml(o.unsubUrl)}" style="color:${t.footText};text-decoration:underline;">Berhenti berlangganan email promosi</a>`
    : "";
  const footBorderCss = t.cardBorder && t.footBorder === "#111111" ? "2px solid #111111" : `1px solid ${t.footBorder}`;

  const html = `<!doctype html>
<html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light">${fontFaceCss(site)}</head>
<body style="margin:0;padding:0;background-color:${t.page};font-family:${FONT};">
${pre}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${t.page}" style="background-color:${t.page};"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="${t.card}" style="width:100%;max-width:600px;background-color:${t.card};border-radius:${t.radius}px;overflow:hidden;${t.cardBorder ? `border:${t.cardBorder};` : ""}">
${accentBar}
${heroRow}
<tr><td style="padding:${t.hero === "banner" ? "32px" : "22px"} 32px 8px;font-family:${FONT};">
${paragraphs(c.body, `margin:0 0 18px;font-size:16px;line-height:1.65;color:${t.body};`)}
</td></tr>
${featRows ? `<tr><td style="padding:8px 32px 8px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${featRows}</table></td></tr>` : ""}
${button ? `<tr><td style="padding:24px 32px 36px;">${button}</td></tr>` : `<tr><td style="padding:0 0 16px;"></td></tr>`}
<tr><td bgcolor="${t.footBg}" style="background-color:${t.footBg};border-top:${footBorderCss};padding:22px 32px;font-family:${FONT};">
<p style="margin:0;font-size:12px;line-height:1.6;color:${t.footText};">${escapeHtml(o.footerNote)}${unsub}</p>
<p style="margin:10px 0 0;font-size:12px;color:${t.muted};">Depup &middot; Deploy tanpa ribet &middot; ${site ? `<a href="${escapeHtml(site)}" style="color:${t.muted};text-decoration:underline;">${escapeHtml(siteLabel)}</a>` : escapeHtml(siteLabel)}</p>
</td></tr>
</table>
</td></tr></table>
</body></html>`;
  return { html, text: textVersion(c, o) };
}
