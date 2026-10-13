"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { DeployState } from "@/lib/deploy-context";

/**
 * Panel log debug untuk proses deploy.
 *
 * Log disusun dari perubahan state deploy yang nyata (tahap, subtitle, hasil, error),
 * ditambah "heartbeat" tiap beberapa detik selama menunggu platform, supaya terlihat
 * bahwa proses masih berjalan. Tidak ada data sensitif yang ditambahkan di sini.
 */

type Level = "info" | "ok" | "warn" | "error" | "wait";
export interface LogLine {
  id: number;
  at: number; // ms sejak deploy dimulai
  level: Level;
  text: string;
}

const STEP_LABELS = [
  "Menghubungkan ke GitHub",
  "Mengunduh source code",
  "Install dependencies",
  "Build project",
  "Deploy ke edge network",
];

const LEVEL_STYLE: Record<Level, { tag: string; cls: string }> = {
  info: { tag: "INFO", cls: "text-sky-300/80" },
  ok: { tag: " OK ", cls: "text-emerald-300/90" },
  warn: { tag: "WARN", cls: "text-amber-300/90" },
  error: { tag: "ERR ", cls: "text-red-300/90" },
  wait: { tag: "WAIT", cls: "text-white/35" },
};

function fmt(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/** Menurunkan log dari DeployState. Dipanggil dari modal (hook harus di atas early-return). */
export function useDeployLog(state: DeployState, enabled: boolean) {
  const [lines, setLines] = React.useState<LogLine[]>([]);
  const startRef = React.useRef<number>(0);
  const idRef = React.useRef(0);
  const seenRef = React.useRef({ step: -1, subtitle: "", status: "idle" as DeployState["status"] });

  const push = React.useCallback((level: Level, text: string) => {
    const at = startRef.current ? Date.now() - startRef.current : 0;
    setLines((prev) => {
      const next = [...prev, { id: ++idRef.current, at, level, text }];
      return next.length > 200 ? next.slice(next.length - 200) : next;
    });
  }, []);

  const { status, stepIndex, subtitle, errorGuide, error, result } = state;

  React.useEffect(() => {
    if (!enabled) return;
    const seen = seenRef.current;

    if (status === "deploying" && seen.status !== "deploying") {
      // deploy baru dimulai → mulai log baru
      startRef.current = Date.now();
      idRef.current = 0;
      setLines([{ id: ++idRef.current, at: 0, level: "info", text: "Deploy dimulai. Memeriksa repo & token…" }]);
      seen.step = -1;
      seen.subtitle = "";
    }

    if (status === "deploying") {
      if (stepIndex !== seen.step) {
        if (stepIndex > 0) {
          const prevLabel = STEP_LABELS[Math.min(stepIndex - 1, STEP_LABELS.length - 1)];
          push("ok", `Selesai: ${prevLabel}`);
        }
        if (stepIndex < STEP_LABELS.length) push("info", `Mulai: ${STEP_LABELS[stepIndex]}`);
        seen.step = stepIndex;
      }
      if (subtitle && subtitle !== seen.subtitle && stepIndex > 0) {
        push("info", subtitle);
        seen.subtitle = subtitle;
      }
    }

    if (status === "success" && seen.status !== "success") {
      push("ok", `Selesai: ${STEP_LABELS[STEP_LABELS.length - 1]}`);
      push("ok", result?.domain ? `Deploy siap: ${result.domain}` : "Deploy berhasil.");
    }

    if (status === "error" && seen.status !== "error") {
      push("error", errorGuide?.title ?? "Deploy gagal");
      push("error", errorGuide?.message ?? error ?? "Terjadi kesalahan.");
      if (errorGuide?.technical) push("warn", `detail: ${errorGuide.technical}`);
    }

    seen.status = status;
  }, [enabled, status, stepIndex, subtitle, errorGuide, error, result, push]);

  // heartbeat selama menunggu platform
  React.useEffect(() => {
    if (!enabled || status !== "deploying") return;
    const iv = window.setInterval(() => {
      const label = STEP_LABELS[Math.min(seenRef.current.step, STEP_LABELS.length - 1)];
      push("wait", `Menunggu platform… (${label})`);
    }, 6000);
    return () => window.clearInterval(iv);
  }, [enabled, status, push]);

  return lines;
}

export function DeployDebugLog({
  lines,
  className,
  maxHeightClass = "max-h-36",
}: {
  lines: LogLine[];
  className?: string;
  maxHeightClass?: string;
}) {
  const boxRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = boxRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines.length]);

  return (
    <div
      className={cn("rounded-xl bg-black/40 border border-white/[0.07] text-left", className)}
      role="log"
      aria-live="off"
      aria-label="Log proses debug"
    >
      <div className="flex items-center justify-between px-3 pt-2 text-[10px] uppercase tracking-wider text-white/30">
        <span>Debug log</span>
        <span>{lines.length} baris</span>
      </div>
      <div
        ref={boxRef}
        className={cn("mt-1 overflow-y-auto px-3 pb-2.5 font-mono text-[10.5px] leading-[1.6]", maxHeightClass)}
      >
        {lines.length === 0 && <div className="text-white/30">Belum ada log.</div>}
        {lines.map((l) => {
          const st = LEVEL_STYLE[l.level];
          return (
            <div key={l.id} className="flex gap-2 break-words">
              <span className="shrink-0 text-white/25">{fmt(l.at)}</span>
              <span className={cn("shrink-0 whitespace-pre", st.cls)}>{st.tag}</span>
              <span className={cn("min-w-0 whitespace-pre-wrap break-words", l.level === "wait" ? "text-white/35" : "text-white/70")}>
                {l.text}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
