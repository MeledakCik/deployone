"use client";

import * as React from "react";
import type { HistoryItem } from "@/types";

type MTokens = { vercelToken?: string; githubPat?: string; cloudflareToken?: string; railwayToken?: string; renderToken?: string };
type UserDataRes = {
  ok: boolean;
  data?: { history: HistoryItem[]; settingsTokens: MTokens };
};

/** Ambil data user dari API web yang sama (/api/user-data). Server tetap satu. */
export function useUserData() {
  const [history, setHistory] = React.useState<HistoryItem[]>([]);
  const [tokens, setTokens] = React.useState<MTokens>({});
  const [loading, setLoading] = React.useState(true);

  const reload = React.useCallback(async () => {
    try {
      const res = await fetch("/api/user-data", { cache: "no-store" });
      const body = (await res.json()) as UserDataRes;
      if (body.ok && body.data) {
        setHistory(body.data.history);
        setTokens(body.data.settingsTokens ?? {});
      }
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  return { history, tokens, loading, reload };
}

/** Tambah satu item ke riwayat (API-nya merge per-field, aman dari data web). */
export async function addHistory(item: HistoryItem) {
  const res = await fetch("/api/user-data", { cache: "no-store" });
  const body = (await res.json()) as UserDataRes;
  const old = body.ok && body.data ? body.data.history : [];
  await fetch("/api/user-data", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ history: [item, ...old] }),
  });
}
