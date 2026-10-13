"use client";

import * as React from "react";
import { Check, CircleAlert, ExternalLink, Loader2, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDeploy } from "@/lib/deploy-context";
import { PLATFORM_NAME, manualDeployGuide } from "@/lib/deploy-guides";
import type { Platform } from "@/types";

/**
 * Kartu hasil pengecekan repo di step "GitHub URL".
 * Menjawab 3 pertanyaan user SEBELUM lanjut: (1) repo ini jenis apa?
 * (2) cocok dengan platform yang dipilih? (3) kalau tidak, harus bagaimana?
 */
export function RepoCheckCard({ platform }: { platform: Platform }) {
  const { form, repoEnvCheck, recheckRepo, setFormField } = useDeploy();
  const { status, validation, errorGuide } = repoEnvCheck;
  const url = form.githubUrl?.trim() ?? "";

  if (status === "idle") {
    if (url && url.toLowerCase().includes("github.com")) {
      return (
        <div className="mt-2 text-[10.5px] sm:text-[11px] text-[var(--dc-text-faint)] flex items-start gap-1.5">
          <CircleAlert className="w-3 h-3 shrink-0 mt-0.5" />
          <span>
            Link belum lengkap. Formatnya{" "}
            <span className="font-mono">https://github.com/nama-akun/nama-repo</span>
          </span>
        </div>
      );
    }
    return null;
  }

  if (status === "checking") {
    return (
      <div className="mt-2 text-[10.5px] sm:text-[11px] text-[var(--dc-text-faint)] flex items-center gap-1.5">
        <Loader2 className="w-3 h-3 shrink-0 animate-spin" />
        Mengecek repo: jenis project, framework, dan env var…
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="mt-3 rounded-xl border border-red-500/25 bg-red-500/[0.06] p-3 text-[11.5px] sm:text-[12px]">
        <div className="flex items-start gap-2 text-red-600 dark:text-red-300">
          <CircleAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">{errorGuide?.title ?? "Repo belum bisa dicek"}</div>
            <div className="mt-0.5 opacity-90">{errorGuide?.message}</div>
          </div>
        </div>
        {errorGuide && errorGuide.steps.length > 0 && (
          <ul className="mt-2 ml-5 list-disc space-y-1 text-[var(--dc-text-muted)]">
            {errorGuide.steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        )}
        <div className="mt-2.5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={recheckRepo}
            className="h-7 px-3 rounded-full border border-[var(--dc-line)] text-[11px] font-medium inline-flex items-center gap-1.5 hover:bg-black/5 dark:hover:bg-white/10"
          >
            <RotateCw className="w-3 h-3" /> Cek ulang
          </button>
          {errorGuide?.links?.map((l) => (
            <a
              key={l.url}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className="h-7 px-3 rounded-full border border-[var(--dc-line)] text-[11px] font-medium inline-flex items-center gap-1.5 hover:bg-black/5 dark:hover:bg-white/10"
            >
              <ExternalLink className="w-3 h-3" /> {l.label}
            </a>
          ))}
        </div>
      </div>
    );
  }

  // status === "ok"
  if (!validation) return null;
  const compat = validation.compat[platform];
  const level = compat.level;
  const manual = manualDeployGuide(platform, validation.project, validation.fullName);
  const guide = compat.guide;

  const tone =
    level === "blocked"
      ? "border-red-500/25 bg-red-500/[0.06] text-red-600 dark:text-red-300"
      : level === "warn"
        ? "border-amber-500/25 bg-amber-500/[0.06] text-amber-700 dark:text-amber-300"
        : "border-emerald-500/25 bg-emerald-500/[0.06] text-emerald-700 dark:text-emerald-300";

  return (
    <div className={cn("mt-3 rounded-xl border p-3 text-[11.5px] sm:text-[12px]", tone)}>
      <div className="flex items-start gap-2">
        {level === "ok" ? (
          <Check className="w-3.5 h-3.5 shrink-0 mt-0.5" strokeWidth={3} />
        ) : (
          <CircleAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        )}
        <div>
          <div className="font-semibold">
            Terdeteksi: {validation.project.label}
            <span className="font-normal opacity-70">
              {" "}
              · {validation.fullName} ({validation.visibility})
            </span>
          </div>
          <div className="mt-0.5 opacity-90">{compat.summary}</div>
        </div>
      </div>

      {level === "warn" && compat.notes.length > 0 && (
        <ul className="mt-2 ml-5 list-disc space-y-1 text-[var(--dc-text-muted)]">
          {compat.notes.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      )}

      {level === "blocked" && guide && (
        <div className="mt-2">
          <div className="opacity-90">{guide.message}</div>
          <ul className="mt-2 ml-5 list-disc space-y-1 text-[var(--dc-text-muted)]">
            {guide.steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {guide.suggestPlatform && (
              <button
                type="button"
                onClick={() => setFormField("platform", guide.suggestPlatform as Platform)}
                className="h-7 px-3 rounded-full bg-[var(--dc-text)] text-[var(--dc-surface)] text-[11px] font-semibold"
              >
                Pakai {PLATFORM_NAME[guide.suggestPlatform]}
              </button>
            )}
            <button
              type="button"
              onClick={recheckRepo}
              className="h-7 px-3 rounded-full border border-[var(--dc-line)] text-[11px] font-medium inline-flex items-center gap-1.5 hover:bg-black/5 dark:hover:bg-white/10"
            >
              <RotateCw className="w-3 h-3" /> Cek ulang
            </button>
          </div>

          <details className="mt-3">
            <summary className="cursor-pointer font-medium select-none">
              Atau deploy manual ke {PLATFORM_NAME[platform]}
            </summary>
            <ol className="mt-2 ml-5 list-decimal space-y-1 text-[var(--dc-text-muted)]">
              {manual.steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
            {manual.links?.map((l) => (
              <a
                key={l.url}
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 underline underline-offset-2"
              >
                <ExternalLink className="w-3 h-3" /> {l.label}
              </a>
            ))}
          </details>
        </div>
      )}
    </div>
  );
}
