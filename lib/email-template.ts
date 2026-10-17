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

export type TemplateId = "gradient" | "gelap" | "minimal" | "hangat" | "pop";

export const TEMPLATES: { id: TemplateId; label: string; desc: string; swatch: [string, string] }[] = [
  { id: "gradient", label: "Ungu Gradient", desc: "Banner gradient, kartu poin", swatch: ["#7c3aed", "#0891b2"] },
  { id: "gelap", label: "Midnight", desc: "Mode gelap, aksen neon", swatch: ["#11111b", "#22d3ee"] },
  { id: "minimal", label: "Bersih", desc: "Putih minimalis, tipografi besar", swatch: ["#ffffff", "#111111"] },
  { id: "hangat", label: "Sunset", desc: "Oranye-pink, judul di tengah", swatch: ["#f97316", "#ec4899"] },
  { id: "pop", label: "Pop Kuning", desc: "Garis tebal, kuning berani", swatch: ["#fde047", "#111111"] },
];

export function isTemplateId(v: unknown): v is TemplateId {
  return typeof v === "string" && TEMPLATES.some((t) => t.id === v);
}

export interface MailContent {
  /** Gaya tampilan email promosi (default: gradient). */
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

const FONT = "'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

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
    ? `<p style="margin:24px 0;"><a href="${escapeHtml(cta.url)}" style="background:#7c3aed;color:#ffffff;text-decoration:none;padding:11px 22px;border-radius:8px;font-size:14px;font-weight:600;display:inline-block;">${escapeHtml(cta.label)}</a></p>`
    : "";
  const unsub = o.unsubUrl ? `<br><a href="${escapeHtml(o.unsubUrl)}" style="color:#888;">Berhenti berlangganan email promosi</a>` : "";
  const html = `<!doctype html>
<html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"></head>
<body style="margin:0;padding:24px 12px;background:#f5f5f7;font-family:${FONT};">
${pre}
<div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:28px 28px 20px;">
<p style="margin:0 0 20px;font-size:17px;font-weight:700;color:#111;">Depup</p>
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
  gradient: {
    page: "#ede9fe", card: "#ffffff", radius: 20, hero: "banner", heroBg: "#6d28d9",
    heroImage: "linear-gradient(135deg,#7c3aed 0%,#4f46e5 55%,#0891b2 100%)", heroPad: "28px 32px 34px", align: "left",
    logoBg: "#ffffff", logoFg: "#6d28d9", brand: "#ffffff", badge: "pill", badgeBg: "#ffffff", badgeFg: "#6d28d9",
    headColor: "#ffffff", headSize: 30, body: "#1f2937", feat: "card", featBg: "#f6f3ff", featBorder: "#ede9fe",
    numBg: "#7c3aed", numFg: "#ffffff", titleC: "#1e1b4b", descC: "#4b5563", btnBg: "#7c3aed",
    btnImage: "linear-gradient(135deg,#7c3aed,#4f46e5)", btnFg: "#ffffff", btnRadius: 999,
    footBg: "#faf9ff", footBorder: "#ede9fe", footText: "#6b7280", accent: "#7c3aed", muted: "#9ca3af",
  },
  gelap: {
    page: "#05050a", card: "#11111b", cardBorder: "1px solid #23233a", radius: 20, hero: "banner", heroBg: "#151530",
    heroImage: "linear-gradient(160deg,#1e1b4b 0%,#11111b 100%)", heroPad: "30px 32px 32px", align: "left",
    accentBar: { image: "linear-gradient(90deg,#22d3ee,#8b5cf6,#ec4899)", fallback: "#8b5cf6" },
    logoBg: "#22d3ee", logoFg: "#041016", brand: "#ffffff", badge: "pill", badgeBg: "#22d3ee", badgeFg: "#041016",
    headColor: "#ffffff", headSize: 30, body: "#d1d5db", feat: "stripe", featBg: "#1a1a2b", featBorder: "#22d3ee",
    numBg: "#22d3ee", numFg: "#22d3ee", titleC: "#ffffff", descC: "#9ca3af", btnBg: "#22d3ee", btnFg: "#041016", btnRadius: 12,
    footBg: "#0c0c14", footBorder: "#23233a", footText: "#8b8fa3", accent: "#22d3ee", muted: "#6b7280",
  },
  minimal: {
    page: "#f4f4f5", card: "#ffffff", cardBorder: "1px solid #e4e4e7", radius: 16, hero: "plain", heroPad: "38px 36px 6px", align: "left",
    logoBg: "#111111", logoFg: "#ffffff", brand: "#111111", badge: "text", badgeBg: "#ffffff", badgeFg: "#7c3aed",
    headColor: "#111111", headSize: 34, body: "#3f3f46", feat: "line", featBg: "#ffffff", featBorder: "#e4e4e7",
    numBg: "#111111", numFg: "#a1a1aa", titleC: "#111111", descC: "#52525b", btnBg: "#111111", btnFg: "#ffffff", btnRadius: 10,
    footBg: "#ffffff", footBorder: "#e4e4e7", footText: "#71717a", accent: "#111111", muted: "#a1a1aa",
  },
  hangat: {
    page: "#fff7ed", card: "#ffffff", radius: 22, hero: "banner", heroBg: "#f97316",
    heroImage: "linear-gradient(135deg,#fb923c 0%,#f97316 40%,#ec4899 100%)", heroPad: "34px 32px 42px", align: "center",
    logoBg: "#ffffff", logoFg: "#ea580c", brand: "#ffffff", badge: "pill", badgeBg: "#ffffff", badgeFg: "#c2410c",
    headColor: "#ffffff", headSize: 32, body: "#292524", feat: "card", featBg: "#fff1e6", featBorder: "#fed7aa",
    numBg: "#f97316", numFg: "#ffffff", titleC: "#431407", descC: "#78716c", btnBg: "#f97316",
    btnImage: "linear-gradient(135deg,#f97316,#ec4899)", btnFg: "#ffffff", btnRadius: 999,
    footBg: "#fffaf5", footBorder: "#fed7aa", footText: "#78716c", accent: "#ea580c", muted: "#a8a29e",
  },
  pop: {
    page: "#fde047", card: "#ffffff", cardBorder: "3px solid #111111", radius: 18, hero: "plain", heroPad: "30px 32px 6px", align: "left",
    logoBg: "#111111", logoFg: "#fde047", brand: "#111111", badge: "pill", badgeBg: "#111111", badgeFg: "#fde047",
    headColor: "#111111", headSize: 32, headHighlight: "#fde047", body: "#111827", feat: "pop", featBg: "#ffffff", featBorder: "#111111",
    numBg: "#111111", numFg: "#fde047", titleC: "#111111", descC: "#4b5563", btnBg: "#fde047", btnFg: "#111111", btnRadius: 12,
    btnBorder: "3px solid #111111", footBg: "#ffffff", footBorder: "#111111", footText: "#4b5563", accent: "#111111", muted: "#6b7280",
  },
};

/** Template promosi: 5 gaya (lihat TEMPLATES). Tanpa gambar; logo digambar dengan HTML. */
export function renderRich(c: MailContent, o: RenderOpts): { html: string; text: string } {
  const t = THEMES[isTemplateId(c.template) ? c.template : "gradient"];
  const cta = cleanCta(c);
  const feats = cleanFeatures(c);
  const site = (o.siteUrl ?? "").replace(/\/+$/, "");
  const siteLabel = site.replace(/^https?:\/\//, "") || "depup.web.id";
  const center = t.align === "center";
  const pre = c.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;">${escapeHtml(c.preheader)}</div>`
    : "";

