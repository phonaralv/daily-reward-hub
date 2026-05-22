import { useMemo } from "react";
import { useSource } from "@/shared/lib/presence/runtime/useSource";
import { tickerSource, type TickerItem } from "@/shared/lib/presence/sources";
import { REGIONS } from "@/shared/config/presence/regions";

const KIND_LABEL: Record<TickerItem["kind"], string> = {
  join: "참여",
  reward: "보상",
  mission: "미션",
  trade: "거래",
};

function regionName(id: string): string {
  return REGIONS.find((r) => r.id === id)?.nameKo ?? id;
}

export interface LiveTickerProps {
  size?: number;
  className?: string;
}

/**
 * LiveTicker — crossfading aggregate feed of region+kind chips. No marquee,
 * no slide; the rotation is encoded by the source's now-bucketed cursor,
 * and we let CSS opacity do the soft handoff.
 */
export function LiveTicker({ size = 5, className = "" }: LiveTickerProps) {
  const source = useMemo(() => tickerSource(size), [size]);
  const items = useSource(source, { jitterKey: "ticker" });
  return (
    <div
      data-presence="ticker"
      data-value={items.map((i) => i.id).join(",")}
      className={`flex flex-wrap gap-1.5 ${className}`}
      style={{ transition: "opacity var(--motion-wave) var(--ease-presence-soft)" }}
    >
      {items.map((it) => (
        <span
          key={it.id}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-surface-aggregate border border-border text-muted-foreground"
        >
          <span data-presence-text>
            {regionName(it.regionId)} · {KIND_LABEL[it.kind]}
          </span>
        </span>
      ))}
    </div>
  );
}
