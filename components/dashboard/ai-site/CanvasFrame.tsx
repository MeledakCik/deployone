"use client";

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

const BRIDGE = `(function(){
var P=parent,ed=null,orig="",sel=null;
var st=document.createElement("style");
st.textContent="[data-f]{cursor:text;outline:2px dashed transparent;outline-offset:3px;border-radius:3px;transition:outline-color .12s}[data-f]:hover{outline-color:rgba(124,92,255,.75)}[data-f][contenteditable]{outline:2px solid #7c5cff!important;background:rgba(124,92,255,.08);cursor:text}[data-img]{cursor:pointer}[data-img]:hover{outline:3px dashed rgba(124,92,255,.85);outline-offset:-3px}.dp-sel{outline:3px solid #7c5cff!important;outline-offset:-3px}";
document.head.appendChild(st);
function go(){var y=window.__dpY||0;if(y)window.scrollTo(0,y);}
go();document.addEventListener("DOMContentLoaded",go);window.addEventListener("load",go);
var tk=0;window.addEventListener("scroll",function(){if(tk)return;tk=setTimeout(function(){tk=0;P.postMessage({dp:"scroll",y:window.scrollY},"*");},120);},{passive:true});
function done(save){if(!ed)return;var el=ed;ed=null;var v=el.innerText;el.removeAttribute("contenteditable");if(!save){el.innerText=orig;return;}if(v.trim()!==orig.trim())P.postMessage({dp:"edit",f:el.getAttribute("data-f"),v:v},"*");}
function start(el,x,y){if(ed===el)return;done(true);ed=el;orig=el.innerText;try{el.setAttribute("contenteditable","plaintext-only");if(el.contentEditable!=="plaintext-only")el.setAttribute("contenteditable","true");}catch(e){el.setAttribute("contenteditable","true");}el.focus();var r=document.caretRangeFromPoint?document.caretRangeFromPoint(x,y):null;var s=window.getSelection();if(r&&s){s.removeAllRanges();s.addRange(r);}
el.addEventListener("blur",function(){done(true);},{once:true});}
document.addEventListener("keydown",function(e){if(!ed)return;if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();ed.blur();}else if(e.key==="Escape"){e.preventDefault();var el=ed;done(false);el.blur();}},true);
document.addEventListener("click",function(e){var t=e.target;if(!t||!t.closest)return;
var f=t.closest("[data-f]");if(f){e.preventDefault();e.stopPropagation();start(f,e.clientX,e.clientY);return;}
var im=t.closest("[data-img]");if(im){e.preventDefault();e.stopPropagation();P.postMessage({dp:"img",k:im.getAttribute("data-img")},"*");return;}
var a=t.closest("a[href]");if(a&&a.getAttribute("href").charAt(0)!=="#")e.preventDefault();
var s=t.closest("[data-sec]");if(s){if(sel)sel.classList.remove("dp-sel");sel=s;s.classList.add("dp-sel");P.postMessage({dp:"sec",id:s.getAttribute("data-sec")},"*");}
},true);
window.addEventListener("message",function(e){if(e.source!==P||!e.data||e.data.dp!=="select")return;if(sel)sel.classList.remove("dp-sel");sel=null;if(!e.data.id)return;var s=document.querySelector('[data-sec="'+String(e.data.id).replace(/[^a-z-]/g,"")+'"]');if(s){sel=s;s.classList.add("dp-sel");s.scrollIntoView({block:"start",behavior:"smooth"});}});
})();`;

export type CanvasMsg = { dp: "edit"; f: string; v: string } | { dp: "img"; k: string } | { dp: "sec"; id: string };

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
  const srcDoc = React.useMemo(() => {
    const tag = `<script>window.__dpY=${Math.round(scrollY.current)};${BRIDGE}</script>`;
    const i = html.lastIndexOf("</body>");
    return i >= 0 ? html.slice(0, i) + tag + html.slice(i) : html + tag;
  }, [html]);

  const vw = device === "desktop" ? 1280 : 390;
  const pad = 24;
  const availW = Math.max(0, box.w - pad * 2);
  const scale = availW > 0 ? Math.min(1, availW / vw) : 1;
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
            title={`Kanvas website, tampilan ${device === "desktop" ? "desktop" : "HP"}. Klik teks untuk mengubah.`}
            srcDoc={srcDoc}
            sandbox="allow-scripts allow-downloads allow-popups allow-popups-to-escape-sandbox"
            style={{ width: vw, height: Math.ceil(frameH / scale), border: 0, display: "block", background: "#fff", transform: `scale(${scale})`, transformOrigin: "top left" }}
          />
        )}
      </div>
    </div>
  );
});
