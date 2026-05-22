import { useMemo } from "react";
import { useSource } from "@/shared/lib/presence/runtime/useSource";
import { rewardWaveSource, type RewardWaveLevel } from "@/shared/lib/presence/sources";

const LABEL: Record<RewardWaveLevel, string> = {
  calm: "CALM",
  rising: "RISING",
  surge: "SURGE",
};

const LEVEL_COLOR: Record<RewardWaveLevel, string> = {
  calm: "var(--muted-foreground)",
  rising: "var(--accent-cyan)",
  surge: "var(--accent-neon)",
};

export interface LiveBadgeProps {
  className?: string;
}

/**
 * LiveBadge — reward wave chip. Level drives the color; intensity drives
 * a subtle opacity ramp (0.75..1) so the badge "breathes" without glow.
 */
export function LiveBadge({ className = "" }: LiveBadgeProps) {
  const source = useMemo(() => rewardWaveSource(), []);
  const { level, intensity } = useSource(source, { jitterKey: "reward-wave" });
  const color = LEVEL_COLOR[level];
  return (
    <span
      data-presence="reward-wave"
      data-value={level}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-surface-aggregate border border-border ${className}`}
      style={{
        color,
        opacity: 0.75 + intensity * 0.25,
        transition: "opacity var(--motion-pulse) var(--ease-presence-breath), color var(--motion-tick) var(--ease-presence-soft)",
      }}
    >
      <span
        aria-hidden="true"
        className="inline-block w-1.5 h-1.5 rounded-full"
        style={{ background: color }}
      />
      <span data-presence-text>{LABEL[level]}</span>
    </span>
  );
}
