"use client";

import * as React from "react";
import { Check, CircleAlert, ExternalLink, Loader2, RotateCw } from "@/components/ui/icons";
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
  const { form, repoEnvCheck, recheckRepo, setFormField, railwayPreview } = useDeploy();
  const { status, validation, errorGuide } = repoEnvCheck;
  const url = form.githubUrl?.trim() ?? "";

  if (status === "idle") {
    if (url && url.toLowerCase().includes("github.com")) {
      return (
        <div className="mt-2 text-[12px] sm:text-[12px] text-[var(--dc-text-faint)] flex items-start gap-1.5">
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
      <div className="mt-2 text-[12px] sm:text-[12px] text-[var(--dc-text-faint)] flex items-center gap-1.5">
        <Loader2 className="w-3 h-3 shrink-0 animate-spin" />
        Memeriksa repo: jenis project, framework, dan env var…
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="mt-3 rounded-xl bg-[var(--bad-bg)] p-3 text-[12px] sm:text-[12px]">
        <div className="flex items-start gap-2 text-bad-fg">
          <CircleAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">{errorGuide?.title ?? "Repo belum bisa diperiksa"}</div>
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
            className="h-7 px-3 rounded-full bg-[var(--dc-pill)] text-[12px] font-medium inline-flex items-center gap-1.5 hover:bg-[var(--dc-hover)]"
          >
            <RotateCw className="w-3 h-3" /> Periksa ulang
          </button>
          {errorGuide?.links?.map((l) => (
            <a
              key={l.url}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className="h-7 px-3 rounded-full bg-[var(--dc-pill)] text-[12px] font-medium inline-flex items-center gap-1.5 hover:bg-[var(--dc-hover)]"
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
      ? "bg-[var(--bad-bg)] text-bad-fg"
      : level === "warn"
        ? "bg-[var(--warn-bg)] text-warn-fg"
        : "bg-[var(--ok-bg)] text-ok-fg";

  return (
    <div className={cn("mt-3 rounded-xl p-3 text-[12px] sm:text-[12px]", tone)}>
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

      {level !== "blocked" && compat.notes.length > 0 && (
        <ul className="mt-2 ml-5 list-disc space-y-1 text-[var(--dc-text-muted)]">
          {compat.notes.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      )}

      {platform === "railway" && level !== "blocked" && railwayPreview.status === "loading" && (
        <div className="mt-2 flex items-center gap-1.5 opacity-80">
          <Loader2 className="w-3 h-3 shrink-0 animate-spin" />
          Mengecek file yang mungkin kurang…
        </div>
      )}

      {platform === "railway" &&
        level !== "blocked" &&
        railwayPreview.status === "ok" &&
        railwayPreview.preview &&
        railwayPreview.preview.files.length > 0 && (
          <div className="mt-2.5 rounded-lg bg-[var(--dc-pill)] p-2.5 text-[var(--dc-text)]">
            <div className="font-semibold">
              {railwayPreview.preview.canWrite
                ? `Depup akan menambahkan ${railwayPreview.preview.files.length} file otomatis saat deploy`
                : `Repo ini kekurangan ${railwayPreview.preview.files.length} file agar bisa jalan di Railway`}
            </div>
            <ul className="mt-1.5 space-y-1.5">
              {railwayPreview.preview.files.map((f) => (
                <li key={f.path} className="flex items-start gap-1.5">
                  <span className="font-mono shrink-0 rounded bg-[var(--dc-hover)] px-1.5 py-0.5 text-[11px]">
                    {f.action === "create" ? "+" : "~"} {f.path}
                  </span>
                  <span className="text-[var(--dc-text-muted)]">{f.reason}</span>
                </li>
              ))}
            </ul>
            <div className="mt-2 text-[var(--dc-text-muted)]">
              {railwayPreview.preview.canWrite
                ? "Semuanya dikirim dalam satu commit ke branch utama repo-mu. File buatanmu tidak ditimpa."
                : "Isi GitHub Token dengan izin menulis (“repo”) supaya Depup bisa menambahkannya otomatis — atau tambahkan file di atas sendiri sebelum deploy."}
            </div>
          </div>
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
                className="h-7 px-3 rounded-full bg-[var(--dc-text)] text-[var(--dc-surface)] text-[12px] font-semibold"
              >
                Pakai {PLATFORM_NAME[guide.suggestPlatform]}
              </button>
            )}
            <button
              type="button"
              onClick={recheckRepo}
              className="h-7 px-3 rounded-full bg-[var(--dc-pill)] text-[12px] font-medium inline-flex items-center gap-1.5 hover:bg-[var(--dc-hover)]"
            >
              <RotateCw className="w-3 h-3" /> Periksa ulang
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
