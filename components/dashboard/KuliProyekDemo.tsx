"use client";

import * as React from "react";
import { Play } from "lucide-react";
import { AlertTriangle, Check, Hammer, RotateCcw, Rocket, Search, UploadCloud, X } from "@/components/ui/icons";
import { Badge, Btn, Card } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { KuliProyek, usePageVisible, type KuliStage } from "./KuliProyek";

/**
 * Panel demo MANDIRI untuk <KuliProyek />. Timer palsu menggerakkan
 * cek -> upload -> build -> live. Tidak memanggil API deploy apa pun.
 */

type TimedStage = "cek" | "upload" | "build";

const DURATIONS: Record<TimedStage, number> = { cek: 3500, upload: 4000, build: 4500 }; // ms pada 1x
const NEXT: Record<TimedStage, KuliStage> = { cek: "upload", upload: "build", build: "live" };
const SPEEDS = [1, 2, 4] as const;

const STEPS = [
  { id: "cek", label: "Cek", Icon: Search },
  { id: "upload", label: "Upload", Icon: UploadCloud },
  { id: "build", label: "Build", Icon: Hammer },
  { id: "live", label: "Live", Icon: Rocket },
] as const;

function isTimed(s: KuliStage): s is TimedStage {
  return s === "cek" || s === "upload" || s === "build";
}

type StepState = "todo" | "active" | "done" | "bad";

const STATE_TEXT: Record<StepState, string> = { todo: "belum", active: "sedang berjalan", done: "selesai", bad: "gagal" };

const STATE_CLS: Record<StepState, string> = {
  todo: "border-[var(--line-strong)] text-[var(--text-muted)]",
  active: "border-transparent bg-tone-lilac text-lav-text motion-safe:animate-pulse",
  done: "border-transparent bg-tone-mint text-ok-fg",
  bad: "border-transparent bg-tone-pink text-bad-fg",
};

export function KuliProyekDemo({ className }: { className?: string }) {
  const [stage, setStage] = React.useState<KuliStage>("idle");
  const [running, setRunning] = React.useState(false);
  const [speed, setSpeed] = React.useState<(typeof SPEEDS)[number]>(1);
  const [failAt, setFailAt] = React.useState(0);
  const visible = usePageVisible();
  const progress = React.useRef(0); // porsi tahap yang sudah berjalan (0..1), supaya jeda tidak mengulang dari nol

  React.useEffect(() => {
    if (!running || !visible || !isTimed(stage)) return;
    const total = DURATIONS[stage] / speed;
    const t0 = performance.now();
    let fired = false;
    const id = window.setTimeout(() => {
      fired = true;
      progress.current = 0;
      const next = NEXT[stage];
      setStage(next);
      if (next === "live") setRunning(false);
    }, total * (1 - progress.current));
    return () => {
      window.clearTimeout(id);
      if (!fired) progress.current = Math.min(0.99, progress.current + (performance.now() - t0) / total);
    };
  }, [running, visible, stage, speed]);

  const start = () => {
    progress.current = 0;
    setStage("cek");
    setRunning(true);
  };

  const fail = () => {
    setFailAt(Math.max(0, STEPS.findIndex((s) => s.id === stage)));
    progress.current = 0;
    setRunning(false);
    setStage("gagal");
  };

  const current = STEPS.findIndex((s) => s.id === stage);
  const stateOf = (i: number): StepState => {
    if (stage === "idle") return "todo";
    if (stage === "live") return "done";
    if (stage === "gagal") return i < failAt ? "done" : i === failAt ? "bad" : "todo";
    return i < current ? "done" : i === current ? "active" : "todo";
  };

  return (
    <Card title="Kuli Proyek" action={<Badge tone="violet">Demo</Badge>} className={className}>
      <div className="space-y-4 p-4 sm:p-5">
        <p className="text-[12.5px] leading-relaxed text-[var(--text-muted)]">
          Simulasi lucu selagi &ldquo;deploy&rdquo; berjalan. Ini hanya timer palsu di browser, tidak memanggil deploy asli.
        </p>

        <KuliProyek stage={stage} speed={speed} />

        <ol className="grid grid-cols-4 gap-2" aria-label="Tahap deploy">
          {STEPS.map(({ id, label, Icon }, i) => {
            const st = stateOf(i);
            return (
              <li key={id} aria-current={st === "active" ? "step" : undefined} className="flex flex-col items-center gap-1.5 text-center">
                <span className={cn("grid h-9 w-9 place-items-center rounded-full border transition-colors", STATE_CLS[st])}>
                  {st === "done" ? <Check size={16} aria-hidden="true" /> : st === "bad" ? <X size={16} aria-hidden="true" /> : <Icon size={16} aria-hidden="true" />}
                </span>
                <span className={cn("text-[12px] font-medium", st === "todo" ? "text-[var(--text-muted)]" : "text-[var(--text)]")}>
                  {label}
                  <span className="sr-only">: {STATE_TEXT[st]}</span>
                </span>
              </li>
            );
          })}
        </ol>

        <div className="flex flex-wrap items-center gap-2">
          <Btn variant="primary" className="min-h-[36px]" onClick={start} disabled={running || stage !== "idle"} aria-label="Mulai simulasi deploy">
            <Play size={13} aria-hidden="true" /> Mulai
          </Btn>
          <Btn className="min-h-[36px]" onClick={start} disabled={stage === "idle"} aria-label="Ulangi simulasi dari awal">
            <RotateCcw size={13} aria-hidden="true" /> Ulangi
          </Btn>
          <Btn variant="danger" className="min-h-[36px]" onClick={fail} disabled={!running} aria-label="Gagalkan simulasi deploy">
            <AlertTriangle size={13} aria-hidden="true" /> Gagalkan
          </Btn>

          <div role="group" aria-label="Kecepatan animasi" className="ml-auto flex items-center gap-1.5">
            <span className="text-[12px] text-[var(--text-muted)]" aria-hidden="true">
              Kecepatan
            </span>
            {SPEEDS.map((s) => (
              <Btn key={s} variant={speed === s ? "primary" : "ghost"} className="min-h-[36px] min-w-[40px] px-3" aria-pressed={speed === s} aria-label={`Kecepatan ${s} kali`} onClick={() => setSpeed(s)}>
                {s}x
              </Btn>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
