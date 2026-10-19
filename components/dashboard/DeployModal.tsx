"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { GlyphText, InlineIcon } from "@/components/ui/Icon";
import { Check, Copy, Loader2, Rocket, CircleAlert, ExternalLink, RotateCw, Terminal, X } from "@/components/ui/icons";
import { cn, normalizeDeployDomain, deployDomainToUrl } from "@/lib/utils";
import { useDeploy } from "@/lib/deploy-context";
import { useDialogA11y } from "@/components/ui/useDialogA11y";
import { PLATFORM_NAME } from "@/lib/deploy-guides";
import { useDeployPreferences } from "@/lib/preferences";
import { SpiderCrawler } from "@/components/dashboard/SpiderCrawler";
import { KuliProyek, kuliStageFromDeploy } from "@/components/dashboard/KuliProyek";
import { DeployDebugLog, useDeployLog } from "@/components/dashboard/DeployDebugLog";
import type { ErrorGuide } from "@/types";

const DEPLOY_STEPS_LABELS = [
  "Menghubungkan ke GitHub",
  "Mengunduh source code",
  "Install dependencies",
  "Build project",
  "Deploy ke edge network",
];

export function DeployModal() {
  const { deployState, closeModal, handleCloseAfterDeploy, retryDeploy } =
    useDeploy();
  const { status, stepIndex, barWidth, title, subtitle, error, errorGuide, result } =
    deployState;

  const { resolvedTheme } = useTheme();
  const theme = resolvedTheme === "dark" ? "dark" : "light";

  const [prefs] = useDeployPreferences();
  const debugLines = useDeployLog(deployState, prefs.showDebug);

  const isDeploying = status === "deploying";
  // Saat deploy berjalan, Esc & klik backdrop sengaja tidak menutup modal.
  const dialogRef = useDialogA11y<HTMLDivElement>(
    status !== "idle",
    () => {
      if (!isDeploying) closeModal();
    },
    { closeOnEscape: !isDeploying }
  );

  if (status === "idle") return null;

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

        /* Warna modal mengikuti tema aplikasi lewat token global (globals.css). */
        .dm-root {
          --dm-surface: var(--surface-solid);
          --dm-surface-2: var(--surface-solid-2);
          --dm-chip: var(--pill-bg);
          --dm-chip-hover: color-mix(in srgb, var(--pill-bg) 78%, var(--text));
          --dm-track: var(--pill-bg);
          --dm-active: color-mix(in srgb, var(--accent) 38%, var(--surface-solid));
          --dm-active-2: color-mix(in srgb, var(--accent) 62%, var(--surface-solid));
          --dm-line: var(--line);
          --dm-accent: var(--ink-fill);
          --dm-accent-fg: var(--ink-fill-text);
          --dm-accent-hover: var(--ink-fill-hover);
          --dm-backdrop: rgba(18, 11, 46, 0.45);
          --dm-shadow: 0 30px 80px -24px rgba(56, 35, 129, 0.5);
          --dm-log: var(--frame);
        }
        [data-theme="dark"] .dm-root {
          --dm-chip-hover: color-mix(in srgb, var(--pill-bg) 78%, white);
          --dm-active: #4b4173;
          --dm-active-2: #787096;
          --dm-accent: var(--lime);
          --dm-accent-fg: var(--lime-text);
          --dm-accent-hover: var(--lime-hover);
          --dm-backdrop: rgba(30, 17, 80, 0.65);
          --dm-shadow: 0 20px 80px -20px rgba(0, 0, 0, 0.8);
        }
      `}</style>

      <div className="dm-root fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 text-[var(--text)]">
        {/* backdrop */}
        <div
          className="absolute inset-0 bg-[var(--dm-backdrop)] backdrop-blur-[10px]"
          onClick={onBackdropClick}
        />

        {/* modal */}
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={title || "Proses deploy"}
          tabIndex={-1}
          className="relative w-full max-w-[520px] rounded-[28px] bg-[var(--dm-surface)] shadow-[var(--dm-shadow)] overflow-hidden flex flex-col max-h-[90dvh] outline-none"
          style={{ animation: "dcModalIn .3s ease" }}
        >

          {/* ================= HEADER ================= */}
          <div className="px-7 md:px-8 pt-6 pb-5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center",
                  isError
                    ? "bg-bad-bg text-bad-fg"
                    : isDone
                      ? "bg-ok-bg text-ok-fg"
                      : "bg-[var(--dm-surface-2)] text-[var(--text-muted)]",
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
                    ? "Deploy belum berhasil"
                    : isDone
                      ? "Deploy berhasil"
                      : "Konsol deploy"}
                </div>
                <div className="text-[12px] text-[var(--text-faint)] mt-1">
                  {isDeploying
                    ? "Sedang menyiapkan deploy…"
                    : isDone
                      ? "Selesai"
                      : "Ada yang perlu diperiksa"}
                </div>
              </div>
            </div>

            {!isDeploying && (
              <button
                type="button"
                onClick={closeModal}
                className="w-8 h-8 rounded-full bg-[var(--dm-chip)] flex items-center justify-center hover:bg-[var(--dm-chip-hover)] transition-colors"
                aria-label="Tutup"
              >
                <X className="w-4 h-4 text-[var(--text-muted)]" />
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
                            ? "bg-[var(--dm-accent)]"
                            : active
                              ? "bg-[var(--dm-active)]"
                              : "bg-[var(--dm-track)]",
                        )}
                      >
                        {active && (
                          <div
                            className="absolute inset-0 bg-gradient-to-r from-[var(--dm-active)] to-[var(--dm-active-2)]"
                            style={{ animation: "dcShimmer 1.5s infinite" }}
                          />
                        )}
                        {complete && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Check
                              className="w-3 h-3 text-[var(--dm-accent-fg)]"
                              strokeWidth={3}
                            />
                          </div>
                        )}
                      </div>
                      {i !== DEPLOY_STEPS_LABELS.length - 1 && (
                        <div
                          className={cn(
                            "w-1 h-1 rounded-full",
                            stepIndex > i ? "bg-[var(--dm-accent)]" : "bg-[var(--dm-active)]",
                          )}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-2.5 flex items-center justify-between gap-3 text-[12px] text-[var(--text-faint)]">
                <span className="truncate font-medium text-[var(--text-muted)]">
                  {DEPLOY_STEPS_LABELS[Math.min(stepIndex, DEPLOY_STEPS_LABELS.length - 1)]}
                </span>
                <span className="shrink-0 tabular-nums">
                  Tahap {Math.min(stepIndex + 1, DEPLOY_STEPS_LABELS.length)} dari {DEPLOY_STEPS_LABELS.length}
                </span>
              </div>
            </div>
          )}

          <div className="h-[1px] bg-[var(--dm-line)] mx-7 md:mx-8 shrink-0" />

          {/* ================= BODY ================= */}
          <div className="px-7 md:px-8 py-6 min-h-[300px] overflow-y-auto flex-1">
            {/* ---------- LOADING ---------- */}
            {isDeploying && (
              <div
                className="py-6 text-center"
                style={{ animation: "dcFadeIn .3s ease" }}
              >
                {prefs.deployAnimation === "spider" ? (
                  <SpiderCrawler stepIndex={stepIndex} theme={theme} className="w-full" />
                ) : prefs.deployAnimation === "kuli" ? (
                  <div className="mx-auto max-w-[420px] text-left">
                    <KuliProyek stage={kuliStageFromDeploy(status, stepIndex)} compact />
                  </div>
                ) : (
                  /* spinner (default) */
                  <div className="relative w-16 h-16 mx-auto">
                    <div className="absolute inset-0 rounded-full border-2 border-[var(--dm-track)]" />
                    <div
                      className="absolute inset-0 rounded-full border-2 border-transparent border-t-[var(--dm-accent)]"
                      style={{ animation: "dcSpin 1s linear infinite" }}
                    />
                    <div className="absolute inset-2 rounded-full bg-[var(--dm-surface-2)] flex items-center justify-center">
                      <Rocket className="w-5 h-5 text-[var(--text-muted)]" />
                    </div>
                  </div>
                )}

                <div className="mt-5 text-[15px] font-medium">
                  {title || "Sedang menyiapkan deploy…"}
                </div>
                <div className="mt-1.5 text-[12px] text-[var(--text-muted)] max-w-[340px] mx-auto leading-relaxed">
                  {subtitle}
                </div>

                {/* progress bar pakai barWidth dari context */}
                <div className="mt-6 max-w-[280px] mx-auto">
                  <div className="h-1 rounded-full bg-[var(--dm-track)] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[var(--dm-accent)] to-[#5CE1FF] transition-all duration-500"
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
                          "flex items-center gap-2 text-[12px]",
                          done
                            ? "text-[var(--text-muted)]"
                            : active
                              ? "text-[var(--text)]"
                              : "text-[var(--text-faint)]",
                        )}
                      >
                        <div
                          className={cn(
                            "w-4 h-4 rounded-full flex items-center justify-center transition-colors shrink-0",
                            done ? "bg-[var(--ok-bg)]" : "bg-[var(--dm-track)]",
                          )}
                        >
                          {done ? (
                            <Check className="w-2.5 h-2.5 text-ok-fg" />
                          ) : active ? (
                            <Loader2 className="w-2.5 h-2.5 animate-spin text-[var(--text-muted)]" />
                          ) : null}
                        </div>
                        <span className="truncate">{label}</span>
                      </div>
                    );
                  })}
                </div>

                {prefs.showDebug && <DeployDebugLog lines={debugLines} className="mt-6" />}
              </div>
            )}

            {/* ---------- SUCCESS ---------- */}
            {isDone && (
              <div
                className="py-4 text-center"
                style={{ animation: "dcFadeIn .4s ease" }}
              >
                {prefs.deployAnimation === "kuli" ? (
                  <div className="mx-auto max-w-[420px] text-left">
                    <KuliProyek stage="live" compact />
                  </div>
                ) : (
                  <div className="w-14 h-14 mx-auto rounded-full bg-[var(--ok-bg)] flex items-center justify-center">
                    <Check className="w-7 h-7 text-ok-fg" strokeWidth={3} />
                  </div>
                )}

                <div className="mt-5 text-[18px] font-semibold">
                  Deploy dimulai! <InlineIcon name="rocket_launch" className="ml-1" />
                </div>
                <div className="mt-1.5 text-[13px] text-[var(--text-muted)] max-w-[320px] mx-auto leading-relaxed">
                  Project{" "}
                  <span className="text-[var(--text)] font-medium">
                    {result?.name || "my-project"}
                  </span>{" "}
                  sedang dibangun. Periksa progress di dashboard.
                </div>

                {/* logs panel */}
                <div className="mt-6 p-3 rounded-xl bg-[var(--dm-surface-2)] text-left">
                  <div className="text-[12px] uppercase tracking-wide text-[var(--text-faint)]">
                    Logs
                  </div>
                  <div className="mt-2 font-mono text-[12px] leading-[1.6] text-[var(--text-muted)]">
                    <div>
                      <span className="text-[var(--text-faint)]">$</span>{" "}
                      {result?.domain?.includes("pages.dev")
                        ? "wrangler pages deploy"
                        : "vercel --prod --token ****"}
                    </div>
                    <div className="text-[var(--ok-fg)]">
                      <GlyphText>{`✓ Project created: ${result?.name || "my-project"}`}</GlyphText>
                    </div>
                    {result?.domain && (
                      <div className="text-[var(--ok-fg)]">
                        <GlyphText>{`✓ Deployed: ${normalizeDeployDomain(result.domain)}`}</GlyphText>
                      </div>
                    )}
                    <div className="text-[var(--text-faint)]"><GlyphText>→ Building…</GlyphText></div>
                  </div>
                </div>

                {prefs.showDebug && debugLines.length > 0 && (
                  <details className="mt-4 text-left">
                    <summary className="cursor-pointer select-none text-center text-[12px] text-[var(--text-faint)] hover:text-[var(--text)]">
                      Lihat log proses debug
                    </summary>
                    <DeployDebugLog lines={debugLines} className="mt-2" />
                  </details>
                )}

                {/* external link */}
                {result?.domain && (
                  <div className="mt-4">
                    <a
                      href={
                        deployDomainToUrl(result.domain)
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[12px] text-[var(--accent-text)] hover:text-[var(--text)] underline underline-offset-4 transition-colors"
                    >
                      Buka {normalizeDeployDomain(result.domain)}{" "}
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  </div>
                )}

                {/* actions */}
                <div className="mt-6 flex gap-2.5 justify-center">
                  <button
                    type="button"
                    onClick={handleCloseAfterDeploy}
                    className="h-10 px-5 rounded-full bg-[var(--dm-accent)] text-[var(--dm-accent-fg)] text-[13px] font-medium hover:bg-[var(--dm-accent-hover)] transition-colors"
                  >
                    Selesai
                  </button>

                  {result?.inspectorUrl && (
                    <a
                      href={result.inspectorUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-10 px-5 rounded-full bg-[var(--dm-chip)] text-[var(--text-muted)] text-[13px] font-medium flex items-center gap-2 hover:bg-[var(--dm-chip-hover)] hover:text-[var(--text)] transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Lihat Logs
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* ---------- ERROR ---------- */}
            {isError && prefs.deployAnimation === "kuli" && (
              <div className="mx-auto mb-5 max-w-[420px] text-left">
                <KuliProyek stage="gagal" compact />
              </div>
            )}
            {isError && (
              <ErrorPanel
                guide={errorGuide}
                fallbackMessage={error || subtitle}
                onClose={handleCloseAfterDeploy}
                onRetry={retryDeploy}
                retryable={errorGuide?.retryable !== false}
                logsUrl={result?.inspectorUrl}
                debugLines={prefs.showDebug ? debugLines : null}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/* ================================================================
 *  Panel error ramah — penjelasan, langkah, link, dan salin detail
 * ================================================================ */

function ErrorPanel({
  guide,
  fallbackMessage,
  onClose,
  onRetry,
  retryable,
  logsUrl,
  debugLines,
}: {
  guide: ErrorGuide | null;
  fallbackMessage: string | null;
  onClose: () => void;
  onRetry: () => void;
  retryable: boolean;
  logsUrl?: string;
  debugLines?: React.ComponentProps<typeof DeployDebugLog>["lines"] | null;
}) {
  const [copied, setCopied] = React.useState(false);

  const copyDetail = async () => {
    const text = guide?.technical ?? fallbackMessage ?? "";
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard bisa diblokir browser — detail tetap terlihat di layar */
    }
  };

  const title = guide?.title ?? "Deploy belum berhasil";
  const message = guide?.message ?? fallbackMessage ?? "Terjadi kesalahan. Coba lagi sebentar lagi.";

  return (
    <div className="py-2" style={{ animation: "dcFadeIn .4s ease" }}>
      <div className="text-center">
        <div className="w-12 h-12 mx-auto rounded-full bg-[var(--bad-bg)] flex items-center justify-center">
          <CircleAlert className="w-6 h-6 text-bad-fg" />
        </div>
        <div className="mt-4 text-[17px] font-semibold">{title}</div>
        <div className="mt-1.5 text-[13px] text-[var(--text-muted)] max-w-[400px] mx-auto leading-relaxed">
          {message}
        </div>
      </div>

      {guide && guide.steps.length > 0 && (
        <div className="mt-5 rounded-2xl bg-[var(--dm-surface-2)] p-4 text-left">
          <div className="text-[12px] uppercase tracking-wider text-[var(--text-faint)] font-medium mb-2.5">
            Yang bisa kamu lakukan
          </div>
          <ol className="space-y-2">
            {guide.steps.map((step, i) => (
              <li key={i} className="flex gap-2.5 text-[12.5px] text-[var(--text-muted)] leading-relaxed">
                <span className="shrink-0 w-5 h-5 rounded-full bg-[var(--dm-chip)] text-[var(--text-muted)] text-[12px] flex items-center justify-center mt-px">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {guide?.suggestPlatform && (
        <div className="mt-3 text-[12px] text-[var(--accent-text)] text-center">
          Saran: pilih <span className="font-semibold">{PLATFORM_NAME[guide.suggestPlatform]}</span> sebagai
          platform tujuan.
        </div>
      )}

      {guide?.links && guide.links.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2 justify-center">
          {guide.links.map((l) => (
            <a
              key={l.url}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className="h-9 px-4 rounded-full bg-[var(--dm-chip)] text-[var(--text-muted)] text-[12px] font-medium flex items-center gap-1.5 hover:bg-[var(--dm-chip-hover)] hover:text-[var(--text)] transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" /> {l.label}
            </a>
          ))}
        </div>
      )}

      {guide?.technical && (
        <details className="mt-4 group">
          <summary className="cursor-pointer text-[12px] text-[var(--text-faint)] hover:text-[var(--text)] text-center select-none">
            Detail teknis (untuk dilaporkan)
          </summary>
          <pre className="mt-2 max-h-28 overflow-auto rounded-xl bg-[var(--dm-surface-2)] p-3 text-[12px] text-[var(--text-muted)] whitespace-pre-wrap break-words font-mono">
            {guide.technical}
          </pre>
          <div className="mt-2 text-center">
            <button
              type="button"
              onClick={copyDetail}
              className="text-[12px] text-[var(--text-faint)] hover:text-[var(--text)] inline-flex items-center gap-1.5"
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? "Tersalin" : "Salin detail"}
            </button>
          </div>
        </details>
      )}

      {debugLines && debugLines.length > 0 && (
        <details className="mt-4 text-left" open>
          <summary className="cursor-pointer select-none text-center text-[12px] text-[var(--text-faint)] hover:text-[var(--text)]">
            Log proses debug
          </summary>
          <DeployDebugLog lines={debugLines} className="mt-2" />
        </details>
      )}

      <div className="mt-6 flex flex-wrap gap-2.5 justify-center">
        {retryable && (
          <button
            type="button"
            onClick={onRetry}
            className="h-10 px-5 rounded-full bg-[var(--dm-accent)] text-[var(--dm-accent-fg)] text-[13px] font-medium hover:bg-[var(--dm-accent-hover)] transition-colors flex items-center gap-2"
          >
            <RotateCw className="w-3.5 h-3.5" /> Coba lagi
          </button>
        )}
        {logsUrl && (
          <a
            href={logsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="h-10 px-5 rounded-full bg-[var(--dm-chip)] text-[var(--text-muted)] text-[13px] font-medium flex items-center gap-2 hover:bg-[var(--dm-chip-hover)] hover:text-[var(--text)] transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Lihat log
          </a>
        )}
        <button
          type="button"
          onClick={onClose}
          className={cn(
            "h-10 px-5 rounded-full text-[13px] font-medium transition-colors",
            retryable
              ? "bg-[var(--dm-chip)] text-[var(--text-muted)] hover:bg-[var(--dm-chip-hover)] hover:text-[var(--text)]"
              : "bg-[var(--dm-accent)] text-[var(--dm-accent-fg)] hover:bg-[var(--dm-accent-hover)]",
          )}
        >
          {retryable ? "Tutup" : "Mengerti"}
        </button>
      </div>
    </div>
  );
}
