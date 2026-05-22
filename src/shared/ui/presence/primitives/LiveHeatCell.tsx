import { useMemo } from "react";
import { useSource } from "@/shared/lib/presence/runtime/useSource";
import { worldActivityHeatSource } from "@/shared/lib/presence/sources";
import { REGIONS } from "@/shared/config/presence/regions";

export interface LiveHeatCellProps {
  regionId: string;
  className?: string;
}

/**
 * LiveHeatCell — one region's heat (0..20) rendered as background opacity
 * over `--surface-live`. No glow; intensity comes from saturation alone.
 */
export function LiveHeatCell({ regionId, className = "" }: LiveHeatCellProps) {
  const source = useMemo(() => worldActivityHeatSource(), []);
  const heat = useSource(source, { jitterKey: `heat-cell:${regionId}` });
  const cell = heat.find((h) => h.regionId === regionId);
  const region = REGIONS.find((r) => r.id === regionId);
  const intensity = cell ? cell.heat / 20 : 0.5;
  return (
    <div
      data-presence="heat-cell"
      data-value={cell?.heat ?? 0}
      className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border bg-surface-aggregate ${className}`}
      style={{
        background: `color-mix(in oklab, var(--surface-live) ${Math.round(intensity * 100)}%, var(--surface-quiet))`,
        transition: "background var(--motion-wave) var(--ease-presence-soft)",
      }}
    >
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {region?.nameKo ?? regionId}
      </span>
      <span data-presence-text className="text-[10px] font-bold text-foreground">
        {Math.round(intensity * 100)}
      </span>
    </div>
  );
}
