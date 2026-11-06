"use client";
import { tl, useLang } from "@/lib/i18n";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Kanvas editor ala Canva: pratinjau website yang bisa diklik.
 *  - Teks bertanda data-f: klik → langsung diketik di tempat (Enter / klik di luar = simpan, Esc = batal).
 *  - Gambar bertanda data-img: klik → minta unggah gambar untuk slot itu.
 *  - Bagian bertanda data-sec: klik → bagian dipilih (panel samping menampilkan pengaturannya).
 * Iframe tetap di-sandbox tanpa allow-same-origin; komunikasi lewat postMessage, dan pesan hanya diterima dari
 * jendela iframe ini sendiri. Posisi gulir dibawa ke versi berikutnya supaya kanvas tidak loncat ke atas tiap diubah.
 */

/** Teks bilah aksi & dialog pratinjau dalam bahasa Inggris (string di skrip kita sendiri). */
const BRIDGE_EN: [string, string][] = [
  ["Jalankan aksi", "Run action"],
  ["Ganti gambar", "Replace image"],
  ["Edit teks", "Edit text"],
  ["Aa Huruf", "Aa Font"],
  ["<b>Ini pratinjau</b>Di website yang sudah online, tombol ini akan ", "<b>This is a preview</b>On the live website, this button will "],
  ["membuka WhatsApp untuk mengirim pesan", "open WhatsApp to send a message"],
  ["membuka aplikasi email", "open the email app"],
  ["membuka situs lain di tab baru", "open another site in a new tab"],
  ["menelepon nomor ini", "call this number"],
  ["Oke, mengerti", "OK, got it"],
];

