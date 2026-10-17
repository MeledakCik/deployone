import * as React from "react";
import { cn } from "@/lib/utils";

interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  flat?: boolean;
  as?: "div" | "section" | "article";
}

/**
 * @deprecated Untuk kartu biasa pakai <Surface> (components/ui/Surface.tsx). `flat` hanya dipakai untuk gaya toast.
 * `.glass` di CSS hanyalah alias lama dari `.surface-solid`.
 */
export function GlassPanel({ className, flat, as = "div", children, ...props }: GlassPanelProps) {
  const Comp = as as any;
  return (
    <Comp className={cn(flat ? "glass-flat" : "glass", className)} {...props}>
      {children}
    </Comp>
  );
}
