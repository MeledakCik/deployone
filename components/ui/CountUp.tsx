"use client";

import * as React from "react";

/**
 * Angka naik halus dari nilai sebelumnya ke nilai baru (±550ms). Tanpa animasi jika reduced motion.
 * Frame animasi menulis langsung ke node teks lewat ref, jadi tidak ada re-render React per frame
 * (beberapa kartu sekaligus tidak lagi membuat Chrome patah-patah).
 */
const fmt = (n: number) => n.toLocaleString("id-ID");

export function CountUp({ value, duration = 550 }: { value: number | string; duration?: number }) {
  const target = typeof value === "number" ? value : Number.NaN;
  const ref = React.useRef<HTMLSpanElement>(null);
  const from = React.useRef(0);

  React.useEffect(() => {
    const el = ref.current;
    if (!el || Number.isNaN(target)) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || target === from.current) {
      from.current = target;
      el.textContent = fmt(target);
      return;
    }
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = fmt(Math.round(a + (target - a) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
      else from.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      from.current = Number((el.textContent ?? "").replace(/\D/g, "")) || 0;
    };
  }, [target, duration]);

  // Teks awal statis; setelah itu hanya efek di atas yang mengubah node ini.
  return (
    <span ref={ref} suppressHydrationWarning>
      {Number.isNaN(target) ? value : 0}
    </span>
  );
}