  // Logo digambar dengan HTML (bukan <img>) supaya tetap muncul saat Gmail/Outlook memblokir gambar.
  const logo = `<span style="display:inline-block;width:32px;height:32px;line-height:32px;text-align:center;border-radius:50%;background-color:${t.logoBg};color:${t.logoFg};font-family:${FONT};font-size:20px;font-weight:900;vertical-align:middle;margin-right:10px;">&uarr;</span>`;
  const badgeText = c.badge?.trim().slice(0, 30);
  const badge = badgeText
    ? t.badge === "pill"
      ? `<p style="margin:26px 0 0;"><span style="display:inline-block;font-family:${FONT};background-color:${t.badgeBg};color:${t.badgeFg};font-size:12px;font-weight:700;letter-spacing:.5px;padding:6px 14px;border-radius:999px;">${escapeHtml(badgeText)}</span></p>`
      : `<p style="margin:26px 0 0;font-family:${FONT};font-size:12px;font-weight:800;letter-spacing:1.6px;text-transform:uppercase;color:${t.badgeFg};">${escapeHtml(badgeText)}</p>`
    : "";
  const headText = c.headline?.trim().slice(0, 90);
  const headInner = headText ? escapeHtml(headText) : "";
  const headline = headText
    ? `<h1 style="margin:${badgeText ? "14px" : "26px"} 0 0;font-family:${FONT};font-size:${t.headSize}px;line-height:${t.headHighlight ? "1.5" : "1.2"};font-weight:800;color:${t.headColor};">${
        t.headHighlight ? `<span style="background-color:${t.headHighlight};padding:0 8px;">${headInner}</span>` : headInner
      }</h1>`
    : "";

  const heroInner = `<p style="margin:0;font-family:${FONT};font-size:18px;font-weight:700;color:${t.brand};">${logo}<span style="vertical-align:middle;">Depup</span></p>
${badge}
${headline}`;
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
<html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"></head>
<body style="margin:0;padding:0;background-color:${t.page};">
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
<p style="margin:10px 0 0;font-size:12px;color:${t.muted};">Depup &middot; ${site ? `<a href="${escapeHtml(site)}" style="color:${t.muted};text-decoration:underline;">${escapeHtml(siteLabel)}</a>` : escapeHtml(siteLabel)}</p>
</td></tr>
</table>
</td></tr></table>
</body></html>`;
  return { html, text: textVersion(c, o) };
}
