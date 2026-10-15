"use client";

import * as React from "react";
import { AlertTriangle, Info, X } from "lucide-react";

interface Announcement {
  text: string;
  level: "info" | "warn" | "critical";
}

const STYLE = {
  info: "border-violet-500/30 bg-violet-500/10",
  warn: "border-amber-500/30 bg-amber-500/10",
  critical: "border-red-500/30 bg-red-500/10",
} as const;

/** Banner pengumuman dari panel admin. Bisa ditutup; muncul lagi kalau teksnya berubah. */
export function AnnouncementBanner() {
  const [ann, setAnn] = React.useState<Announcement | null>(null);
  const [hidden, setHidden] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    fetch("/api/announcement", { cache: "no-store" })
      .then((r) => r.json())
      .then((b) => {
        if (!alive || !b?.ok || !b.data.announcement) return;
        const a = b.data.announcement as Announcement;
        setAnn(a);
        try {
          if (window.sessionStorage.getItem("depup:ann-dismissed") === a.text) setHidden(true);
        } catch {
          /* storage tidak tersedia */
        }
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  if (!ann || hidden) return null;
  const Icon = ann.level === "info" ? Info : AlertTriangle;
  return (
    <div role="status" className={`mb-4 flex items-start gap-3 rounded-2xl border px-4 py-3 text-[13px] ${STYLE[ann.level]}`}>
      <Icon size={16} className="mt-0.5 shrink-0" />
      <p className="min-w-0 flex-1 whitespace-pre-wrap break-words">{ann.text}</p>
      <button
        type="button"
        aria-label="Tutup pengumuman"
        onClick={() => {
          setHidden(true);
          try {
            window.sessionStorage.setItem("depup:ann-dismissed", ann.text);
          } catch {
            /* abaikan */
          }
        }}
        className="shrink-0 text-text-muted hover:text-text"
      >
        <X size={15} />
      </button>
    </div>
  );
}
