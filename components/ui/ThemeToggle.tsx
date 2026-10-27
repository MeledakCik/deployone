"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "@/components/ui/icons";

/**
 * Satu-satunya tempat mengganti tema (di sidebar). Dibuat sebagai saklar aksesibel:
 * "Mode terang" aktif/nonaktif, dan dibaca benar oleh screen reader.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="theme-toggle" aria-hidden />;
  }

  const isLight = resolvedTheme === "light";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isLight}
      className="theme-toggle"
      aria-label="Mode terang"
      title={isLight ? "Ganti ke mode gelap" : "Ganti ke mode terang"}
      onClick={() => setTheme(isLight ? "dark" : "light")}
    >
      <span className="theme-toggle-knob">
        <span key={isLight ? "sun" : "moon"} className="theme-icon-swap grid place-items-center">
          {isLight ? <Sun size={14} /> : <Moon size={14} />}
        </span>
      </span>
    </button>
  );
}
