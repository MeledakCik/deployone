"use client";

import * as React from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { Btn } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

/**
 * Menampilkan HTML di dalam iframe berukuran "virtual" (mis. 1280px) lalu mengecilkannya dengan
 * transform supaya muat di kolom. Dengan begitu pratinjau desktop benar-benar memakai tata letak desktop,
 * bukan tata letak tablet karena kolomnya sempit.
 */
export function ScaledFrame({
  html,
  title,
  vw,
  vh,
  fitHeight,
  sandbox,
  interactive = true,
  className,
}: {
  html: string;
  title: string;
  /** Lebar virtual iframe (px). */
  vw: number;
  /** Tinggi virtual iframe (px). Diabaikan bila fitHeight diisi. */
  vh?: number;
  /** Tinggi kotak tampilan (px) bila ingin tinggi tetap; tinggi iframe menyesuaikan skala. */
  fitHeight?: number;
  sandbox: string;
  interactive?: boolean;
  className?: string;
}) {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const [w, setW] = React.useState(0);

  React.useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    setW(el.clientWidth);
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const scale = w > 0 ? Math.min(1, w / vw) : 1;
  const boxW = Math.round(vw * scale);
  const boxH = fitHeight ?? Math.round((vh ?? 800) * scale);
  const innerH = fitHeight ? Math.ceil(fitHeight / scale) : vh ?? 800;

  return (
    <div ref={wrapRef} className="w-full">
      <div className={cn("mx-auto overflow-hidden bg-white", className)} style={{ width: boxW, height: boxH }}>
        <iframe
          title={title}
          srcDoc={html}
          sandbox={sandbox}
          tabIndex={interactive ? undefined : -1}
          aria-hidden={interactive ? undefined : true}
          style={{
            width: vw,
            height: innerH,
            border: 0,
            display: "block",
            background: "#fff",
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            pointerEvents: interactive ? undefined : "none",
          }}
        />
      </div>
    </div>
  );
}

/**
 * Pratinjau website: bingkai desktop (1280px) atau HP (390px), dengan tombol layar penuh.
 * Iframe tetap di-sandbox tanpa allow-same-origin, jadi skrip di dalamnya tidak bisa menyentuh dashboard.
 */
export function PreviewFrame({ html, device }: { html: string; device: "desktop" | "mobile" }) {
  const boxRef = React.useRef<HTMLDivElement>(null);
  const [fs, setFs] = React.useState(false);
  const [canFs, setCanFs] = React.useState(false);
  const [winH, setWinH] = React.useState(800);

  React.useEffect(() => {
    setCanFs(!!document.fullscreenEnabled);
    const onChange = () => setFs(document.fullscreenElement === boxRef.current);
    const onResize = () => setWinH(window.innerHeight);
    onResize();
    document.addEventListener("fullscreenchange", onChange);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const vw = device === "desktop" ? 1280 : 390;
  const vh = device === "desktop" ? 800 : 760;

  return (
    <div ref={boxRef} className={cn(fs && "flex h-full w-full flex-col bg-[var(--bg)]")}>
      {fs && (
        <div className="flex h-12 shrink-0 items-center justify-between gap-3 px-4">
          <span className="text-[13px] font-medium">Pratinjau {device === "desktop" ? "desktop" : "HP"}</span>
          <Btn onClick={() => document.exitFullscreen?.()}>
            <Minimize2 size={13} /> Keluar layar penuh
          </Btn>
        </div>
      )}
      <div className={cn(fs ? "min-h-0 flex-1 overflow-auto px-2 pb-2" : "rounded-xl")}>
        <ScaledFrame
          html={html}
          title={`Pratinjau website, tampilan ${device === "desktop" ? "desktop" : "HP"}`}
          vw={vw}
          vh={vh}
          fitHeight={fs ? Math.max(240, winH - 56) : undefined}
          sandbox="allow-scripts allow-downloads allow-popups allow-popups-to-escape-sandbox"
          className={fs ? undefined : "rounded-xl ring-1 ring-[var(--line)]"}
        />
      </div>
      {!fs && canFs && (
        <div className="mt-2 flex justify-end">
          <Btn onClick={() => boxRef.current?.requestFullscreen?.().catch(() => {})}>
            <Maximize2 size={13} /> Layar penuh
          </Btn>
        </div>
      )}
    </div>
  );
}
