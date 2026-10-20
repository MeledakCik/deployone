"use client";

import { useDeploy } from "@/lib/deploy-context";

/**
 * Data untuk shell app (/m). Sumbernya sama persis dengan dashboard web
 * (DeployProvider), jadi riwayat, token, dan sinkronisasi selalu identik.
 */
export function useUserData() {
  const d = useDeploy();
  return {
    history: d.history,
    tokens: {
      vercelToken: d.vercelToken || undefined,
      railwayToken: d.railwayToken || undefined,
      cloudflareToken: d.cloudflareToken || undefined,
      cloudflareAccountId: d.cloudflareAccountId || undefined,
      githubPat: d.githubPat || undefined,
    },
    loading: !d.historyReady,
    /** Sinkronkan status semua project dengan platform aslinya. */
    reload: d.syncAllProjects,
    syncing: d.syncingProjects,
  };
}
