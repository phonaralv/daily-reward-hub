import { useLiveCounter, type LiveCounterOpts } from "@/shared/lib/presence/liveEngine";

export interface LiveValueProps {
  seed: number;
  opts?: LiveCounterOpts;
  format?: (n: number) => string;
  className?: string;
  label?: string;
}

/**
 * LiveValue — tabular number that breathes via the live counter source.
 * Single Source consumer (`useLiveCounter` → `liveCounterSource`).
 * No glow, no scale tricks — only a soft color transition for legibility.
 */
export function LiveValue({
  seed,
  opts,
  format = (n) => n.toLocaleString("en-US"),
  className = "",
  label,
}: LiveValueProps) {
  const value = useLiveCounter(seed, opts);
  return (
    <span
      data-presence="live-value"
      data-value={Math.round(value)}
      aria-label={label}
      className={`font-tabular inline-block ${className}`}
      style={{ transition: "color var(--motion-tick) var(--ease-presence-soft)" }}
    >
      <span data-presence-text>{format(Math.round(value))}</span>
    </span>
  );
}
