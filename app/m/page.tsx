"use client";

import { useUserData } from "@/lib/m-data";

export default function MobileProjects() {
  const { history, loading } = useUserData();

  // Satu project = satu nama+platform, ambil yang terbaru, sembunyikan yang sudah dihapus.
  const seen = new Set<string>();
  const projects = history.filter((h) => {
    const key = `${h.platform}:${h.name}`;
    if (seen.has(key) || h.status === "deleted") return false;
    seen.add(key);
    return true;
  });

  if (loading) return <p className="text-sm opacity-60">Memuat…</p>;
  if (projects.length === 0) return <p className="text-sm opacity-60">Belum ada project. Buka tab Deploy.</p>;

  return (
    <ul className="space-y-3">
      {projects.map((p) => (
        <li key={p.id} className="rounded-xl border border-black/10 p-4 dark:border-white/10">
          <div className="flex items-center justify-between">
            <span className="font-medium">{p.name}</span>
            <span className="text-xs opacity-60">{p.platform}</span>
          </div>
          <div className="mt-1 text-xs opacity-60">{p.status}</div>
          {p.domain && (
            <a
              href={p.domain.startsWith("http") ? p.domain : `https://${p.domain}`}
              target="_blank"
              rel="noreferrer"
              className="mt-2 block truncate text-sm text-violet-600"
            >
              Buka situs
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}
