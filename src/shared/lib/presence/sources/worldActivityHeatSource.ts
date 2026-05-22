import { REGIONS } from "@/shared/config/presence/regions";
import { regionHeat } from "../waveEngine";
import type { PresenceSource } from "./types";

export interface RegionHeat {
  readonly regionId: string;
  /** Quantized heat in 0..20 — small enough to skip noisy re-renders. */
  readonly heat: number;
}

const REFRESH_MS = 12_000;
const HEAT_STEPS = 20;

const firstPaintHeat = (): RegionHeat[] =>
  REGIONS.map((r) => ({ regionId: r.id, heat: 10 }));

/**
 * World-wide activity heat snapshot. One quantized heat per region.
 * Returns `prev` by reference when the entire heat vector is unchanged
 * after quantization.
 */
export function worldActivityHeatSource(): PresenceSource<readonly RegionHeat[]> {
  return {
    key: "world:activity",
    minIntervalMs: REFRESH_MS,
    firstPaint: firstPaintHeat,
    sample: (_now, prev) => {
      const next: RegionHeat[] = REGIONS.map((r) => ({
        regionId: r.id,
        heat: Math.round(regionHeat(r) * HEAT_STEPS),
      }));
      if (
        prev.length === next.length &&
        prev.every(
          (p, i) => p.regionId === next[i].regionId && p.heat === next[i].heat,
        )
      ) {
        return prev;
      }
      return next;
    },
  };
}
