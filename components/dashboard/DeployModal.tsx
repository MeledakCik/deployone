"use client";

import * as React from "react";
import {
  Check,
  Loader2,
  Rocket,
  CircleAlert,
  ExternalLink,
  Terminal,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDeploy } from "@/lib/deploy-context";

const DEPLOY_STEPS_LABELS = [
  "Menghubungkan ke GitHub",
  "Mengunduh source code",
  "Install dependencies",
  "Build project",
  "Deploy ke edge network",
];

export function DeployModal() {
  const { deployState, closeModal, handleCloseAfterDeploy } = useDeploy();
  const { status, stepIndex, barWidth, title, subtitle, error, result } =
    deployState;

  if (status === "idle") return null;

  const isDeploying = status === "deploying";
  const isDone = status === "success";
  const isError = status === "error";

  /* Klik backdrop: jangan tutup saat masih deploying */
  const onBackdropClick = () => {
    if (isDeploying) return;
    closeModal();
  };

  return (
    <>
      {/* keyframes lokal — biar tidak bentrok dengan style global */}
      <style>{`
        @keyframes dcModalIn  { from { opacity:0; transform: scale(.96) } to { opacity:1; transform: scale(1) } }
        @keyframes dcFadeIn   { from { opacity:0 } to { opacity:1 } }
        @keyframes dcShimmer  { 0% { transform: translateX(-100%) } 100% { transform: translateX(100%) } }
        @keyframes dcSpin     { to { transform: rotate(360deg) } }
      `}</style>

      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
        {/* backdrop */}
        <div
          className="absolute inset-0 bg-[#06060a]/80 backdrop-blur-[14px]"
          onClick={onBackdropClick}
        />

        {/* modal */}
        <div
          className="relative w-full max-w-[520px] rounded-[28px] bg-[#15151f] border border-white/[0.08] shadow-[0_20px_80px_-20px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.05)_inset] overflow-hidden flex flex-col max-h-[90vh]"
          style={{ animation: "dcModalIn .3s ease" }}
        >
          <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-white/15 to-transparent shrink-0" />

          {/* ================= HEADER ================= */}
          <div className="px-7 md:px-8 pt-6 pb-5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "w-9 h-9 rounded-xl border flex items-center justify-center",
                  isError
                    ? "bg-red-500/10 border-red-500/20 text-red-300"
                    : isDone
                      ? "bg-emerald-400/10 border-emerald-400/20 text-emerald-300"
                      : "bg-[#1e1e2f] border-white/10 text-white/70",
                )}
              >
                {isError ? (
                  <CircleAlert className="w-4 h-4" />
                ) : isDone ? (
                  <Check className="w-4 h-4" strokeWidth={3} />
                ) : (
                  <Terminal className="w-4 h-4" />
                )}
              </div>
              <div>
                <div className="text-[13px] font-semibold leading-none">
                  {isError
                    ? "Deploy Gagal"
                    : isDone
                      ? "Deploy Berhasil"
                      : "Deploy Console"}
                </div>
                <div className="text-[11px] text-white/40 mt-1">
                  {isDeploying
                    ? "Sedang menyiapkan deploy..."
                    : isDone
                      ? "Selesai"
                      : "Terjadi error"}
                </div>
              </div>
            </div>

            {!isDeploying && (
              <button
                type="button"
                onClick={closeModal}
                className="w-8 h-8 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center hover:bg-white/10 transition-colors"
                aria-label="Tutup"
              >
                <X className="w-4 h-4 text-white/60" />
              </button>
            )}
          </div>

          {/* ============ PROGRESS PILLS (hanya saat deploying) ============ */}
          {isDeploying && (
            <div className="px-7 md:px-8 pb-5 shrink-0">
              <div className="flex items-center gap-2">
                {DEPLOY_STEPS_LABELS.map((_, i) => {
                  const complete = stepIndex > i;
                  const active = stepIndex === i;
                  return (
                    <div key={i} className="flex items-center gap-2 flex-1">
                      <div
                        className={cn(
                          "relative h-[28px] flex-1 rounded-full overflow-hidden transition-all duration-500",
                          complete
                            ? "bg-white"
                            : active
                              ? "bg-white/20"
                              : "bg-white/[0.07]",
                        )}
                      >
                        {active && (
                          <div
                            className="absolute inset-0 bg-gradient-to-r from-white/20 to-white/40"
                            style={{ animation: "dcShimmer 1.5s infinite" }}
                          />
                        )}
                        {complete && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Check
                              className="w-3 h-3 text-black"
                              strokeWidth={3}
                            />
                          </div>
                        )}
                      </div>
                      {i !== DEPLOY_STEPS_LABELS.length - 1 && (
                        <div
                          className={cn(
                            "w-1 h-1 rounded-full",
                            stepIndex > i ? "bg-white" : "bg-white/15",
                          )}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-2 flex justify-between text-[10px] tracking-wide text-white/25 uppercase">
                <span>1. Mulai deploy</span>
                <span>2. Input + Penjelasan</span>
                <span>3. Token & Deploy</span>
              </div>
            </div>
          )}

          <div className="h-[1px] bg-white/[0.06] mx-7 md:mx-8 shrink-0" />

          {/* ================= BODY ================= */}
          <div className="px-7 md:px-8 py-6 min-h-[300px] overflow-y-auto flex-1">
            {/* ---------- LOADING ---------- */}
            {isDeploying && (
              <div
                className="py-6 text-center"
                style={{ animation: "dcFadeIn .3s ease" }}
              >
                {/* spinner */}
                <div className="relative w-16 h-16 mx-auto">
                  <div className="absolute inset-0 rounded-full border-2 border-white/[0.06]" />
                  <div
                    className="absolute inset-0 rounded-full border-2 border-transparent border-t-white/80"
                    style={{ animation: "dcSpin 1s linear infinite" }}
                  />
                  <div className="absolute inset-2 rounded-full bg-[#1e1e2f] flex items-center justify-center">
                    <Rocket className="w-5 h-5 text-white/70" />
                  </div>
                </div>

                <div className="mt-5 text-[15px] font-medium">
                  {title || "Sedang menyiapkan deploy..."}
                </div>
                <div className="mt-1.5 text-[12px] text-white/40 max-w-[340px] mx-auto leading-relaxed">
                  {subtitle}
                </div>

                {/* progress bar pakai barWidth dari context */}
                <div className="mt-6 max-w-[280px] mx-auto">
                  <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all duration-500"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>

                {/* checklist */}
                <div className="mt-6 max-w-[300px] mx-auto space-y-2">
                  {DEPLOY_STEPS_LABELS.map((label, i) => {
                    const done = stepIndex > i;
                    const active = stepIndex === i;
                    return (
                      <div
                        key={i}
                        className={cn(
                          "flex items-center gap-2 text-[11px]",
                          done
                            ? "text-white/70"
                            : active
                              ? "text-white"
                              : "text-white/40",
                        )}
                      >
                        <div
                          className={cn(
                            "w-4 h-4 rounded-full flex items-center justify-center transition-colors shrink-0",
                            done ? "bg-emerald-400/30" : "bg-white/10",
                          )}
                        >
                          {done ? (
                            <Check className="w-2.5 h-2.5 text-emerald-300" />
                          ) : active ? (
                            <Loader2 className="w-2.5 h-2.5 animate-spin text-white/70" />
                          ) : null}
                        </div>
                        <span className="truncate">{label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ---------- SUCCESS ---------- */}
            {isDone && (
              <div
                className="py-4 text-center"
                style={{ animation: "dcFadeIn .4s ease" }}
              >
                <div className="w-14 h-14 mx-auto rounded-full bg-emerald-400/15 border border-emerald-400/20 flex items-center justify-center">
                  <Check className="w-7 h-7 text-emerald-300" strokeWidth={3} />
                </div>

                <div className="mt-5 text-[18px] font-semibold">
                  Deploy dimulai! 🚀
                </div>
                <div className="mt-1.5 text-[13px] text-white/45 max-w-[320px] mx-auto leading-relaxed">
                  Project{" "}
                  <span className="text-white font-medium">
                    {result?.name || "my-project"}
                  </span>{" "}
                  sedang di-build. Cek progress di dashboard.
                </div>

                {/* logs panel */}
                <div className="mt-6 p-3 rounded-xl bg-[#1e1e2f] border border-white/[0.06] text-left">
                  <div className="text-[11px] uppercase tracking-wide text-white/30">
                    Logs
                  </div>
                  <div className="mt-2 font-mono text-[11px] leading-[1.6] text-white/60">
                    <div>
                      <span className="text-white/25">$</span>{" "}
                      {result?.domain?.includes("pages.dev")
                        ? "wrangler pages deploy"
                        : "vercel --prod --token ****"}
                    </div>
                    <div className="text-emerald-300/70">
                      ✓ Project created: {result?.name || "my-project"}
                    </div>
                    {result?.domain && (
                      <div className="text-emerald-300/70">
                        ✓ Deployed: {result.domain}
                      </div>
                    )}
                    <div className="text-white/40">→ Building...</div>
                  </div>
                </div>

                {/* external link */}
                {result?.domain && (
                  <div className="mt-4">
                    <a
                      href={
                        result.domain.startsWith("http")
                          ? result.domain
                          : `https://${result.domain}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[12px] text-violet-400 hover:text-white underline underline-offset-4 transition-colors"
                    >
                      Buka {result.domain}{" "}
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  </div>
                )}

                {/* actions */}
                <div className="mt-6 flex gap-2.5 justify-center">
                  <button
                    type="button"
                    onClick={handleCloseAfterDeploy}
                    className="h-10 px-5 rounded-full bg-white text-black text-[13px] font-medium hover:bg-white/90 transition-colors"
                  >
                    Selesai
                  </button>

                  {result?.inspectorUrl && (
                    <a
                      href={result.inspectorUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-10 px-5 rounded-full bg-white/[0.08] border border-white/10 text-white/70 text-[13px] font-medium flex items-center gap-2 hover:bg-white/[0.12] transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Lihat Logs
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* ---------- ERROR ---------- */}
            {isError && (
              <div
                className="py-6 text-center"
                style={{ animation: "dcFadeIn .4s ease" }}
              >
                <div className="w-14 h-14 mx-auto rounded-full bg-red-400/15 border border-red-400/20 flex items-center justify-center">
                  <CircleAlert className="w-7 h-7 text-red-300" />
                </div>

                <div className="mt-5 text-[18px] font-semibold">
                  Deploy Gagal
                </div>
                <div className="mt-1.5 text-[13px] text-white/50 max-w-[340px] mx-auto leading-relaxed">
                  {error || subtitle}
                </div>

                <div className="mt-6 flex gap-2.5 justify-center">
                  <button
                    type="button"
                    onClick={handleCloseAfterDeploy}
                    className="h-10 px-5 rounded-full bg-white text-black text-[13px] font-medium hover:bg-white/90 transition-colors"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}