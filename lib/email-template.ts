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

export interface MailContent {
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

/** Template promosi: banner gradient, judul besar, kartu poin, tombol besar. */
export function renderRich(c: MailContent, o: RenderOpts): { html: string; text: string } {
  const cta = cleanCta(c);
  const feats = cleanFeatures(c);
  const site = (o.siteUrl ?? "").replace(/\/+$/, "");
  const siteLabel = site.replace(/^https?:\/\//, "") || "depup.web.id";
  const pre = c.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;">${escapeHtml(c.preheader)}</div>`
    : "";
  // Logo digambar dengan HTML (bukan <img>) supaya tetap muncul saat Gmail/Outlook memblokir gambar.
  const logo = `<span style="display:inline-block;width:32px;height:32px;line-height:32px;text-align:center;border-radius:50%;background-color:#ffffff;color:#6d28d9;font-family:${FONT};font-size:20px;font-weight:900;vertical-align:middle;margin-right:10px;">&uarr;</span>`;
  const badge = c.badge?.trim()
    ? `<p style="margin:26px 0 0;"><span style="display:inline-block;font-family:${FONT};background-color:#ffffff;color:#6d28d9;font-size:12px;font-weight:700;letter-spacing:.5px;padding:6px 14px;border-radius:999px;">${escapeHtml(c.badge.trim().slice(0, 30))}</span></p>`
    : "";
  const headline = c.headline?.trim()
    ? `<h1 style="margin:${c.badge?.trim() ? "14px" : "26px"} 0 0;font-family:${FONT};font-size:30px;line-height:1.2;font-weight:800;color:#ffffff;">${escapeHtml(c.headline.trim().slice(0, 90))}</h1>`
    : "";

  const featRows = feats
    .map(
      (f, i) => `<tr><td style="padding:0 0 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f6f3ff" style="background-color:#f6f3ff;border-radius:14px;"><tr>
<td width="52" valign="top" style="padding:16px 0 16px 16px;"><div style="width:34px;height:34px;line-height:34px;text-align:center;border-radius:50%;background-color:#7c3aed;color:#ffffff;font-family:${FONT};font-size:15px;font-weight:700;">${i + 1}</div></td>
<td valign="top" style="padding:16px 18px 16px 4px;font-family:${FONT};"><p style="margin:0;font-size:16px;font-weight:700;color:#1e1b4b;">${escapeHtml(f.title)}</p>${
        f.desc ? `<p style="margin:4px 0 0;font-size:14px;line-height:1.55;color:#4b5563;">${escapeHtml(f.desc)}</p>` : ""
      }</td></tr></table></td></tr>`
    )
    .join("\n");

  const button = cta
    ? `<table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="margin:8px auto 0;"><tr>
<td align="center" bgcolor="#7c3aed" style="border-radius:999px;background-color:#7c3aed;background-image:linear-gradient(135deg,#7c3aed,#4f46e5);"><a href="${escapeHtml(cta.url)}" style="display:inline-block;padding:16px 38px;font-family:${FONT};font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:999px;">${escapeHtml(cta.label)} &rarr;</a></td>
</tr></table>
<p style="margin:14px 0 0;text-align:center;font-family:${FONT};font-size:12px;line-height:1.5;color:#9ca3af;">Tombol tidak berfungsi? Buka <a href="${escapeHtml(cta.url)}" style="color:#7c3aed;text-decoration:underline;">${escapeHtml(cta.url.replace(/^https?:\/\//, "").slice(0, 60))}</a></p>`
    : "";

  const unsub = o.unsubUrl
    ? `<br><a href="${escapeHtml(o.unsubUrl)}" style="color:#6b7280;text-decoration:underline;">Berhenti berlangganan email promosi</a>`
    : "";

  const html = `<!doctype html>
<html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"></head>
<body style="margin:0;padding:0;background-color:#ede9fe;">
${pre}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#ede9fe" style="background-color:#ede9fe;"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background-color:#ffffff;border-radius:20px;overflow:hidden;">
<tr><td bgcolor="#6d28d9" style="background-color:#6d28d9;background-image:linear-gradient(135deg,#7c3aed 0%,#4f46e5 55%,#0891b2 100%);padding:28px 32px 34px;">
<p style="margin:0;font-family:${FONT};font-size:18px;font-weight:700;color:#ffffff;">${logo}<span style="vertical-align:middle;">Depup</span></p>
${badge}
${headline}
</td></tr>
<tr><td style="padding:32px 32px 8px;font-family:${FONT};">
${paragraphs(c.body, "margin:0 0 18px;font-size:16px;line-height:1.65;color:#1f2937;")}
</td></tr>
${featRows ? `<tr><td style="padding:8px 32px 8px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${featRows}</table></td></tr>` : ""}
${button ? `<tr><td style="padding:24px 32px 36px;">${button}</td></tr>` : `<tr><td style="padding:0 0 16px;"></td></tr>`}
<tr><td bgcolor="#faf9ff" style="background-color:#faf9ff;border-top:1px solid #ede9fe;padding:22px 32px;font-family:${FONT};">
<p style="margin:0;font-size:12px;line-height:1.6;color:#6b7280;">${escapeHtml(o.footerNote)}${unsub}</p>
<p style="margin:10px 0 0;font-size:12px;color:#9ca3af;">Depup &middot; ${site ? `<a href="${escapeHtml(site)}" style="color:#9ca3af;text-decoration:underline;">${escapeHtml(siteLabel)}</a>` : escapeHtml(siteLabel)}</p>
</td></tr>
</table>
</td></tr></table>
</body></html>`;
  return { html, text: textVersion(c, o) };
}
