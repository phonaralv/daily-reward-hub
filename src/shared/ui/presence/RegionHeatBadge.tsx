import { useActiveRegions } from "@/shared/lib/presence/waveEngine";
import { OnlinePulseDot } from "./OnlinePulseDot";

export function RegionHeatBadge() {
  const [top] = useActiveRegions(1);
  if (!top) return null;
  return (
    <span
      data-presence="region-heat"
      data-value={top.id}
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-surface-2 text-[11px] font-medium"
    >
      <OnlinePulseDot color="var(--reward-glow)" size={6} />
      <span data-presence-text>{top.name} · {top.nameKo}</span>
    </span>
  );
}
