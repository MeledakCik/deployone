"use client";

// Lightweight CSS-only fade (no framer-motion / JS-driven animation).
// Avoids per-mount JS animation work and layout-affecting transforms;
// only `opacity` is animated, which is cheap to composite.
export function ViewFade({ children }: { children: React.ReactNode }) {
  return <div className="view-fade">{children}</div>;
}
