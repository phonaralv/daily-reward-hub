import { useGlobalPulse } from "@/shared/lib/presence/useGlobalPulse";
import { t } from "@/shared/config/i18n";
import { OnlinePulseDot } from "./OnlinePulseDot";

const LABELS = {
  global_surge: { key: "presence.pulse.globalSurge", color: "var(--accent-pink)" },
  hot_now:      { key: "presence.pulse.hot",         color: "var(--reward-glow)" },
  trending:     { key: "presence.pulse.trending",    color: "var(--accent-cyan)" },
  steady:       { key: "presence.pulse.steady",      color: "var(--success)"     },
  low:          { key: "presence.pulse.steady",      color: "var(--muted-foreground)" },
  limited_wave: { key: "presence.pulse.limitedWave", color: "var(--accent-pink)" },
} as const;

export function GlobalPulseChip() {
  const state = useGlobalPulse();
  const meta = LABELS[state] ?? LABELS.steady;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-surface-2 border border-border"
      style={{ color: meta.color }}
    >
      <OnlinePulseDot color={meta.color} size={6} />
      {t(meta.key as Parameters<typeof t>[0])}
    </span>
  );
}
