"use client";

import * as React from "react";

/** Fetch ke /api/admin/*: mengembalikan `data` atau melempar Error berisi pesan yang bisa ditampilkan. */
export async function adminFetch<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(path, {
    method: init?.method ?? "GET",
    cache: "no-store",
    headers: init?.body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  const body = await res.json().catch(() => null);
  if (!body?.ok) throw new Error(body?.error ?? `Permintaan gagal (${res.status}).`);
  return body.data as T;
}

export function useAdminData<T>(path: string) {
  const [data, setData] = React.useState<T | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const seq = React.useRef(0);

  const load = React.useCallback(async () => {
    const my = ++seq.current;
    setLoading(true);
    try {
      const d = await adminFetch<T>(path);
      if (my === seq.current) {
        setData(d);
        setError(null);
      }
    } catch (e) {
      if (my === seq.current) setError(e instanceof Error ? e.message : "Gagal memuat data.");
    } finally {
      if (my === seq.current) setLoading(false);
    }
  }, [path]);

  React.useEffect(() => {
    void load();
  }, [load]);

  return { data, error, loading, reload: load };
}
