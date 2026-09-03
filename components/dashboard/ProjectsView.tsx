"use client";

import { FolderOpen, ExternalLink, RotateCw, Globe2 } from "lucide-react";
import { Surface } from "@/components/ui/Surface";
import { ViewFade } from "@/components/ui/ViewFade";
import { VercelSyncBadge } from "@/components/dashboard/VercelSyncBadge";
import { useDeploy } from "@/lib/deploy-context";
import type { HistoryItem } from "@/types";

function groupByProject(history: HistoryItem[]) {
  const map = new Map<string, HistoryItem>();
  for (const item of history) {
    // history is newest-first, so the first time we see a name is its latest deploy
    if (!map.has(item.name)) map.set(item.name, item);
  }
  return Array.from(map.values());
}

export function ProjectsView() {
  const { history, redeploy } = useDeploy();
  const projects = groupByProject(history);

  return (
    <ViewFade>
      <div className="space-y-6">
        <div>
          <h2 className="text-[22px] font-semibold">Projects</h2>
          <p className="text-[13px] text-text-muted">
            {projects.length} project unik dari riwayat deployment kamu.
          </p>
        </div>

        {projects.length === 0 ? (
          <Surface className="flex flex-col items-center justify-center gap-3 px-6 py-24 text-center">
            <FolderOpen size={52} className="text-text-faint" strokeWidth={1.5} />
            <h3 className="text-[16px] font-semibold">Manajemen Proyek</h3>
            <p className="max-w-xs text-[13px] text-text-muted">
              Belum ada project. Deploy project pertamamu untuk melihatnya di sini.
            </p>
          </Surface>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => {
              const isReady = project.status === "ready";
              return (
                <Surface key={project.name} className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate text-[14px] font-semibold">{project.name}</h3>
                      <p className="mono text-[11px] text-text-faint capitalize mt-0.5">
                        {project.platform} • {project.date}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-0.5 text-[11px] font-medium ${
                        isReady
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                          : "border-red-500/20 bg-red-500/10 text-red-400"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${isReady ? "bg-emerald-400" : "bg-red-400"}`} />
                      {isReady ? "Ready" : "Failed"}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center gap-1.5 text-[12px] text-text-muted">
                    <Globe2 size={13} className="shrink-0" />
                    <span className="mono truncate">{project.domain}</span>
                  </div>

                  {project.platform === "vercel" && (
                    <div className="mt-3">
                      <VercelSyncBadge projectName={project.name} />
                    </div>
                  )}

                  <div className="mt-5 flex items-center gap-2">
                    <a
                      href={`https://${project.domain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="pill flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-[12px] font-medium hover:brightness-110"
                    >
                      <ExternalLink size={13} /> Visit
                    </a>
                    <button
                      type="button"
                      onClick={() => redeploy(project.name)}
                      className="pill flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-[12px] font-medium hover:brightness-110"
                    >
                      <RotateCw size={13} /> Redeploy
                    </button>
                  </div>
                </Surface>
              );
            })}
          </div>
        )}
      </div>
    </ViewFade>
  );
}