const BRIDGE = `(function(){
var P=parent,ed=null,orig="",pick=null,sec=null,S=window.__dpS||1;
var st=document.createElement("style");
st.textContent="[data-f],a[href],[data-img]{cursor:pointer}[data-f]:hover,a[href]:hover,[data-img]:hover{outline:2px dashed rgba(124,92,255,.7);outline-offset:3px}"+
".dp-pick{outline:2px solid #7c5cff!important;outline-offset:3px}[data-f][contenteditable]{outline:2px solid #7c5cff!important;background:rgba(124,92,255,.08);cursor:text}"+
".dp-sel{outline:3px solid #7c5cff!important;outline-offset:-3px}.reader.dp-target{display:block}html:has(.reader.dp-target){overflow:hidden}"+
"#dp-bar{position:absolute;z-index:2147483000;display:flex;gap:2px;padding:4px;background:#1d1b26;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.28);transform-origin:left bottom;font:600 13px/1 system-ui,sans-serif;white-space:nowrap}"+
"#dp-bar button{all:unset;cursor:pointer;color:#fff;padding:9px 11px;border-radius:9px;display:flex;align-items:center;gap:6px}#dp-bar button:hover,#dp-bar button:focus-visible{background:#7c5cff}"+
"#dp-dlg{position:fixed;inset:0;z-index:2147483001;display:grid;place-items:center;background:rgba(20,16,40,.45);font:15px/1.5 system-ui,sans-serif}"+
"#dp-dlg>div{background:#fff;color:#1d1b26;border-radius:18px;padding:22px;max-width:340px;margin:16px;box-shadow:0 20px 60px rgba(0,0,0,.3);transform-origin:center}"+
"#dp-dlg b{display:block;font-size:17px;margin-bottom:6px}#dp-dlg code{display:block;margin:10px 0 14px;padding:8px 10px;background:#f1eefc;border-radius:10px;font:13px ui-monospace,monospace;word-break:break-all}"+
"#dp-dlg button{all:unset;cursor:pointer;background:#7c5cff;color:#fff;font-weight:700;padding:10px 18px;border-radius:12px}";
document.head.appendChild(st);
function go(){var y=window.__dpY||0;if(y)window.scrollTo(0,y);}
go();document.addEventListener("DOMContentLoaded",go);window.addEventListener("load",go);
var tk=0;window.addEventListener("scroll",function(){place();if(tk)return;tk=setTimeout(function(){tk=0;P.postMessage({dp:"scroll",y:window.scrollY},"*");},120);},{passive:true});
function esc(t){return String(t).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];});}
/* ---- kotak contoh untuk aksi yang keluar dari website (WhatsApp, email, telepon, situs lain) ---- */
function dummy(url){var u=String(url||""),what="membuka halaman lain";
if(/^https?:\\/\\/(wa\\.me|api\\.whatsapp\\.com)/i.test(u))what="membuka WhatsApp untuk mengirim pesan";else if(/^mailto:/i.test(u))what="membuka aplikasi email";else if(/^tel:/i.test(u))what="menelepon nomor ini";else if(/^https?:/i.test(u))what="membuka situs lain di tab baru";
closeDlg();var d=document.createElement("div");d.id="dp-dlg";d.innerHTML="<div style='transform:scale("+(1/S)+")'><b>Ini pratinjau</b>Di website yang sudah online, tombol ini akan "+what+":<code>"+esc(u.replace(/^mailto:|^tel:/i,""))+"</code><button type=button>Oke, mengerti</button></div>";
d.addEventListener("click",function(e){if(e.target===d||e.target.tagName==="BUTTON")closeDlg();});document.body.appendChild(d);d.querySelector("button").focus();}
function closeDlg(){var d=document.getElementById("dp-dlg");if(d)d.remove();}
window.open=function(u){dummy(u);return null;};
/* ---- jalankan aksi tautan tanpa meninggalkan kanvas ---- */
function run(a){var h=a.getAttribute("href")||"";
if(h.charAt(0)==="#"){var id=h.slice(1),t=id?document.getElementById(id):null;
document.querySelectorAll(".reader.dp-target").forEach(function(r){r.classList.remove("dp-target");});
if(t&&t.classList.contains("reader")){t.classList.add("dp-target");t.scrollTop=0;}else if(t)t.scrollIntoView({behavior:"smooth",block:"start"});else if(!id)window.scrollTo({top:0,behavior:"smooth"});
var d=a.closest("details");if(d)d.open=false;return;}
dummy(a.href||h);}
/* ---- edit teks di tempat ---- */
function done(save){if(!ed)return;var el=ed;ed=null;var v=el.innerText;el.removeAttribute("contenteditable");if(!save){el.innerText=orig;return;}if(v.trim()!==orig.trim())P.postMessage({dp:"edit",f:el.getAttribute("data-f"),v:v},"*");}
function start(el,x,y){hideBar();if(ed===el)return;done(true);ed=el;orig=el.innerText;try{el.setAttribute("contenteditable","plaintext-only");if(el.contentEditable!=="plaintext-only")el.setAttribute("contenteditable","true");}catch(e){el.setAttribute("contenteditable","true");}el.focus();
var r=x!=null&&document.caretRangeFromPoint?document.caretRangeFromPoint(x,y):null,s=window.getSelection();if(s){s.removeAllRanges();if(r&&el.contains(r.startContainer))s.addRange(r);else{var rr=document.createRange();rr.selectNodeContents(el);s.addRange(rr);}}
el.addEventListener("blur",function(){done(true);},{once:true});}
/* ---- seleksi + bilah aksi ---- */
var bar=null;
function role(f){var h=f.closest("h1,h2,h3,h4");return h?(h.tagName==="H1"?"title":"sub"):"body";}
function hideBar(){if(bar){bar.remove();bar=null;}if(pick){pick.classList.remove("dp-pick");pick=null;P.postMessage({dp:"pick",role:null},"*");}}
function place(){if(!bar||!pick)return;var r=pick.getBoundingClientRect(),bw=bar.offsetWidth/S,bh=bar.offsetHeight/S;
var x=Math.max(4,Math.min(window.innerWidth-bw*S-4,r.left))+window.scrollX,y=r.top+window.scrollY-bh*S-10;if(r.top-bh*S-10<0)y=r.bottom+window.scrollY+10;bar.style.left=x+"px";bar.style.top=y+"px";}
function select(el,x,y){hideBar();pick=el;el.classList.add("dp-pick");
var f=el.matches("[data-f]")?el:el.querySelector("[data-f]"),a=el.closest("a[href]"),im=el.closest("[data-img]");
bar=document.createElement("div");bar.id="dp-bar";bar.setAttribute("role","toolbar");bar.style.transform="scale("+(1/S)+")";
function add(label,fn){var b=document.createElement("button");b.type="button";b.textContent=label;b.addEventListener("click",function(e){e.preventDefault();e.stopPropagation();fn();});bar.appendChild(b);}
if(f){var rl=role(f);add("\\u270E Edit teks",function(){start(f,null,null);});add("Aa Huruf",function(){P.postMessage({dp:"font",role:rl},"*");});P.postMessage({dp:"pick",role:rl},"*");}
if(a){var h=a.getAttribute("href")||"";add(h.charAt(0)==="#"?"\\u2193 Jalankan aksi":"\\u2197 Jalankan aksi",function(){hideBar();run(a);});}
if(im)add("\\u21BB Ganti gambar",function(){hideBar();P.postMessage({dp:"img",k:im.getAttribute("data-img")},"*");});
document.body.appendChild(bar);place();var fb=bar.querySelector("button");if(fb)fb.focus({preventScroll:true});}
document.addEventListener("keydown",function(e){
if(ed){if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();ed.blur();}else if(e.key==="Escape"){e.preventDefault();var el=ed;done(false);el.blur();}return;}
if(e.key==="Escape"){closeDlg();hideBar();}},true);
document.addEventListener("dblclick",function(e){var f=e.target.closest&&e.target.closest("[data-f]");if(f){e.preventDefault();start(f,e.clientX,e.clientY);}},true);
document.addEventListener("submit",function(e){e.preventDefault();},true);
document.addEventListener("click",function(e){var t=e.target;if(!t||!t.closest)return;
if(t.closest("#dp-bar,#dp-dlg"))return;
if(ed&&ed.contains(t))return;
var f=t.closest("[data-f]"),a=t.closest("a[href]"),im=t.closest("[data-img]");
if(f||a||im){e.preventDefault();e.stopPropagation();var el=a||f||im;
if(pick===el&&f&&!a){start(f,e.clientX,e.clientY);return;}
select(el,e.clientX,e.clientY);return;}
hideBar();
var s=t.closest("[data-sec]");if(s){if(sec)sec.classList.remove("dp-sel");sec=s;s.classList.add("dp-sel");P.postMessage({dp:"sec",id:s.getAttribute("data-sec")},"*");}
},true);
window.addEventListener("message",function(e){if(e.source!==P||!e.data)return;
if(e.data.dp==="scale"&&typeof e.data.s==="number"&&e.data.s>0){S=e.data.s;if(bar){bar.style.transform="scale("+(1/S)+")";place();}return;}
if(e.data.dp!=="select")return;if(sec)sec.classList.remove("dp-sel");sec=null;if(!e.data.id)return;var s=document.querySelector('[data-sec="'+String(e.data.id).replace(/[^a-z-]/g,"")+'"]');if(s){sec=s;s.classList.add("dp-sel");s.scrollIntoView({block:"start",behavior:"smooth"});}});
})();`;

