import { useMemo } from "react";
import { useSource } from "@/shared/lib/presence/runtime/useSource";
import { onlineDotSource } from "@/shared/lib/presence/sources";

export interface LiveDotProps {
  size?: number;
  className?: string;
}

/**
 * LiveDot — aggregate online/idle indicator. Reuses the existing
 * `.phonara-pulse` keyframe; soft glow only when online.
 */
export function LiveDot({ size = 8, className = "" }: LiveDotProps) {
  const source = useMemo(() => onlineDotSource(), []);
  const state = useSource(source, { jitterKey: "online-dot" });
  const isOnline = state === "online";
  return (
    <span
      data-presence="online-dot"
      data-value={state}
      aria-hidden="true"
      className={`inline-block rounded-full ${isOnline ? "phonara-pulse" : ""} ${className}`}
      style={{
        width: size,
        height: size,
        background: isOnline ? "var(--accent-neon)" : "var(--muted-foreground)",
        boxShadow: isOnline ? "var(--shadow-presence-soft)" : "none",
        transition: "background var(--motion-pulse) var(--ease-presence-soft)",
      }}
    />
  );
}
