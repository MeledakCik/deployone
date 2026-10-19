/**
 * Perbaikan href relatif untuk halaman folder ("/dashboard" -> dashboard/index.html).
 *
 * Next.js menormalkan "/dashboard/" menjadi "/dashboard" (308) SEBELUM middleware jalan, jadi kita tidak
 * bisa me-redirect ke versi ber-slash (akan loop). Akibatnya browser menganggap halaman berada di "/",
 * sehingga `href="style.css"` / `src="app.js"` / `href="../index.html"` di dalam dashboard/index.html
 * menunjuk ke tempat yang salah. Solusi: sisipkan <base href="/dashboard/"> (seperti yang
 * dilakukan versi ber-slash di Vercel/Netlify) + skrip kecil supaya link "#anchor" tetap di halaman yang sama.
 */
export function withDirBase(html: string, dirPath: string): string {
  if (/<base\s/i.test(html)) return html; // developer sudah menentukan sendiri
  const baseHref = "/" + dirPath.replace(/^\/+|\/+$/g, "") + "/";
  const tag =
    `<base href="${baseHref.replace(/"/g, "%22")}">` +
    `<script>document.addEventListener("click",function(e){var a=e.target&&e.target.closest&&e.target.closest("a[href^='#']");` +
    `if(a&&!e.defaultPrevented&&a.getAttribute("href").length>1){e.preventDefault();location.hash=a.getAttribute("href")}})</script>`;
  const m = /<head(\s[^>]*)?>/i.exec(html);
  if (m) return html.slice(0, m.index + m[0].length) + tag + html.slice(m.index + m[0].length);
  const h = /<html(\s[^>]*)?>/i.exec(html);
  if (h) return html.slice(0, h.index + h[0].length) + "<head>" + tag + "</head>" + html.slice(h.index + h[0].length);
  return tag + html;
}