export type TextRoleMsg = "title" | "sub" | "body";
export type CanvasMsg = { dp: "edit"; f: string; v: string } | { dp: "img"; k: string } | { dp: "sec"; id: string } | { dp: "pick"; role: TextRoleMsg | null } | { dp: "font"; role: TextRoleMsg };

export interface CanvasHandle {
  /** Sorot & gulir ke satu bagian (null = hapus sorotan). */
  select(id: string | null): void;
}

export const CanvasFrame = React.forwardRef<
  CanvasHandle,
  { html: string; device: "desktop" | "mobile"; onMessage: (m: CanvasMsg) => void; busy?: boolean; className?: string }
>(function CanvasFrame({ html, device, onMessage, busy, className }, ref) {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const frameRef = React.useRef<HTMLIFrameElement>(null);
  const scrollY = React.useRef(0);
  const scaleRef = React.useRef(1);
  const [box, setBox] = React.useState({ w: 0, h: 0 });
  const cb = React.useRef(onMessage);
  cb.current = onMessage;

  React.useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  React.useEffect(() => {
    const on = (e: MessageEvent) => {
      if (!frameRef.current || e.source !== frameRef.current.contentWindow) return;
      const d = e.data as Record<string, unknown> | null;
      if (!d || typeof d !== "object") return;
      if (d.dp === "scroll" && typeof d.y === "number" && Number.isFinite(d.y)) scrollY.current = Math.max(0, Math.min(1e6, d.y));
      else if (d.dp === "edit" && typeof d.f === "string" && typeof d.v === "string" && d.f.length < 60 && d.v.length < 4000) cb.current({ dp: "edit", f: d.f, v: d.v });
      else if (d.dp === "img" && typeof d.k === "string" && d.k.length < 80) cb.current({ dp: "img", k: d.k });
      else if (d.dp === "sec" && typeof d.id === "string" && d.id.length < 30) cb.current({ dp: "sec", id: d.id });
      else if (d.dp === "pick" && (d.role === null || d.role === "title" || d.role === "sub" || d.role === "body")) cb.current({ dp: "pick", role: d.role });
      else if (d.dp === "font" && (d.role === "title" || d.role === "sub" || d.role === "body")) cb.current({ dp: "font", role: d.role });
    };
    window.addEventListener("message", on);
    return () => window.removeEventListener("message", on);
  }, []);

  React.useImperativeHandle(ref, () => ({
    select(id) {
      frameRef.current?.contentWindow?.postMessage({ dp: "select", id }, "*");
    },
  }));

  // Ganti perangkat = mulai dari atas lagi (tata letaknya berbeda).
  React.useEffect(() => {
    scrollY.current = 0;
  }, [device]);

  // Skrip jembatan + posisi gulir terakhir disisipkan sebelum </body>. Hanya untuk kanvas, bukan untuk publish/ekspor.
  const lang = useLang();
  const srcDoc = React.useMemo(() => {
    const bridge = lang === "en" ? BRIDGE_EN.reduce((js, [a, b]) => js.split(a).join(b), BRIDGE) : BRIDGE;
    const tag = `<script>window.__dpY=${Math.round(scrollY.current)};window.__dpS=${scaleRef.current};${bridge}</script>`;
    const i = html.lastIndexOf("</body>");
    return i >= 0 ? html.slice(0, i) + tag + html.slice(i) : html + tag;
  }, [html, lang]);

  const vw = device === "desktop" ? 1280 : 390;
  const pad = 24;
  const availW = Math.max(0, box.w - pad * 2);
  const scale = availW > 0 ? Math.min(1, availW / vw) : 1;
  scaleRef.current = scale;
  // Bilah aksi & kotak contoh di dalam iframe dibesarkan balik sesuai skala kanvas supaya tetap terbaca.
  const sendScale = React.useCallback(() => frameRef.current?.contentWindow?.postMessage({ dp: "scale", s: scaleRef.current }, "*"), []);
  React.useEffect(() => {
    sendScale();
  }, [scale, sendScale]);
  const frameW = Math.round(vw * scale);
  const frameH = Math.max(200, box.h - pad * 2);

  return (
    <div ref={wrapRef} className={cn("relative h-full w-full overflow-hidden", className)}>
      <div
        className={cn(
          "absolute left-1/2 top-6 -translate-x-1/2 overflow-hidden bg-white shadow-[0_10px_40px_rgba(30,20,60,.18)] transition-opacity motion-reduce:transition-none",
          device === "mobile" ? "rounded-[28px] ring-[6px] ring-[#1d1b26]" : "rounded-[10px]",
          busy && "opacity-60",
        )}
        style={{ width: frameW, height: frameH }}
      >
        {box.w > 0 && (
          <iframe
            ref={frameRef}
            title={tl(device === "desktop" ? "Kanvas website, tampilan desktop. Klik teks untuk mengubah." : "Kanvas website, tampilan HP. Klik teks untuk mengubah.")}
            srcDoc={srcDoc}
            onLoad={sendScale}
            sandbox="allow-scripts allow-downloads allow-popups allow-popups-to-escape-sandbox"
            style={{ width: vw, height: Math.ceil(frameH / scale), border: 0, display: "block", background: "#fff", transform: `scale(${scale})`, transformOrigin: "top left" }}
          />
        )}
      </div>
    </div>
  );
});
