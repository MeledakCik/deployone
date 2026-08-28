import * as React from "react";
import { cn } from "@/lib/utils";

interface SurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: "div" | "section" | "article";
}

/** Solid surface panel: no backdrop-filter, so it's cheap to paint/composite. */
export function Surface({ className, as = "div", children, ...props }: SurfaceProps) {
  const Comp = as as any;
  return (
    <Comp className={cn("surface-solid", className)} {...props}>
      {children}
    </Comp>
  );
}
