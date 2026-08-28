"use client";

import { CheckCircle2, Circle, ExternalLink } from "lucide-react";
import { Surface } from "@/components/ui/Surface";
import { useDeploy, DEPLOY_STEPS } from "@/lib/deploy-context";

export function DeployModal() {
  const { modal, closeModal, handleCloseAfterDeploy } = useDeploy();

  if (!modal.open) return null;

  return (
    <div id="modal" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4">
      <Surface className="w-full max-w-md p-6">
        <h3 id="deployTitle" className="text-[17px] font-semibold mb-1">
          {modal.title}
        </h3>
        <p id="deploySubtitle" className="text-[13px] text-text-muted mb-6">
          {modal.subtitle}
        </p>

        <div className="mb-5 h-1.5 w-full overflow-hidden rounded-pill bg-[var(--pill-bg)]">
          <div
            id="bar"
            className="h-full rounded-pill bg-gradient-to-r from-violet-500 to-cyan-400 transition-[width] duration-500 ease-out"
            style={{ width: `${modal.barWidth}%` }}
          />
        </div>

        <ul className="space-y-2.5 mb-2">
          {DEPLOY_STEPS.map((label, i) => {
            const done = modal.stepIndex > i;
            return (
              <li
                key={label}
                id={`s${i + 1}`}
                data-text={label}
                className={`deploy-step flex items-center gap-2.5 text-[13px] ${done ? "done text-text" : "text-text-muted"}`}
              >
                {done ? (
                  <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                ) : (
                  <Circle size={16} className="text-text-faint shrink-0" />
                )}
                {done ? `✓ ${label}` : label}
              </li>
            );
          })}
        </ul>

        {modal.resultVisible && modal.result && (
          <div id="result" className="mt-5 pt-5 border-t border-[var(--line)]">
            <p className="mono text-[12px] opacity-60">PROJECT</p>
            <p className="font-semibold">{modal.result.name}</p>
            <p className="mt-3 mono text-[12px] opacity-60">URL</p>
            <a
              href={`https://${modal.result.domain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-violet-400 underline break-all"
            >
              {modal.result.domain} <ExternalLink size={12} />
            </a>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          {!modal.closeVisible && (
            <button
              type="button"
              onClick={closeModal}
              className="pill px-4 py-2 text-[13px] font-medium hover:bg-[var(--card-hover)]"
            >
              Sembunyikan
            </button>
          )}
          {modal.closeVisible && (
            <button
              id="closeModal"
              type="button"
              onClick={handleCloseAfterDeploy}
              className="btn-primary px-5 py-2.5 text-[13px]"
            >
              Tutup &amp; Kembali
            </button>
          )}
        </div>
      </Surface>
    </div>
  );
}
